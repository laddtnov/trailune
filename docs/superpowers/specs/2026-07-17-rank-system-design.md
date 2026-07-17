# Rank/Level System — Design Spec

Date: 2026-07-17

## Overview

A 7-tier travel rank system, derived from total countries visited, shown on the home page hero. Each tier has a name, emoji, and personalized subtitle; a progress bar shows how far into the current tier the user is and how many countries remain until the next one. Reaching a new tier triggers a one-time, two-stage level-up animation the next time the user visits the home page. This is a separate system from the existing Achievement badges — two of the tier names originally proposed ("Explorer", "Globetrotter") collided with existing Achievement names and have been renamed to avoid a user seeing two different things called "Explorer" with two different thresholds on the same app.

**Out of scope for this cycle:** the future "Trailune Score" (a points system combining new countries, continents, travel days, journal completions, photos, and packing-list completion into a single score, replacing raw country count as the rank driver) — explicitly deferred, noted here only so it isn't lost, not designed or built now.

## Goals

- **7 tiers**, each with an id, emoji, name, subtitle, and inclusive country-count range:

  | id | Emoji | Name | Range | Subtitle |
  |---|---|---|---|---|
  | `beginner` | 🌱 | Beginner | 0–2 | Every great journey starts with a single destination. |
  | `traveler` | 🎒 | Traveler | 3–9 | You're beginning to leave your footprints around the world. |
  | `adventurer` | 🧭 | Adventurer | 10–24 | Curiosity is taking you farther from home. |
  | `wanderer` | 🌍 | Wanderer | 25–49 | Your map is filling with unforgettable memories. |
  | `voyager` | ✈️ | Voyager | 50–99 | Airports are becoming familiar places. |
  | `world-citizen` | 🌎 | World Citizen | 100–174 | You've experienced cultures across the globe. |
  | `trailblazer` | 👑 | Trailblazer | 175–211 | Few people have explored the world as extensively as you have. |

  (`wanderer` and `voyager` are renamed from the original "Explorer"/"Globetrotter" proposal to avoid colliding with the existing Achievement badges of the same names, which use different thresholds.)

- **Progress display** on the home page hero: current tier's emoji + name, its subtitle, a progress bar showing band-relative progress within the current tier, and "N countries until [next tier name]" — except at Trailblazer (the top tier), which shows a full bar and a "reached the top rank" message instead of a countdown, since there's no next tier.
- **Level-up animation**: the first time the user visits the home page after crossing into a new tier, a two-stage animated sequence plays — the previous tier's bar completing to 100%, then the new tier's "🎉 Level Up!" reveal with its bar filling to the actual current progress — before settling into the normal steady-state display. Never replays after the first viewing.

## Non-goals

- No "Trailune Score" / points system — deferred, this cycle is country-count-only.
- No changes to the existing Achievement badges (`achievements.ts`, the `/stats` badge grid) — this is an additive, separate system living on the home page.
- No new user-entered data — the rank is entirely derived from `totalCountries`, already computed by the existing `computeTripStats`.

## Architecture

- **`src/lib/levels.ts`** (new) — the tier table and progress calculation:
  ```ts
  export interface Level {
    id: string;
    emoji: string;
    name: string;
    subtitle: string;
    min: number;
    max: number;
  }
  export const LEVELS: readonly Level[]; // ordered lowest to highest, the 7 tiers above

  export interface LevelProgress {
    level: Level;
    countriesIntoLevel: number;
    levelWidth: number;
    percentToNext: number; // 0-100, band-relative; 100 at the top tier
    countriesToNext: number | null; // null at the top tier
    nextLevel: Level | null; // null at the top tier
  }
  export function getLevelProgress(totalCountries: number): LevelProgress
  ```
  Band-relative progress: `percentToNext = Math.round(((totalCountries - level.min) / (nextLevel.min - level.min)) * 100)`. At the top tier (`trailblazer`), `percentToNext` is always `100`, `countriesToNext` and `nextLevel` are `null`.

- **`src/lib/storage/levelViewState.ts`** (new) — mirrors the existing `achievementViewState.ts`/`mapViewState.ts` pattern, but stores a single id rather than a set (only one level is ever "current"):
  ```ts
  export function getLastSeenLevelId(): string | null
  export function setLastSeenLevelId(id: string): void
  ```
  Backed by a single localStorage key.

- **Home page** (`src/routes/+page.svelte`, modify) — on mount, alongside the existing `computeTripStats` call, also computes `getLevelProgress(stats.totalCountries)`. Compares the resulting `level.id` against `getLastSeenLevelId()`:
  - If they differ **and** a last-seen value already existed (i.e., not a brand-new user with no stored value yet), the hero renders the two-stage level-up animation described below, then persists the new level id immediately.
  - If they differ because there was no last-seen value yet (first-ever visit with existing trips), or they're the same, the hero renders the normal steady-state view directly — no false "level up" on a first visit — and the last-seen value is still persisted immediately either way, matching the "persist before showing" rule already used for the Living Map and Achievements.
  - If `trips.length === 0`, none of this renders — the existing "Your trips" empty-state header is completely unchanged.

## Data flow & animation

1. Home page mounts, loads `trips`, computes `stats` (existing) and `levelProgress = getLevelProgress(stats.totalCountries)` (new).
2. Reads `lastSeenLevelId = getLastSeenLevelId()`. Three cases:
   - `lastSeenLevelId === null` (first-ever visit): render steady-state directly, then `setLastSeenLevelId(levelProgress.level.id)`.
   - `lastSeenLevelId === levelProgress.level.id` (no change): render steady-state directly, then re-persist the same id (a harmless no-op write, keeping the logic uniform).
   - `lastSeenLevelId !== levelProgress.level.id` (leveled up): render the level-up animation (below), then `setLastSeenLevelId(levelProgress.level.id)` — persisted immediately per the established "can't replay after refresh" rule, even though the animation itself takes ~1s to play out.
3. **Level-up animation**, using `tweened` from `svelte/motion` (already used this way in `src/routes/map/+page.svelte` and `src/routes/+page.svelte`'s existing stats strip):
   - Determine the "previous tier": the entry in `LEVELS` immediately before the current one (by array index), not necessarily whatever tier was actually last seen — if a user's country count jumps across multiple tiers in one trip, the animation still only shows one before/after transition, using the tier directly below the new current one.
   - **Stage 1** (~500ms): render the previous tier's emoji/name/subtitle with its bar tweening from 0 to 100.
   - **Stage 2** (~500ms, starts immediately after Stage 1 completes): switch to "🎉 Level Up! You are now [emoji] [Name] — N countries visited" with the new tier's bar tweening from 0 to `levelProgress.percentToNext`.
   - After Stage 2 completes, the hero settles into the normal steady-state view (same content as the non-animated case, so there's no visual jump).
   - Respects `prefers-reduced-motion: reduce`: both stages skip the tween and land directly on their end values, matching the reduced-motion handling already established for the Living Map and Achievements reveals.

## UI

**Steady-state hero** (levels unchanged since last visit, or first visit): current tier's emoji + name as a heading, its subtitle below, a horizontal progress bar (same visual language as the existing home-page stats-strip cards — `--color-card`, `--radius-lg`, `--shadow-card` tokens), and "N countries until [next tier name]" beneath it. At Trailblazer: bar shown full, text replaced with "You've reached the top rank — few travelers get this far."

**Level-up hero** (one-time): replaces the steady-state view for the two animation stages described above, then hands off to the steady-state view with no jump (Stage 2 ends exactly where the steady-state view would already show).

The existing 4-tile stats strip (Visited/World explored/Trips/Travel days) stays exactly where it is today, unchanged and unaffected by this feature — it renders below whichever hero variant is showing.

## Testing

Following this project's established convention:

- Vitest unit tests for `getLevelProgress()`: a boundary test at every tier transition (countries = 2 vs. 3, 9 vs. 10, 24 vs. 25, 49 vs. 50, 99 vs. 100, 174 vs. 175), band-relative percent math at a mid-tier point (e.g. 15 countries within `adventurer`'s 10–24 range), the top-tier case (`percentToNext` 100, `countriesToNext` null, `nextLevel` null), and 0 countries (`beginner`, 0% into the tier).
- Vitest unit tests for `levelViewState.ts`: get/set round-trip, `null` default — same shape as `achievementViewState.test.ts`.
- Manual browser verification: seed trips crossing a tier boundary, reload the home page, confirm the two-stage level-up animation plays once (previous tier bar completing, then new tier revealing) and doesn't replay on a second reload; confirm a brand-new user (no last-seen value, trips already present) sees the steady-state view directly with no false level-up; confirm the Trailblazer max-tier display; toggle `prefers-reduced-motion` and confirm both animation stages skip the tween and land on final values immediately.
