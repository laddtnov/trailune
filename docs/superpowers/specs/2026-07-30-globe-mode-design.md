# Globe Mode (MVP) — Design Spec

Date: 2026-07-30

## Overview

This is the last remaining item in `docs/ROADMAP.md` §7 "Polishing Ideas": *"Globe mode (long-term, aspirational) — An alternative 3D globe view of the map (via a library like Three.js or Cesium) that users can spin, as a premium-feeling alternative to the flat SVG map. Meaningfully larger scope than anything else in this list — a new rendering technology, not a CSS/data change — and should only be considered once the flat map's remaining ideas (path arcs, heatmap) are exhausted."*

Investigation before design confirmed: no 3D/WebGL rendering exists anywhere in the codebase today (only unrelated hits — the "globetrotter" achievement name and a purely decorative CSS-animated spinning nav badge). No 3D library is installed (`package.json` dependencies are just `idb` and `resend`). The flat map's remaining ideas (travel path arcs, visit-intensity heatmap) are both already shipped, satisfying the roadmap's own precondition for considering this item.

Given this is explicitly the largest-scope item in §7 — a new rendering technology, not a CSS/data change — this spec deliberately scopes down to an MVP: a spinnable 3D globe showing visited/unvisited countries only, with the flat map's richer interactions (popover, arcs, heatmap, reveal animation) explicitly deferred to future cycles once this base exists.

## Goals

- A new `/globe` page shows an interactive 3D globe of the world.
- Visited countries render highlighted; unvisited countries render neutral — the same binary distinction the flat map started with, derived from trip data exactly the same way (`new Set(trips.flatMap((t) => t.countries))`).
- Users can rotate the globe by dragging, and zoom with scroll/pinch.
- The globe respects the currently selected theme (Travel Journal, Explorer Night, Golden Sunset, Polar Morning) for its visited-country color, reading the theme's accent color at render time rather than hardcoding a palette.
- A new "Globe" link appears in the main navigation, alongside Map/Dream Map/Timeline/Calendar.

## Non-goals

- No hover/click country popover (stats, visit count, etc.) — flat map only, this cycle.
- No travel-path arcs or visit-intensity heatmap tiers on the globe — binary visited/unvisited only.
- No scratch-reveal-style animation when a country becomes newly visited.
- No per-trip globe view in the trip hub (the trip hub's Map tab keeps using the flat `WorldMap` component, unchanged).
- No auto-rotation and no `prefers-reduced-motion` handling for rotation — there is no automatic motion to gate, since rotation only happens in direct response to user drag input.
- No changes to the existing flat map (`/map`, `WorldMap.svelte`) — this is an additive, separate page.

## Architecture

- **New dependencies**: `three` and `three-globe` (added to `package.json` `dependencies`) — the first non-trivial third-party dependencies this app has taken beyond `idb`/`resend`. `three-globe` is a purpose-built wrapper over Three.js specifically for "spinnable globe with country/data overlays," handling sphere geometry, GeoJSON polygon rendering, and providing built-in drag-rotate + scroll-zoom camera controls — avoiding the need to hand-roll raw Three.js scene/camera/raycasting code for this MVP.

- **`static/world-countries.geojson`** (new bundled asset) — a public-domain world country-boundary dataset at 110m resolution (Natural Earth via the well-known `world-atlas`/`ne_110m_admin_0_countries` data, the same source class of data this kind of "spinnable globe with country polygons" feature typically uses). Each feature's properties must include (or be mapped to) an ISO 3166-1 alpha-2 code, matching the two-letter codes already used everywhere else in this app (`src/lib/countries.ts` parses the same alpha-2 codes from the flat map's SVG path `id` attributes) — this is the join key between "this GeoJSON polygon" and "this trip's `countries: string[]` entry." No live geo/mapping service is called — this is a static, bundled file, following the exact same pattern as `static/world-map.svg`.

- **`src/lib/globeCountries.ts`** (new):
  ```ts
  export interface GlobeCountryFeature {
    code: string; // ISO alpha-2
    geometry: unknown; // GeoJSON Feature['geometry'], typed loosely to avoid a new geojson-types dependency
  }

  export async function loadGlobeCountries(): Promise<GlobeCountryFeature[]> {
    const res = await fetch('/world-countries.geojson');
    const data = await res.json();
    return data.features
      .map((f: any) => ({ code: f.properties.ISO_A2 as string, geometry: f.geometry }))
      .filter((f: GlobeCountryFeature) => /^[A-Z]{2}$/.test(f.code));
  }
  ```
  Mirrors the existing `countries.ts`'s `loadWorldCountries`-style async-fetch-and-parse pattern (fetching a bundled static asset, filtering to valid 2-letter codes), just over a different bundled file.

- **`src/lib/components/Globe.svelte`** (new):
  - Props: `{ visitedCodes: Set<string> }` — same shape already used by `WorldMap.svelte`, so a future consumer could pass the identical value.
  - On mount: loads `globeCountries` via `loadGlobeCountries()`, constructs a `ThreeGlobe` instance (`three-globe`'s default export) with `.polygonsData(features)`, `.polygonCapColor((feature) => visitedCodes.has(feature.code) ? visitedColor : neutralColor)`, mounts it into a Three.js `Scene`/`PerspectiveCamera`/`WebGLRenderer` sized to the container, and enables `three-globe`'s built-in `controls()` (drag-rotate, scroll-zoom — both ship with the library, no extra dependency).
  - `visitedColor` is read once at mount via `getComputedStyle(document.documentElement).getPropertyValue('--color-accent')`, so switching the app's theme before visiting `/globe` picks up that theme's accent color; the globe does not need to react live to a theme switch happening while already mounted (a page reload after changing themes is an acceptable, consistent-with-elsewhere behavior, since no other page reacts to a theme change without a reload either).
  - A render loop (`requestAnimationFrame`) drives the Three.js renderer, cleaned up via `onDestroy` (canceling the animation frame and disposing the renderer) to avoid leaking a running render loop if the user navigates away.

- **`src/routes/globe/+page.svelte`** (new):
  - Loads trips via the existing `listTrips()` on mount, computes `visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)))` — the same derivation already used by `/map`.
  - Shows a loading skeleton (reusing the existing `Skeleton` component) while trips are loading and the WebGL context is initializing, then renders `<Globe {visitedCodes} />`.

- **`src/routes/+layout.svelte`** (modify) — add `{ href: '/globe', label: 'Globe' }` to the existing nav links array, positioned after the existing Map/Dream Map/Timeline/Calendar entries.

## Data flow & interaction notes

- Fully derived, read-only — no writes, no new `localStorage`/`IndexedDB` usage. The globe reads the same trip data every other page already reads.
- The GeoJSON asset is fetched once per page visit (standard browser HTTP caching applies on repeat visits, same as `world-map.svg` already benefits from).
- Drag-rotate and scroll-zoom are the only interactions — no click handling on individual countries this cycle (Non-goals).

## Edge cases

- **Zero trips**: `visitedCodes` is an empty set, so `polygonCapColor` always resolves to the neutral color for every country — the globe still renders (an all-neutral world), consistent with how the flat map shows an all-unvisited world with zero trips rather than erroring or showing nothing.
- **A GeoJSON feature's ISO_A2 code doesn't match any code the app otherwise knows about** (a genuinely obscure territory absent from the flat map's own 211-country SVG): it simply never matches `visitedCodes` (which only ever contains codes the user actually selected when creating a trip, themselves drawn from the flat map's own country list) — renders as neutral, same as any other unvisited country. No crash, no special-casing needed.
- **WebGL unavailable in the browser** (very old browser, or an environment with WebGL explicitly disabled): `three-globe`/Three.js's `WebGLRenderer` construction will throw. This MVP does not add a graceful "WebGL not supported" fallback message — accepted as an edge case affecting an extremely small fraction of modern users, and out of scope for a first cycle whose own framing is "a premium-feeling alternative," not a required feature.
- **Very slow network / large asset on first load**: the GeoJSON file at 110m resolution is deliberately chosen for its small size (~100–150KB) specifically to keep this concern minor; the existing loading-skeleton pattern already covers the visible wait.

## Testing

- **New unit tests** for `loadGlobeCountries` in `src/lib/globeCountries.test.ts`: given a mocked `fetch` returning a small sample GeoJSON `FeatureCollection`, confirms it correctly maps `ISO_A2` to `code`, filters out any feature with a non-2-letter code, and correctly preserves each feature's `geometry`.
- **No automated tests for `Globe.svelte` itself** — this project has no existing precedent for testing WebGL/canvas-rendering components (the flat map's `WorldMap.svelte` similarly has no component-level test, only its supporting pure functions like `mapZoom.ts` do), and Three.js rendering isn't practically unit-testable without a real GPU/WebGL context. Manual browser verification is this project's established convention for this class of feature, same as `WorldMap.svelte`/`DreamMap.svelte` before it.
- **Manual browser verification**: seed a few trips, open `/globe`, confirm visited countries render in the current theme's accent color and unvisited countries render neutral; confirm drag rotates the globe and scroll/pinch zooms it; switch themes, reload, and confirm the visited color updates to match; confirm the "Globe" nav link is present and navigates correctly; confirm no console errors and no lingering render loop after navigating away (checked via a quick before/after `requestAnimationFrame` call-count sanity check, or simply confirming no dev-tools warning about a detached canvas still rendering).
