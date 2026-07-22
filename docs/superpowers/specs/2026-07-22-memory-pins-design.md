# Memory Pins — Design Spec

Date: 2026-07-22

## Overview

This is the fourth slice of `docs/ROADMAP.md` §3 "Journal, Memories & Timeline" (the journal reframe, journey timeline, and photo gallery/trip map shipped first). Memory pins let a user pin a specific *location* within a trip (e.g. "Cliffs of Moher," "Shibuya Crossing") — a place, not just a country. This is the first idea in §3 that introduces a genuinely new data concept rather than re-presenting existing `Trip`/`JournalEntry`/`TipEntry` data.

## Goals

- A new `PinEntry` data concept: a label (place name, required) and an optional short note, scoped to a trip.
- A new **Pins** tab in the trip hub, positioned right after Map (Journal, Gallery, Map, Pins, Packing, Tips, Do's & Don'ts).
- Add, list, and delete pins for a trip — the same lightweight CRUD pattern already established by the Do's & Don'ts and Tips tabs.
- Deleting a trip correctly removes its pins too, via the existing `deleteTripCascade` mechanism.

## Non-goals

- No coordinates field in this cycle — deferred entirely until an in-country map actually needs it, rather than added now unused.
- No photo attachment on pins — photos already live on journal entries and tips; a third photo-attachment surface is out of scope for what the roadmap frames as a small addition.
- No checklist/checkbox behavior — pins are not a to-do list, unlike Do's & Don'ts.
- No map integration in this cycle (no plotting pins on `WorldMap` or any other map view) — this ships the data concept and its trip-hub list UI only.

## Architecture

- **`src/lib/types.ts`** (modify) — add:
  ```ts
  export interface PinEntry {
    id: string;
    tripId: string;
    label: string;
    note: string | null;
    createdAt: string;
  }
  ```
- **`src/lib/storage/pins.ts`** (new) — a `localStorage`-backed module mirroring `checklist.ts`'s existing pattern exactly: `listPins(tripId: string): PinEntry[]`, `savePin(pin: PinEntry): void` (upsert by `id`), `deletePin(id: string): void`, `deletePinsForTrip(tripId: string): void`.
- **`src/lib/storage/storage.ts`** (modify) — re-export `pins.ts` (`export * from './pins'`, matching the existing `export * from './checklist'` / `export * from './tips'` pattern) and add a call to `deletePinsForTrip(tripId)` inside `deleteTripCascade`.
- **`src/lib/components/PinsList.svelte`** (new) — structurally close to `DoDontList.svelte`: an add-form (label input, required; note input, optional) and a list of existing pins with delete buttons. No checkboxes, no photo upload, no coordinate fields.
- **`src/routes/trips/[id]/+page.svelte`** (modify) — `activeTab`'s type gains `'pins'`, the `tabs` array gains a `{ id: 'pins', label: 'Pins' }` entry positioned right after Map, and the tab-content branch chain gains one more `{:else if activeTab === 'pins'}` rendering `<PinsList {tripId} />`.

## Data flow & interaction notes

- No aggregation or derivation logic — `pins.ts` is pure CRUD passthrough, identical in shape to `checklist.ts`'s existing `listDoDontItems`/`saveDoDontItem`/`deleteDoDontItem`/`deleteDoDontItemsForTrip`.
- `PinsList.svelte` takes only `tripId` as a prop, loads pins in `onMount`, and re-loads after every add/delete — the same pattern `DoDontList.svelte` and `TipsList.svelte` already use.
- `deleteTripCascade`'s existing cleanup order (packing items → do/don't items → tips+photos → trip) gains one more step for pins; since pins have no photos, this is a plain delete-by-tripId call with no async photo cleanup needed.

## Edge cases

- **No pins yet**: the Pins tab shows a simple "no pins yet" message, matching the empty-state text style already used in `DoDontList.svelte` ("Nothing here yet.") or the dashed-border pattern used elsewhere in this trip hub — final wording decided at implementation time to match whichever nearby convention reads best.
- **Empty/whitespace-only label**: the add-form requires a non-empty label (same `required` + trim-check pattern already used by `DoDontList.svelte`'s add inputs), so a pin can never be created with a blank name.
- **Trip deletion**: `deletePinsForTrip` is called unconditionally as part of `deleteTripCascade`, even if the trip has zero pins — no special-casing needed since deleting an already-empty set is a no-op.

## Testing

- **`pins.ts`** gets unit tests (Vitest, `localStorage`-backed, following the exact convention already used for `checklist.ts`'s do/don't functions): list returns only pins for the given trip, save both creates and updates (upsert by id), delete removes a single pin, `deletePinsForTrip` removes all pins for a trip without touching other trips' pins.
- **`PinsList.svelte` and the trip-hub wiring**: manual browser verification (this project's established convention for simple CRUD UI) — add a pin with just a label, add one with a note, delete a pin, confirm the empty state renders with no pins, and confirm deleting a trip via the existing "Delete trip" button also removes its pins (no orphaned data left in `localStorage`).
