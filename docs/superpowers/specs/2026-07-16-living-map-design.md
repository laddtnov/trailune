# Living Map — Design Spec

Date: 2026-07-16

## Overview

The `/map` page already shows a world map with visited countries highlighted, a numeric visited/total counter, and a click-to-open panel listing trips per country. This feature turns that into the "Living Map" from `docs/ROADMAP.md` §1: a reveal animation when new countries are added, a stats popover on hover/tap, and an animated progress bar — all derived reads over existing trip data, no new backend or schema changes.

This is a scoped slice of the roadmap's Living Map section. **Out of scope for this cycle:** the Dream Map (wishlist of not-yet-visited countries — a genuinely new, user-entered data concept, deferred to its own brainstorm), and the "scratch map" texture/reveal style (visual treatment, not core mechanic).

## Goals

- **Country-reveal animation**: when a trip adds a country not seen on a previous map visit, that country plays a brief entrance animation (glow pulse + scale) the next time the user opens `/map`, and the visited counter/progress bar animate counting up to the new total. Plays once per newly-visited country, never replays.
- **Stats popover**: hovering (desktop) or tapping (touch) a visited country shows a small popover with visit count, total days spent there, and last visit date — all computed from existing trip data. Unvisited countries show nothing new.
- **Animated progress bar**: the current numeric "N / total · X%" badge gains a visual horizontal progress bar alongside the existing text, and both animate during a reveal.
- **Click panel unchanged in substance**: desktop click still opens the existing full trip-list side panel. Touch gets a two-tap path: first tap shows the popover, tapping again (or a "View trips" affordance in the popover) opens the same panel.

## Non-goals

- No Dream Map / wishlist data model.
- No scratch-map reveal texture/animation style — the reveal is a glow + scale pulse, consistent with the map's existing visited-state styling.
- No per-trip quick-link icons (photos/journal/packing) inside the panel — the panel keeps linking to the trip hub as it does today, just with added per-trip stat text (dates, day count).
- No changes to how trips are created or to the New Trip form/flow.

## Architecture

Three new, single-purpose additions layered onto the existing `WorldMap.svelte` / `map/+page.svelte`, following this project's pattern of small focused modules:

- **`src/lib/countryStats.ts`** — pure function, no storage of its own:
  ```ts
  function getCountryStats(code: string, trips: Trip[]): { visitCount: number; totalDays: number; lastVisitDate: string } | null
  ```
  Returns `null` when the country has no trips. `totalDays` sums `(endDate - startDate + 1)` in days per trip touching that country; `lastVisitDate` is the max `endDate` among them. Computed on demand (hover/tap), not precomputed for all ~200 countries.

- **`src/lib/storage/mapViewState.ts`** — smallest possible localStorage repo, mirroring the existing repo pattern (e.g. `tips.ts`):
  ```ts
  function getLastSeenVisitedCodes(): Set<string>
  function setLastSeenVisitedCodes(codes: Set<string>): void
  ```
  Backed by a single JSON array under a `trailune:map-last-seen` key.

- **`src/lib/components/CountryPopover.svelte`** — new small positioned card for the hover/tap stats popover, distinct from (and smaller than) the existing full side panel.

`WorldMap.svelte` gains a `newlyVisitedCodes` prop (drives the `.revealing` class for the entrance animation) and hover/tap callbacks that report pointer position (for popover placement). `map/+page.svelte` orchestrates: on mount, loads last-seen state via `mapViewState`, diffs it against the current visited set to get `newlyVisited`, immediately persists the current visited set as the new "last seen" (so the reveal never replays), and owns the popover's open/selected state alongside the existing panel's `selectedCode` state.

## Data flow

1. `map/+page.svelte` mounts: loads `trips`, `countries`, and `getLastSeenVisitedCodes()`.
2. Computes `visitedCodes` (as today) and `newlyVisited = visitedCodes \ lastSeen`.
3. Calls `setLastSeenVisitedCodes(visitedCodes)` immediately — the reveal is a one-time "welcome back" moment, not something that needs to survive being interrupted mid-animation.
4. If `newlyVisited.size > 0`: passes it to `WorldMap` as `newlyVisitedCodes`, and animates the counter/progress bar from the old total (`visitedCodes.size - newlyVisited.size`) up to the new total via `svelte/motion`'s `tweened`, over ~600ms (staggered ~80ms per country if more than one appears at once, matching the per-path reveal stagger).
5. Hover (desktop, via `pointerenter`/`pointerleave`) or tap (touch, via `click` combined with a coarse-pointer media query check) on a country path calls `getCountryStats(code, trips)`. If non-null, `CountryPopover` renders near the pointer/tap position with the stats. If null, nothing changes (existing hover-highlight-only behavior stands).
6. On touch, tapping a country that already has its popover open opens the existing full side panel (reuses `selectedCode` state, unchanged panel markup) — same effect as the popover's "View trips →" link.
7. Desktop click behavior is unchanged: opens the full side panel directly, regardless of popover/hover state.

## Animation & motion

- Reveal: `.revealing` class applies a glow pulse (opacity/`drop-shadow` intensity) and a brief scale-up (to ~1.08, back to 1.0) over ~600ms using the existing `--ease-out-quart` easing token, then the class is removed and the path settles into the normal `.visited` resting style.
- Counter/progress bar: `tweened` store animates the displayed number and bar fill width over the same ~600ms window as the reveal.
- `prefers-reduced-motion: reduce`: reveal skips the scale/pulse (matches the existing reduced-motion override for hover/visited transitions in `WorldMap.svelte`) — the counter/bar still updates, but jumps to the final value instead of animating.

## Testing

- Vitest unit tests for `countryStats.ts`: visit count and day totals across single/multiple/overlapping trips per country, `lastVisitDate` selection among multiple trips, `null` return for an unvisited country.
- Vitest unit tests for `mapViewState.ts`: get/set round-trip, empty-array default when nothing stored yet.
- Manual browser verification (this project's established convention for animation/UI work): create a trip with a new country, reload `/map`, confirm the reveal + counter/progress-bar tick play once and don't replay on a second reload; hover a visited country on desktop to confirm the popover; resize to mobile width and tap to confirm the popover-then-panel two-step; toggle `prefers-reduced-motion` to confirm the pulse/scale is suppressed while the counter still updates.
