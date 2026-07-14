<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
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

  const transportModes: Array<{ value: TransportMode; label: string }> = [
    { value: 'flight', label: 'Flight' },
    { value: 'train', label: 'Train' },
    { value: 'road', label: 'Road' },
    { value: 'boat', label: 'Boat' },
    { value: 'other', label: 'Other' }
  ];

  const filteredCountries = $derived(
    countryFilter.trim()
      ? countries.filter((c) => c.name.toLowerCase().includes(countryFilter.trim().toLowerCase()))
      : countries
  );

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
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
    resetForm();
    dialogEl?.close();
  }

  function onDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }
</script>

<div class="flex flex-wrap items-center justify-between gap-4">
  <div>
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Your trips</h1>
    <p class="mt-1 text-[var(--color-ink-soft)]">
      {trips.length === 0
        ? 'Every journey starts with the first pin.'
        : `${trips.length} trip${trips.length === 1 ? '' : 's'} logged so far.`}
    </p>
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
{:else}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
    {#each trips as trip (trip.id)}
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
            <button
              type="button"
              aria-pressed={transportMode === option.value}
              onclick={() => (transportMode = option.value)}
              class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ease-out {transportMode ===
              option.value
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
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
