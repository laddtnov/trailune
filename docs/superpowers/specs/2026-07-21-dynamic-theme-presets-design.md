# Dynamic Theme Presets — Design Spec

Date: 2026-07-21

## Overview

This implements `docs/ROADMAP.md` §5's "dynamic themes" idea: four named theme presets — Travel Journal (the current, unchanged default), Explorer Night, Golden Sunset, and Polar Morning — selectable from a new Settings page, applied instantly and persisted locally. This is a scoped slice of §5 — ambient background motion is deferred to its own future cycle, since it's an architecturally distinct visual layer independent of theming.

## Goals

- Four selectable color themes, all built now (not just Travel Journal + one new preset), since the switcher/persistence infrastructure costs the same regardless of preset count.
- A new `/settings` page hosting the theme picker (this app currently has no settings/preferences surface at all).
- Selecting a theme re-colors the entire app instantly, with no page reload.
- The chosen theme persists across sessions (localStorage, matching this app's local-only architecture) and survives reload with no flash of the wrong theme.
- Theme selection is purely manual — no `prefers-color-scheme` auto-detection or auto-switching.

## Non-goals

- No ambient background motion (moving gradients, cloud drift, parallax) — deferred as its own future cycle, per the roadmap's own framing of these as separate ideas.
- No auto dark-mode detection or time-of-day auto-switching — every preset is a manual, explicit choice.
- No broader settings/preferences beyond the theme picker in this cycle — the new Settings page starts with exactly one section (theme), leaving room for future preferences without building for them now.
- No new npm dependencies.

## Architecture

- **`src/app.css`** (modify) — the existing `@theme` block is unchanged and becomes the "Travel Journal" preset's values (already the current look). Three new `:root[data-theme="..."]` blocks are added — `explorer-night`, `golden-sunset`, `polar-morning` — each redefining the same set of `--color-*` custom properties used by the base theme. A fourth explicit block, `:root[data-theme="travel-journal"]`, duplicates the base `@theme` values so all four presets are symmetric and explicit (no implicit "absence of data-theme" fallback). Because every component in this codebase already reads colors via `var(--color-x)` (never Tailwind-generated utility classes like `bg-accent`), swapping the `data-theme` attribute on `<html>` re-themes the entire app instantly with zero changes to any existing component.
- **`src/lib/theme.ts`** (new) — the pure/browser-boundary theme utility:
  - `THEMES`: an ordered array of `{ id, name }` for the four presets (Travel Journal first/default).
  - `getStoredTheme(): string` — reads localStorage, falling back to `'travel-journal'` if empty or the stored value isn't a known theme id.
  - `setStoredTheme(id: string): void` — persists to localStorage.
  - `applyTheme(id: string): void` — sets `document.documentElement.dataset.theme = id` and calls `setStoredTheme(id)`.
- **`src/app.html`** (modify) — a small inline `<script>` added to `<head>`, running synchronously before SvelteKit hydrates: reads localStorage directly (vanilla JS, no imports) and sets `data-theme` on `<html>` immediately, preventing a flash of the wrong theme on load.
- **`src/routes/settings/+page.svelte`** (new) — renders `THEMES` as a set of preset cards (each with a small live-color swatch preview, matching the visual style already approved during brainstorming — a mini nav band + stat card + accent button in that preset's colors). Clicking a card calls `applyTheme(id)` immediately; the currently-active theme is visually indicated (e.g. a selected border/checkmark, matching the existing tab-picker `aria-pressed` convention used elsewhere in this app).
- **`src/routes/+layout.svelte`** (modify) — add `{ href: '/settings', label: 'Settings' }` to the existing `navItems` array.

## Data flow & interaction notes

- Theme selection is instantaneous and reload-free: `applyTheme` mutates the `data-theme` attribute directly via the DOM, and since all color references are CSS custom properties, the browser repaints immediately with no Svelte state plumbing required across components.
- On every page load (not just `/settings`), `app.html`'s inline script is what actually determines the initial theme — the Settings page itself only needs to call `getStoredTheme()` on mount to know which card to show as "currently selected," and `applyTheme()` when the user picks a new one.
- No interaction with the existing `prefers-reduced-motion` handling — this feature introduces no new animations.

## Edge cases

- **Invalid or stale localStorage value** (e.g. a preset id that no longer exists after a future change): `getStoredTheme()` falls back to `'travel-journal'`.
- **First-time visitor with no stored preference**: defaults to `'travel-journal'`, matching today's only look.
- **JS-disabled or pre-hydration flash**: mitigated by the inline `app.html` script running before first paint; not eliminable to zero (an inline script still runs after the initial HTML parse begins), but eliminates the flash that would otherwise occur waiting for Svelte to hydrate and run `onMount`.

## Approved palette values

These are the exact color values shown in the mockup you approved during brainstorming, to carry forward into the implementation plan verbatim. Each preset redefines the same `--color-*` custom properties currently in `app.css`'s `@theme` block (canvas, ink, card, accent, teal, danger, success) — only `canvas`, `ink`, `card`, and `accent` are given new hero values below; `teal`/`danger`/`success` reuse Travel Journal's existing hue families adjusted for contrast against each preset's canvas (exact values specified in the implementation plan).

**Explorer Night:**
- `--color-canvas`: `oklch(18% 0.02 260)`
- `--color-ink`: `oklch(92% 0.01 90)`
- `--color-card`: `oklch(24% 0.025 255)`
- `--color-card-border`: `oklch(34% 0.03 255)`
- `--color-accent`: `oklch(72% 0.15 80)`
- `--color-ink-band`: `oklch(12% 0.02 260)`

**Golden Sunset:**
- `--color-canvas`: `oklch(96% 0.02 50)`
- `--color-ink`: `oklch(24% 0.04 30)`
- `--color-card`: `oklch(94% 0.05 45)`
- `--color-card-border`: `oklch(84% 0.07 40)`
- `--color-accent`: `oklch(60% 0.2 20)`
- `--color-ink-band`: `oklch(30% 0.06 30)`

**Polar Morning:**
- `--color-canvas`: `oklch(97% 0.008 230)`
- `--color-ink`: `oklch(25% 0.02 240)`
- `--color-card`: `oklch(95% 0.015 220)`
- `--color-card-border`: `oklch(85% 0.025 220)`
- `--color-accent`: `oklch(55% 0.12 220)`
- `--color-ink-band`: `oklch(28% 0.03 235)`

## Testing

Following this project's established convention (Vitest for pure logic, manual browser verification for UI):

- Vitest unit tests for `src/lib/theme.ts`: `getStoredTheme()` returns `'travel-journal'` when localStorage is empty, returns `'travel-journal'` when localStorage holds an unrecognized value, and returns the stored value when it's a valid theme id; `setStoredTheme()` writes the expected localStorage key/value.
- Manual browser verification: visiting `/settings` and clicking each of the four presets, confirming the whole app (nav, cards, buttons, map) re-themes instantly with no reload; reloading the page after selecting a non-default theme and confirming it persists with no visible flash of Travel Journal; spot-checking Trips, Map, Stats, and Packing pages under each of the four palettes for visual coherence (contrast, readability) beyond just the Settings page itself.
