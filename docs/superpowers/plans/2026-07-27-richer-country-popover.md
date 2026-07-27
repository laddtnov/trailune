# Richer Country Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The map's hover/tap country popover shows longest stay and a first/last visit year range instead of a single month-precision "last visit" date.

**Architecture:** `countryStats.ts`'s `CountryStats` interface and `getCountryStats` gain `longestStayDays`, `firstVisitYear`, `lastVisitYear` in place of `lastVisitDate`. `CountryPopover.svelte`'s markup is updated to render the new fields, collapsing the year range to a single year when a country's visits all fall in one calendar year.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No new CSS custom properties, no new props on `WorldMap.svelte`, no changes to `src/routes/map/+page.svelte` — it already passes through whatever shape `getCountryStats` returns (spec: Architecture, Data flow).
- No "progress-style visual" and no naming which specific trip produced the longest stay — duration only (spec: Non-goals).
- `firstVisitYear`/`lastVisitYear` collapse to a single `Visited in {year}` line when equal; otherwise `First visited {year} · Last visited {year}` (spec: Goals, Edge cases).
- `lastVisitDate` is removed from `CountryStats` entirely, along with its only consumer, `CountryPopover.svelte`'s `formatLastVisit` helper (spec: Architecture).

---

### Task 1: `countryStats.ts` — longest stay and visit-year range

**Files:**
- Modify: `src/lib/countryStats.ts`
- Modify: `src/lib/countryStats.test.ts`

**Interfaces:**
- Consumes: `Trip`, `daysInTrip` (both already defined in this file — `daysInTrip` is unchanged).
- Produces: `export interface CountryStats { visitCount: number; totalDays: number; longestStayDays: number; firstVisitYear: number; lastVisitYear: number }` and `getCountryStats(code: string, trips: Trip[]): CountryStats | null` — consumed by Task 2's `CountryPopover.svelte`.

- [ ] **Step 1: Replace the existing tests with ones covering the new fields**

Replace the full contents of `src/lib/countryStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getCountryStats } from './countryStats';
import type { Trip } from '$lib/types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    countries: ['FR'],
    transportMode: 'flight',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('getCountryStats', () => {
  it('returns null for a country with no trips', () => {
    const trips = [makeTrip({ countries: ['FR'] })];
    expect(getCountryStats('DE', trips)).toBeNull();
  });

  it('counts a single trip: visitCount 1, inclusive day count, longest stay equals that trip, one visit year', () => {
    const trips = [makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 1,
      totalDays: 5,
      longestStayDays: 5,
      firstVisitYear: 2026,
      lastVisitYear: 2026
    });
  });

  it('sums days and counts visits across multiple trips to the same country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR', 'DE'], startDate: '2026-03-01', endDate: '2026-03-03' })
    ];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 2,
      totalDays: 8,
      longestStayDays: 5,
      firstVisitYear: 2026,
      lastVisitYear: 2026
    });
  });

  it('picks the maximum trip duration as longestStayDays regardless of trip order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-03-01', endDate: '2026-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-10' })
    ];
    expect(getCountryStats('FR', trips)?.longestStayDays).toBe(10);
  });

  it('returns the same value for firstVisitYear and lastVisitYear when all trips are in one year', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-06-01', endDate: '2026-06-03' })
    ];
    const stats = getCountryStats('FR', trips);
    expect(stats?.firstVisitYear).toBe(2026);
    expect(stats?.lastVisitYear).toBe(2026);
  });

  it('spans firstVisitYear and lastVisitYear across trips in different years, regardless of order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2027-03-01', endDate: '2027-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2022-01-01', endDate: '2022-01-05' })
    ];
    const stats = getCountryStats('FR', trips);
    expect(stats?.firstVisitYear).toBe(2022);
    expect(stats?.lastVisitYear).toBe(2027);
  });

  it('ignores trips that do not include the requested country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'] }),
      makeTrip({ id: 't2', countries: ['DE'] })
    ];
    expect(getCountryStats('FR', trips)?.visitCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/countryStats.test.ts`
Expected: FAIL — `getCountryStats` still returns the old shape (`lastVisitDate` instead of `longestStayDays`/`firstVisitYear`/`lastVisitYear`), so the `toEqual` assertions mismatch.

- [ ] **Step 3: Update the implementation**

Replace the full contents of `src/lib/countryStats.ts`:

```ts
import type { Trip } from '$lib/types';

export interface CountryStats {
  visitCount: number;
  totalDays: number;
  longestStayDays: number;
  firstVisitYear: number;
  lastVisitYear: number;
}

export function daysInTrip(trip: Trip): number {
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getCountryStats(code: string, trips: Trip[]): CountryStats | null {
  const matching = trips.filter((trip) => trip.countries.includes(code));
  if (matching.length === 0) return null;

  const totalDays = matching.reduce((sum, trip) => sum + daysInTrip(trip), 0);
  const longestStayDays = Math.max(...matching.map((trip) => daysInTrip(trip)));
  const visitYears = matching.map((trip) => new Date(trip.startDate).getFullYear());
  const firstVisitYear = Math.min(...visitYears);
  const lastVisitYear = Math.max(...visitYears);

  return { visitCount: matching.length, totalDays, longestStayDays, firstVisitYear, lastVisitYear };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/countryStats.test.ts`
Expected: PASS (7/7 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/countryStats.ts src/lib/countryStats.test.ts
git commit -m "feat: add longest stay and visit-year range to country stats"
```

---

### Task 2: `CountryPopover.svelte` — render the new stats

**Files:**
- Modify: `src/lib/components/CountryPopover.svelte`

**Interfaces:**
- Consumes: `CountryStats` from `$lib/countryStats` (Task 1) — specifically `visitCount`, `totalDays`, `longestStayDays`, `firstVisitYear`, `lastVisitYear`.
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Replace the popover's stats markup and remove the now-unused date formatter**

In `src/lib/components/CountryPopover.svelte`, replace:

```svelte
<script lang="ts">
  import type { CountryStats } from '$lib/countryStats';

  let {
    countryName,
    stats,
    x,
    y,
    onviewtrips
  }: {
    countryName: string;
    stats: CountryStats;
    x: number;
    y: number;
    onviewtrips?: () => void;
  } = $props();

  function formatLastVisit(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
</script>

<div
  class="country-popover"
  style={`left: ${x}px; top: ${y}px;`}
  role="status"
>
  <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">Visited</p>
  <h3 class="mt-0.5 font-display text-base font-bold">{countryName}</h3>
  <p class="mt-1 text-sm text-[var(--color-ink-soft)]">
    {stats.visitCount}
    {stats.visitCount === 1 ? 'trip' : 'trips'} &middot; {stats.totalDays}
    {stats.totalDays === 1 ? 'day' : 'days'} &middot; Last visit {formatLastVisit(stats.lastVisitDate)}
  </p>
  {#if onviewtrips}
    <button
      type="button"
      class="mt-2 text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
      onclick={onviewtrips}
    >
      View trips &rarr;
    </button>
  {/if}
</div>
```

with:

```svelte
<script lang="ts">
  import type { CountryStats } from '$lib/countryStats';

  let {
    countryName,
    stats,
    x,
    y,
    onviewtrips
  }: {
    countryName: string;
    stats: CountryStats;
    x: number;
    y: number;
    onviewtrips?: () => void;
  } = $props();
</script>

<div
  class="country-popover"
  style={`left: ${x}px; top: ${y}px;`}
  role="status"
>
  <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">Visited</p>
  <h3 class="mt-0.5 font-display text-base font-bold">{countryName}</h3>
  <p class="mt-1 text-sm text-[var(--color-ink-soft)]">
    {stats.visitCount}
    {stats.visitCount === 1 ? 'trip' : 'trips'} &middot; {stats.totalDays}
    {stats.totalDays === 1 ? 'day' : 'days'} &middot; Longest stay {stats.longestStayDays}
    {stats.longestStayDays === 1 ? 'day' : 'days'}
  </p>
  <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">
    {#if stats.firstVisitYear === stats.lastVisitYear}
      Visited in {stats.firstVisitYear}
    {:else}
      First visited {stats.firstVisitYear} &middot; Last visited {stats.lastVisitYear}
    {/if}
  </p>
  {#if onviewtrips}
    <button
      type="button"
      class="mt-2 text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
      onclick={onviewtrips}
    >
      View trips &rarr;
    </button>
  {/if}
</div>
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; `CountryPopover.svelte` is manually verified per this project's established convention)

- [ ] **Step 3: Manually verify in the browser**

Start the dev server, go to `/map`, and confirm (seed `localStorage` trip data covering a single-visit country and a multi-year multi-visit country if none already exists):
- A country visited on trips all within one calendar year shows `Visited in {year}`.
- A country with trips spanning multiple years shows `First visited {earliest} · Last visited {latest}`.
- The main stats line correctly shows `Longest stay {N} days`, matching that country's actual longest trip.
- Singular/plural wording is correct at every count (`1 trip`/`2 trips`, `1 day`/`2 days`) for both the totals and the longest-stay figure.
- "View trips →" still opens the click-to-open panel exactly as before.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/CountryPopover.svelte
git commit -m "feat: show longest stay and visit-year range in country popover"
```
