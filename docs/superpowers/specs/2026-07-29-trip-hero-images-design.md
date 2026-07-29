# Trip Hero Images — Design Spec

Date: 2026-07-29

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas": *"Trip card hero treatment ('the single biggest UX improvement,' per this feedback pass) — Replace the current gradient-background trip cards with a real hero image per trip."*

The roadmap's own "Feasibility" note already scoped this: user-uploaded covers are straightforward (reuse the existing photo pipeline, add a cover-photo concept to `Trip` or reuse the first journal photo); auto-fetched stock photos are a bigger lift requiring a new backend concern and were explicitly deferred to a separate cycle if pursued. This spec takes the "reuse the first journal photo" path — the lower-effort option that needs no new upload UI, no `Trip` schema change, and no new storage infrastructure.

## Goals

- `TripCard.svelte` (rendered in the home page's trip grid) shows a real photo as its header background, once the trip has one, replacing today's gradient-background header.
- The photo used is the first photo attached to the chronologically earliest-dated journal entry that has at least one photo. If that entry has multiple photos, the first one (by upload order within that entry) is used.
- The transport-mode icon and country-count badge remain legible over a photo background via a dark scrim overlay.
- Trips with no qualifying journal photo yet keep today's gradient exactly as-is — no visual regression.

## Non-goals

- No new `Trip` schema field (no `coverPhotoId`) and no dedicated cover-photo upload UI — the hero image is derived entirely from existing journal-entry photo data.
- No auto-fetched stock photos (Unsplash, etc.) — explicitly deferred per the roadmap's own scoping, since it needs a new backend concern.
- No changes to the trip hub page's (`/trips/[id]`) own header — scoped to the home page's `TripCard` only this cycle.
- Tip photos are not considered as hero-image candidates — only journal-entry photos, matching the roadmap's "reuse the first journal photo" wording.
- No changes to `collectTripPhotos` or `PhotoGallery.svelte` — this adds a new, separate read path alongside the existing gallery-aggregation logic, not a modification of it.

## Architecture

- **`src/lib/tripPhotos.ts`** (modify) — add one new export alongside the existing `collectTripPhotos`:
  ```ts
  export interface HeroPhoto {
    photoId: string;
    thumbnailBlob: Blob;
  }

  export async function getTripHeroPhoto(tripId: string): Promise<HeroPhoto | undefined> {
    const entries = listJournalEntries(tripId).sort((a, b) => a.date.localeCompare(b.date));
    for (const entry of entries) {
      if (entry.photoIds.length === 0) continue;
      const photo = await getPhoto(entry.photoIds[0]);
      if (photo) return { photoId: entry.photoIds[0], thumbnailBlob: photo.thumbnailBlob };
    }
    return undefined;
  }
  ```
  Sorting ascending by `date` (opposite of `collectTripPhotos`'s descending sort, which is intentionally for "most recent first" gallery display) gives the chronologically earliest entry. Uses `thumbnailBlob` (already capped at 400px by `createThumbnail`), matching the size need of a compact card header rather than the full-resolution `blob` used in lightbox/full-view contexts.

- **`src/lib/components/TripCard.svelte`** (modify):
  - On mount, calls `getTripHeroPhoto(trip.id)`. If it resolves to a `HeroPhoto`, creates an object URL from its `thumbnailBlob` and stores it in local component state.
  - The existing header `<div class="... bg-gradient-to-br ...">` gains a conditional: when a hero photo URL is available, render it as a background image (`background-image: url(...)`, `background-size: cover`, `background-position: center`) instead of applying the gradient class, plus a dark scrim (`bg-black/30` overlay, or a linear gradient scrim) so the white transport icon and badge keep sufficient contrast. When no hero photo is available (still loading, or none exists), the existing gradient renders unchanged — this is the default/initial state, so there's no flash-to-gradient-then-swap for photo-less trips.
  - The object URL is revoked in `onDestroy` to avoid leaking blob URLs as cards mount/unmount (e.g., navigating away from the home page), following proper cleanup instead of the leak pattern noted as a Minor finding in a past `PhotoGallery.svelte` review.

## Data flow & interaction notes

- Purely additive, read-only: no writes, no new `Trip` fields, no changes to how journal-entry photos are uploaded or stored.
- Each `TripCard` independently calls `getTripHeroPhoto` on mount — with realistic trip-list sizes (a personal travel log, not a shared multi-user app) this is a handful of cheap IndexedDB reads, consistent with how `PhotoGallery.svelte` already does one `getPhoto` call per photo on trip-hub mount.
- A trip's hero image is fully derived, so it updates automatically the next time its card renders after a new earlier-dated journal photo is added — no cache invalidation needed since there's no cache.

## Edge cases

- **Trip with journal entries but none have photos**: `getTripHeroPhoto` returns `undefined` after checking every entry; gradient renders, unchanged from today.
- **Trip with zero journal entries**: `listJournalEntries` returns `[]`, loop doesn't execute, `undefined` returned; gradient renders.
- **Trip with photos only on tips, not journal entries**: not considered — tips are out of scope per Non-goals; gradient renders even though the trip technically has photos elsewhere (consistent with the roadmap's own "reuse the first journal photo" scoping, not "any photo").
- **Earliest-dated entry has a photo, but a later entry doesn't**: still uses the earliest entry with a photo, which by definition is found first in the ascending-sorted loop — a later photo-less entry never blocks it.
- **Multiple journal entries share the exact same `date`**: `Array.prototype.sort` is stable in modern JS engines, so entries with equal dates keep their original (insertion/creation) order; the first one encountered in that stable order is used. This is a reasonable, deterministic tiebreak — not required to be any particular order beyond "consistent."

## Testing

- **New unit tests** for `getTripHeroPhoto` in `src/lib/tripPhotos.test.ts`, following the same real-storage-backed test pattern already used for `collectTripPhotos` (real `createTrip`/`addJournalEntry` calls against `localStorage`, not mocks):
  - Returns `undefined` when the trip has no journal entries.
  - Returns `undefined` when the trip has journal entries but none have photos.
  - Returns the first entry's first photo when only one entry has a photo.
  - Returns the *earliest-dated* entry's photo when multiple entries have photos, even if an earlier-dated entry was added to storage after a later-dated one.
  - Ignores tip photos — a trip with only a tip photo (no journal photo) still returns `undefined`.
- **Manual browser verification** (this project's established convention for this class of read-only display feature): seed a trip with a journal entry with a photo, confirm its home-page card shows the photo with the transport icon/badge still legible over the scrim; confirm a trip with no journal photos still shows the original gradient; confirm no console errors from object-URL handling when navigating away from and back to the home page.
