<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import CountryPopover from '$lib/components/CountryPopover.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { getCountryStats, type CountryStats } from '$lib/countryStats';
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let selectedCode: string | null = $state(null);
  let newlyVisitedCodes: Set<string> = $state(new Set());

  let hoveredCode: string | null = $state(null);
  let hoveredStats: CountryStats | null = $state(null);
  let hoverPosition: { x: number; y: number } | null = $state(null);

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let tripsForSelected = $derived(
    selectedCode ? trips.filter((t) => t.countries.includes(selectedCode as string)) : []
  );
  let selectedName = $derived(
    selectedCode ? (countries.find((c) => c.code === selectedCode)?.name ?? selectedCode) : ''
  );
  let hoveredName = $derived(
    hoveredCode ? (countries.find((c) => c.code === hoveredCode)?.name ?? hoveredCode) : ''
  );

  const visitedCount = tweened(0, { duration: 600, easing: cubicOut });
  let percentVisited = $derived(
    countries.length > 0 ? Math.round(($visitedCount / countries.length) * 100) : 0
  );

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();

    const currentVisited = new Set(trips.flatMap((t) => t.countries));
    const lastSeen = getLastSeenVisitedCodes();
    const diff = new Set([...currentVisited].filter((code) => !lastSeen.has(code)));

    setLastSeenVisitedCodes(currentVisited);

    if (diff.size > 0) {
      newlyVisitedCodes = diff;
      visitedCount.set(currentVisited.size - diff.size, { duration: 0 });
      visitedCount.set(currentVisited.size);
    } else {
      visitedCount.set(currentVisited.size, { duration: 0 });
    }
  });

  function handleClick(code: string) {
    selectedCode = code;
  }

  function handleHover(code: string | null, position: { x: number; y: number } | null) {
    if (!code || !position) {
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    const stats = getCountryStats(code, trips);
    if (!stats) {
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    if (hoveredCode === code) {
      // Second activation on the same country (touch double-tap) opens the full panel.
      selectedCode = code;
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    hoveredCode = code;
    hoveredStats = stats;
    hoverPosition = position;
  }

  function handleViewTrips() {
    if (!hoveredCode) return;
    selectedCode = hoveredCode;
    hoveredCode = null;
    hoveredStats = null;
    hoverPosition = null;
  }

  function handleWindowPointerDown(event: PointerEvent) {
    if (!hoveredCode) return;
    const target = event.target as Element;
    if (target.closest('.country-popover') || target.closest('path[id]')) return;
    hoveredCode = null;
    hoveredStats = null;
    hoverPosition = null;
  }
</script>

<svelte:window onpointerdown={handleWindowPointerDown} />

<div class="flex flex-wrap items-end justify-between gap-4">
  <div>
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Your world</h1>
    <p class="mt-1 text-[var(--color-ink-soft)]">Every highlighted country is a place you've been.</p>
  </div>
  <div class="flex flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--color-card)] px-5 py-3 shadow-[var(--shadow-card)]">
    <div class="flex items-baseline gap-2">
      <span class="font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($visitedCount)}</span>
      <span class="text-sm text-[var(--color-ink-soft)]">/ {countries.length} countries &middot; {percentVisited}%</span>
    </div>
    <div class="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
        style={`width: ${percentVisited}%;`}
      ></div>
    </div>
  </div>
</div>

<div class="relative mt-8 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-ink-band)] p-4 shadow-[var(--shadow-pop)] sm:p-8">
  <WorldMap {visitedCodes} {newlyVisitedCodes} oncountryclick={handleClick} oncountryhover={handleHover} />

  {#if hoveredCode && hoveredStats && hoverPosition}
    <CountryPopover
      countryName={hoveredName}
      stats={hoveredStats}
      x={hoverPosition.x}
      y={hoverPosition.y}
      onviewtrips={handleViewTrips}
    />
  {/if}

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
          <ul class="mt-2 space-y-2">
            {#each tripsForSelected as trip (trip.id)}
              <li class="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`/trips/${trip.id}`}
                  class="text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
                >
                  {trip.name}
                </a>
                <div class="flex items-center gap-1">
                  <a
                    href={`/trips/${trip.id}?tab=journal`}
                    aria-label={`Open ${trip.name}'s journal`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6c-1.8-1.2-4.5-1.5-7-1v13c2.5-.5 5.2-.2 7 1 1.8-1.2 4.5-1.5 7-1V5c-2.5-.5-5.2-.2-7 1Z"
                      />
                    </svg>
                  </a>
                  <a
                    href={`/trips/${trip.id}?tab=gallery`}
                    aria-label={`Open ${trip.name}'s gallery`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 6h16v12H4zM4 16l4.5-4.5a2 2 0 0 1 2.83 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.83 0L20 14"
                      />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                    </svg>
                  </a>
                  <a
                    href={`/trips/${trip.id}?tab=packing`}
                    aria-label={`Open ${trip.name}'s packing list`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <rect x="4" y="8" width="16" height="12" rx="2" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </a>
                </div>
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
