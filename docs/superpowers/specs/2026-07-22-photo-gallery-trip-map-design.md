# Photo Gallery + Trip Map Tabs — Design Spec

Date: 2026-07-22

## Overview

This is the third slice of `docs/ROADMAP.md` §3 "Journal, Memories & Timeline" (the journal reframe and journey timeline shipped first, in PR #33 and PR #34). The roadmap bullet "Photo gallery per trip" originally bundled gallery/map/journal/timeline tabs together; this spec scopes it down to two new trip hub tabs — **Gallery** and **Map** — leaving a per-trip Timeline tab as an unscoped future idea (it isn't part of this cycle).

## Goals

- A new **Gallery** tab within the trip hub, aggregating every photo attached to that trip's journal entries and tips into one grid.
- Clicking a photo opens a lightbox: a full-size overlay with prev/next navigation and a caption identifying the photo's source ("Journal · Jul 14" or "Tip · Sightseeing").
- A new **Map** tab within the trip hub, showing just that trip's countries highlighted on the existing world map — a quick visual reference, not an interactive experience.
- New tab order: Journal, Gallery, Map, Packing, Tips, Do's & Don'ts.

## Non-goals

- No per-trip Timeline tab in this cycle — that idea is left unscoped for a future slice.
- No click/hover/zoom-to-country interactivity on the Map tab — it reuses `WorldMap.svelte` in its simplest, non-interactive configuration (no `oncountryclick`/`oncountryhover` handlers), avoiding any duplication of the main `/map` page's popover and zoom logic.
- No new photo upload flow — the Gallery tab is read-only, surfacing photos that are already uploaded via the existing journal-entry and tip forms.
- No new data model changes — `JournalEntry`, `TipEntry`, and `Photo` are all unchanged. This is pure aggregation and re-presentation of existing data.

## Architecture

- **`src/lib/tripPhotos.ts`** (new) — a single async function `collectTripPhotos(tripId: string): Promise<GalleryPhoto[]>`:
  - `GalleryPhoto = { photoId: string; url: string; caption: string }`.
  - Reads `listJournalEntries(tripId)` and, for every `photoIds[]` entry, resolves the photo via the existing `getPhoto(id)` (from `$lib/storage/photos`) and builds the caption `"Journal · {formatted date}"`.
  - Reads `listTips(tripId)` and, for every tip with a non-null `photoId`, resolves it the same way and builds the caption `"Tip · {category label}"` (using the same category-label mapping already defined in `TipsList.svelte`).
  - Returns the combined list; ordering follows journal entries first (most recent first, matching the existing journal tab's sort), then tips.
- **`src/lib/components/PhotoGallery.svelte`** (new) — takes `tripId: string` as its only prop. Loads `collectTripPhotos(tripId)` in `onMount`, renders a responsive thumbnail grid, and owns the lightbox's open/closed state and current-index navigation (prev/next, close). Self-contained — no props or events beyond `tripId` in.
- **`src/routes/trips/[id]/+page.svelte`** (modify):
  - `activeTab` type gains `'gallery' | 'map'`; the `tabs` array gains two entries in the approved order (Journal, Gallery, Map, Packing, Tips, Do's & Don'ts).
  - Two new `{:else if}` branches render `<PhotoGallery {tripId} />` and `<WorldMap visitedCodes={new Set(trip.countries)} />` respectively, following the exact pattern already used for the Packing/Tips/Do's & Don'ts branches.

## Data flow & interaction notes

- No new storage functions — `listJournalEntries`, `listTips`, and `getPhoto` all already exist and are reused as-is.
- `collectTripPhotos` is a pure-ish read function (no writes, no side effects beyond the existing `getPhoto` calls it delegates to) — it takes a trip ID and returns derived display data; `PhotoGallery.svelte` doesn't need to know how photos are stored or where captions come from.
- The Map tab passes a plain `Set<string>` built from `trip.countries` into `WorldMap` — the same prop shape the main `/map` page already uses, just scoped to one trip's countries instead of all visited countries app-wide.

## Edge cases

- **No photos anywhere on the trip**: the Gallery tab shows the existing dashed-border empty-state pattern (matching the "No journal entries yet" treatment already used elsewhere in this trip hub).
- **Lightbox navigation at the ends of the list**: prev/next wraps around (going past the last photo returns to the first, and vice versa) rather than disabling the button — simpler UX, no disabled-state styling needed.
- **A tip's `photoId` pointing to a since-deleted photo, or `getPhoto` returning `undefined`**: that photo is simply omitted from the gallery (skipped during aggregation), matching how the existing journal and tips tabs already handle a missing/undefined photo lookup.

## Testing

- **`collectTripPhotos`** gets unit tests (Vitest, using this project's existing `localStorage`-backed test setup from `storage.test.ts`): aggregates photos from both journal entries and tips, orders journal photos before tip photos, produces the correct caption format for each source, and returns an empty array when the trip has no photos at all.
- **`PhotoGallery.svelte` and the Map tab**: manual browser verification (this project's established convention for UI-only work) — confirm the grid renders all photos from both sources, the lightbox opens/closes/navigates correctly including wraparound, the empty state renders with no photos, and the Map tab correctly highlights only this trip's countries (not the full visited-countries set) across all four theme presets.
