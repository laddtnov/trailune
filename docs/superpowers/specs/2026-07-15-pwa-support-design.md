# PWA Support — Design Spec

Date: 2026-07-15

## Overview

Make Trailune installable and fully offline-capable. Since the app already has zero runtime network dependencies (all data lives in `localStorage`/IndexedDB), precaching the app shell is enough to make the entire app work offline once visited once — no offline-fallback pages or background-sync logic needed.

## Goals

- Trailune can be installed from the browser (desktop address-bar icon, mobile "Add to Home Screen").
- Once loaded, the app works fully offline — all routes, styles, and scripts are precached.
- App icons match the existing circular "T" brand mark, generated from the existing `static/favicon.svg`, not new artwork.
- Manifest colors match the existing design tokens (`--color-ink-band` for `theme_color`, `--color-canvas` for `background_color`).

## Non-goals

- No custom "Install app" button or `beforeinstallprompt` handling — installation relies entirely on the browser's native affordance.
- No offline-specific UX (no "you're offline" banner, no offline fallback page) — the app already works without a network by design, so there's nothing to special-case.
- No push notifications, background sync, or any other service-worker capability beyond offline asset caching.
- No changes to the existing favicon (`static/favicon.svg` stays as-is for the browser tab icon; new PNGs are generated alongside it for the install icon).

## Tooling

**`@vite-pwa/sveltekit`** (new dev dependency), added to `vite.config.ts` alongside the existing `tailwindcss()` and `sveltekit()` plugins. It generates the web app manifest and a Workbox-based service worker automatically, configured to precache all built assets (the SvelteKit app shell) — the standard "auto-update precache" pattern, not a hand-rolled service worker.

## Icons

A new one-off Node script (`scripts/generate-icons.mjs`), run manually once (not part of the build/CI pipeline, since the source SVG rarely changes), uses `sharp` (new dev dependency) to rasterize `static/favicon.svg` into:

- `static/icon-192.png` (192×192)
- `static/icon-512.png` (512×512)

Both committed to the repo as static assets, same as the existing `static/favicon.svg`.

## Manifest

Configured via the `@vite-pwa/sveltekit` plugin options in `vite.config.ts`:

```
name: "Trailune"
short_name: "Trailune"
description: "Track every journey."
display: "standalone"
theme_color: "#2c1a14"   (hex equivalent of --color-ink-band: oklch(24% 0.032 38))
background_color: "#faf8f6"   (hex equivalent of --color-canvas: oklch(98% 0.003 60))
icons: [
  { src: "icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" }
]
```

## Testing

- No new Vitest coverage — this is build/config-level tooling with no application logic to unit test, consistent with how the project already treats build-tool changes (e.g. no tests were added for the Tailwind v4 setup itself).
- Verification is manual: `npm run build && npm run preview`, then in a browser — confirm the manifest is served, confirm the install prompt/icon appears, install the app, then go offline (devtools "Offline" throttling) and confirm the app still loads and all routes still navigate.
