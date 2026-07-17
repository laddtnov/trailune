# Rank/Level System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-tier travel rank system (derived from total countries visited) to the home page hero, with a progress bar toward the next tier and a two-stage level-up animation the first time the user visits after crossing into a new tier.

**Architecture:** A pure `levels.ts` module defines the tier table and progress math; `levelViewState.ts` mirrors the existing last-seen-diffing repos; the home page hero is modified to render the level display (replacing the existing greeting) and orchestrate the level-up animation via `svelte/motion`'s `tweened`.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, `svelte/motion`/`svelte/easing` (already part of the `svelte` package), Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- No changes to the existing Achievement badges (`src/lib/achievements.ts`, the `/stats` badge grid) — this is a separate, additive system.
- The 7 tiers, in order, with exact ranges: `beginner` (0–2), `traveler` (3–9), `adventurer` (10–24), `wanderer` (25–49), `voyager` (50–99), `world-citizen` (100–174), `trailblazer` (175–211).
- Progress is band-relative: `percentToNext = round(((totalCountries - level.min) / (nextLevel.min - level.min)) * 100)`. At `trailblazer` (the top tier), `percentToNext` is always `100`, `countriesToNext` and `nextLevel` are `null`.
- A brand-new user (no last-seen level stored yet) never sees a false "level up" on their first visit — the steady-state view renders directly, and the current level is still persisted as last-seen.
- The level-up animation is a genuine two-stage tween (previous tier's bar completing to 100%, then the new tier's bar filling to its actual progress) — not a single jump-cut.
- Both animation stages must skip their tween and land directly on final values when `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true. This is a new capability for this codebase (no existing file does a JS-level reduced-motion check — prior features only suppress CSS keyframe pulses via `@media (prefers-reduced-motion: reduce)`), introduced here because this animation is a plain numeric bar tween with no CSS pulse to hook a media-query override into.
- The existing 4-tile stats strip (Visited/World explored/Trips/Travel days) and everything below it on the home page must remain completely unchanged.

---

### Task 1: `levels.ts` — tier table and progress calculation

**Files:**
- Create: `src/lib/levels.ts`
- Test: `src/lib/levels.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by the home page in Task 3):
  ```ts
  export interface Level {
    id: string;
    emoji: string;
    name: string;
    subtitle: string;
    min: number;
    max: number;
  }
  export const LEVELS: readonly Level[];
  export interface LevelProgress {
    level: Level;
    countriesIntoLevel: number;
    levelWidth: number;
    percentToNext: number;
    countriesToNext: number | null;
    nextLevel: Level | null;
  }
  export function getLevelProgress(totalCountries: number): LevelProgress
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/levels.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getLevelProgress, LEVELS } from './levels';

describe('LEVELS', () => {
  it('has exactly 7 tiers with the correct ids in order', () => {
    expect(LEVELS.map((l) => l.id)).toEqual([
      'beginner',
      'traveler',
      'adventurer',
      'wanderer',
      'voyager',
      'world-citizen',
      'trailblazer'
    ]);
  });
});

describe('getLevelProgress', () => {
  it('places 0 countries in beginner, 3 countries until traveler', () => {
    const progress = getLevelProgress(0);
    expect(progress.level.id).toBe('beginner');
    expect(progress.percentToNext).toBe(0);
    expect(progress.countriesToNext).toBe(3);
    expect(progress.nextLevel?.id).toBe('traveler');
  });

  it('boundary: 2 countries is still beginner, 3 is traveler', () => {
    expect(getLevelProgress(2).level.id).toBe('beginner');
    expect(getLevelProgress(3).level.id).toBe('traveler');
  });

  it('boundary: 9 countries is still traveler, 10 is adventurer', () => {
    expect(getLevelProgress(9).level.id).toBe('traveler');
    expect(getLevelProgress(10).level.id).toBe('adventurer');
  });

  it('boundary: 24 countries is still adventurer, 25 is wanderer', () => {
    expect(getLevelProgress(24).level.id).toBe('adventurer');
    expect(getLevelProgress(25).level.id).toBe('wanderer');
  });

  it('boundary: 49 countries is still wanderer, 50 is voyager', () => {
    expect(getLevelProgress(49).level.id).toBe('wanderer');
    expect(getLevelProgress(50).level.id).toBe('voyager');
  });

  it('boundary: 99 countries is still voyager, 100 is world-citizen', () => {
    expect(getLevelProgress(99).level.id).toBe('voyager');
    expect(getLevelProgress(100).level.id).toBe('world-citizen');
  });

  it('boundary: 174 countries is still world-citizen, 175 is trailblazer', () => {
    expect(getLevelProgress(174).level.id).toBe('world-citizen');
    expect(getLevelProgress(175).level.id).toBe('trailblazer');
  });

  it('computes band-relative percent and countdown mid-tier', () => {
    const progress = getLevelProgress(15); // adventurer: 10-24, width 15, next wanderer at 25
    expect(progress.level.id).toBe('adventurer');
    expect(progress.countriesIntoLevel).toBe(5);
    expect(progress.levelWidth).toBe(15);
    expect(progress.percentToNext).toBe(33); // round(5/15*100)
    expect(progress.countriesToNext).toBe(10);
    expect(progress.nextLevel?.id).toBe('wanderer');
  });

  it('reports the top tier with no next level, full bar, no countdown', () => {
    const atThreshold = getLevelProgress(175);
    expect(atThreshold.level.id).toBe('trailblazer');
    expect(atThreshold.percentToNext).toBe(100);
    expect(atThreshold.countriesToNext).toBeNull();
    expect(atThreshold.nextLevel).toBeNull();

    const atMax = getLevelProgress(211);
    expect(atMax.level.id).toBe('trailblazer');
    expect(atMax.percentToNext).toBe(100);
    expect(atMax.countriesToNext).toBeNull();
    expect(atMax.nextLevel).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/levels.test.ts`
Expected: FAIL — `Cannot find module './levels'`.

- [ ] **Step 3: Implement `levels.ts`**

Create `src/lib/levels.ts`:

```ts
export interface Level {
  id: string;
  emoji: string;
  name: string;
  subtitle: string;
  min: number;
  max: number;
}

export const LEVELS: readonly Level[] = [
  {
    id: 'beginner',
    emoji: '🌱',
    name: 'Beginner',
    subtitle: 'Every great journey starts with a single destination.',
    min: 0,
    max: 2
  },
  {
    id: 'traveler',
    emoji: '🎒',
    name: 'Traveler',
    subtitle: "You're beginning to leave your footprints around the world.",
    min: 3,
    max: 9
  },
  {
    id: 'adventurer',
    emoji: '🧭',
    name: 'Adventurer',
    subtitle: 'Curiosity is taking you farther from home.',
    min: 10,
    max: 24
  },
  {
    id: 'wanderer',
    emoji: '🌍',
    name: 'Wanderer',
    subtitle: 'Your map is filling with unforgettable memories.',
    min: 25,
    max: 49
  },
  {
    id: 'voyager',
    emoji: '✈️',
    name: 'Voyager',
    subtitle: 'Airports are becoming familiar places.',
    min: 50,
    max: 99
  },
  {
    id: 'world-citizen',
    emoji: '🌎',
    name: 'World Citizen',
    subtitle: "You've experienced cultures across the globe.",
    min: 100,
    max: 174
  },
  {
    id: 'trailblazer',
    emoji: '👑',
    name: 'Trailblazer',
    subtitle: 'Few people have explored the world as extensively as you have.',
    min: 175,
    max: 211
  }
];

export interface LevelProgress {
  level: Level;
  countriesIntoLevel: number;
  levelWidth: number;
  percentToNext: number;
  countriesToNext: number | null;
  nextLevel: Level | null;
}

export function getLevelProgress(totalCountries: number): LevelProgress {
  const levelIndex = LEVELS.findIndex((l) => totalCountries >= l.min && totalCountries <= l.max);
  const level = levelIndex === -1 ? LEVELS[LEVELS.length - 1] : LEVELS[levelIndex];
  const nextLevel = levelIndex === -1 || levelIndex === LEVELS.length - 1 ? null : LEVELS[levelIndex + 1];

  const countriesIntoLevel = totalCountries - level.min;

  if (!nextLevel) {
    return {
      level,
      countriesIntoLevel,
      levelWidth: level.max - level.min + 1,
      percentToNext: 100,
      countriesToNext: null,
      nextLevel: null
    };
  }

  const levelWidth = nextLevel.min - level.min;
  const percentToNext = Math.round((countriesIntoLevel / levelWidth) * 100);
  const countriesToNext = nextLevel.min - totalCountries;

  return { level, countriesIntoLevel, levelWidth, percentToNext, countriesToNext, nextLevel };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/levels.test.ts`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/levels.ts src/lib/levels.test.ts
git commit -m "feat: add levels.ts with 7-tier rank table and progress calculation"
```

---

### Task 2: `levelViewState.ts` — last-seen level storage

**Files:**
- Create: `src/lib/storage/levelViewState.ts`
- Test: `src/lib/storage/levelViewState.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces (used by the home page in Task 3):
  ```ts
  export function getLastSeenLevelId(): string | null
  export function setLastSeenLevelId(id: string): void
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage/levelViewState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenLevelId, setLastSeenLevelId } from './levelViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('levelViewState', () => {
  it('returns null when nothing has been stored yet', () => {
    expect(getLastSeenLevelId()).toBeNull();
  });

  it('round-trips a stored level id', () => {
    setLastSeenLevelId('wanderer');
    expect(getLastSeenLevelId()).toBe('wanderer');
  });

  it('overwrites the previously stored id rather than merging', () => {
    setLastSeenLevelId('adventurer');
    setLastSeenLevelId('voyager');
    expect(getLastSeenLevelId()).toBe('voyager');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/levelViewState.test.ts`
Expected: FAIL — `Cannot find module './levelViewState'`.

- [ ] **Step 3: Implement `levelViewState.ts`**

Create `src/lib/storage/levelViewState.ts`:

```ts
const LAST_SEEN_KEY = 'trailune:level-last-seen';

export function getLastSeenLevelId(): string | null {
  return localStorage.getItem(LAST_SEEN_KEY);
}

export function setLastSeenLevelId(id: string): void {
  localStorage.setItem(LAST_SEEN_KEY, id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/levelViewState.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/levelViewState.ts src/lib/storage/levelViewState.test.ts
git commit -m "feat: add levelViewState repo for last-seen level tracking"
```

---

### Task 3: Wire the level display and level-up animation into the home page

**Files:**
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes:
  - `getLevelProgress`, `LEVELS`, `Level`, `LevelProgress` from `src/lib/levels.ts` (Task 1)
  - `getLastSeenLevelId`, `setLastSeenLevelId` from `src/lib/storage/levelViewState.ts` (Task 2)
- Produces: nothing consumed by later tasks (final task in this plan).

- [ ] **Step 1: Update the script block**

The current `src/routes/+page.svelte` script block has this import section and `onMount`/`stats`/`greeting` block:

```ts
  import { onMount } from 'svelte';
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats } from '$lib/tripStats';
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
```

Change the imports to:

```ts
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats } from '$lib/tripStats';
  import { getLevelProgress, LEVELS, type Level } from '$lib/levels';
  import { getLastSeenLevelId, setLastSeenLevelId } from '$lib/storage/levelViewState';
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
```

Find the existing `onMount`/`stats`/`greeting` block:

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

Replace it with:

```ts
  type HeroPhase = 'steady' | 'levelup-stage1' | 'levelup-stage2';
  let heroPhase: HeroPhase = $state('steady');
  let previousLevel: Level | null = $state(null);
  const barPercent = tweened(0, { duration: 500, easing: cubicOut });

  const stats = $derived(computeTripStats(trips, countries));
  const levelProgress = $derived(getLevelProgress(stats.totalCountries));

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();

    if (trips.length === 0) return;

    const currentTotalCountries = computeTripStats(trips, countries).totalCountries;
    const currentProgress = getLevelProgress(currentTotalCountries);
    const lastSeenLevelId = getLastSeenLevelId();
    setLastSeenLevelId(currentProgress.level.id);

    const reduced = prefersReducedMotion();

    if (lastSeenLevelId === null || lastSeenLevelId === currentProgress.level.id) {
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      return;
    }

    const currentIndex = LEVELS.findIndex((l) => l.id === currentProgress.level.id);
    const prevLevel = currentIndex > 0 ? LEVELS[currentIndex - 1] : null;

    if (!prevLevel) {
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      return;
    }

    previousLevel = prevLevel;

    if (reduced) {
      heroPhase = 'levelup-stage2';
      barPercent.set(currentProgress.percentToNext, { duration: 0 });
      heroPhase = 'steady';
      return;
    }

    heroPhase = 'levelup-stage1';
    barPercent.set(0, { duration: 0 });
    await barPercent.set(100);

    heroPhase = 'levelup-stage2';
    barPercent.set(0, { duration: 0 });
    await barPercent.set(currentProgress.percentToNext);

    heroPhase = 'steady';
  });
```

- [ ] **Step 2: Replace the hero markup**

Find the existing hero block:

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
```

Replace the `<div>` containing the conditional with:

```svelte
<div class="flex flex-wrap items-center justify-between gap-4">
  <div>
    {#if trips.length === 0}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">Your trips</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">Every journey starts with the first pin.</p>
    {:else if heroPhase === 'levelup-stage1' && previousLevel}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{previousLevel.emoji} {previousLevel.name}</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{previousLevel.subtitle}</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
    {:else if heroPhase === 'levelup-stage2'}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">
        &#127881; Level Up! You are now {levelProgress.level.emoji} {levelProgress.level.name}
      </h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{stats.totalCountries} countries visited</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
    {:else}
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{levelProgress.level.emoji} {levelProgress.level.name}</h1>
      <p class="mt-1 text-[var(--color-ink-soft)]">{levelProgress.level.subtitle}</p>
      <div class="mt-3 h-2 w-64 max-w-full overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
        <div class="h-full rounded-full bg-[var(--color-accent)]" style={`width: ${$barPercent}%;`}></div>
      </div>
      <p class="mt-1.5 text-sm text-[var(--color-ink-soft)]">
        {#if levelProgress.nextLevel}
          {levelProgress.countriesToNext} countr{levelProgress.countriesToNext === 1 ? 'y' : 'ies'} until {levelProgress.nextLevel.name}
        {:else}
          You've reached the top rank &mdash; few travelers get this far.
        {/if}
      </p>
    {/if}
  </div>
```

Do not change the `<button>` (New trip) that follows this `<div>`, and do not touch the 4-tile stats strip, transport-mode tabs, or trip-card grid below — all of that stays exactly as it is today.

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. With zero trips, confirm the home page header is completely unchanged ("Your trips" / "Every journey starts with the first pin.", no level display) — regression check.
2. Create a trip with 2 countries. Reload the home page. Confirm the steady-state view shows: 🌱 Beginner, its subtitle, a progress bar near-full within the beginner band, and "1 country until Traveler" (since 2 countries into a 0-2 range with next tier at 3 means 1 country to go). Confirm no level-up animation plays (first-ever visit with no prior last-seen value).
3. Add a country to cross into a new tier (e.g. add a third country to reach `traveler`). Reload. Confirm the two-stage level-up animation plays: Beginner's bar fills to 100%, then "🎉 Level Up! You are now 🎒 Traveler" appears with its bar filling to the correct in-tier progress, then it settles into the normal steady-state view matching what would render without the animation.
4. Reload again without changing data. Confirm the level-up animation does NOT replay — the steady-state view renders directly.
5. Seed enough countries to reach 211 (`trailblazer`, the top tier) and confirm the bar shows full with the "reached the top rank" message and no countdown.
6. Toggle `prefers-reduced-motion` (OS-level or via browser devtools emulation), then trigger a level-up by crossing a tier boundary again. Confirm the hero jumps directly to the "🎉 Level Up!" steady-state view with the bar at its final value — no tweening animation plays.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including `levels.test.ts` and `levelViewState.test.ts` from Tasks 1–2.

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add rank/level display and level-up animation to home page hero"
```

---

## Self-Review Notes

- **Spec coverage:** 7-tier table with exact ranges/subtitles (Task 1), band-relative progress math including top-tier edge case (Task 1), last-seen level storage (Task 2), steady-state hero display with next-tier countdown or max-tier message (Task 3), two-stage level-up animation with reduced-motion handling (Task 3), first-visit-no-false-positive handling (Task 3), Vitest coverage for both new logic files (Tasks 1–2) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `LevelProgress`/`Level` defined in Task 1 are used identically in Task 3's script and template; `getLastSeenLevelId`/`setLastSeenLevelId` from Task 2 are called with matching signatures in Task 3.
