# Achievements — Design Spec

Date: 2026-07-17

## Overview

This turns `docs/ROADMAP.md` §2's deferred "Achievements" idea into a scoped feature: four derived milestone badges shown on `/stats`, with a one-time unlock highlight the next time the user visits after earning one — the same "living" treatment already used for the map's country reveal. Every badge's unlock condition is computed from existing trip/journal/tip data; no new user-entered fields.

This is a scoped slice of the roadmap. **Out of scope for this cycle:** Year in Review ("Wrapped"), and any achievements beyond the four named in the roadmap (Explorer, Continental Traveller, Photographer, Globetrotter) — both deferred to their own future cycles.

## Goals

- **Four achievements**, each a simple derived boolean:
  - **Explorer** — at least 1 country visited.
  - **Globetrotter** — at least 25 countries visited.
  - **Continental Traveller** — every country on at least one continent has been visited (a genuine "covered the whole continent" milestone, not just "visited all 7 continents").
  - **Photographer** — at least 100 total photos across all journal entries and tips, combined, across every trip.
- **Badge grid on `/stats`**, below the existing 7 metric cards: unlocked badges show full-color with a checkmark; locked badges show greyed-out with a lock icon.
- **Unlock reveal**: the first time the user visits `/stats` after earning a new badge, that badge gets a one-time highlight pulse before settling into its normal unlocked appearance — mirrors the Living Map's country-reveal treatment exactly, including "persist last-seen immediately so a refresh can't replay it."

## Non-goals

- No Year in Review / "Wrapped" — deferred.
- No achievements beyond the four listed above.
- No new user-entered data — every condition is a derived read over `Trip[]`, `JournalEntry[]`, and `TipEntry[]`, already in `localStorage`.
- No changes to the `/map` page, `WorldMap.svelte`, or any Living Map file — this reuses the *pattern* (last-seen diffing, reveal pulse), not the code.

## Architecture

- **`src/lib/continents.ts`** (modify) — add one new export:
  ```ts
  export function getContinentCountryCounts(): Record<Continent, number>
  ```
  Derived by counting how many entries in the existing internal country→continent table belong to each continent (computed once, not hand-maintained as a separate table — single source of truth stays the existing lookup). Continents with zero countries in the table (Antarctica, in this dataset) are simply absent from the returned record rather than appearing with a `0`.

- **`src/lib/achievements.ts`** (new) — the sole source of truth for achievement definitions and unlock logic:
  ```ts
  export interface Achievement {
    id: 'explorer' | 'globetrotter' | 'continental-traveller' | 'photographer';
    name: string;
    description: string;
    unlocked: boolean;
  }
  export function getAchievements(trips: Trip[]): Achievement[]
  ```
  Explorer/Globetrotter reuse the same visited-country-set logic already established in `tripStats.ts` (recomputed here rather than imported, since `tripStats.ts` returns a count, not the underlying set — see Data flow below for the exact reuse boundary). Continental Traveller compares, per continent, the visited-country count against `getContinentCountryCounts()`'s total for that continent. Photographer sums photos by calling the existing per-trip `listJournalEntries(trip.id)` and `listTips(trip.id)` for every trip and adding up `photoIds.length` plus tips with a non-null `photoId`.

- **`src/lib/storage/achievementViewState.ts`** (new) — mirrors `mapViewState.ts` exactly:
  ```ts
  export function getLastSeenUnlockedIds(): Set<string>
  export function setLastSeenUnlockedIds(ids: Set<string>): void
  ```
  One localStorage key, same `readAll`-as-JSON-array pattern.

- **`/stats` page** (modify) — on mount, after computing `stats` (existing) and loading `trips`/`countries`, also calls `getAchievements(trips)`, diffs the unlocked IDs against `getLastSeenUnlockedIds()`, persists the current unlocked set immediately, and renders a new "Achievements" section below the metric-card grid: a 4-card badge grid, each card showing name + description, colored/checked when unlocked or greyed/locked when not, with the reveal-pulse CSS class applied to any badge in the newly-unlocked diff.

## Data flow

1. `/stats` page mounts: loads `trips` and `countries` (as it already does), then calls `getAchievements(trips)` to get all 4 badges' current unlocked state.
2. Loads `lastSeenUnlockedIds` via `getLastSeenUnlockedIds()`; computes `newlyUnlocked = currentUnlockedIds \ lastSeenUnlockedIds`.
3. Immediately calls `setLastSeenUnlockedIds(currentUnlockedIds)` — the reveal is a one-time "welcome back" moment, not something that needs to survive an interrupted animation, exactly like the Living Map's `mapViewState` handling.
4. Renders the badge grid; any badge whose `id` is in `newlyUnlocked` gets a `.revealing`-equivalent pulse class for ~600ms (same keyframe/easing convention as `WorldMap.svelte`'s reveal, respecting `prefers-reduced-motion: reduce`), then settles into its normal unlocked styling.

**Continental Traveller detail**: for each continent present in `getContinentCountryCounts()`, count how many of that continent's countries appear in the user's overall visited-country set (from all trips combined, not per-trip); if any continent's visited count equals its total from the lookup, the achievement unlocks. A continent absent from `getContinentCountryCounts()` (i.e., zero countries) is never checked, so it can't trivially "complete."

**Photographer detail**: `sum(journalEntry.photoIds.length for every journal entry across every trip) + count(tips with photoId !== null across every trip)`. This iterates all trips and calls the existing per-trip `listJournalEntries`/`listTips` functions rather than adding new "list everything" exports to `local.ts`/`tips.ts` — acceptable at this app's scale (a personal trip log, not a high-volume dataset), and keeps this cycle's changes contained to two new files plus one small addition to `continents.ts`.

## UI

New "Achievements" section on `/stats`, placed directly below the existing 7-card metric grid, with its own small heading ("Achievements"). A 4-card grid (same `grid-cols-[repeat(auto-fit,minmax(...),1fr)]` responsive pattern as the metric cards): each card shows the achievement's name and description. Unlocked: full accent color, small checkmark icon. Locked: greyed text/background, small lock icon, description still visible (so users know what they're working toward, not just that something is hidden). A badge in the newly-unlocked set on this page load plays the reveal pulse (glow + brief scale, same keyframe as `WorldMap.svelte`'s `.revealing`), suppressed under `prefers-reduced-motion: reduce` exactly like the map's reveal.

## Testing

Following this project's established convention:

- Vitest unit tests for `getContinentCountryCounts()`: spot-check exact totals for a couple of continents (verified against the actual table: Europe 42, Asia 49, North America 37, Africa 58, South America 14, Oceania 11), and confirm Antarctica (0 countries) is absent from the returned record.
- Vitest unit tests for `getAchievements()`: each of the 4 achievements' true/false boundary (e.g. Globetrotter at 24 vs. 25 countries), Continental Traveller's true case (a set of trips covering every South American country, the smallest continent) and false case (a near-miss missing one country), and Photographer's boundary (99 vs. 100 combined photos, counting both journal-entry photos and tip photos).
- Vitest unit tests for `achievementViewState.ts`: get/set round-trip, empty-default — same shape as `mapViewState.test.ts`.
- Manual browser verification: seed trips crossing an achievement threshold, reload `/stats`, confirm the newly-unlocked badge pulses once and doesn't replay on a second reload; confirm locked badges show description + lock icon; toggle `prefers-reduced-motion` to confirm the pulse is suppressed.
