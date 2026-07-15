# Trip Tips (Local Tips & Sightseeing) — Design Spec

Date: 2026-07-15

## Overview

Trips gain a **Tips** tab: free-text notes per trip, grouped into four categories (Currency, Avoid, Getting Around, Sightseeing), each optionally attached to one photo. This is the local-only, user-entered version of the "local tips" idea discussed for v2 — no accounts, no sharing, no backend, consistent with the differentiator principle already established by the world map (data derived from what the user actually logged, not a generic external source).

## Goals

- Add a `TipEntry` type and a new `tips` storage repository, following the existing repository pattern (`local.ts`, `checklist.ts`).
- Add a "Tips" tab to the trip hub (`src/routes/trips/[id]/+page.svelte`), alongside the existing Journal / Packing / Do's & Don'ts tabs.
- Each tip has a category (`currency` | `avoid` | `transit` | `sightseeing`), a free-text note, and an optional single photo.
- Tips display grouped by category, each group showing its entries with note + photo thumbnail (if present).
- An add-form lets the user pick a category, write a note, and optionally attach one photo.
- Deleting a trip cascades to delete its tips and any attached tip photos (extending the existing `deleteTripCascade`).

## Non-goals

- No sharing/community tips — this is explicitly the user-entered, private-per-trip version. Shared/community tips (requiring accounts + a backend) remain a distinct, larger v2 idea not covered by this spec.
- No per-country scoping — tips are scoped to the whole trip, not broken down by individual country within a multi-country trip (decided explicitly; simpler than the map's per-country model).
- No multiple photos per tip — one optional photo per entry, unlike Journal's multi-photo entries.
- No backend/API — entirely client-side (localStorage for the `TipEntry` metadata, IndexedDB via the existing photo store for the optional photo), consistent with the rest of v1.

## Data Model

```ts
export type TipCategory = 'currency' | 'avoid' | 'transit' | 'sightseeing';

export interface TipEntry {
  id: string;
  tripId: string;
  category: TipCategory;
  note: string;
  photoId: string | null;
  createdAt: string;
}
```

Category → display label mapping:

| Value | Label |
|---|---|
| `currency` | Currency |
| `avoid` | Avoid |
| `transit` | Getting Around |
| `sightseeing` | Sightseeing |

## Storage Layer

New file `src/lib/storage/tips.ts`, mirroring `src/lib/storage/local.ts`'s structure exactly (own localStorage key `trailune:tips`, own `readAll`/`writeAll` via the same pattern already used per-repository in this codebase):

```ts
export function listTips(tripId: string): TipEntry[]
export function saveTip(tip: TipEntry): void
export function deleteTip(id: string): void
export function deleteTipsForTrip(tripId: string): void
```

`src/lib/storage/storage.ts` facade gains:

```ts
export async function addTipEntry(
  tripId: string,
  input: { category: TipCategory; note: string; photoFile: File | null }
): Promise<TipEntry>

export async function deleteTipEntryWithPhoto(id: string): Promise<void>
```

`addTipEntry` mirrors `addJournalEntry`'s photo-handling (thumbnail generation via `createThumbnail`, falling back to the original file on failure, saved through the existing `photoStore`) but for a single optional photo instead of an array.

`deleteTripCascade` gains one more step: delete the trip's tips (and each tip's photo, if any) alongside the existing journal/packing/do-dont cleanup.

## UI

### Trip hub tab

`src/routes/trips/[id]/+page.svelte`'s `tabs` array and `activeTab` union type gain a `'tips'` entry (labeled "Tips"), rendering a new `<TipsList tripId={tripId} />` component — same integration pattern as `<PackingChecklist>` and `<DoDontList>`.

### `TipsList.svelte` component

Self-contained component (own state, own load/add/delete functions), following `DoDontList.svelte`'s structure:

- Loads and groups this trip's tips by category into the 4 fixed groups (always rendered in Currency / Avoid / Getting Around / Sightseeing order, even if empty — each shows "Nothing here yet." when its group has no entries, matching `DoDontList`'s empty-group treatment).
- Each entry shows its note text and, if `photoId` is set, a small thumbnail (loaded the same way Journal entries load thumbnails: `getPhoto` → `URL.createObjectURL(photo.thumbnailBlob)`).
- A remove button per entry (matching `DoDontList`'s hover-reveal delete button pattern).
- One add-form: a category `<select>`, a required note `<textarea>`, and an optional single-file `<input type="file" accept="image/*">` (no `multiple`, unlike Journal's), a submit button. On submit, calls `addTipEntry` and reloads.
- Same 8MB-per-photo size guard and the same private-browsing-friendly error message already used in the trip hub's Journal form, reused here rather than re-invented.

## Testing

- Storage layer: new Vitest file `src/lib/storage/tips.test.ts` covering `listTips`/`saveTip`/`deleteTip`/`deleteTipsForTrip`, following `local.test.ts`'s structure.
- `storage.test.ts` gains coverage for `addTipEntry` (with and without a photo) and `deleteTripCascade` now also removing tips and their photos.
- UI (`TipsList.svelte`, the new tab): verified manually via the dev server, consistent with this project's existing manual-verification approach for UI.
