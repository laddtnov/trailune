# Visit-Intensity Heatmap — Design Spec

Date: 2026-07-28

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas." On the main `/map` page, countries visited more than once render in an increasingly saturated color instead of today's flat "visited" accent color — a small, contained change to `WorldMap.svelte`'s existing visited-state styling, using visit counts already derivable from trip data.

## Goals

- On `/map`, a country's fill color reflects how many trips have included it, in three tiers: 1 visit = light, 2-4 visits = medium, 5+ visits = deep — matching the roadmap's own bucket wording.
- Tier 3 ("5+ visits, deep") renders identically to today's existing `.visited` accent color, so the most-visited countries look exactly as they do now; tiers 1 and 2 are new, progressively lighter variants of the same accent hue.
- This is purely a fill-color change — no new text, no new UI elements, no change to the hover popover (which already shows the exact visit count as a number) or the click-to-open panel.

## Non-goals

- No changes to the trip hub's own Map tab — that view always passes just the current trip's own countries as "visited" (not each country's real global visit count), so applying intensity tiers there would be misleading (every country would show as "1 visit" regardless of its actual history). It keeps today's flat single-tier styling unchanged.
- No changes to the hover popover, click-to-open panel, scratch-coating reveal, or travel-path arcs — this only adds an additional CSS class alongside the existing `.visited` class; all other `WorldMap.svelte` behavior is untouched.
- No new data model — visit counts are derived entirely from existing `Trip.countries` arrays at render time, the same data `countryStats.ts` already reads.
- No more than 3 tiers, and no continuous/gradient scale — three discrete tiers only, per the roadmap's own framing and this codebase's existing preference for discrete CSS state classes over continuous scales.

## Architecture

- **`src/lib/visitIntensity.ts`** (new) — two pure functions, no DOM:
  ```ts
  import type { Trip } from '$lib/types';

  export function computeVisitCounts(trips: Trip[]): Map<string, number> {
    const counts = new Map<string, number>();
    for (const trip of trips) {
      for (const code of trip.countries) {
        counts.set(code, (counts.get(code) ?? 0) + 1);
      }
    }
    return counts;
  }

  export function getIntensityTier(count: number): 1 | 2 | 3 | null {
    if (count <= 0) return null;
    if (count === 1) return 1;
    if (count <= 4) return 2;
    return 3;
  }
  ```

- **`src/lib/components/WorldMap.svelte`** (modify) — gains an optional prop:
  ```ts
  visitCounts?: Map<string, number>;
  ```
  defaulting to `new Map()`, so any existing caller that doesn't pass it (the trip hub's Map tab) behaves exactly as it does today. In both places the file currently toggles the `.visited` class (`onMount`'s initial pass and the `$effect` that re-syncs on prop changes), it additionally computes `getIntensityTier(visitCounts.get(code) ?? 0)` and toggles exactly one of three new classes (`intensity-1`, `intensity-2`, `intensity-3`) to match — removing the other two, and adding none when the tier is `null`. The existing `.visited` class itself is untouched (still controls hover scale, cursor, and the base fill/drop-shadow that intensity tier 3 will match).

  New CSS rules (added after the existing `.world-map :global(path.visited)` rule, using compound selectors for specificity so they reliably override it regardless of stylesheet order):
  ```css
  .world-map :global(path.visited.intensity-1) {
    fill: color-mix(in oklch, var(--color-accent) 45%, var(--color-ink-band-soft));
    filter: drop-shadow(0 0 4px color-mix(in oklch, var(--color-accent) 30%, transparent));
  }
  .world-map :global(path.visited.intensity-2) {
    fill: color-mix(in oklch, var(--color-accent) 70%, var(--color-ink-band-soft));
    filter: drop-shadow(0 0 5px color-mix(in oklch, var(--color-accent) 45%, transparent));
  }
  ```
  Tier 3 needs no new rule — it's identical to the existing `.visited` styling already in the file.

- **`src/routes/map/+page.svelte`** (modify) — computes `let visitCounts = $derived(computeVisitCounts(trips));` and passes `{visitCounts}` to the existing `<WorldMap>` invocation, alongside the props already passed there (`visitedCodes`, `newlyVisitedCodes`, `routeCodes`, `oncountryclick`, `oncountryhover`).

## Data flow & interaction notes

- `visitCounts` is derived from the same `trips` array already loaded on `/map` — no new storage reads.
- A country's intensity tier is entirely a function of `visitCounts.get(code)`; there's no separate "intensity" state to track or persist anywhere.
- The trip hub's Map tab's `<WorldMap visitedCodes={new Set(trip.countries)} routeCodes={trip.countries} />` call is not modified at all — `visitCounts` simply defaults to empty there, so every one of that trip's countries has no entry in it, `getIntensityTier(undefined ?? 0)` returns `null`, no intensity class is added, and the fill falls back to `.visited`'s existing base styling exactly as today.

## Edge cases

- **A country with zero visits**: never has `.visited` toggled true in the first place, so no intensity class question arises — unaffected, same as today.
- **A newly-revealed country mid-scratch-animation**: the base `.visited` class (and now its intensity tier) is applied immediately when a country becomes visited, before the scratch-coating overlay peels away — so a country that's now on its 2nd trip reveals directly into its correct medium-tier color underneath the coating, not a plain default color that then has to re-tier itself later.
- **A country that reaches a new tier boundary** (e.g. going from 1 visit to 2 on adding a new trip): the `$effect` that already re-syncs `.visited` on every `visitedCodes`/`newlyVisitedCodes` change also re-derives the intensity tier from the current `visitCounts`, so the color updates correctly without any extra wiring.
- **Trip hub's Map tab**: as covered above, entirely unaffected since it never supplies `visitCounts`.

## Testing

- **`visitIntensity.ts`**: Vitest unit tests — `computeVisitCounts` correctly counts trips per country across multiple trips and multiple countries per trip; `getIntensityTier` returns `null` for 0, `1` for exactly 1, `2` for 2 and for 4, `3` for 5 and for a much higher number (boundary checks at every tier edge).
- **`WorldMap.svelte`/`/map`**: manual browser verification (this project's established convention for map UI) — a country visited once, a country visited 2-4 times, and a country visited 5+ times all render visibly distinct fill intensities; a country with zero visits is unaffected; the trip hub's own Map tab renders unchanged; the feature composes correctly alongside the already-shipped scratch-coating reveal and global travel-path arcs on `/map`.
