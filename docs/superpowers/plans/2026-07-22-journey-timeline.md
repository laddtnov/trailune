# Journey Timeline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `/timeline` page — a vertical, year-grouped view of all trips showing country, season, and duration for each — closing out the second slice of `docs/ROADMAP.md` §3.

**Architecture:** A pure derivation module (`journeyTimeline.ts`) computes year-grouping, season labels, and flag emoji from existing `Trip` data. A new route (`src/routes/timeline/+page.svelte`) consumes it and renders a responsive timeline: a centered alternating spine at ≥640px, collapsing to a single left-aligned rail below that, using one shared DOM structure switched via a CSS media query (not two separate templates).

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest, Tailwind CSS v4 (plus scoped component `<style>` for the timeline rail/spine layout, matching this project's existing pattern for layout too complex for utility classes alone — see `AmbientBackground.svelte`).

## Global Constraints

- No changes to `Trip` or any other existing type in `src/lib/types.ts` — this feature is pure re-presentation.
- No click-through from a timeline entry to its trip hub in this cycle (v1 is read-only, no `<a href>` on entry cards).
- Seasons are a fixed Northern-hemisphere month lookup (Dec-Feb Winter, Mar-May Spring, Jun-Aug Summer, Sep-Nov Fall) — no hemisphere awareness, no per-country logic.
- No new storage functions — reuse the existing `listTrips()` and `loadWorldCountries()` exactly as the home page (`src/routes/+page.svelte`) already does.
- Years are grouped most-recent-first; trips within a year are ordered most-recent-`startDate`-first.
- For a multi-country trip, all countries are listed on its entry (not just the first).
- The alternating-spine (≥640px) and single-rail (<640px) layouts must be the same markup and data, switched by a CSS breakpoint — not two separate component trees or duplicated logic.

---

### Task 1: `journeyTimeline.ts` derivation module

**Files:**
- Create: `src/lib/journeyTimeline.ts`
- Test: `src/lib/journeyTimeline.test.ts`

**Interfaces:**
- Consumes: `Trip` from `src/lib/types.ts` (existing, unchanged).
- Produces: `getSeasonLabel(dateIso: string): Season` (`Season = 'Winter' | 'Spring' | 'Summer' | 'Fall'`), `groupTripsByYear(trips: Trip[]): TimelineYearGroup[]` (`TimelineYearGroup = { year: number; trips: Trip[] }`), and `countryCodeToFlag(code: string): string` — all consumed by Task 2's page component.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/journeyTimeline.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getSeasonLabel, groupTripsByYear, countryCodeToFlag } from './journeyTimeline';
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

describe('getSeasonLabel', () => {
  it('returns Winter for December, January, and February', () => {
    expect(getSeasonLabel('2025-12-15')).toBe('Winter');
    expect(getSeasonLabel('2025-01-15')).toBe('Winter');
    expect(getSeasonLabel('2025-02-15')).toBe('Winter');
  });

  it('returns Spring for March through May', () => {
    expect(getSeasonLabel('2025-03-01')).toBe('Spring');
    expect(getSeasonLabel('2025-05-31')).toBe('Spring');
  });

  it('returns Summer for June through August', () => {
    expect(getSeasonLabel('2025-06-01')).toBe('Summer');
    expect(getSeasonLabel('2025-08-31')).toBe('Summer');
  });

  it('returns Fall for September through November', () => {
    expect(getSeasonLabel('2025-09-01')).toBe('Fall');
    expect(getSeasonLabel('2025-11-30')).toBe('Fall');
  });
});

describe('groupTripsByYear', () => {
  it('groups trips by year parsed from startDate', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-03-01' }),
      makeTrip({ id: '2', startDate: '2025-06-01' }),
      makeTrip({ id: '3', startDate: '2024-01-01' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups).toHaveLength(2);
    expect(groups[0].year).toBe(2025);
    expect(groups[0].trips).toHaveLength(2);
    expect(groups[1].year).toBe(2024);
    expect(groups[1].trips).toHaveLength(1);
  });

  it('orders years with the most recent first', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2023-01-01' }),
      makeTrip({ id: '2', startDate: '2026-01-01' }),
      makeTrip({ id: '3', startDate: '2024-01-01' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups.map((g) => g.year)).toEqual([2026, 2024, 2023]);
  });

  it('orders trips within a year with the most recent startDate first', () => {
    const trips = [
      makeTrip({ id: '1', startDate: '2025-01-10' }),
      makeTrip({ id: '2', startDate: '2025-08-05' }),
      makeTrip({ id: '3', startDate: '2025-04-20' })
    ];
    const groups = groupTripsByYear(trips);
    expect(groups[0].trips.map((t) => t.id)).toEqual(['2', '3', '1']);
  });

  it('returns an empty array when there are no trips', () => {
    expect(groupTripsByYear([])).toEqual([]);
  });
});

describe('countryCodeToFlag', () => {
  it('converts a 2-letter ISO code into its flag emoji', () => {
    expect(countryCodeToFlag('JP')).toBe('🇯🇵');
    expect(countryCodeToFlag('us')).toBe('🇺🇸');
  });

  it('returns an empty string for a code that is not 2 letters', () => {
    expect(countryCodeToFlag('XYZ')).toBe('');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- journeyTimeline.test.ts`
Expected: FAIL — `src/lib/journeyTimeline.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/journeyTimeline.ts`:

```ts
import type { Trip } from '$lib/types';

export type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall';

export interface TimelineYearGroup {
  year: number;
  trips: Trip[];
}

function tripYear(trip: Trip): number {
  return Number(trip.startDate.slice(0, 4));
}

export function getSeasonLabel(dateIso: string): Season {
  const month = Number(dateIso.slice(5, 7));
  if (month === 12 || month <= 2) return 'Winter';
  if (month <= 5) return 'Spring';
  if (month <= 8) return 'Summer';
  return 'Fall';
}

export function groupTripsByYear(trips: Trip[]): TimelineYearGroup[] {
  const byYear = new Map<number, Trip[]>();
  for (const trip of trips) {
    const year = tripYear(trip);
    const existing = byYear.get(year);
    if (existing) {
      existing.push(trip);
    } else {
      byYear.set(year, [trip]);
    }
  }
  const years = [...byYear.keys()].sort((a, b) => b - a);
  return years.map((year) => ({
    year,
    trips: byYear.get(year)!.sort((a, b) => b.startDate.localeCompare(a.startDate))
  }));
}

export function countryCodeToFlag(code: string): string {
  if (code.length !== 2) return '';
  const codePoints = [...code.toUpperCase()].map((char) => 0x1f1e6 + (char.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}
```

`countryCodeToFlag` converts each of the two ISO letters into a Unicode regional indicator symbol (`0x1F1E6` is the offset for 'A'); combining two of them is how flag emoji are composed — no image assets or new data needed.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- journeyTimeline.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/journeyTimeline.ts src/lib/journeyTimeline.test.ts
git commit -m "feat: add journey timeline derivation module"
```

---

### Task 2: `/timeline` page and nav link

**Files:**
- Create: `src/routes/timeline/+page.svelte`
- Modify: `src/routes/+layout.svelte:14-20`

**Interfaces:**
- Consumes: `getSeasonLabel`, `groupTripsByYear`, `countryCodeToFlag`, and `TimelineYearGroup` from Task 1's `src/lib/journeyTimeline.ts`; `listTrips` from `$lib/storage/storage` (existing); `loadWorldCountries`, `CountryInfo` from `$lib/countries` (existing); `daysInTrip` from `$lib/countryStats` (existing).
- Produces: nothing consumed by other tasks — this is the final task in this plan.

- [ ] **Step 1: Create the `/timeline` page**

Create `src/routes/timeline/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { groupTripsByYear, getSeasonLabel, countryCodeToFlag } from '$lib/journeyTimeline';
  import { daysInTrip } from '$lib/countryStats';
  import type { Trip } from '$lib/types';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let loading = $state(true);

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
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Journey timeline</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Every trip you've logged, year by year.</p>
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
{:else}
  <div class="mt-8">
    {#each yearGroups as group (group.year)}
      <h2 class="mt-10 text-left font-display text-2xl font-bold first:mt-0 sm:text-center">{group.year}</h2>
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
```

Note: entry cards are plain `<div>`s, not `<a>` links — matching the plan's non-goal that this cycle is read-only, no click-through to the trip hub.

Note: the `.timeline-entry`/`.timeline-rail`/`.timeline-dot` CSS is the single shared structure behind both responsive layouts — the base (mobile) rules position everything in a left-aligned rail; the `@media (min-width: 640px)` block repositions the same elements into the alternating centered spine, without any duplicated markup or JS-driven breakpoint logic.

- [ ] **Step 2: Add the nav link**

In `src/routes/+layout.svelte`, change:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' }
  ];
```

to:

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

The existing `isActive(href)` function already handles this correctly with no changes — it does an exact match for `/` and a `startsWith` check for every other route, and `/timeline` doesn't share a prefix with any existing route.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass — this task adds no new test file (the page has no pure logic beyond what Task 1 already tests; matches this project's convention for presentational route components).

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. With at least 3-4 trips across at least two different years (including at least one multi-country trip) already in the app, open `/timeline`. Confirm the nav bar shows a "Timeline" item between Map and Packing, and that clicking it navigates here.
2. At a desktop width (≥640px), confirm trips alternate left/right of a centered vertical spine, with year headings centered above each year's group.
3. Resize the browser below 640px width. Confirm the layout collapses to a single left-aligned rail with all entries in one column, and year headings left-aligned.
4. Confirm each entry shows: all countries with flag emoji and name (for a multi-country trip, confirm all countries appear, not just the first), a season badge, the date range, and duration in days.
5. Temporarily clear all trips (or test in a fresh browser profile) and confirm the "No trips yet" empty state renders correctly.
6. Switch through all four theme presets on `/settings` and revisit `/timeline`. Confirm the rail, dots, and season badge colors read correctly against each theme's card/canvas colors.

- [ ] **Step 5: Commit**

```bash
git add src/routes/timeline/+page.svelte src/routes/+layout.svelte
git commit -m "feat: add journey timeline page and nav link"
```

---

## Self-Review Notes

- **Spec coverage:** year-grouping with most-recent-first ordering (Task 1's `groupTripsByYear`), season derivation (Task 1's `getSeasonLabel`), country/flag display for multi-country trips (Task 2's `countryList`), duration via existing `daysInTrip` (Task 2), the responsive alternating-spine/single-rail layout via one shared markup structure (Task 2's CSS), the nav link (Task 2 Step 2), the empty state (Task 2), and the full manual test matrix from the spec's Testing section (Task 2 Step 4) are all covered. No spec requirement is left unmapped.
- **Placeholder scan:** no TBD/TODO; every step contains complete, final code.
- **Type consistency:** `TimelineYearGroup` (Task 1) is consumed identically in Task 2's `{#each yearGroups as group (group.year)}` and `group.trips`; `Season` return type of `getSeasonLabel` matches its only call site's usage (interpolated directly into the season badge, no further processing needed); `countryCodeToFlag(code: string): string` and `daysInTrip(trip: Trip): number` signatures match their call sites exactly.
