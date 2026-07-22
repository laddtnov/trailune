# Ambient Background Motion — Design Spec

Date: 2026-07-22

## Overview

This implements the last remaining piece of `docs/ROADMAP.md` §5 "Ambient Design & Feel": subtle, slowly-drifting gradient blobs behind the app's content — "the app should breathe," per the roadmap's framing. Tiny details and dynamic theme presets (the rest of §5) already shipped; this closes out the section.

## Goals

- Two large, blurred, theme-colored gradient blobs drifting slowly behind all page content, on every page (app-wide, same scope as the existing paper texture).
- Pure CSS animation — no JavaScript, no new dependencies, consistent with every other animation already in this codebase (paper texture, nav globe-spin/letter-hop, reveal-pulse, etc.).
- Automatically correct under all four theme presets (Travel Journal, Explorer Night, Golden Sunset, Polar Morning) by using the active theme's own CSS custom properties rather than fixed colors.
- Respects `prefers-reduced-motion: reduce` via the existing global CSS override — no new reduced-motion code path needed.

## Non-goals

- No cloud-shaped assets or literal cloud imagery — this cycle is the "drifting gradient blobs" variant, not "cloud drift."
- No scroll-based parallax — the blobs are fixed-position and drift on their own timer, independent of scroll position.
- No per-page variation — the same treatment applies everywhere, matching the paper texture's existing app-wide scope.
- No new data model or backend changes.

## Architecture

- **`src/lib/components/AmbientBackground.svelte`** (new) — a presentational component with two `<div>`s, each a large (~420px), heavily blurred (`filter: blur(70px)`), circular gradient blob:
  - Blob 1: `background: var(--color-accent)`, positioned top-left, `18s` drift animation.
  - Blob 2: `background: var(--color-teal)`, positioned bottom-right, `22s` drift animation with a negative `animation-delay` offset so the two never move in sync.
  - Both blobs sit inside a `position: fixed`, full-viewport, `pointer-events: none`, low-`z-index` wrapper, so they never block clicks or scroll with the page.
  - Opacity `0.22` on both blobs (the approved "Option C — more colorful" intensity from brainstorming), so they read as an intentional, colorful ambient layer rather than a barely-visible tint.
  - The drift animation itself (`@keyframes drift`) moves each blob via `transform: translate(...) scale(...)` only — no layout-affecting properties — for cheap, GPU-friendly animation.
- **`src/routes/+layout.svelte`** (modify) — render `<AmbientBackground />` once, near the top of the template (before the header), so it's present on every route.

## Data flow & interaction notes

- No data flow — this is a static, self-animating presentational component with no props, no state, and no interaction handling.
- Because the blobs use `var(--color-accent)` and `var(--color-teal)` (already defined per-theme in `app.css`'s four `:root[data-theme='...']` blocks), switching themes on `/settings` re-colors the blobs automatically, with zero changes needed to this component.
- Stacking order: the blobs sit behind the paper-texture body background and all page content. `z-index` and `pointer-events: none` on the fixed wrapper ensure they're purely decorative.

## Edge cases

- **Reduced motion**: the existing global `@media (prefers-reduced-motion: reduce)` block in `app.css` already zeroes `animation-duration` on `*`, so the blobs freeze in place with no additional code — the same mechanism every other animation in this app already relies on.
- **Viewport overflow**: the wrapper is sized to the viewport (`position: fixed; inset: 0`) with `overflow: hidden`, so the blobs (which extend beyond their own container edges via negative positioning, per the approved mockup) never introduce a scrollbar.
- **Performance**: `blur()` is applied once per blob element, not recalculated per animation frame beyond the browser's own compositing, and only `transform` is animated — no layout thrashing.

## Testing

Following this project's established convention (manual browser verification for animation/UI, since this component has no pure logic to unit test):
- Manually check all four themes on a couple of pages (home, `/map`) to confirm the blobs read as intended — colorful and present (per the approved Option C) without overwhelming the content or clashing with any theme's canvas/card colors.
- Toggle `prefers-reduced-motion` and confirm the blobs freeze in place with no animation.
- Confirm the blobs don't block clicks anywhere (buttons, links, the map's country paths) and don't introduce a horizontal or vertical scrollbar.
