# Achievements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four derived milestone badges (Explorer, Globetrotter, Continental Traveller, Photographer) to `/stats`, with a one-time unlock reveal the next time the user visits after earning one — no schema changes.

**Architecture:** A small addition to `continents.ts` (per-continent country totals), a new `achievements.ts` module as the single source of truth for the four unlock conditions, a `achievementViewState.ts` last-seen-diffing repo mirroring `mapViewState.ts`, and a new badge-grid section wired into the existing `/stats` page.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- Explorer unlocks at **5+** countries visited (not 1 — corrected from the roadmap's original wording during brainstorming).
- Globetrotter unlocks at **25+** countries visited.
- Continental Traveller unlocks when **every country on at least one continent** has been visited (not "visited all 7 continents") — continents with zero countries in the lookup table (Antarctica) are never checked.
- Photographer unlocks at **100+** combined photos: `journalEntry.photoIds.length` summed across all journal entries, plus a count of tips with a non-null `photoId`, across every trip.
- The achievement reveal pulse reuses the exact same CSS keyframe/easing convention as `WorldMap.svelte`'s `.revealing` class (`reveal-pulse` keyframes, `var(--ease-out-quart)`, 0.6s), including suppression under `prefers-reduced-motion: reduce`.
- `achievementViewState.ts` follows the identical pattern to `src/lib/storage/mapViewState.ts`: one localStorage key, a `Set<string>` of IDs, get/set functions, no `readAll`/`writeAll` abstraction needed for a single value.

---

### Task 1: `getContinentCountryCounts()` — per-continent country totals

**Files:**
- Modify: `src/lib/continents.ts`
- Test: `src/lib/continents.test.ts`

**Interfaces:**
- Consumes: nothing new (uses the existing internal `COUNTRY_CONTINENT` table already in this file).
- Produces (used by `achievements.ts` in Task 2):
  ```ts
  export function getContinentCountryCounts(): Record<Continent, number>
  ```
  Continents with zero countries in the table are absent from the returned record (not present with value `0`).

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/continents.test.ts` (the file already has a `describe('getContinent', ...)` block — add this as a new top-level `describe` in the same file):

```ts
import { getContinentCountryCounts } from './continents';

describe('getContinentCountryCounts', () => {
  it('returns the exact country count for each continent present in the table', () => {
    const counts = getContinentCountryCounts();
    expect(counts.Europe).toBe(42);
    expect(counts.Asia).toBe(49);
    expect(counts['North America']).toBe(37);
    expect(counts.Africa).toBe(58);
    expect(counts['South America']).toBe(14);
    expect(counts.Oceania).toBe(11);
  });

  it('omits continents with zero countries in the table', () => {
    const counts = getContinentCountryCounts();
    expect(counts.Antarctica).toBeUndefined();
  });

  it('sums to 211, the total number of countries in the table', () => {
    const counts = getContinentCountryCounts();
    const total = Object.values(counts).reduce((sum, n) => sum + n, 0);
    expect(total).toBe(211);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/continents.test.ts`
Expected: FAIL — `getContinentCountryCounts is not a function` (or similar import error).

- [ ] **Step 3: Implement `getContinentCountryCounts()`**

Add this export to the end of `src/lib/continents.ts` (after the existing `getContinent` function, leaving everything else in the file untouched):

```ts
export function getContinentCountryCounts(): Record<Continent, number> {
  const counts = {} as Record<Continent, number>;
  for (const continent of Object.values(COUNTRY_CONTINENT)) {
    counts[continent] = (counts[continent] ?? 0) + 1;
  }
  return counts;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/continents.test.ts`
Expected: PASS (7 tests — the 4 existing `getContinent` tests plus the 3 new ones).

- [ ] **Step 5: Commit**

```bash
git add src/lib/continents.ts src/lib/continents.test.ts
git commit -m "feat: add getContinentCountryCounts for per-continent totals"
```

---

### Task 2: `achievements.ts` — the four achievement definitions

**Files:**
- Create: `src/lib/achievements.ts`
- Test: `src/lib/achievements.test.ts`

**Interfaces:**
- Consumes:
  - `getContinent`, `getContinentCountryCounts`, `Continent` from `src/lib/continents.ts` (Task 1)
  - `Trip` from `src/lib/types.ts`
  - `listJournalEntries` from `src/lib/storage/local.ts` (existing, re-exported via `src/lib/storage/storage.ts`)
  - `listTips` from `src/lib/storage/tips.ts` (existing, re-exported via `src/lib/storage/storage.ts`)
- Produces (used by `/stats` in Task 4):
  ```ts
  export interface Achievement {
    id: 'explorer' | 'globetrotter' | 'continental-traveller' | 'photographer';
    name: string;
    description: string;
    unlocked: boolean;
  }
  export function getAchievements(trips: Trip[]): Achievement[]
  ```
  Always returns exactly 4 achievements, in this fixed order: explorer, globetrotter, continental-traveller, photographer.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/achievements.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAchievements } from './achievements';
import { saveTrip } from '$lib/storage/storage';
import { saveJournalEntry } from '$lib/storage/local';
import { saveTip } from '$lib/storage/tips';
import type { Trip, JournalEntry, TipEntry } from '$lib/types';

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

function countryCodes(n: number, prefix: string): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}${i}`);
}

beforeEach(() => {
  localStorage.clear();
});

describe('getAchievements', () => {
  it('always returns exactly 4 achievements in a fixed order', () => {
    const achievements = getAchievements([]);
    expect(achievements.map((a) => a.id)).toEqual([
      'explorer',
      'globetrotter',
      'continental-traveller',
      'photographer'
    ]);
  });

  it('explorer stays locked at 4 countries and unlocks at 5', () => {
    const fourCountries = [makeTrip({ countries: countryCodes(4, 'X') })];
    expect(getAchievements(fourCountries).find((a) => a.id === 'explorer')?.unlocked).toBe(false);

    const fiveCountries = [makeTrip({ countries: countryCodes(5, 'X') })];
    expect(getAchievements(fiveCountries).find((a) => a.id === 'explorer')?.unlocked).toBe(true);
  });

  it('globetrotter stays locked at 24 countries and unlocks at 25', () => {
    const trips24 = [makeTrip({ countries: countryCodes(24, 'X') })];
    expect(getAchievements(trips24).find((a) => a.id === 'globetrotter')?.unlocked).toBe(false);

    const trips25 = [makeTrip({ countries: countryCodes(25, 'X') })];
    expect(getAchievements(trips25).find((a) => a.id === 'globetrotter')?.unlocked).toBe(true);
  });

  it('continental-traveller unlocks only when every South American country (the smallest continent) is visited', () => {
    const allSouthAmerica = ['AR', 'BO', 'BR', 'CL', 'CO', 'EC', 'FK', 'GF', 'GY', 'PE', 'PY', 'SR', 'UY', 'VE'];
    const completeTrip = [makeTrip({ countries: allSouthAmerica })];
    expect(getAchievements(completeTrip).find((a) => a.id === 'continental-traveller')?.unlocked).toBe(true);

    const missingOne = [makeTrip({ countries: allSouthAmerica.slice(0, -1) })];
    expect(getAchievements(missingOne).find((a) => a.id === 'continental-traveller')?.unlocked).toBe(false);
  });

  it('photographer stays locked at 99 combined photos and unlocks at 100', () => {
    const trip = makeTrip({ id: 'tp', countries: ['FR'] });
    saveTrip(trip);

    for (let i = 0; i < 99; i++) {
      const entry: JournalEntry = { id: `e${i}`, tripId: 'tp', date: '2026-01-01', note: '', photoIds: ['p1'] };
      saveJournalEntry(entry);
    }
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(false);

    const oneMoreEntry: JournalEntry = { id: 'e99', tripId: 'tp', date: '2026-01-01', note: '', photoIds: ['p1'] };
    saveJournalEntry(oneMoreEntry);
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(true);
  });

  it('photographer counts tip photos alongside journal entry photos', () => {
    const trip = makeTrip({ id: 'tp2', countries: ['FR'] });
    saveTrip(trip);

    for (let i = 0; i < 60; i++) {
      const entry: JournalEntry = { id: `je${i}`, tripId: 'tp2', date: '2026-01-01', note: '', photoIds: ['p1'] };
      saveJournalEntry(entry);
    }
    for (let i = 0; i < 39; i++) {
      const tip: TipEntry = {
        id: `tip${i}`,
        tripId: 'tp2',
        category: 'sightseeing',
        note: '',
        photoId: 'ph1',
        createdAt: '2026-01-01T00:00:00.000Z'
      };
      saveTip(tip);
    }
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(false);

    const tip: TipEntry = {
      id: 'tipLast',
      tripId: 'tp2',
      category: 'sightseeing',
      note: '',
      photoId: 'ph2',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    saveTip(tip);
    expect(getAchievements([trip]).find((a) => a.id === 'photographer')?.unlocked).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: FAIL — `Cannot find module './achievements'`.

- [ ] **Step 3: Implement `achievements.ts`**

Create `src/lib/achievements.ts`:

```ts
import type { Trip } from '$lib/types';
import { listJournalEntries, listTips } from '$lib/storage/storage';
import { getContinent, getContinentCountryCounts, type Continent } from '$lib/continents';

export interface Achievement {
  id: 'explorer' | 'globetrotter' | 'continental-traveller' | 'photographer';
  name: string;
  description: string;
  unlocked: boolean;
}

const EXPLORER_THRESHOLD = 5;
const GLOBETROTTER_THRESHOLD = 25;
const PHOTOGRAPHER_THRESHOLD = 100;

function visitedCountries(trips: Trip[]): Set<string> {
  return new Set(trips.flatMap((trip) => trip.countries));
}

function hasCompletedAnyContinent(visited: Set<string>): boolean {
  const visitedByContinent = new Map<Continent, number>();
  for (const code of visited) {
    const continent = getContinent(code);
    if (!continent) continue;
    visitedByContinent.set(continent, (visitedByContinent.get(continent) ?? 0) + 1);
  }

  const totals = getContinentCountryCounts();
  for (const [continent, visitedCount] of visitedByContinent) {
    if (visitedCount === totals[continent]) return true;
  }
  return false;
}

function totalPhotoCount(trips: Trip[]): number {
  let count = 0;
  for (const trip of trips) {
    const entries = listJournalEntries(trip.id);
    for (const entry of entries) count += entry.photoIds.length;

    const tips = listTips(trip.id);
    for (const tip of tips) {
      if (tip.photoId !== null) count += 1;
    }
  }
  return count;
}

export function getAchievements(trips: Trip[]): Achievement[] {
  const visited = visitedCountries(trips);

  return [
    {
      id: 'explorer',
      name: 'Explorer',
      description: `Visit ${EXPLORER_THRESHOLD} countries`,
      unlocked: visited.size >= EXPLORER_THRESHOLD
    },
    {
      id: 'globetrotter',
      name: 'Globetrotter',
      description: `Visit ${GLOBETROTTER_THRESHOLD} countries`,
      unlocked: visited.size >= GLOBETROTTER_THRESHOLD
    },
    {
      id: 'continental-traveller',
      name: 'Continental Traveller',
      description: 'Visit every country on one continent',
      unlocked: hasCompletedAnyContinent(visited)
    },
    {
      id: 'photographer',
      name: 'Photographer',
      description: `Take ${PHOTOGRAPHER_THRESHOLD} photos`,
      unlocked: totalPhotoCount(trips) >= PHOTOGRAPHER_THRESHOLD
    }
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/achievements.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/achievements.ts src/lib/achievements.test.ts
git commit -m "feat: add getAchievements with Explorer/Globetrotter/Continental Traveller/Photographer"
```

---

### Task 3: `achievementViewState.ts` — last-seen unlocked achievements storage

**Files:**
- Create: `src/lib/storage/achievementViewState.ts`
- Test: `src/lib/storage/achievementViewState.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by `/stats` in Task 4):
  ```ts
  export function getLastSeenUnlockedIds(): Set<string>
  export function setLastSeenUnlockedIds(ids: Set<string>): void
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage/achievementViewState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenUnlockedIds, setLastSeenUnlockedIds } from './achievementViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('achievementViewState', () => {
  it('returns an empty set when nothing has been stored yet', () => {
    expect(getLastSeenUnlockedIds()).toEqual(new Set());
  });

  it('round-trips a set of ids through storage', () => {
    setLastSeenUnlockedIds(new Set(['explorer', 'globetrotter']));
    expect(getLastSeenUnlockedIds()).toEqual(new Set(['explorer', 'globetrotter']));
  });

  it('overwrites the previously stored set rather than merging', () => {
    setLastSeenUnlockedIds(new Set(['explorer']));
    setLastSeenUnlockedIds(new Set(['photographer']));
    expect(getLastSeenUnlockedIds()).toEqual(new Set(['photographer']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/achievementViewState.test.ts`
Expected: FAIL — `Cannot find module './achievementViewState'`.

- [ ] **Step 3: Implement `achievementViewState.ts`**

Create `src/lib/storage/achievementViewState.ts`:

```ts
const LAST_SEEN_KEY = 'trailune:achievements-last-seen';

export function getLastSeenUnlockedIds(): Set<string> {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as string[]);
}

export function setLastSeenUnlockedIds(ids: Set<string>): void {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Array.from(ids)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/achievementViewState.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/achievementViewState.ts src/lib/storage/achievementViewState.test.ts
git commit -m "feat: add achievementViewState repo for last-seen unlocked achievements"
```

---

### Task 4: Wire the badge grid into `/stats`

**Files:**
- Modify: `src/routes/stats/+page.svelte`

**Interfaces:**
- Consumes:
  - `getAchievements`, `Achievement` from `src/lib/achievements.ts` (Task 2)
  - `getLastSeenUnlockedIds`, `setLastSeenUnlockedIds` from `src/lib/storage/achievementViewState.ts` (Task 3)
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Update the script block**

The current `src/routes/stats/+page.svelte` script block is:

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
```

Replace it with:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
  import { getLastSeenUnlockedIds, setLastSeenUnlockedIds } from '$lib/storage/achievementViewState';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let stats: TripStats | null = $state(null);
  let achievements: Achievement[] = $state([]);
  let newlyUnlockedIds: Set<string> = $state(new Set());

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    stats = computeTripStats(trips, countries);

    achievements = getAchievements(trips);
    const currentUnlockedIds = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id));
    const lastSeen = getLastSeenUnlockedIds();
    newlyUnlockedIds = new Set([...currentUnlockedIds].filter((id) => !lastSeen.has(id)));
    setLastSeenUnlockedIds(currentUnlockedIds);
  });
</script>
```

- [ ] **Step 2: Add the Achievements section to the template**

The current template ends with the closing `{/if}` of the metric-card grid (the block containing "Average trip length"). Add this new section immediately after that `{/if}` (and before the end of the file):

```svelte
{#if achievements.length > 0}
  <div class="mt-10">
    <h2 class="font-display text-2xl font-bold">Achievements</h2>
    <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
      {#each achievements as achievement (achievement.id)}
        <div
          class="rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)] {achievement.unlocked
            ? 'bg-[var(--color-card)]'
            : 'bg-[var(--color-card)]/60'} {newlyUnlockedIds.has(achievement.id) ? 'achievement-revealing' : ''}"
        >
          <div class="flex items-center gap-2">
            {#if achievement.unlocked}
              <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-accent)]" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-ink-soft)]" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            {/if}
            <p
              class="font-display text-lg font-bold {achievement.unlocked
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-ink-soft)]'}"
            >
              {achievement.name}
            </p>
          </div>
          <p class="mt-1.5 text-sm text-[var(--color-ink-soft)]">{achievement.description}</p>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .achievement-revealing {
    animation: reveal-pulse 0.6s var(--ease-out-quart);
  }

  @keyframes reveal-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent);
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 10px color-mix(in oklch, var(--color-accent) 70%, transparent));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .achievement-revealing {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. With zero trips, confirm the "Achievements" section still renders (all 4 badges greyed-out/locked, since `achievements.length > 0` is true even when all are locked) below the existing "No stats yet" empty state.
2. Create a trip with 5 countries. Reload `/stats`. Confirm "Explorer" now shows unlocked (checkmark, full color) and pulses once on this load, and the other 3 stay locked.
3. Reload `/stats` again without changing data. Confirm "Explorer" no longer pulses (the reveal only plays once).
4. Add enough countries/photos/continent coverage to unlock the remaining 3 achievements one at a time across a few reloads, confirming each pulses exactly once when it newly unlocks.
5. Toggle `prefers-reduced-motion` and unlock a new achievement; confirm no pulse animation plays but the badge still shows unlocked correctly.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `continents.test.ts` additions, `achievements.test.ts`, and `achievementViewState.test.ts` from Tasks 1–3.

- [ ] **Step 5: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat: add achievement badge grid with unlock reveal to /stats"
```

---

## Self-Review Notes

- **Spec coverage:** all 4 achievement definitions and thresholds (Task 2), `getContinentCountryCounts` addition (Task 1), last-seen diffing/reveal persistence (Task 3), badge grid UI with locked/unlocked states and reveal pulse (Task 4), reduced-motion handling (Task 4), Vitest coverage for all three new/modified logic files (Tasks 1–3) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `Achievement`'s `id` union type defined in Task 2 is used identically as the `newlyUnlockedIds: Set<string>` comparison in Task 4 (compared as plain strings, which is compatible since the union members are string literals); `getContinentCountryCounts()`'s `Record<Continent, number>` return type from Task 1 matches its only call site in Task 2's `hasCompletedAnyContinent`; `achievementViewState.ts`'s two functions are used with matching names/signatures in Task 4.
