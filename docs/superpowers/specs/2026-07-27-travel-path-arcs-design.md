# Travel Path Arcs — Design Spec

Date: 2026-07-27

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas" — the section's own framing calls this "the biggest visual idea" in the list. On the main `/map` page, animated lines connect every country in the order it was first visited, across the user's *entire* trip history — "every trip becomes part of your travel story," the map gradually filling with a global route as more trips are logged.

This is distinct from the already-shipped per-trip Animated Flight Route (§4), which only draws arcs between a single trip's own countries, on that trip's own Map tab. That feature's rendering machinery (`WorldMap.svelte`'s `routeCodes` prop, `flightRoute.ts`'s arc-path math) is fully reused here — this spec adds one new pure function and one page-level wiring change, nothing else.

## Goals

- On `/map`, animated arcs connect every visited country in the order it was first visited, derived from all trips sorted by `startDate` ascending.
- The full route animates in (leg by leg) every time `/map` loads — not just newly-added legs since a prior visit.
- A country revisited on a later trip does not produce a new leg back to it — each country appears exactly once in the route, at the position of its earliest visit.
- Reuses the exact same visual treatment (curved arc legs, waypoint markers, staggered leg-by-leg animation, `prefers-reduced-motion` handling) already shipped for the per-trip flight route — no new visual design needed.

## Non-goals

- No changes to `WorldMap.svelte` itself — it already accepts a `routeCodes: string[]` prop and renders arcs/waypoints between them; this feature only supplies it with a different (global, cross-trip) list of codes.
- No changes to the per-trip Animated Flight Route on the trip hub's Map tab — that feature is untouched.
- No "only animate new legs since last visit" behavior — every page load re-animates the whole route from scratch, matching how the per-trip route already behaves on its own page.
- No handling of within-trip country ordering beyond what already exists — a trip's own `countries` array order is used as-is, the same order the per-trip route already relies on.

## Architecture

- **`src/lib/flightRoute.ts`** (modify) — add:
  ```ts
  import type { Trip } from '$lib/types';

  export function computeGlobalRouteCodes(trips: Trip[]): string[] {
    const sorted = [...trips].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
    const seen = new Set<string>();
    const codes: string[] = [];
    for (const trip of sorted) {
      for (const code of trip.countries) {
        if (seen.has(code)) continue;
        seen.add(code);
        codes.push(code);
      }
    }
    return codes;
  }
  ```
  Pure function, no DOM — sorts a *copy* of the trips array (never mutates the caller's array), flattens each trip's countries in that trip's existing stored order, and keeps only each country's first occurrence across the whole flattened sequence.

- **`src/routes/map/+page.svelte`** (modify) — imports `computeGlobalRouteCodes` from `$lib/flightRoute`, computes `let globalRouteCodes = $derived(computeGlobalRouteCodes(trips))`, and passes it to the existing `<WorldMap>` invocation as `routeCodes={globalRouteCodes}` (a new prop value on an existing component usage — `WorldMap.svelte` already defines this prop and defaults it to `[]` when unset, so this is strictly additive).

## Data flow & interaction notes

- `trips` is already loaded on `/map` today (used to derive `visitedCodes`); `computeGlobalRouteCodes` reads the same array, no new data fetching.
- `WorldMap.svelte`'s existing `buildFlightRoute` internal function already: resolves each code's on-screen centroid via `getBBox()`, draws sequential animated arcs with staggered `setTimeout`-based leg reveals, adds waypoint markers, and skips entirely if given fewer than 2 codes (`routeCodes.length < 2`) — all of this is reused verbatim.
- This composes with everything else already on `/map` (scratch-map coating/reveal, hover popover, click-to-zoom) without any interaction changes, since `routeCodes` is an independent, additive prop that doesn't touch click/hover event wiring.

## Edge cases

- **Fewer than 2 total countries visited** (0 or 1 trip covering only one country): `computeGlobalRouteCodes` returns a list of length < 2, and `WorldMap.svelte`'s existing guard means no route is drawn — same behavior as the per-trip route's existing single-country-trip case.
- **A country revisited on a later trip**: only its first-visit position contributes to the route; the later trip's occurrence of that same code is skipped by the `seen` set, so no backtracking leg is ever drawn to it.
- **Two trips with the same `startDate`**: `Array.prototype.sort` is stable in modern JS engines, so trips with identical dates retain their original relative order from the input array — an acceptable, deterministic tie-break with no special-casing needed.
- **`prefers-reduced-motion`**: unchanged — `WorldMap.svelte`'s existing `buildFlightRoute` already skips the staggered animation and shows all legs statically when this is set, and that logic is untouched.

## Testing

- **`flightRoute.ts`**: new Vitest unit tests for `computeGlobalRouteCodes` — trips are ordered by `startDate` correctly regardless of the input array's order; a country appearing in an earlier trip and again in a later trip appears exactly once, at its earlier position; a trip history covering only one total country returns a list of length < 2; the input `trips` array is not mutated (its element order is unchanged after the call).
- **`/map` page**: manual browser verification (this project's established convention for map UI) — the full route animates leg-by-leg across the whole map on page load, a revisited country does not produce a duplicate/backtracking leg, and the route composes correctly alongside the existing scratch-map coating/reveal, hover popover, and click-to-zoom behavior already on this page.
