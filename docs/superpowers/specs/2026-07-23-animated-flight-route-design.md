# Animated Flight Route — Design Spec

Date: 2026-07-23

## Overview

This is the third and final slice of `docs/ROADMAP.md` §4 "Trip Experience Polish" (packing cards + templates and destination preview shipped first). Opening a multi-country trip's Map tab now draws an animated route line between its countries, in visited order — a curved "flight path" look, drawn in leg by leg.

## Goals

- A pure, testable function that computes an SVG arc path between two points, bowing consistently in one rotational direction regardless of travel direction — so a whole multi-leg route reads as one coherent flight path rather than a tangle of differently-curved lines.
- `WorldMap.svelte` gains an optional `routeCodes` prop (a trip's countries in visited order). When it has 2 or more entries, the component draws one arc per consecutive pair of countries, in order, as an overlay on the existing map.
- Each leg draws in sequentially (leg 2 starts only after leg 1 finishes) the first time the Map tab renders with a qualifying route, using the standard SVG stroke-dasharray/stroke-dashoffset line-draw technique.
- A small marker at each waypoint (country centroid) alongside the drawn line.
- The trip hub's Map tab passes the trip's countries through as `routeCodes`, so a multi-country trip's Map tab shows the animated route automatically; a single-country trip (the majority) shows no route and looks exactly as it does today.

## Non-goals

- No new "Route" tab — this enhances the existing Map tab only.
- No replay button in this cycle — the animation plays once, automatically, on first render; after that it just stays drawn as a static route.
- No real flight-path curvature (great-circle projection, airport-level precision) — arcs are a simple geometric bow for visual effect, not a geographically accurate flight path.
- No deduplication of repeated countries (e.g. an A → B → A trip draws both legs literally, including doubling back over itself).

## Architecture

- **`src/lib/flightRoute.ts`** (new) — one pure function:
  ```ts
  export function computeArcPath(
    from: { x: number; y: number },
    to: { x: number; y: number },
    curvature = 0.15
  ): string
  ```
  Computes the straight-line distance and midpoint between `from` and `to`, offsets the midpoint perpendicular to the line by `curvature × distance` (always rotating the direction vector the same way, e.g. 90° counterclockwise), and returns an SVG path string `"M {from.x} {from.y} Q {controlX} {controlY} {to.x} {to.y}"` — a single quadratic Bézier curve per leg.
- **`src/lib/components/WorldMap.svelte`** (modify) — gains an optional prop `routeCodes?: string[]`. After the SVG loads (in the existing `onMount`), if `routeCodes.length >= 2`:
  1. For each code in `routeCodes`, find its `<path id={code}>` in the loaded SVG and compute its centroid via `path.getBBox()` (the same technique the existing zoom-to-country click handler already uses) — `{ x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 }`. A code with no matching path is skipped (defensive, mirrors the skip-unknown-code convention already used in `destinationPreview.ts`).
  2. Build one arc string per consecutive pair of resolved waypoints via `computeArcPath`.
  3. Render an SVG `<g class="flight-route">` containing one `<path>` per leg (`stroke: var(--color-accent)`, `fill: none`) plus a small `<circle>` marker at each waypoint.
  4. Animate each leg's `<path>` drawing in via `stroke-dasharray`/`stroke-dashoffset` (set both to the path's `getTotalLength()`, then transition `stroke-dashoffset` to `0`), with each leg's transition delayed until the previous leg's transition duration has elapsed — a simple cumulative `setTimeout`/CSS `animation-delay` chain, so the whole route reveals in visited order.
  5. Under `prefers-reduced-motion: reduce` (checked via the same `prefersReducedMotion()` helper already defined in this component), skip the animation entirely — render every leg with `stroke-dashoffset: 0` immediately.
- **`src/routes/trips/[id]/+page.svelte`** (modify) — the Map tab's `<WorldMap visitedCodes={new Set(trip.countries)} />` gains `routeCodes={trip.countries}`.

## Data flow & interaction notes

- `routeCodes` is just `trip.countries` — no new data model, no new storage. Order is whatever order countries were added to the trip in (already the order `trip.countries` is stored in).
- Waypoint centroids are computed at render time from the already-loaded SVG's actual path geometry, not from a separate static coordinate table — reusing the same `getBBox()`-based approach the map already uses for its zoom-on-click behavior, so there's no new per-country dataset to maintain.
- The route overlay is purely additive to the existing map markup — it doesn't change how `visitedCodes` highlighting or click/hover/zoom behavior work.

## Edge cases

- **Single-country trip** (`routeCodes.length < 2`): no route rendered at all; `WorldMap` behaves exactly as it does today.
- **Unknown country code**: skipped when resolving waypoints, same defensive pattern as elsewhere in the app; a route with one skipped waypoint simply has one fewer leg (or no route at all if fewer than 2 waypoints resolve).
- **Repeated country** (A → B → A): both legs draw in order, including the leg that doubles back over a previous one — no special-casing.
- **Reduced motion**: the entire route (all legs) appears immediately, fully drawn, with no sequential reveal delay.

## Testing

- **`flightRoute.ts`** gets Vitest unit tests: `computeArcPath` returns a well-formed `"M...Q...`" path string; the control point's perpendicular offset has magnitude `curvature × distance` for a known pair of points; reversing `from`/`to` produces a control point on the geometrically opposite side of the straight line (confirming the "always the same rotational direction relative to travel direction" rule, not a random or direction-dependent flip).
- **`WorldMap.svelte`'s route rendering**: manual browser verification (this project's established convention for this DOM-heavy, real-SVG component — the existing zoom-to-country feature was verified the same way) — confirm legs draw in sequentially in visited order for a multi-country trip, waypoint markers appear, a single-country trip shows no route, and simulated reduced-motion shows the full route immediately with no animation.
