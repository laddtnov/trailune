<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { getAvailableYears } from '$lib/yearInReview';
  import type { Trip } from '$lib/types';
  import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let trips: Trip[] = $state([]);
  let year: number | null = $state(null);
  let loading = $state(true);

  function stepYear(delta: number) {
    if (year === null) return;
    year = year + delta;
  }

  onMount(() => {
    trips = listTrips();
    const availableYears = getAvailableYears(trips);
    if (availableYears.length > 0) {
      year = availableYears[0];
    }
    loading = false;
  });
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Travel Calendar</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">A yearly heatmap of your travel days.</p>
</div>

{#if loading}
  <div class="mt-8">
    <Skeleton height="12rem" width="100%" />
  </div>
{:else if trips.length === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <h2 class="font-display text-2xl font-bold">No trips yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">Add one to see your travel calendar.</p>
    <a
      href="/"
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Log a trip
    </a>
  </div>
{:else if year !== null}
  <div class="mt-6 flex items-center gap-3">
    <button
      type="button"
      onclick={() => stepYear(-1)}
      class="rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink-soft)] transition-colors duration-150 ease-out hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]"
    >
      &larr; Prev
    </button>
    <span class="font-display text-xl font-bold">{year}</span>
    <button
      type="button"
      onclick={() => stepYear(1)}
      class="rounded-full border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink-soft)] transition-colors duration-150 ease-out hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]"
    >
      Next &rarr;
    </button>
  </div>

  <div class="mt-6 rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
    {#key year}
      <CalendarHeatmap {trips} {year} />
    {/key}
  </div>
{/if}
