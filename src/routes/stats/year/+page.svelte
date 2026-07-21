<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { getAvailableYears, computeYearInReview, type YearInReview } from '$lib/yearInReview';
  import type { Trip } from '$lib/types';
  import Skeleton from '$lib/components/Skeleton.svelte';

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ];

  let trips: Trip[] = $state([]);
  let availableYears: number[] = $state([]);
  let selectedYear: number | null = $state(null);
  let review: YearInReview | null = $state(null);
  let loading = $state(true);

  function selectYear(year: number) {
    selectedYear = year;
    review = computeYearInReview(trips, year);
  }

  onMount(() => {
    trips = listTrips();
    availableYears = getAvailableYears(trips);
    if (availableYears.length > 0) {
      selectYear(availableYears[0]);
    }
    loading = false;
  });
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Year in Review</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">A recap of your travels, year by year.</p>
</div>

{#if loading}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
    {#each { length: 6 } as _, i (i)}
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <Skeleton height="0.875rem" width="60%" />
        <div class="mt-2">
          <Skeleton height="1.75rem" width="40%" />
        </div>
      </div>
    {/each}
  </div>
{:else if availableYears.length === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <h2 class="font-display text-2xl font-bold">No trips yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
      Log your first trip and your Year in Review will start filling in automatically.
    </p>
    <a
      href="/"
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Log a trip
    </a>
  </div>
{:else}
  <div class="mt-6 flex flex-wrap gap-1.5">
    {#each availableYears as year (year)}
      <button
        type="button"
        aria-pressed={selectedYear === year}
        onclick={() => selectYear(year)}
        class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {selectedYear ===
        year
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
          : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
      >
        {year}
      </button>
    {/each}
  </div>

  {#if review}
    {#key review.year}
      <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
        <div class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <p class="text-sm text-[var(--color-ink-soft)]">Countries visited</p>
          <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{review.totalCountries}</p>
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 60ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Trips taken</p>
          <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{review.totalTrips}</p>
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 120ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Flights taken</p>
          <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{review.totalFlights}</p>
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 180ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Days abroad</p>
          <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{review.totalDays}</p>
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 240ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Most-visited country</p>
          {#if review.mostVisitedCountry}
            <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">
              {review.mostVisitedCountry.code}
            </p>
            <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{review.mostVisitedCountry.visitCount} trips</p>
          {/if}
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 300ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Longest trip</p>
          {#if review.longestTrip}
            <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">{review.longestTrip.name}</p>
            <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{review.longestTrip.days} days</p>
          {/if}
        </div>
        <div
          class="year-card rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]"
          style="animation-delay: 360ms"
        >
          <p class="text-sm text-[var(--color-ink-soft)]">Most active month</p>
          {#if review.mostActiveMonth}
            <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">
              {MONTH_NAMES[review.mostActiveMonth.month]}
            </p>
            <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{review.mostActiveMonth.days} travel days</p>
          {/if}
        </div>
      </div>
    {/key}
  {/if}
{/if}

<style>
  .year-card {
    animation: year-card-in 0.4s var(--ease-out-quart) backwards;
  }

  @keyframes year-card-in {
    0% {
      opacity: 0;
      transform: translateY(8px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .year-card {
      animation: none;
    }
  }
</style>
