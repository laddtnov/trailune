# Travel Calendar Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new `/calendar` page showing a GitHub-style yearly heatmap of which days were "travel days," colored per trip, derived entirely from existing `Trip` date ranges.

**Architecture:** A new pure module (`travelCalendar.ts`) computes per-year travel days, a 7×53 week grid, and stable per-trip colors from existing `Trip[]` data — no new schema. A new `CalendarHeatmap.svelte` component renders that grid plus a legend and hover tooltips, using five new CSS custom properties added to the existing theme system. A new `/calendar` page wires the component to real trip data with year prev/next navigation, following the exact pattern already used by `/stats/year`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, Tailwind v4.

## Global Constraints

- No new fields on `Trip` — everything is derived at render time from existing `startDate`/`endDate`/`countries` (spec: Non-goals).
- No support for overlapping trips on the same day — a day belongs to at most one trip (spec: Non-goals).
- No click-through from a day cell to its trip page — hover tooltip only, using the native `title` attribute, matching this project's existing lightweight-tooltip convention (spec: Goals, Architecture).
- Tooltip text format is exactly `"{trip.name} · {date}"` (spec: Architecture).
- Trip colors come from five new dedicated CSS custom properties (`--color-trip-1` through `--color-trip-5`), never a reuse of `--color-danger`/`--color-success` (semantic red/green elsewhere in the app) or `--color-accent`/`--color-teal` (primary UI accents) (spec: Architecture).
- Color assignment is global across all trips (sorted chronologically by `startDate`), not scoped to the displayed year, so a trip's color never changes when paging between years (spec: Data flow & interaction notes).
- Nav entry `{ href: '/calendar', label: 'Calendar' }` goes after Timeline: Trips, Map, Timeline, Calendar, Packing, Stats, Settings (spec: Goals).
- Reuse the existing `getAvailableYears(trips: Trip[]): number[]` from `src/lib/yearInReview.ts` — do not duplicate it (spec: Architecture).

---

### Task 1: `travelCalendar.ts` — pure heatmap data functions

**Files:**
- Create: `src/lib/travelCalendar.ts`
- Test: `src/lib/travelCalendar.test.ts`

**Interfaces:**
- Consumes: `Trip` from `$lib/types` (fields: `id`, `startDate`, `endDate`, all `YYYY-MM-DD` strings).
- Produces:
  - `interface TravelDay { date: string; tripId: string }`
  - `computeYearHeatmap(trips: Trip[], year: number): TravelDay[]`
  - `assignTripColors(trips: Trip[]): Map<string, string>`
  - `buildYearWeeks(year: number): (string | null)[][]` — an array of week-columns; each week is an array of exactly 7 entries (index 0 = Sunday … index 6 = Saturday), holding a `YYYY-MM-DD` string for real days or `null` for padding outside the year.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/travelCalendar.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeYearHeatmap, assignTripColors, buildYearWeeks } from './travelCalendar';
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

describe('computeYearHeatmap', () => {
  it('tags every day of a trip fully inside the requested year', () => {
    const trip = makeTrip({ id: 'trip-1', startDate: '2025-06-01', endDate: '2025-06-03' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([
      { date: '2025-06-01', tripId: 'trip-1' },
      { date: '2025-06-02', tripId: 'trip-1' },
      { date: '2025-06-03', tripId: 'trip-1' }
    ]);
  });

  it('only returns the days that fall in the requested year when a trip spans a year boundary', () => {
    const trip = makeTrip({ id: 'trip-1', startDate: '2025-12-30', endDate: '2026-01-02' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([
      { date: '2025-12-30', tripId: 'trip-1' },
      { date: '2025-12-31', tripId: 'trip-1' }
    ]);
    expect(computeYearHeatmap([trip], 2026)).toEqual([
      { date: '2026-01-01', tripId: 'trip-1' },
      { date: '2026-01-02', tripId: 'trip-1' }
    ]);
  });

  it('tags days from multiple non-overlapping trips in the same year', () => {
    const tripA = makeTrip({ id: 'trip-a', startDate: '2025-02-01', endDate: '2025-02-02' });
    const tripB = makeTrip({ id: 'trip-b', startDate: '2025-07-10', endDate: '2025-07-11' });
    expect(computeYearHeatmap([tripA, tripB], 2025)).toEqual([
      { date: '2025-02-01', tripId: 'trip-a' },
      { date: '2025-02-02', tripId: 'trip-a' },
      { date: '2025-07-10', tripId: 'trip-b' },
      { date: '2025-07-11', tripId: 'trip-b' }
    ]);
  });

  it('returns an empty array when no trip falls in the requested year', () => {
    const trip = makeTrip({ startDate: '2024-01-01', endDate: '2024-01-05' });
    expect(computeYearHeatmap([trip], 2025)).toEqual([]);
  });
});

describe('assignTripColors', () => {
  it('assigns colors in chronological order by startDate, not input order', () => {
    const tripA = makeTrip({ id: 'trip-a', startDate: '2025-06-01' });
    const tripB = makeTrip({ id: 'trip-b', startDate: '2025-01-01' });
    const colors = assignTripColors([tripA, tripB]);
    expect(colors.get('trip-b')).toBe('var(--color-trip-1)');
    expect(colors.get('trip-a')).toBe('var(--color-trip-2)');
  });

  it('cycles the palette once trips outnumber the 5 palette entries', () => {
    const trips = Array.from({ length: 6 }, (_, i) =>
      makeTrip({ id: `trip-${i}`, startDate: `2025-0${i + 1}-01` })
    );
    const colors = assignTripColors(trips);
    expect(colors.get('trip-0')).toBe('var(--color-trip-1)');
    expect(colors.get('trip-5')).toBe('var(--color-trip-1)');
  });
});

describe('buildYearWeeks', () => {
  it('pads the first week so days align to their weekday column', () => {
    const weeks = buildYearWeeks(2025);
    expect(weeks[0]).toEqual([null, null, null, '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04']);
  });

  it('produces 53 week columns for 2025 and pads the last week', () => {
    const weeks = buildYearWeeks(2025);
    expect(weeks).toHaveLength(53);
    const lastWeek = weeks[52];
    expect(lastWeek[3]).toBe('2025-12-31');
    expect(lastWeek[4]).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/travelCalendar.test.ts`
Expected: FAIL with "Cannot find module './travelCalendar'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/travelCalendar.ts`:

```ts
import type { Trip } from './types';

export interface TravelDay {
  date: string;
  tripId: string;
}

const TRIP_COLOR_PALETTE = [
  'var(--color-trip-1)',
  'var(--color-trip-2)',
  'var(--color-trip-3)',
  'var(--color-trip-4)',
  'var(--color-trip-5)'
];

export function computeYearHeatmap(trips: Trip[], year: number): TravelDay[] {
  const days: TravelDay[] = [];
  for (const trip of trips) {
    const start = new Date(trip.startDate);
    const end = new Date(trip.endDate);
    for (
      let d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
      d <= end;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      if (d.getUTCFullYear() === year) {
        days.push({ date: d.toISOString().slice(0, 10), tripId: trip.id });
      }
    }
  }
  return days.sort((a, b) => a.date.localeCompare(b.date));
}

export function assignTripColors(trips: Trip[]): Map<string, string> {
  const sorted = [...trips].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const colors = new Map<string, string>();
  sorted.forEach((trip, index) => {
    colors.set(trip.id, TRIP_COLOR_PALETTE[index % TRIP_COLOR_PALETTE.length]);
  });
  return colors;
}

export function buildYearWeeks(year: number): (string | null)[][] {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const dec31 = new Date(Date.UTC(year, 11, 31));
  const startPad = jan1.getUTCDay();
  const weeks: (string | null)[][] = [];
  let week: (string | null)[] = new Array(startPad).fill(null);
  for (let d = new Date(jan1); d <= dec31; d.setUTCDate(d.getUTCDate() + 1)) {
    week.push(d.toISOString().slice(0, 10));
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/travelCalendar.test.ts`
Expected: PASS (9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/travelCalendar.ts src/lib/travelCalendar.test.ts
git commit -m "feat: add travelCalendar module for yearly heatmap data"
```

---

### Task 2: Trip-color CSS variables + `CalendarHeatmap.svelte`

**Files:**
- Modify: `src/app.css`
- Create: `src/lib/components/CalendarHeatmap.svelte`

**Interfaces:**
- Consumes: `buildYearWeeks`, `computeYearHeatmap`, `assignTripColors` from `$lib/travelCalendar` (Task 1); `Trip` from `$lib/types`; CSS vars `--color-trip-1`..`--color-trip-5` (added in Step 1 below), `--color-card-border`, `--color-ink-soft` (existing).
- Produces: `CalendarHeatmap.svelte` with props `{ trips: Trip[]; year: number }` — a self-contained grid+legend component consumed by the `/calendar` page in Task 3.

- [ ] **Step 1: Add five trip-color CSS variables to the base theme block**

In `src/app.css`, the base `@theme` block ends with the semantic colors followed by the Type comment. Replace:

```css
  --color-danger: oklch(48% 0.19 25);
  --color-danger-hover: oklch(42% 0.19 25);
  --color-danger-soft: oklch(93% 0.045 25);
  --color-success: oklch(58% 0.13 150);
  --color-success-soft: oklch(93% 0.04 150);

  /* Type: one display serif for headings (journal/passport character),
```

with:

```css
  --color-danger: oklch(48% 0.19 25);
  --color-danger-hover: oklch(42% 0.19 25);
  --color-danger-soft: oklch(93% 0.045 25);
  --color-success: oklch(58% 0.13 150);
  --color-success-soft: oklch(93% 0.04 150);

  /* Trip palette: distinct hues for the travel calendar heatmap, kept
     separate from --color-accent/--color-teal (primary UI accents) and
     --color-danger/--color-success (semantic red/green). */
  --color-trip-1: oklch(55% 0.16 300);
  --color-trip-2: oklch(65% 0.15 85);
  --color-trip-3: oklch(58% 0.18 340);
  --color-trip-4: oklch(55% 0.12 235);
  --color-trip-5: oklch(55% 0.13 130);

  /* Type: one display serif for headings (journal/passport character),
```

- [ ] **Step 2: Add the same five variables to the `travel-journal` preset**

Replace:

```css
  --color-danger: oklch(48% 0.19 25);
  --color-danger-hover: oklch(42% 0.19 25);
  --color-danger-soft: oklch(93% 0.045 25);
  --color-success: oklch(58% 0.13 150);
  --color-success-soft: oklch(93% 0.04 150);
}

:root[data-theme='explorer-night'] {
```

with:

```css
  --color-danger: oklch(48% 0.19 25);
  --color-danger-hover: oklch(42% 0.19 25);
  --color-danger-soft: oklch(93% 0.045 25);
  --color-success: oklch(58% 0.13 150);
  --color-success-soft: oklch(93% 0.04 150);
  --color-trip-1: oklch(55% 0.16 300);
  --color-trip-2: oklch(65% 0.15 85);
  --color-trip-3: oklch(58% 0.18 340);
  --color-trip-4: oklch(55% 0.12 235);
  --color-trip-5: oklch(55% 0.13 130);
}

:root[data-theme='explorer-night'] {
```

- [ ] **Step 3: Add the (lighter) five variables to the `explorer-night` preset**

Replace:

```css
  --color-danger: oklch(65% 0.17 25);
  --color-danger-hover: oklch(59% 0.17 25);
  --color-danger-soft: oklch(30% 0.07 25);
  --color-success: oklch(68% 0.13 150);
  --color-success-soft: oklch(28% 0.06 150);
}

:root[data-theme='golden-sunset'] {
```

with:

```css
  --color-danger: oklch(65% 0.17 25);
  --color-danger-hover: oklch(59% 0.17 25);
  --color-danger-soft: oklch(30% 0.07 25);
  --color-success: oklch(68% 0.13 150);
  --color-success-soft: oklch(28% 0.06 150);
  --color-trip-1: oklch(70% 0.14 300);
  --color-trip-2: oklch(75% 0.13 85);
  --color-trip-3: oklch(72% 0.16 340);
  --color-trip-4: oklch(68% 0.11 235);
  --color-trip-5: oklch(68% 0.12 130);
}

:root[data-theme='golden-sunset'] {
```

- [ ] **Step 4: Add the five variables to the `golden-sunset` preset**

Replace:

```css
  --color-danger: oklch(46% 0.19 25);
  --color-danger-hover: oklch(40% 0.19 25);
  --color-danger-soft: oklch(90% 0.05 25);
  --color-success: oklch(56% 0.13 150);
  --color-success-soft: oklch(90% 0.045 150);
}

:root[data-theme='polar-morning'] {
```

with:

```css
  --color-danger: oklch(46% 0.19 25);
  --color-danger-hover: oklch(40% 0.19 25);
  --color-danger-soft: oklch(90% 0.05 25);
  --color-success: oklch(56% 0.13 150);
  --color-success-soft: oklch(90% 0.045 150);
  --color-trip-1: oklch(56% 0.17 300);
  --color-trip-2: oklch(66% 0.16 85);
  --color-trip-3: oklch(58% 0.19 340);
  --color-trip-4: oklch(54% 0.13 235);
  --color-trip-5: oklch(54% 0.14 130);
}

:root[data-theme='polar-morning'] {
```

- [ ] **Step 5: Add the five variables to the `polar-morning` preset**

Replace:

```css
  --color-danger: oklch(47% 0.18 25);
  --color-danger-hover: oklch(41% 0.18 25);
  --color-danger-soft: oklch(91% 0.045 25);
  --color-success: oklch(57% 0.12 150);
  --color-success-soft: oklch(91% 0.04 150);
}

@layer base {
```

with:

```css
  --color-danger: oklch(47% 0.18 25);
  --color-danger-hover: oklch(41% 0.18 25);
  --color-danger-soft: oklch(91% 0.045 25);
  --color-success: oklch(57% 0.12 150);
  --color-success-soft: oklch(91% 0.04 150);
  --color-trip-1: oklch(54% 0.15 300);
  --color-trip-2: oklch(64% 0.14 85);
  --color-trip-3: oklch(56% 0.17 340);
  --color-trip-4: oklch(52% 0.11 235);
  --color-trip-5: oklch(52% 0.12 130);
}

@layer base {
```

- [ ] **Step 6: Create the component**

Create `src/lib/components/CalendarHeatmap.svelte`:

```svelte
<script lang="ts">
  import { buildYearWeeks, computeYearHeatmap, assignTripColors } from '$lib/travelCalendar';
  import type { Trip } from '$lib/types';

  let { trips, year }: { trips: Trip[]; year: number } = $props();

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  let weeks = $derived(buildYearWeeks(year));
  let heatmapDays = $derived(computeYearHeatmap(trips, year));
  let tripColors = $derived(assignTripColors(trips));
  let dayTripMap = $derived(new Map(heatmapDays.map((day) => [day.date, day.tripId])));
  let tripsById = $derived(new Map(trips.map((trip) => [trip.id, trip])));
  let legendTrips = $derived.by(() => {
    const visibleIds = new Set(heatmapDays.map((day) => day.tripId));
    return trips.filter((trip) => visibleIds.has(trip.id));
  });

  function monthLabelForWeek(weekIndex: number): string {
    const week = weeks[weekIndex];
    const firstDate = week.find((date) => date !== null);
    if (!firstDate) return '';
    const day = Number(firstDate.slice(8, 10));
    if (day > 7) return '';
    return MONTH_LABELS[Number(firstDate.slice(5, 7)) - 1];
  }
</script>

<div class="overflow-x-auto">
  <div class="inline-flex gap-2">
    <div class="flex flex-col gap-1 pt-5 text-xs text-[var(--color-ink-soft)]">
      {#each DAY_LABELS as label (label)}
        <span class="h-3 leading-3">{label}</span>
      {/each}
    </div>
    <div class="flex flex-col">
      <div class="flex gap-1 text-xs text-[var(--color-ink-soft)]">
        {#each weeks as _, weekIndex (weekIndex)}
          <span class="w-3">{monthLabelForWeek(weekIndex)}</span>
        {/each}
      </div>
      <div class="mt-1 flex gap-1">
        {#each weeks as week, weekIndex (weekIndex)}
          <div class="flex flex-col gap-1">
            {#each week as date, dayIndex (dayIndex)}
              {@const tripId = date ? dayTripMap.get(date) : undefined}
              <div
                class="h-3 w-3 rounded-sm {date && !tripId ? 'bg-[var(--color-card-border)]' : ''}"
                style={tripId ? `background-color: ${tripColors.get(tripId)}` : undefined}
                title={date && tripId ? `${tripsById.get(tripId)?.name} · ${date}` : undefined}
              ></div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  {#if legendTrips.length > 0}
    <div class="mt-4 flex flex-wrap gap-3">
      {#each legendTrips as trip (trip.id)}
        <div class="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)]">
          <span class="h-3 w-3 rounded-sm" style={`background-color: ${tripColors.get(trip.id)}`}></span>
          {trip.name}
        </div>
      {/each}
    </div>
  {/if}
</div>
```

- [ ] **Step 7: Run the full test suite to confirm nothing broke**

Run: `npx vitest run`
Expected: PASS (all existing tests plus Task 1's 9 new tests)

- [ ] **Step 8: Commit**

```bash
git add src/app.css src/lib/components/CalendarHeatmap.svelte
git commit -m "feat: add trip-color CSS palette and CalendarHeatmap component"
```

---

### Task 3: `/calendar` page + nav link

**Files:**
- Create: `src/routes/calendar/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `listTrips` from `$lib/storage/storage`; `getAvailableYears` from `$lib/yearInReview`; `CalendarHeatmap` from `$lib/components/CalendarHeatmap.svelte` (Task 2); `Skeleton` from `$lib/components/Skeleton.svelte`.
- Produces: the `/calendar` route and its nav entry — nothing downstream depends on this task.

- [ ] **Step 1: Create the page**

Create `src/routes/calendar/+page.svelte`:

```svelte
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
```

- [ ] **Step 2: Add the nav link**

In `src/routes/+layout.svelte`, replace:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' }
  ];
```

with:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' }
  ];
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests, matching this project's convention of manual browser verification for page-level CRUD/view UI)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, navigate to `/calendar`, and confirm:
- With no trips: empty state renders with a "Log a trip" link back to `/`.
- With trips: the grid renders for the most recent year with data, travel days are colored, non-travel days show the muted `--color-card-border` square.
- Hovering a colored day shows a tooltip reading `"{trip name} · {date}"`.
- The legend below the grid lists only trips visible in the current year, each with a color swatch matching the grid.
- Prev/Next buttons move between years; a trip's color stays the same across years.
- The nav bar shows "Calendar" between "Timeline" and "Packing", and it highlights as active on `/calendar`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/calendar/+page.svelte src/routes/+layout.svelte
git commit -m "feat: add /calendar page with year navigation and nav link"
```
