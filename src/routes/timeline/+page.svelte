<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { groupTripsByYear, getSeasonLabel, countryCodeToFlag, uniqueCountriesInYear } from '$lib/journeyTimeline';
  import { daysInTrip } from '$lib/countryStats';
  import type { Trip } from '$lib/types';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let loading = $state(true);
  let view: 'full' | 'compact' = $state('full');

  const yearGroups = $derived(groupTripsByYear(trips));

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    loading = false;
  });

  function countryName(code: string): string {
    return countries.find((c) => c.code === code)?.name ?? code;
  }

  function countryList(trip: Trip): string {
    return trip.countries.map((code) => `${countryCodeToFlag(code)} ${countryName(code)}`).join(', ');
  }

  function formatDateRange(trip: Trip): string {
    const start = new Date(`${trip.startDate}T00:00:00`);
    const end = new Date(`${trip.endDate}T00:00:00`);
    const startLabel = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const endLabel = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${startLabel}–${endLabel}`;
  }

  function jumpToYear(year: number) {
    view = 'full';
    requestAnimationFrame(() => {
      document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
</script>

<div class="flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Journey timeline</h1>
    <p class="mt-1 text-[var(--color-ink-soft)]">Every trip you've logged, year by year.</p>
  </div>
  {#if !loading && trips.length > 0}
    <button
      class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
      onclick={() => (view = view === 'full' ? 'compact' : 'full')}
    >
      {view === 'full' ? 'Compact view' : 'Full view'}
    </button>
  {/if}
</div>

{#if loading}
  <div class="mt-8 space-y-3">
    {#each { length: 3 } as _, i (i)}
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]">
        <Skeleton height="0.875rem" width="50%" />
        <div class="mt-2">
          <Skeleton height="0.75rem" width="30%" />
        </div>
      </div>
    {/each}
  </div>
{:else if trips.length === 0}
  <div
    class="mt-10 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-10 text-center"
  >
    <p class="text-[var(--color-ink-soft)]">No trips yet. Once you add a trip, it'll appear here on your timeline.</p>
  </div>
{:else if view === 'full'}
  <div class="mt-8">
    {#each yearGroups as group (group.year)}
      <h2 id="year-{group.year}" class="mt-10 text-left font-display text-2xl font-bold first:mt-0 sm:text-center">{group.year}</h2>
      <div class="timeline-year mt-5">
        <div class="timeline-rail"></div>
        {#each group.trips as trip, i (trip.id)}
          <div class="timeline-entry {i % 2 === 0 ? 'entry-left' : 'entry-right'}">
            <div class="timeline-dot"></div>
            <div class="timeline-card">
              <p class="text-sm font-semibold text-[var(--color-ink)]">
                {countryList(trip)}
                <span
                  class="ml-1.5 inline-block rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-[var(--color-accent)]"
                >
                  {getSeasonLabel(trip.startDate)}
                </span>
              </p>
              <p class="mt-1 text-xs text-[var(--color-ink-soft)]">
                {formatDateRange(trip)} &middot; {daysInTrip(trip)} {daysInTrip(trip) === 1 ? 'day' : 'days'}
              </p>
            </div>
          </div>
        {/each}
      </div>
    {/each}
  </div>
{:else}
  <div class="mt-8 space-y-2">
    {#each yearGroups as group (group.year)}
      {@const countries = uniqueCountriesInYear(group)}
      <button
        class="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-card)] p-4 text-left shadow-[var(--shadow-card)] transition hover:bg-[var(--color-card-hover)]"
        onclick={() => jumpToYear(group.year)}
      >
        <span class="font-display text-lg font-bold">{group.year}</span>
        <span class="text-sm text-[var(--color-ink-soft)]">
          {countries.map(countryCodeToFlag).join('')}
          {countries.length}
          {countries.length === 1 ? 'country' : 'countries'}
        </span>
      </button>
    {/each}
  </div>
{/if}

<style>
  .timeline-year {
    position: relative;
  }

  .timeline-rail {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 5px;
    width: 2px;
    background: var(--color-card-border);
  }

  .timeline-entry {
    position: relative;
    padding-left: 28px;
    padding-bottom: 20px;
  }

  .timeline-entry:last-child {
    padding-bottom: 0;
  }

  .timeline-dot {
    position: absolute;
    left: 0;
    top: 4px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    background: var(--color-accent);
    border: 2px solid var(--color-canvas);
  }

  .timeline-card {
    border: 1px solid var(--color-card-border);
    background: var(--color-card);
    border-radius: var(--radius-md);
    padding: 12px 16px;
  }

  @media (min-width: 640px) {
    .timeline-rail {
      left: 50%;
      transform: translateX(-50%);
    }

    .timeline-entry {
      padding-left: 0;
      padding-bottom: 24px;
      display: flex;
    }

    .timeline-entry.entry-left {
      justify-content: flex-end;
      padding-right: calc(50% + 20px);
      text-align: right;
    }

    .timeline-entry.entry-right {
      justify-content: flex-start;
      padding-left: calc(50% + 20px);
    }

    .timeline-dot {
      left: 50%;
      transform: translateX(-50%);
    }

    .timeline-card {
      max-width: 260px;
    }
  }
</style>
