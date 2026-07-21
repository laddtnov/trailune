# Year in Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/stats/year` page presenting an annual travel recap (countries, trips, flights, days abroad, most-visited country, longest trip, most active month) for a user-selected year, derived entirely from existing trip data, linked from the existing `/stats` page.

**Architecture:** A new pure module `src/lib/yearInReview.ts` computes the recap and the list of years with data, following the same `compute*Stats(trips, ...)` pattern as `src/lib/tripStats.ts`. A new route `src/routes/stats/year/+page.svelte` renders the year picker and stat cards, following the same `onMount` → load trips → compute → tweened-counter pattern as `src/routes/stats/+page.svelte`. `src/routes/stats/+page.svelte` gets one new link/card pointing to the new route.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, `svelte/motion`/`svelte/easing` (already used throughout this codebase), Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- No image export / share-image generation in this cycle — in-app view only.
- No story-style slideshow — a single scrollable page, matching `/stats`'s existing layout.
- A trip is assigned to a year by its `startDate`'s year (a trip is never split across a year boundary), consistent with how `tripStats.ts`'s `longestTrip` already treats a trip as one indivisible unit.
- Every new animation must skip straight to its final/steady state when `prefers-reduced-motion: reduce` is set — via the existing global CSS override in `app.css` for CSS-keyframe animations, or an explicit `window.matchMedia('(prefers-reduced-motion: reduce)').matches` check for JS-driven tweens (matching the established pattern in `src/routes/stats/+page.svelte`).

---

### Task 1: `computeYearInReview` and `getAvailableYears`

**Files:**
- Create: `src/lib/yearInReview.ts`
- Test: `src/lib/yearInReview.test.ts`

**Interfaces:**
- Consumes: `Trip` from `$lib/types` (fields used: `startDate`, `endDate`, `name`, `countries`, `transportMode`); `daysInTrip` from `$lib/countryStats`.
- Produces (used by Task 2):
  ```ts
  export interface YearInReview {
    year: number;
    totalCountries: number;
    totalTrips: number;
    totalFlights: number;
    totalDays: number;
    mostVisitedCountry: { code: string; visitCount: number } | null;
    longestTrip: { name: string; days: number } | null;
    mostActiveMonth: { month: number; days: number } | null; // month is 0-11 (JS Date convention)
  }

  export function getAvailableYears(trips: Trip[]): number[]; // descending, e.g. [2026, 2025, 2024]
  export function computeYearInReview(trips: Trip[], year: number): YearInReview;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/yearInReview.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeYearInReview, getAvailableYears } from './yearInReview';
import type { Trip } from './types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: overrides.id ?? 'trip-1',
    name: overrides.name ?? 'Test Trip',
    startDate: overrides.startDate ?? '2025-01-01',
    endDate: overrides.endDate ?? '2025-01-01',
    countries: overrides.countries ?? ['FR'],
    transportMode: overrides.transportMode ?? 'flight',
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z'
  };
}

describe('getAvailableYears', () => {
  it('returns distinct years sorted descending', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2024-03-01' }),
      makeTrip({ id: '2', startDate: '2026-01-01' }),
      makeTrip({ id: '3', startDate: '2025-06-01' }),
      makeTrip({ id: '4', startDate: '2024-11-01' })
    ];
    expect(getAvailableYears(trips)).toEqual([2026, 2025, 2024]);
  });

  it('returns an empty array when there are no trips', () => {
    expect(getAvailableYears([])).toEqual([]);
  });
});

describe('computeYearInReview', () => {
  it('filters trips to the given year by startDate', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-03-01', endDate: '2025-03-05', countries: ['FR'] }),
      makeTrip({ id: '2', startDate: '2024-03-01', endDate: '2024-03-05', countries: ['DE'] })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalTrips).toBe(1);
    expect(result.totalCountries).toBe(1);
  });

  it('counts distinct countries, trips, flights, and total days for the year', () => {
    const trips = [
      makeTrip({
        id: '1',
        startDate: '2025-01-01',
        endDate: '2025-01-05',
        countries: ['FR', 'DE'],
        transportMode: 'flight'
      }),
      makeTrip({
        id: '2',
        startDate: '2025-06-10',
        endDate: '2025-06-12',
        countries: ['FR'],
        transportMode: 'train'
      })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.totalCountries).toBe(2);
    expect(result.totalTrips).toBe(2);
    expect(result.totalFlights).toBe(1);
    expect(result.totalDays).toBe(5 + 3);
  });

  it('picks the most-visited country, tie-broken by earliest first-visit date', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-01-01', endDate: '2025-01-02', countries: ['FR'] }),
      makeTrip({ id: '2', startDate: '2025-02-01', endDate: '2025-02-02', countries: ['DE'] }),
      makeTrip({ id: '3', startDate: '2025-03-01', endDate: '2025-03-02', countries: ['FR'] })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.mostVisitedCountry).toEqual({ code: 'FR', visitCount: 2 });
  });

  it('picks the longest trip for the year', () => {
    const trips = [
      makeTrip({ id: '1', name: 'Short Trip', startDate: '2025-01-01', endDate: '2025-01-02' }),
      makeTrip({ id: '2', name: 'Long Trip', startDate: '2025-02-01', endDate: '2025-02-10' })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.longestTrip).toEqual({ name: 'Long Trip', days: 10 });
  });

  it('computes the most active month across a trip spanning multiple months', () => {
    const trips = [
      // Jan 28 - Feb 3: 4 days in January (28,29,30,31), 3 days in February (1,2,3)
      makeTrip({ id: '1', startDate: '2025-01-28', endDate: '2025-02-03' })
    ];
    const result = computeYearInReview(trips, 2025);
    expect(result.mostActiveMonth).toEqual({ month: 0, days: 4 }); // January = month 0
  });

  it('returns null for mostVisitedCountry, longestTrip, and mostActiveMonth when the year has no trips', () => {
    const result = computeYearInReview([], 2025);
    expect(result.mostVisitedCountry).toBeNull();
    expect(result.longestTrip).toBeNull();
    expect(result.mostActiveMonth).toBeNull();
    expect(result.totalTrips).toBe(0);
    expect(result.totalCountries).toBe(0);
    expect(result.totalDays).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/yearInReview.test.ts`
Expected: FAIL — `Cannot find module './yearInReview'`.

- [ ] **Step 3: Implement `yearInReview.ts`**

Create `src/lib/yearInReview.ts`:

```ts
import type { Trip } from '$lib/types';
import { daysInTrip } from '$lib/countryStats';

export interface YearInReview {
  year: number;
  totalCountries: number;
  totalTrips: number;
  totalFlights: number;
  totalDays: number;
  mostVisitedCountry: { code: string; visitCount: number } | null;
  longestTrip: { name: string; days: number } | null;
  mostActiveMonth: { month: number; days: number } | null;
}

function tripYear(trip: Trip): number {
  return new Date(trip.startDate).getFullYear();
}

export function getAvailableYears(trips: Trip[]): number[] {
  const years = new Set(trips.map(tripYear));
  return [...years].sort((a, b) => b - a);
}

function computeMostActiveMonth(trips: Trip[]): { month: number; days: number } | null {
  const monthDays = new Array(12).fill(0);
  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      monthDays[d.getMonth()] += 1;
    }
  }
  let bestMonth = -1;
  let bestDays = 0;
  for (let month = 0; month < 12; month++) {
    if (monthDays[month] > bestDays) {
      bestDays = monthDays[month];
      bestMonth = month;
    }
  }
  return bestMonth === -1 ? null : { month: bestMonth, days: bestDays };
}

export function computeYearInReview(trips: Trip[], year: number): YearInReview {
  const yearTrips = trips.filter((trip) => tripYear(trip) === year);

  const totalCountries = new Set(yearTrips.flatMap((trip) => trip.countries)).size;
  const totalTrips = yearTrips.length;
  const totalFlights = yearTrips.filter((trip) => trip.transportMode === 'flight').length;
  const totalDays = yearTrips.reduce((sum, trip) => sum + daysInTrip(trip), 0);

  const visitCounts = new Map<string, { visitCount: number; firstVisit: number }>();
  for (const trip of yearTrips) {
    const start = new Date(trip.startDate).getTime();
    for (const code of trip.countries) {
      const existing = visitCounts.get(code);
      if (existing) {
        existing.visitCount += 1;
        existing.firstVisit = Math.min(existing.firstVisit, start);
      } else {
        visitCounts.set(code, { visitCount: 1, firstVisit: start });
      }
    }
  }
  let mostVisitedCountry: YearInReview['mostVisitedCountry'] = null;
  for (const [code, { visitCount, firstVisit }] of visitCounts) {
    if (
      !mostVisitedCountry ||
      visitCount > mostVisitedCountry.visitCount ||
      (visitCount === mostVisitedCountry.visitCount &&
        firstVisit < visitCounts.get(mostVisitedCountry.code)!.firstVisit)
    ) {
      mostVisitedCountry = { code, visitCount };
    }
  }

  const longestTrip =
    yearTrips.length === 0
      ? null
      : yearTrips.reduce(
          (longest, trip) => (daysInTrip(trip) > longest.days ? { name: trip.name, days: daysInTrip(trip) } : longest),
          { name: yearTrips[0].name, days: daysInTrip(yearTrips[0]) }
        );

  const mostActiveMonth = computeMostActiveMonth(yearTrips);

  return {
    year,
    totalCountries,
    totalTrips,
    totalFlights,
    totalDays,
    mostVisitedCountry,
    longestTrip,
    mostActiveMonth
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/yearInReview.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/yearInReview.ts src/lib/yearInReview.test.ts
git commit -m "feat: add computeYearInReview and getAvailableYears"
```

---

### Task 2: `/stats/year` page

**Files:**
- Create: `src/routes/stats/year/+page.svelte`

**Interfaces:**
- Consumes: `getAvailableYears`, `computeYearInReview`, `YearInReview` from `$lib/yearInReview` (Task 1); `listTrips` from `$lib/storage/storage`; `Trip` from `$lib/types`; `Skeleton` from `$lib/components/Skeleton.svelte` (already exists from the Ambient Delight Details feature).
- Produces: nothing consumed by later tasks in this plan (Task 3 only links to this route by URL string, not by import).

- [ ] **Step 1: Create the page**

Create `src/routes/stats/year/+page.svelte`:

```svelte
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
```

Note on the reveal animation: each `.year-card` gets a small `animation-delay` (via inline `style`, following the same manual-stagger approach as this codebase's other reveal animations) so the cards appear in a staggered sequence rather than all at once. `backwards` fill-mode ensures each card is invisible (`opacity: 0`) before its delay elapses, and the `{#key review.year}` block ensures switching years re-triggers the animation. The global reduced-motion CSS override in `app.css` combined with this component's own `@media` block ensures `animation: none` under `prefers-reduced-motion: reduce`.

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Navigate to `/stats/year` with existing multi-year trip data. Confirm the year picker shows every year that has a trip, defaults to selecting the most recent one, and the six stat cards render with a staggered fade/slide-in animation.
2. Click a different year in the picker. Confirm the stats update to that year's numbers and the cards re-play their staggered reveal animation.
3. With no trips at all (clear localStorage or test in an empty state), confirm the "No trips yet" empty state renders instead of the picker/cards.
4. Toggle `prefers-reduced-motion` and reload. Confirm the cards appear instantly with no animation.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (this page is presentational with no new pure logic — the logic it calls was already tested in Task 1).

- [ ] **Step 4: Commit**

```bash
git add src/routes/stats/year/+page.svelte
git commit -m "feat: add Year in Review page"
```

---

### Task 3: Link to Year in Review from `/stats`

**Files:**
- Modify: `src/routes/stats/+page.svelte`

**Interfaces:**
- Consumes: nothing from Task 1 or Task 2 (a plain `<a href="/stats/year">` link, not a component import).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add a link/card to the Year in Review page**

Find the closing of the Achievements section in `src/routes/stats/+page.svelte`:

```svelte
  {#if achievements.length > 0}
    <div class="mt-10">
      <h2 class="font-display text-2xl font-bold">Achievements</h2>
      <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
        {#each achievements as achievement (achievement.id)}
```

Change the opening of that block to add a new card immediately before it, inside the same `{:else}` branch. Find the end of the stats grid, right before the achievements block:

```svelte
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Average trip length</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{$averageTripDaysT.toFixed(1)} days</p>
      </div>
    </div>
  {/if}

  {#if achievements.length > 0}
```

Change to:

```svelte
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Average trip length</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{$averageTripDaysT.toFixed(1)} days</p>
      </div>
    </div>

    <a
      href="/stats/year"
      class="mt-6 flex items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-card)] px-5 py-4 shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
    >
      <div>
        <p class="font-display text-lg font-bold">Year in Review</p>
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">See your travel recap, year by year.</p>
      </div>
      <svg aria-hidden="true" viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-accent)]" fill="none" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </a>
  {/if}

  {#if achievements.length > 0}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`. Open `/stats` with existing trip data. Confirm the new "Year in Review" card renders below the stats grid (and above Achievements), with a hover-lift effect matching the rest of the page, and clicking it navigates to `/stats/year`.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat: link Year in Review from stats page"
```

---

## Self-Review Notes

- **Spec coverage:** pure derivation module with tests (Task 1), the year-picker page with empty/loading states and staggered reveal animation respecting reduced-motion (Task 2), and the link from `/stats` (Task 3) — all spec sections have a task. Image export and slideshow-style presentation are explicitly out of scope per the spec's Non-goals, and no task implements them.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `YearInReview` and its field shapes (`mostVisitedCountry: { code, visitCount } | null`, `longestTrip: { name, days } | null`, `mostActiveMonth: { month, days } | null`) are defined once in Task 1 and consumed identically in Task 2's template. `getAvailableYears`/`computeYearInReview` signatures match between Task 1's export and Task 2's import.
- **Cross-task note:** Task 3's diff assumes Task 1 and Task 2 are already applied (though neither changes `stats/+page.svelte` itself, so Task 3's "Find X" block matches the file as it exists today unmodified by prior tasks in this plan).
