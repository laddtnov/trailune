# Home Dashboard & Stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the home page a warmer hero + quick stats strip, and add a new `/stats` page with a full metric breakdown — all derived from existing trip data, no schema changes.

**Architecture:** A static country→continent lookup (`continents.ts`), a single `computeTripStats` function that is the sole source of truth for every metric, a new `/stats` route, and small additive edits to the home page header and the nav.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, or any other existing type in `src/lib/types.ts`.
- `percentWorld` uses whole-percent rounding (`Math.round(...)`), matching the existing convention already used on `/map` — not a decimal.
- `computeTripStats([], countries)` must return a fully-populated object (all-zero/null fields), never `null` itself, so consumers never special-case "no data yet" in their data layer.
- The continent lookup (`continents.ts`) must have an entry for every one of the 211 country codes present in `static/world-map.svg` — verified by a coverage test, not by inspection.
- `daysInTrip` in `src/lib/countryStats.ts` must be exported (not reimplemented) and reused by `tripStats.ts`, so the day-count formula exists in exactly one place.

---

### Task 1: `continents.ts` — country→continent lookup

**Files:**
- Create: `src/lib/continents.ts`
- Test: `src/lib/continents.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by `tripStats.ts` in Task 3):
  ```ts
  export type Continent =
    | 'Africa' | 'Antarctica' | 'Asia' | 'Europe'
    | 'North America' | 'Oceania' | 'South America';
  export const CONTINENTS: readonly Continent[];
  export function getContinent(countryCode: string): Continent | null;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/continents.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getContinent, CONTINENTS } from './continents';
import { parseCountriesFromSvg } from './countries';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('getContinent', () => {
  it('resolves a spot-check of known country codes to the correct continent', () => {
    expect(getContinent('FR')).toBe('Europe');
    expect(getContinent('JP')).toBe('Asia');
    expect(getContinent('BR')).toBe('South America');
    expect(getContinent('US')).toBe('North America');
    expect(getContinent('AU')).toBe('Oceania');
    expect(getContinent('KE')).toBe('Africa');
  });

  it('returns null for a code with no lookup entry', () => {
    expect(getContinent('ZZ')).toBeNull();
  });

  it('lists exactly 7 continents', () => {
    expect(CONTINENTS).toHaveLength(7);
    expect(new Set(CONTINENTS).size).toBe(7);
  });

  it('has a lookup entry for every country code present in world-map.svg', () => {
    const svgText = readFileSync(resolve(__dirname, '../../static/world-map.svg'), 'utf8');
    const countries = parseCountriesFromSvg(svgText);
    const missing = countries.filter((c) => getContinent(c.code) === null);
    expect(missing.map((c) => c.code)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/continents.test.ts`
Expected: FAIL — `Cannot find module './continents'`.

- [ ] **Step 3: Implement `continents.ts`**

Create `src/lib/continents.ts`:

```ts
export type Continent =
  | 'Africa'
  | 'Antarctica'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America';

export const CONTINENTS: readonly Continent[] = [
  'Africa',
  'Antarctica',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America'
];

const COUNTRY_CONTINENT: Record<string, Continent> = {
  AD: 'Europe',
  AE: 'Asia',
  AF: 'Asia',
  AG: 'North America',
  AI: 'North America',
  AL: 'Europe',
  AM: 'Asia',
  AO: 'Africa',
  AR: 'South America',
  AT: 'Europe',
  AU: 'Oceania',
  AW: 'North America',
  AZ: 'Asia',
  BA: 'Europe',
  BB: 'North America',
  BD: 'Asia',
  BE: 'Europe',
  BF: 'Africa',
  BG: 'Europe',
  BI: 'Africa',
  BJ: 'Africa',
  BM: 'North America',
  BN: 'Asia',
  BO: 'South America',
  BR: 'South America',
  BS: 'North America',
  BT: 'Asia',
  BW: 'Africa',
  BY: 'Europe',
  BZ: 'North America',
  CA: 'North America',
  CD: 'Africa',
  CF: 'Africa',
  CG: 'Africa',
  CH: 'Europe',
  CI: 'Africa',
  CL: 'South America',
  CM: 'Africa',
  CN: 'Asia',
  CO: 'South America',
  CR: 'North America',
  CU: 'North America',
  CV: 'Africa',
  CW: 'North America',
  CY: 'Asia',
  CZ: 'Europe',
  DE: 'Europe',
  DJ: 'Africa',
  DK: 'Europe',
  DM: 'North America',
  DO: 'North America',
  DZ: 'Africa',
  EC: 'South America',
  EE: 'Europe',
  EG: 'Africa',
  EH: 'Africa',
  ER: 'Africa',
  ES: 'Europe',
  ET: 'Africa',
  FI: 'Europe',
  FJ: 'Oceania',
  FK: 'South America',
  FO: 'Europe',
  FR: 'Europe',
  GA: 'Africa',
  GB: 'Europe',
  GD: 'North America',
  GE: 'Asia',
  GF: 'South America',
  GH: 'Africa',
  GL: 'North America',
  GM: 'Africa',
  GN: 'Africa',
  GP: 'North America',
  GQ: 'Africa',
  GR: 'Europe',
  GT: 'North America',
  GW: 'Africa',
  GY: 'South America',
  HK: 'Asia',
  HN: 'North America',
  HR: 'Europe',
  HT: 'North America',
  HU: 'Europe',
  IC: 'Africa',
  ID: 'Asia',
  IE: 'Europe',
  IL: 'Asia',
  IN: 'Asia',
  IQ: 'Asia',
  IR: 'Asia',
  IS: 'Europe',
  IT: 'Europe',
  JM: 'North America',
  JO: 'Asia',
  JP: 'Asia',
  KE: 'Africa',
  KG: 'Asia',
  KH: 'Asia',
  KM: 'Africa',
  KN: 'North America',
  KP: 'Asia',
  KR: 'Asia',
  KW: 'Asia',
  KY: 'North America',
  KZ: 'Asia',
  LA: 'Asia',
  LB: 'Asia',
  LC: 'North America',
  LI: 'Europe',
  LK: 'Asia',
  LR: 'Africa',
  LS: 'Africa',
  LT: 'Europe',
  LU: 'Europe',
  LV: 'Europe',
  LY: 'Africa',
  MA: 'Africa',
  MD: 'Europe',
  ME: 'Europe',
  MG: 'Africa',
  MK: 'Europe',
  ML: 'Africa',
  MM: 'Asia',
  MN: 'Asia',
  MQ: 'North America',
  MR: 'Africa',
  MS: 'North America',
  MT: 'Europe',
  MU: 'Africa',
  MV: 'Asia',
  MW: 'Africa',
  MX: 'North America',
  MY: 'Asia',
  MZ: 'Africa',
  NA: 'Africa',
  NC: 'Oceania',
  NE: 'Africa',
  NG: 'Africa',
  NI: 'North America',
  NL: 'Europe',
  NO: 'Europe',
  NP: 'Asia',
  NR: 'Oceania',
  NZ: 'Oceania',
  OM: 'Asia',
  PA: 'North America',
  PE: 'South America',
  PF: 'Oceania',
  PG: 'Oceania',
  PH: 'Asia',
  PK: 'Asia',
  PL: 'Europe',
  PN: 'Oceania',
  PR: 'North America',
  PS: 'Asia',
  PT: 'Europe',
  PY: 'South America',
  QA: 'Asia',
  RE: 'Africa',
  RO: 'Europe',
  RS: 'Europe',
  RU: 'Europe',
  RW: 'Africa',
  SA: 'Asia',
  SB: 'Oceania',
  SC: 'Africa',
  SD: 'Africa',
  SE: 'Europe',
  SG: 'Asia',
  SI: 'Europe',
  SK: 'Europe',
  SL: 'Africa',
  SN: 'Africa',
  SO: 'Africa',
  SR: 'South America',
  SS: 'Africa',
  ST: 'Africa',
  SV: 'North America',
  SX: 'North America',
  SY: 'Asia',
  SZ: 'Africa',
  TC: 'North America',
  TD: 'Africa',
  TG: 'Africa',
  TH: 'Asia',
  TJ: 'Asia',
  TL: 'Asia',
  TM: 'Asia',
  TN: 'Africa',
  TO: 'Oceania',
  TR: 'Asia',
  TT: 'North America',
  TW: 'Asia',
  TZ: 'Africa',
  UA: 'Europe',
  UG: 'Africa',
  US: 'North America',
  UY: 'South America',
  UZ: 'Asia',
  VC: 'North America',
  VE: 'South America',
  VG: 'North America',
  VI: 'North America',
  VN: 'Asia',
  VU: 'Oceania',
  YE: 'Asia',
  YT: 'Africa',
  ZA: 'Africa',
  ZM: 'Africa',
  ZW: 'Africa'
};

export function getContinent(countryCode: string): Continent | null {
  return COUNTRY_CONTINENT[countryCode] ?? null;
}
```

This table was generated and cross-checked against every country code in `static/world-map.svg` (211 codes, exact match, no gaps) before being written into this plan — do not add, remove, or re-derive entries.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/continents.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/continents.ts src/lib/continents.test.ts
git commit -m "feat: add country-to-continent lookup table"
```

---

### Task 2: Export `daysInTrip` from `countryStats.ts`

**Files:**
- Modify: `src/lib/countryStats.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces (used by `tripStats.ts` in Task 3):
  ```ts
  export function daysInTrip(trip: Trip): number
  ```
  (identical implementation to what's already there — only the `export` keyword is added).

- [ ] **Step 1: Add the `export` keyword**

In `src/lib/countryStats.ts`, change:

```ts
function daysInTrip(trip: Trip): number {
```

to:

```ts
export function daysInTrip(trip: Trip): number {
```

No other change to this file. The function body, `CountryStats` interface, and `getCountryStats` are untouched.

- [ ] **Step 2: Run the existing test suite to confirm no regression**

Run: `npx vitest run src/lib/countryStats.test.ts`
Expected: PASS (5 tests, unchanged — this is a pure visibility change, not a behavior change).

- [ ] **Step 3: Commit**

```bash
git add src/lib/countryStats.ts
git commit -m "feat: export daysInTrip so tripStats.ts can reuse it"
```

---

### Task 3: `tripStats.ts` — the single source of truth for all metrics

**Files:**
- Create: `src/lib/tripStats.ts`
- Test: `src/lib/tripStats.test.ts`

**Interfaces:**
- Consumes:
  - `daysInTrip` from `src/lib/countryStats.ts` (Task 2)
  - `getContinent` from `src/lib/continents.ts` (Task 1)
  - `Trip` from `src/lib/types.ts`
  - `CountryInfo` from `src/lib/countries.ts`
- Produces (used by `/stats` in Task 4 and the home page in Task 5):
  ```ts
  export interface TripStats {
    totalCountries: number;
    percentWorld: number;
    totalContinents: number;
    totalTrips: number;
    totalFlights: number;
    totalDays: number;
    longestTrip: { name: string; days: number } | null;
    averageTripDays: number;
  }
  export function computeTripStats(trips: Trip[], countries: CountryInfo[]): TripStats
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tripStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeTripStats } from './tripStats';
import type { Trip } from '$lib/types';
import type { CountryInfo } from '$lib/countries';

const countries: CountryInfo[] = Array.from({ length: 211 }, (_, i) => ({
  code: `C${i}`,
  name: `Country ${i}`
}));

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

describe('computeTripStats', () => {
  it('returns an all-zero/null shape for zero trips', () => {
    expect(computeTripStats([], countries)).toEqual({
      totalCountries: 0,
      percentWorld: 0,
      totalContinents: 0,
      totalTrips: 0,
      totalFlights: 0,
      totalDays: 0,
      longestTrip: null,
      averageTripDays: 0
    });
  });

  it('computes all fields for a single trip', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Japan Trip', countries: ['JP'], startDate: '2026-01-01', endDate: '2026-01-05', transportMode: 'flight' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalCountries).toBe(1);
    expect(stats.totalContinents).toBe(1);
    expect(stats.totalTrips).toBe(1);
    expect(stats.totalFlights).toBe(1);
    expect(stats.totalDays).toBe(5);
    expect(stats.longestTrip).toEqual({ name: 'Japan Trip', days: 5 });
    expect(stats.averageTripDays).toBe(5);
  });

  it('sums countries/continents/days across multiple trips and counts non-flight modes correctly', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Japan Trip', countries: ['JP'], startDate: '2026-01-01', endDate: '2026-01-05', transportMode: 'flight' }),
      makeTrip({ id: 't2', name: 'France Trip', countries: ['FR', 'DE'], startDate: '2026-03-01', endDate: '2026-03-03', transportMode: 'train' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalCountries).toBe(3);
    expect(stats.totalContinents).toBe(2);
    expect(stats.totalTrips).toBe(2);
    expect(stats.totalFlights).toBe(1);
    expect(stats.totalDays).toBe(5 + 3);
  });

  it('picks the trip with the largest day count as longestTrip', () => {
    const trips = [
      makeTrip({ id: 't1', name: 'Short Trip', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-02' }),
      makeTrip({ id: 't2', name: 'Long Trip', countries: ['DE'], startDate: '2026-02-01', endDate: '2026-02-14' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.longestTrip).toEqual({ name: 'Long Trip', days: 14 });
  });

  it('rounds averageTripDays to one decimal place', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-01' }),
      makeTrip({ id: 't2', countries: ['DE'], startDate: '2026-01-01', endDate: '2026-01-02' })
    ];
    const stats = computeTripStats(trips, countries);
    expect(stats.totalDays).toBe(1 + 2);
    expect(stats.averageTripDays).toBe(1.5);
  });

  it('rounds percentWorld to a whole percent', () => {
    const trips = [makeTrip({ countries: ['FR'] })];
    const stats = computeTripStats(trips, countries);
    expect(stats.percentWorld).toBe(Math.round((1 / 211) * 100));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/tripStats.test.ts`
Expected: FAIL — `Cannot find module './tripStats'`.

- [ ] **Step 3: Implement `tripStats.ts`**

Create `src/lib/tripStats.ts`:

```ts
import type { Trip } from '$lib/types';
import type { CountryInfo } from '$lib/countries';
import { daysInTrip } from '$lib/countryStats';
import { getContinent } from '$lib/continents';

export interface TripStats {
  totalCountries: number;
  percentWorld: number;
  totalContinents: number;
  totalTrips: number;
  totalFlights: number;
  totalDays: number;
  longestTrip: { name: string; days: number } | null;
  averageTripDays: number;
}

export function computeTripStats(trips: Trip[], countries: CountryInfo[]): TripStats {
  const visitedCodes = new Set(trips.flatMap((trip) => trip.countries));
  const totalCountries = visitedCodes.size;
  const percentWorld = countries.length > 0 ? Math.round((totalCountries / countries.length) * 100) : 0;

  const visitedContinents = new Set(
    [...visitedCodes].map((code) => getContinent(code)).filter((c): c is NonNullable<typeof c> => c !== null)
  );

  const totalTrips = trips.length;
  const totalFlights = trips.filter((trip) => trip.transportMode === 'flight').length;
  const totalDays = trips.reduce((sum, trip) => sum + daysInTrip(trip), 0);

  const longestTrip =
    trips.length === 0
      ? null
      : trips.reduce(
          (longest, trip) => (daysInTrip(trip) > longest.days ? { name: trip.name, days: daysInTrip(trip) } : longest),
          { name: trips[0].name, days: daysInTrip(trips[0]) }
        );

  const averageTripDays = totalTrips > 0 ? Math.round((totalDays / totalTrips) * 10) / 10 : 0;

  return {
    totalCountries,
    percentWorld,
    totalContinents: visitedContinents.size,
    totalTrips,
    totalFlights,
    totalDays,
    longestTrip,
    averageTripDays
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/tripStats.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripStats.ts src/lib/tripStats.test.ts
git commit -m "feat: add computeTripStats as the single source of truth for trip metrics"
```

---

### Task 4: `/stats` page and nav link

**Files:**
- Create: `src/routes/stats/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes:
  - `computeTripStats`, `TripStats` from `src/lib/tripStats.ts` (Task 3)
  - `listTrips` from `src/lib/storage/storage` (existing)
  - `loadWorldCountries`, `CountryInfo` from `src/lib/countries` (existing)
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Create the stats page**

Create `src/routes/stats/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let stats: TripStats | null = $state(null);

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    stats = computeTripStats(trips, countries);
  });
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Your stats</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Everything below is derived from the trips you've already logged.</p>
</div>

{#if stats && stats.totalTrips === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <h2 class="font-display text-2xl font-bold">No stats yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
      Log your first trip and your stats will start filling in automatically.
    </p>
    <a
      href="/"
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Log a trip
    </a>
  </div>
{:else if stats}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Countries visited</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
      <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.percentWorld}% of the world</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Continents visited</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalContinents}</p>
      <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">of 7</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Trips logged</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Flights taken</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalFlights}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Total days travelled</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Longest trip</p>
      {#if stats.longestTrip}
        <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">{stats.longestTrip.name}</p>
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.longestTrip.days} days</p>
      {/if}
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Average trip length</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.averageTripDays} days</p>
    </div>
  </div>
{/if}
```

- [ ] **Step 2: Add the nav link**

In `src/routes/+layout.svelte`, find:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' }
  ];
```

Change to:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' }
  ];
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. With zero trips, navigate to `/stats` — confirm the empty state renders with a working "Log a trip" link back to `/`.
2. Create at least two trips spanning different continents and transport modes (e.g. one flight to Japan, one train trip through France and Germany).
3. Navigate to `/stats` — confirm all 7 cards render correct values: countries visited, % of world, continents (of 7), trips logged, flights taken, total days, longest trip (name + days), average trip length.
4. Confirm the "Stats" link appears in the header nav and highlights as active when on `/stats`.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including `continents.test.ts` and `tripStats.test.ts` from Tasks 1 and 3.

- [ ] **Step 5: Commit**

```bash
git add src/routes/stats/+page.svelte src/routes/+layout.svelte
git commit -m "feat: add /stats page with full trip metric breakdown"
```

---

### Task 5: Home page hero and stats strip

**Files:**
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `computeTripStats`, `TripStats` from `src/lib/tripStats.ts` (Task 3).
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Add the stats computation to the script block**

In `src/routes/+page.svelte`, add the import and computed stats. Find:

```ts
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
```

Change to:

```ts
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats } from '$lib/tripStats';
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
```

Then find the `onMount` block:

```ts
  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
  });
```

Change to:

```ts
  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
  });

  const stats = $derived(computeTripStats(trips, countries));

  function greeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }
```

- [ ] **Step 2: Replace the header markup**

Find the existing header block:

```svelte
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
```

Replace with:

```svelte
<div class="flex flex-wrap items-center justify-between gap-4">
  <div>
    {#if trips.length === 0}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">Your trips</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">Every journey starts with the first pin.</p>
    {:else}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{greeting()}.</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">
        {stats.totalCountries} countr{stats.totalCountries === 1 ? 'y' : 'ies'} explored, {trips.length} trip{trips.length === 1 ? '' : 's'} logged.
      </p>
    {/if}
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

{#if trips.length > 0}
  <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Visited</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">World explored</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.percentWorld}%</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Trips</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Travel days</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
    </div>
  </div>
{/if}
```

Note: this removes the trip-count subtitle line's old standalone logic (it's now folded into the greeting branch) and the previous `{#if trips.length > 0}` transport-mode filter tabs block (already present just below in the file, unchanged) now follows directly after this new stats strip — do not duplicate or remove the existing tabs block.

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. With zero trips, confirm the header shows "Your trips" / "Every journey starts with the first pin." exactly as before (no stats strip rendered) — this is a regression check on the existing empty state.
2. Create a trip. Confirm the header now shows a time-of-day greeting (e.g. "Good afternoon.") and a summary line ("1 country explored, 1 trip logged."), and the 4-tile stats strip appears below it with correct values.
3. Create a second trip in a different country. Confirm the stats strip numbers update correctly.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass — this task adds no new test file (the underlying logic is already covered by `tripStats.test.ts` in Task 3; this task only wires it into a template), so the existing suite count should be unchanged from Task 4.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add hero greeting and stats strip to home page"
```

---

## Self-Review Notes

- **Spec coverage:** hero greeting (Task 5), stats strip (Task 5), `/stats` page with all 7 metrics (Task 4), continent lookup (Task 1), `daysInTrip` reuse (Task 2), `computeTripStats` single source of truth (Task 3), nav link (Task 4), zero-trips empty states on both pages (Tasks 4–5), Vitest coverage for continents/tripStats (Tasks 1, 3) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code. The continent lookup table was generated and verified against the actual SVG file's 211 codes before being written into this plan (confirmed programmatically: 211 in, 211 mapped, zero missing, zero extra).
- **Type consistency:** `TripStats` defined in Task 3 is consumed identically in Tasks 4 and 5; `getContinent`/`CONTINENTS` from Task 1 are used only inside `tripStats.ts` (Task 3), matching their declared signatures; `daysInTrip`'s export in Task 2 matches its only new call site in Task 3.
