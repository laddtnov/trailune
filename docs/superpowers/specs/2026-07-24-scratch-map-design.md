# Scratch Map — Design Spec

Date: 2026-07-24

## Overview

This is the next slice of `docs/ROADMAP.md` §1 "The Living Map." Today, an unvisited country renders in a plain soft fill, and a newly-visited country reveals via a scale+glow pulse animation. This replaces that reveal with a "scratch-off travel map" metaphor: unvisited countries get a permanent foil/coating texture, and adding a trip peels that coating away in a jagged, scratch-like animation instead of a uniform fade.

## Goals

- Unvisited countries on the map render with a subtle metallic/foil "coating" texture (diagonal hatching), instead of today's plain soft fill, so the map visibly reads as "a scratch map waiting to be scratched."
- Adding a trip triggers a scratch-peel reveal animation on that trip's newly-visited countries — the coating tears away in an irregular, jagged pattern (not a uniform fade/wipe), exposing the solid accent-colored country underneath.
- This is purely an automatic, one-shot visual reveal — no user-driven scratching interaction.
- Applies everywhere `WorldMap.svelte` is used: the main `/map` page and each trip hub's Map tab (a trip hub's own countries are already visited by the time it renders, so they show no coating — this only affects the shared component's styling/behavior, not scoped per-page).

## Non-goals

- No user-driven "scratch with your cursor/finger" interaction — the reveal is fully automatic, matching how every other reveal in this app is derived from data, not manual input.
- No new `Trip` schema fields or storage changes — this is a rendering-only change in `WorldMap.svelte` plus one new pure logic module.
- No changes to the existing zoom-to-country, hover popover, click panel, or flight-route features — this only touches the unvisited-country fill and the newly-visited reveal animation.
- No new CSS custom properties — the coating texture reuses the existing `--color-ink-band` / `--color-ink-band-soft` variables already used for unvisited country styling.

## Architecture

- **`src/lib/scratchReveal.ts`** (new) — pure data module, no DOM:
  ```ts
  export const SCRATCH_CLIP_KEYFRAMES: string[] = [
    'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
    'polygon(8% 4%, 100% 0%, 96% 62%, 40% 100%, 0% 88%)',
    'polygon(30% 10%, 92% 6%, 100% 55%, 68% 100%, 10% 96%, 0% 40%)',
    'polygon(55% 20%, 88% 30%, 90% 80%, 45% 96%, 20% 60%)',
    'polygon(70% 45%, 82% 55%, 60% 90%, 55% 60%)',
    'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)'
  ];
  ```
  Five jagged intermediate polygons shrinking from full coverage (100%) to a single collapsed point (0%), simulating an irregular tear rather than a uniform wipe. Percentages are relative to the overlay element's own bounding box, so this works regardless of a country's actual shape or size — no per-country geometry needed.

- **`src/lib/components/WorldMap.svelte`** (modify):
  - After fetching and injecting `world-map.svg`, inject one `<pattern id="scratch-coating" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">` into the SVG's `<defs>` (creating a `<defs>` element if the SVG doesn't already have one), containing a `<rect>` filled with `var(--color-ink-band-soft)` and a thin `<line>` stroked with `var(--color-ink-band)` — a simple diagonal hatch.
  - Unvisited paths (i.e. `!visitedCodes.has(code)` and not newly-revealing) get `fill: url(#scratch-coating)` via a new `.unvisited-coating` class, applied/toggled alongside the existing `.visited` toggle in both `onMount`'s initial pass and the `$effect` that re-syncs classes on `visitedCodes` changes.
  - `applyRevealClass(path, code)` changes from adding a `.revealing` class to:
    1. Setting `.visited` on the real path immediately (so the solid accent fill is already there underneath).
    2. Cloning the real path node (`path.cloneNode(false)` as `SVGPathElement`), giving the clone `fill: url(#scratch-coating)` and no pointer/interaction listeners, and inserting it immediately after the real path in the DOM (so it renders on top).
    3. Stepping the clone's `clip-path` through `SCRATCH_CLIP_KEYFRAMES` on a fixed interval (total ~600ms, matching today's reveal duration — `600 / (SCRATCH_CLIP_KEYFRAMES.length - 1)` ms per step), staggered per-country using the existing `revealIndex * 80` delay pattern already in this function.
    4. Removing the clone from the DOM once the final (collapsed) keyframe is reached.
  - `prefersReducedMotion()` (already defined in this file) short-circuits `applyRevealClass`: when true, apply `.visited` directly with no coating class, no clone, no animation — identical in spirit to the existing reduced-motion branches elsewhere in this file.

## Data flow & interaction notes

- The coating pattern and reveal animation are entirely derived from the existing `visitedCodes` / `newlyVisitedCodes` props — no new props, no new data flowing into `WorldMap.svelte`.
- A country's coating is purely a rendering detail of "is this code in `visitedCodes`" — there's no separate "coated" state to track or persist.
- The clone overlay is a transient DOM node that exists only for the duration of one reveal animation; it's never part of any Svelte reactive state, mirroring how `buildFlightRoute` already creates and manages raw SVG elements imperatively in this same file.

## Edge cases

- **Reduced motion**: no coating, no overlay clone, no animation — `.visited` applied directly and instantly, consistent with every other animated feature in this codebase.
- **Country already visited on load** (not in `newlyVisitedCodes`): renders with `.visited` and solid accent fill immediately; never gets a coating or overlay, since it was never "unvisited" from this render's perspective.
- **Trip hub's Map tab**: that trip's own countries are always already-visited by the time the component mounts, so they render normally with no coating — this spec doesn't special-case per-page behavior; it's simply a consequence of which codes are in `visitedCodes` when each page renders.
- **Multiple countries revealing at once** (a trip with several countries): each gets its own staggered clone overlay and independent keyframe stepping, using the same `revealIndex`-based stagger already used today.
- **Unmount mid-animation**: if the component unmounts while a clone's keyframe-stepping `setInterval`/`setTimeout` chain is still running, the interval reference is cleared in the same way today's `setTimeout`-based reveal already tolerates (no explicit cleanup exists today either — this is not a regression, since the DOM node itself is discarded along with the component's rendered SVG on unmount).

## Testing

- **`scratchReveal.ts`**: Vitest unit tests — `SCRATCH_CLIP_KEYFRAMES` has exactly 6 entries, every entry matches `/^polygon\(.+\)$/`, the first entry's points are all at the 0%/100% extremes (full coverage), and the last entry collapses to a single repeated point (0% 0%).
- **`WorldMap.svelte`**: manual browser verification (this project's established convention for map/canvas UI) — unvisited countries show the diagonal coating texture, adding a new trip triggers the jagged scratch-peel reveal on its countries (staggered when multiple), reduced-motion shows an instant plain reveal with no coating or overlay, and the trip hub's Map tab (already-visited countries) is visually unaffected.
