# Journey Waypoints — Design Spec

Date: 2026-07-29

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas": *"Journey path within a trip (a new data concept, similar in shape to memory pins from §3) — For multi-stop trips, show the actual route between cities/waypoints (e.g. `Dublin → Doha → Sydney`), not just the countries visited."*

The roadmap's own framing calls this "a new data concept... beyond what §3's memory pins (unordered location pins) already cover." This spec takes the path of extending the existing `PinEntry`/Pins tab with ordering, rather than introducing a wholly separate feature — every pin becomes a sequenced waypoint, and the trip's route is derived by reading pins in order.

## Goals

- Every pin (`PinEntry`) carries a position in an ordered sequence for its trip.
- The Pins tab in the trip hub shows a route-chain summary (e.g. `Dublin → Doha → Sydney`) above the pin list, built from pins sorted by their order, whenever a trip has 2 or more pins.
- Pins can be reordered via drag-and-drop directly in the list, persisting the new order.
- Newly added pins are appended to the end of the current order by default.
- Existing pins (created before this feature) get a sensible default order automatically — no manual migration step, no data loss.

## Non-goals

- No map or arc visualization of the route this cycle — that would require city-level geographic coordinates, a new data concern beyond this spec's scope (the same reasoning that made memory pins themselves defer coordinates in §3).
- No changes to the trip hub header, the home page, or any page besides the Pins tab — scoped entirely to `PinsList.svelte` and its backing storage.
- No guarantee of touch-drag reordering across all mobile browsers — native HTML5 Drag and Drop has known inconsistent mobile support (notably Safari). This is accepted as a known limitation rather than hand-rolling a custom pointer-based drag system for a personal, single-user app. Pins remain addable/removable/viewable normally on mobile; only drag-reordering may not work there.
- No separate "waypoint" concept distinct from pins — per this cycle's scope decision, every pin is a waypoint; there is no unordered-pin / ordered-waypoint distinction to maintain.

## Architecture

- **`src/lib/types.ts`** (modify) — `PinEntry` gains one field:
  ```ts
  export interface PinEntry {
    id: string;
    tripId: string;
    label: string;
    note: string | null;
    order: number;
    createdAt: string;
  }
  ```

- **`src/lib/storage/pins.ts`** (modify):
  - `listPins(tripId)` backfills a default `order` for legacy records (created before this field existed) using the same idiom already established in `local.ts:16` for `Trip.transportMode` — a default value spread first, then the real record spread on top so any existing explicit value wins:
    ```ts
    export function listPins(tripId: string): PinEntry[] {
      return readAll()
        .filter((p) => p.tripId === tripId)
        .map((p, i) => ({ order: i, ...p }));
    }
    ```
    Since `readAll()` returns pins in their original storage (creation) order, and `.filter()` preserves relative order, backfilling `order: i` (post-filter index) gives legacy pins a stable, deterministic order matching the sequence they were originally created in — a reasonable default with no prior ordering information to do better with.
  - Add `reorderPins(tripId: string, orderedIds: string[]): void` — takes the full desired order as a list of pin IDs (as produced by a completed drag operation) and rewrites every matching pin's `order` field to its index in that list, in one batch:
    ```ts
    export function reorderPins(tripId: string, orderedIds: string[]): void {
      const items = readAll();
      for (const item of items) {
        if (item.tripId !== tripId) continue;
        const newOrder = orderedIds.indexOf(item.id);
        if (newOrder !== -1) item.order = newOrder;
      }
      writeAll(items);
    }
    ```

- **`src/lib/components/PinsList.svelte`** (modify):
  - Pins are sorted by `order` ascending before rendering (both the list and the chain summary read from this sorted array).
  - A new chain-summary block renders above the `<ul>`, only when `pins.length >= 2`:
    ```svelte
    {#if pins.length >= 2}
      <p class="font-mono text-sm text-[var(--color-ink-soft)]">
        {pins.map((p) => p.label).join(' → ')}
      </p>
    {/if}
    ```
  - Each `<li>` becomes `draggable="true"` with `ondragstart`, `ondragover`, `ondrop`, and `ondragend` handlers:
    - `ondragstart` records the dragged pin's `id` (component-local state, e.g. `draggedId`).
    - `ondragover` on a row calls `event.preventDefault()` (required to allow a drop) and reorders the in-memory `pins` array live, moving the dragged pin to the hovered row's position, for immediate visual feedback — no persistence yet.
    - `ondrop` calls `reorderPins(tripId, pins.map((p) => p.id))` with the current (already-live-reordered) array, then reloads via the existing `load()` function to reflect the persisted state.
    - `ondragend` clears `draggedId` regardless of whether a drop occurred (handles a drag cancelled outside any valid drop target).
  - The existing `add()` function's `savePin(...)` call gains `order: pins.length` (append at the end of the current sorted list).
  - A small visual affordance (a drag-handle icon, e.g. a six-dot grip glyph) is added to each row so it's discoverable as draggable, consistent with this app's existing pattern of small inline SVG icons rather than icon fonts.

## Data flow & interaction notes

- Reordering is fully client-side and synchronous — no async operations beyond the existing `savePin`/`writeAll` localStorage writes, consistent with how pins already work.
- The chain summary and the list are two views over the same sorted-by-`order` array computed once per render — no duplicate sorting logic.
- Deleting a pin (`deletePin`) does not renumber remaining pins' `order` values — gaps in the sequence (e.g. orders `0, 2, 3` after deleting the pin at order `1`) are harmless, since rendering always sorts by `order` regardless of whether the values are contiguous.

## Edge cases

- **Zero or one pin**: chain summary is hidden (`pins.length >= 2` guard) — a "chain" of one place isn't meaningful. The existing empty-state message and single-pin list rendering are unaffected.
- **Legacy pins with no stored `order`**: backfilled deterministically from their filtered-array index, per the Architecture section — no crash, no `undefined` sort comparisons, no manual migration needed.
- **Dragging a pin to the same position it started in**: `reorderPins` still runs (harmless no-op — the resulting order matches the pre-drag order) rather than needing a special "did anything change" check.
- **A trip with duplicate-looking labels** (e.g. two waypoints both named "Doha" for a layover-then-return itinerary): each pin is a distinct entity keyed by `id`, so duplicate labels render correctly in both the list and the chain summary (`Dublin → Doha → Sydney → Doha → Dublin` is valid).

## Testing

- **New unit tests** in `src/lib/storage/pins.test.ts` (existing test file, per the codebase's established per-module test convention):
  - `listPins` backfills `order` as the array index for pins with no stored `order` field.
  - `listPins` preserves an explicit `order` value when one is already present (doesn't get overwritten by the index-based default).
  - `reorderPins` correctly rewrites `order` for pins belonging to the given trip, based on their position in the provided ID list.
  - `reorderPins` does not affect pins belonging to a different trip, even if their IDs happen to be interleaved in storage.
- **Manual browser verification** (this project's established convention for drag-and-drop and other rich-interaction UI): add 3+ pins to a trip, confirm the chain summary shows them in creation order initially; drag to reorder and confirm both the chain summary and list update correctly and persist across a page reload; confirm a single pin shows no chain summary; confirm deleting a pin from the middle of an ordered list doesn't break the remaining chain's order.
