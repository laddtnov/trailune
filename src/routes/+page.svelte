<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats } from '$lib/tripStats';
  import { getLevelProgress, LEVELS, type Level } from '$lib/levels';
  import { getLastSeenLevelId, setLastSeenLevelId } from '$lib/storage/levelViewState';
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let dialogEl: HTMLDialogElement | undefined = $state();
  let name = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let selectedCountries: Set<string> = $state(new Set());
  let countryFilter = $state('');
  let transportMode: TransportMode = $state('flight');

  const MODE_LABELS: Record<TransportMode, string> = {
    flight: 'Flight',
    train: 'Train',
    road: 'Road',
    boat: 'Boat',
    other: 'Other'
  };

  const MODE_ICONS: Record<TransportMode, 'plane' | 'train' | 'car' | 'boat' | 'bike'> = {
    flight: 'plane',
    train: 'train',
    road: 'car',
    boat: 'boat',
    other: 'bike'
  };

  const transportModes: Array<{ value: TransportMode; label: string }> = (
    Object.keys(MODE_LABELS) as TransportMode[]
  ).map((value) => ({ value, label: MODE_LABELS[value] }));

  const filteredCountries = $derived(
    countryFilter.trim()
      ? countries.filter((c) => c.name.toLowerCase().includes(countryFilter.trim().toLowerCase()))
      : countries
  );

  let activeTab: 'all' | TransportMode = $state('all');

  const tabs: Array<{ value: 'all' | TransportMode; label: string }> = [
    { value: 'all', label: 'All' },
    ...transportModes
  ];

  const filteredTrips = $derived(
    activeTab === 'all' ? trips : trips.filter((t) => t.transportMode === activeTab)
  );

  type HeroPhase = 'steady' | 'levelup-stage1' | 'levelup-stage2';
  let heroPhase: HeroPhase = $state('steady');
  let previousLevel: Level | null = $state(null);
  const barPercent = tweened(0, { duration: 500, easing: cubicOut });

  const stats = $derived(computeTripStats(trips, countries));
  const levelProgress = $derived(getLevelProgress(stats.totalCountries));

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();

    if (trips.length === 0) return;

    const currentTotalCountries = computeTripStats(trips, countries).totalCountries;
    const currentProgress = getLevelProgress(currentTotalCountries);
    const lastSeenLevelId = getLastSeenLevelId();
    setLastSeenLevelId(currentProgress.level.id);

    const reduced = prefersReducedMotion();

    if (lastSeenLevelId === null || lastSeenLevelId === currentProgress.level.id) {
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      return;
    }

    const currentIndex = LEVELS.findIndex((l) => l.id === currentProgress.level.id);
    const prevLevel = currentIndex > 0 ? LEVELS[currentIndex - 1] : null;

    if (!prevLevel) {
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      return;
    }

    previousLevel = prevLevel;

    if (reduced) {
      heroPhase = 'levelup-stage2';
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      heroPhase = 'steady';
      return;
    }

    heroPhase = 'levelup-stage1';
    barPercent.set(0, { duration: 0 });
    await barPercent.set(100);

    heroPhase = 'levelup-stage2';
    barPercent.set(0, { duration: 0 });
    await barPercent.set(currentProgress.percentToNext);

    heroPhase = 'steady';
  });

  function toggleCountry(code: string) {
    const next = new Set(selectedCountries);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    selectedCountries = next;
  }

  function openForm() {
    dialogEl?.showModal();
  }

  function resetForm() {
    name = '';
    startDate = '';
    endDate = '';
    selectedCountries = new Set();
    countryFilter = '';
    transportMode = 'flight';
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    createTrip({ name, startDate, endDate, countries: Array.from(selectedCountries), transportMode });
    trips = listTrips();
    activeTab = 'all';
    resetForm();
    dialogEl?.close();
  }

  function onDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-4">
  <div>
    {#if trips.length === 0}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">Your trips</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">Every journey starts with the first pin.</p>
    {:else if heroPhase === 'levelup-stage1' && previousLevel}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{previousLevel.emoji} {previousLevel.name}</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{previousLevel.subtitle}</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
    {:else if heroPhase === 'levelup-stage2'}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">
        &#127881; Level Up! You are now {levelProgress.level.emoji} {levelProgress.level.name}
      </h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{stats.totalCountries} countries visited</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
    {:else}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{levelProgress.level.emoji} {levelProgress.level.name}</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{levelProgress.level.subtitle}</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
      <p class="mt-1.5 text-sm text-[var(--color-ink-soft)]">
        {#if levelProgress.nextLevel}
          {levelProgress.countriesToNext} countr{levelProgress.countriesToNext === 1 ? 'y' : 'ies'} until {levelProgress.nextLevel.name}
        {:else}
          You've reached the top rank &mdash; few travelers get this far.
        {/if}
      </p>
    {/if}
  </div>
  <button
    type="button"
    onclick={openForm}
    class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)] hover:shadow-[var(--shadow-card-hover)] active:translate-y-0 active:bg-[var(--color-accent-active)]"
  >
    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2.5">
      <path stroke-linecap="round" d="M12 5v14M5 12h14" />
    </svg>
    New trip
  </button>
</div>

{#if trips.length > 0 && countries.length > 0}
  <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Visited</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">World explored</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.percentWorld}%</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Trips</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Travel days</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
    </div>
  </div>
{/if}

{#if trips.length > 0}
  <div class="mt-6 flex flex-wrap gap-1.5">
    {#each tabs as tab (tab.value)}
      <button
        type="button"
        aria-pressed={activeTab === tab.value}
        onclick={() => (activeTab = tab.value)}
        class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {activeTab ===
        tab.value
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
          : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
{/if}

{#if trips.length === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <div
      class="grid size-20 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    >
      <svg viewBox="0 0 24 24" class="size-10" fill="none" stroke="currentColor" stroke-width="1.75">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    </div>
    <h2 class="mt-6 font-display text-2xl font-bold">No trips yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
      Log where you're going, what you packed, and what you saw. Your map starts filling in the
      moment you add your first trip.
    </p>
    <button
      type="button"
      onclick={openForm}
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Start your first trip
    </button>
  </div>
{:else if filteredTrips.length === 0}
  <div
    class="mt-10 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center text-[var(--color-ink-soft)]"
  >
    No trips match this filter yet.
  </div>
{:else}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
    {#each filteredTrips as trip (trip.id)}
      <TripCard {trip} />
    {/each}
  </div>
{/if}

<dialog
  bind:this={dialogEl}
  onclick={onDialogClick}
  onclose={resetForm}
  class="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-pop)] backdrop:bg-[var(--color-ink)]/40 backdrop:backdrop-blur-sm open:animate-[pop-in_0.2s_var(--ease-out-quart)]"
>
  <form onsubmit={submit} class="flex max-h-[85vh] flex-col">
    <header class="flex items-center justify-between border-b border-[var(--color-card-border)] px-6 py-4">
      <h2 class="font-display text-xl font-bold">New trip</h2>
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        aria-label="Close"
        class="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)] hover:text-[var(--color-ink)]"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <div class="flex-1 space-y-5 overflow-y-auto px-6 py-5">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Trip name</span>
        <input
          bind:value={name}
          required
          placeholder="e.g. Two weeks in Japan"
          class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
      </label>

      <div class="flex gap-4">
        <label class="block min-w-0 flex-1">
          <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Start</span>
          <input
            type="date"
            bind:value={startDate}
            required
            class="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
          />
        </label>
        <label class="block min-w-0 flex-1">
          <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">End</span>
          <input
            type="date"
            bind:value={endDate}
            required
            min={startDate || undefined}
            class="w-full min-w-0 rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
          />
        </label>
      </div>

      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">How are you getting there?</legend>
        <div class="flex flex-wrap gap-2">
          {#each transportModes as option (option.value)}
            {@const icon = MODE_ICONS[option.value]}
            <button
              type="button"
              aria-pressed={transportMode === option.value}
              onclick={() => (transportMode = option.value)}
              class="inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ease-out {transportMode ===
              option.value
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
              {#if icon === 'plane'}
                <svg class="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M21.7 3.3a1 1 0 0 0-1-.24L3.35 8.94a1 1 0 0 0-.06 1.88l7.15 2.74 2.74 7.15a1 1 0 0 0 1.88-.06l5.88-17.35a1 1 0 0 0-.24-1Z"
                  />
                </svg>
              {:else if icon === 'train'}
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <rect x="5" y="3" width="14" height="14" rx="4" />
                  <path d="M5 12h14M8 17l-2 3M16 17l2 3" />
                  <circle cx="9" cy="15" r="0.8" fill="currentColor" />
                  <circle cx="15" cy="15" r="0.8" fill="currentColor" />
                </svg>
              {:else if icon === 'car'}
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M4 16l1.5-5A2 2 0 0 1 7.4 9.5h9.2A2 2 0 0 1 18.5 11l1.5 5" />
                  <rect x="3" y="16" width="18" height="4" rx="1.5" />
                  <circle cx="7.5" cy="20" r="1.3" fill="currentColor" />
                  <circle cx="16.5" cy="20" r="1.3" fill="currentColor" />
                </svg>
              {:else if icon === 'boat'}
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <path d="M4 14h16l-2 5H6l-2-5Z" />
                  <path d="M8 14V6l7 4-3 1.6M12 3v3" />
                </svg>
              {:else}
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="6" cy="17" r="3" />
                  <circle cx="18" cy="17" r="3" />
                  <path d="M6 17l4-8h4l4 8M10 9h4M10 9L8 5h3" />
                </svg>
              {/if}
              {option.label}
            </button>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">
          Countries visited
          {#if selectedCountries.size > 0}
            <span class="text-[var(--color-accent)]">({selectedCountries.size} selected)</span>
          {/if}
        </legend>
        <input
          bind:value={countryFilter}
          type="text"
          placeholder="Search countries&hellip;"
          class="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
        <div
          class="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] p-3"
        >
          {#each filteredCountries as country (country.code)}
            {@const selected = selectedCountries.has(country.code)}
            <button
              type="button"
              aria-pressed={selected}
              onclick={() => toggleCountry(country.code)}
              class="rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out {selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
              {country.name}
            </button>
          {:else}
            <p class="px-1 py-2 text-sm text-[var(--color-ink-soft)]">No countries match "{countryFilter}".</p>
          {/each}
        </div>
      </fieldset>
    </div>

    <footer class="flex justify-end gap-3 border-t border-[var(--color-card-border)] px-6 py-4">
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        class="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)]"
      >
        Cancel
      </button>
      <button
        type="submit"
        class="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        Create trip
      </button>
    </footer>
  </form>
</dialog>

<style>
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open] {
      animation: none;
    }
  }
</style>
