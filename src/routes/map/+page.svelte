<script lang="ts">
  import { onMount } from 'svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let selectedCode: string | null = $state(null);

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let tripsForSelected = $derived(
    selectedCode ? trips.filter((t) => t.countries.includes(selectedCode as string)) : []
  );
  let selectedName = $derived(
    selectedCode ? (countries.find((c) => c.code === selectedCode)?.name ?? selectedCode) : ''
  );
  let percentVisited = $derived(
    countries.length > 0 ? Math.round((visitedCodes.size / countries.length) * 100) : 0
  );

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
  });

  function handleClick(code: string) {
    selectedCode = code;
  }
</script>

<div class="flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Your world</h1>
    <p class="mt-1 text-[var(--color-ink-soft)]">Every highlighted country is a place you've been.</p>
  </div>
  <div class="flex items-baseline gap-2 rounded-[var(--radius-lg)] bg-[var(--color-card)] px-5 py-3 shadow-[var(--shadow-card)]">
    <span class="font-display text-3xl font-bold text-[var(--color-accent)]">{visitedCodes.size}</span>
    <span class="text-sm text-[var(--color-ink-soft)]">/ {countries.length} countries &middot; {percentVisited}%</span>
  </div>
</div>

<div class="relative mt-8 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-ink-band)] p-4 shadow-[var(--shadow-pop)] sm:p-8">
  <WorldMap {visitedCodes} oncountryclick={handleClick} />

  {#if selectedCode}
    <div
      class="absolute bottom-4 left-4 right-4 flex items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-pop)] sm:left-8 sm:right-auto sm:w-80"
    >
      <div class="min-w-0">
        <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
          {tripsForSelected.length > 0 ? 'Visited' : 'Not visited yet'}
        </p>
        <h2 class="mt-0.5 truncate font-display text-lg font-bold">{selectedName}</h2>
        {#if tripsForSelected.length > 0}
          <ul class="mt-2 space-y-1">
            {#each tripsForSelected as trip (trip.id)}
              <li>
                <a
                  href={`/trips/${trip.id}`}
                  class="text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
                >
                  {trip.name}
                </a>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="mt-2 text-sm text-[var(--color-ink-soft)]">Add a trip here to fill it in.</p>
        {/if}
      </div>
      <button
        type="button"
        onclick={() => (selectedCode = null)}
        aria-label="Close"
        class="grid size-7 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)] hover:text-[var(--color-ink)]"
      >
        <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  {/if}
</div>
