# Ambient Delight Details — Design Spec

Date: 2026-07-20

## Overview

This turns `docs/ROADMAP.md` §5's "tiny details" list into a scoped feature: six small, independent visual/interaction touches that make the app feel more alive and finished, without adding any new data or backend. This is a scoped slice of §5 — **dynamic theme presets** (which need real theme-switcher infrastructure that doesn't exist yet) are deferred to their own future cycle, and **ambient background motion** (a persistent moving-gradient/parallax background layer) is likewise deferred as its own cycle, since both are architecturally distinct from these smaller touches.

## Goals

- **Skeleton loaders**: Trips, Map, and Stats pages show shaped placeholder content while their `onMount` data load is in flight, replacing today's blank gap.
- **Passport-stamp animation**: the newly-created trip's card plays a one-time stamp-settle animation when it appears in the trips list.
- **Soft paper texture**: a subtle background texture on the app canvas, replacing the current flat color.
- **Gentle page transitions**: a brief fade/slide transition plays on route changes between pages.
- **Animated counters on `/stats`**: every numeric stat on the page counts up from 0 on load, matching the animation already used on the home page and map.
- **Zoom-to-country on map click**: clicking a country smoothly zooms the map to center on it; clicking outside resets the zoom back to the full world view.

All six respect `prefers-reduced-motion: reduce` (skipping straight to final/steady states), matching every prior animation feature in this app.

## Non-goals

- No dynamic theme presets (Travel Journal / Explorer Night / Golden Sunset / Polar Morning) — deferred; this app currently has exactly one fixed theme with no theme-switching infrastructure at all, and building that infrastructure is a bigger, separate project.
- No persistent ambient background motion (moving gradients, cloud drift, parallax) — deferred as its own cycle.
- No compass loading spinner — superseded by skeleton loaders, which cover the same "blank while loading" gap more consistently across pages.
- No new data model changes — every touch here is presentation-only.

## Architecture

- **`src/lib/components/Skeleton.svelte`** (new) — a generic placeholder block (configurable width/height/radius via props) with a CSS shimmer sweep animation. Used to build page-specific skeleton layouts:
  - Trips list (`src/routes/+page.svelte`): 3 `TripCard`-shaped skeleton blocks shown while a new `loading` boolean is `true` (set `false` once `onMount`'s `listTrips()`/`loadWorldCountries()` resolve), shown instead of both the real content and the "No trips yet" empty state.
  - Map (`src/routes/map/+page.svelte`): one large skeleton rectangle in place of the SVG while `loadWorldCountries()` is in flight.
  - Stats (`src/routes/stats/+page.svelte`): 7 skeleton cards in place of the metric grid while data loads.

- **Passport-stamp animation** (modify `src/routes/+page.svelte`) — a new `justCreatedTripId: string | null` state, set immediately after `createTrip()` succeeds in the existing `submit()` handler. `TripCard` (modify `src/lib/components/TripCard.svelte`) gains an optional `stamping` prop; when true, applies a `.stamping` CSS class with a ~400ms keyframe (slight rotate/scale-in settling to rest, no bounce). The parent clears `justCreatedTripId` via `setTimeout` matching the animation duration so it never replays on later re-renders of the same card.

- **Soft paper texture** (modify `src/app.css`) — a small inline SVG fractal-noise data URI layered as a low-opacity `background-image` under the existing `--color-canvas` on `body`, no new asset file.

- **Gentle page transitions** (modify `src/routes/+layout.svelte`) — wrap the existing `{@render children()}` in a `{#key page.url.pathname}` block using `svelte/transition`'s `fade` (or a few-pixel `fly`), ~200ms, `--ease-out-quart`. The existing global reduced-motion CSS block in `app.css` already zeroes all transition/animation durations, so no separate reduced-motion branch is needed here.

- **Animated counters on `/stats`** (modify `src/routes/stats/+page.svelte`) — replace each static numeric display with a `tweened` store (mirroring the home page's `visitedCount`/`barPercent` pattern), animating from 0 to the final computed value on mount.

- **Zoom-to-country on map click** (modify `src/lib/components/WorldMap.svelte`) — the existing click handler (which already calls `oncountryclick`) additionally computes the clicked `<path>`'s `getBBox()` and tweens the SVG's `viewBox` attribute from the full-world box to a padded box around that country, over ~500ms with `cubicOut`. The existing tap-outside-to-dismiss logic (already built in `map/+page.svelte` for the popover) is extended to also reverse this tween back to the full-world `viewBox` when it fires. Popover/panel click behavior is unaffected — this is a purely additive visual layer alongside it.

## Data flow & interaction notes

- **Skeleton timing**: each page's existing `onMount` already sets its data arrays; a `loading` flag (default `true`, flipped to `false` at the end of `onMount`) is the only new piece of state per page. No new fetch logic — this only gates which markup renders during the same async window that already exists today.
- **Stamp animation is single-shot per creation, not per page-load**: unlike the Living Map's reveal or the Achievements unlock (which diff against a persisted "last seen" state across page loads), the stamp only needs to fire once, synchronously, right after the user's own action — no localStorage tracking needed.
- **Page transition and route content**: `{#key page.url.pathname}` forces Svelte to treat each route as a fresh keyed block, so the `in`/`out` transitions fire on every navigation between the app's pages (Trips ↔ Map ↔ Stats ↔ Packing ↔ a trip hub), not just first load.
- **Map zoom bounds**: the "full-world" `viewBox` is the SVG's original, unmodified viewBox (captured once when the SVG loads); the "zoomed" `viewBox` is a bounding box around the clicked country's path, padded by a fixed margin (e.g. 20% of the bbox's own width/height) so the country isn't flush against the edges.

## Testing

Following this project's established convention (Vitest for pure logic, manual browser verification for animation/UI):

- Vitest unit test for the bounding-box-to-padded-viewBox math in the map zoom (a pure function taking a bbox and returning a padded viewBox string/tuple) — this is genuinely isolable logic, unlike the rest of this feature.
- Manual browser verification: confirm skeleton placeholders appear briefly on Trips/Map/Stats before real content (may require throttling or a brief artificial delay to observe reliably) and never appear alongside the real "No trips yet" empty state; create a trip and confirm the stamp animation plays once on its card and doesn't replay on subsequent re-renders; confirm the paper texture is visible but subtle against the existing canvas color; navigate between pages and confirm the fade/slide transition plays each time; confirm `/stats` numbers count up on load; click a country on the map and confirm it zooms in smoothly, then click outside and confirm it zooms back out; toggle `prefers-reduced-motion` and confirm every one of the above skips straight to its final/steady state with no animation.
