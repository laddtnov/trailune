# Journey Waypoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every pin (`PinEntry`) becomes an ordered waypoint. The trip hub's Pins tab shows a route-chain summary (e.g. `Dublin → Doha → Sydney`) built from pins in order, and pins can be reordered via drag-and-drop.

**Architecture:** `PinEntry` gains an `order: number` field. `pins.ts` backfills `order` for legacy records (no stored value) from their array position, and gains a `reorderPins` batch-update function. `PinsList.svelte` sorts by `order`, renders the chain summary, appends new pins at the end of the order, and wires up native HTML5 drag-and-drop to call `reorderPins`.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, native HTML5 Drag and Drop API (no new dependency).

## Global Constraints

- No map/arc visualization of the route this cycle — text chain summary only (spec: Non-goals).
- Scoped to `PinsList.svelte` and its backing storage only — no changes to the trip hub header, home page, or other tabs (spec: Non-goals).
- Touch-drag reordering on mobile is not guaranteed (native HTML5 DnD's known mobile limitation) — accepted, not a defect to work around in this cycle (spec: Non-goals).
- Every pin is a waypoint — no separate unordered-pin/ordered-waypoint distinction (spec: Non-goals).
- Legacy pins with no stored `order` must backfill deterministically from their storage-array position, following the same default-then-spread idiom already used for `Trip.transportMode` in `local.ts:16` (spec: Architecture).
- Deleting a pin must not require renumbering the remaining pins' `order` values — gaps in the sequence are harmless since rendering always sorts by `order` (spec: Edge cases).

---

### Task 1: Data layer — `order` field, backfill, and `reorderPins`

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage/pins.ts`
- Test: `src/lib/storage/pins.test.ts`

**Interfaces:**
- Consumes: existing `PinEntry` interface, existing `readAll`/`writeAll` helpers (both already private to `pins.ts`).
- Produces: `PinEntry.order: number` (used by Task 2's `PinsList.svelte` for sorting/appending), `export function reorderPins(tripId: string, orderedIds: string[]): void` (used by Task 2's drag-and-drop handlers).

- [ ] **Step 1: Add `order` to the `PinEntry` type**

In `src/lib/types.ts`, replace:

```ts
export interface PinEntry {
  id: string;
  tripId: string;
  label: string;
  note: string | null;
  createdAt: string;
}
```

with:

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

- [ ] **Step 2: Update existing test fixtures to include `order`**

In `src/lib/storage/pins.test.ts`, replace:

```ts
  const pin1: PinEntry = {
    id: 'pin1',
    tripId: 't1',
    label: 'Cliffs of Moher',
    note: 'Windiest place I have ever stood',
    createdAt: '2026-07-10T00:00:00.000Z'
  };
  const pin2: PinEntry = {
    id: 'pin2',
    tripId: 't1',
    label: 'Shibuya Crossing',
    note: null,
    createdAt: '2026-07-11T00:00:00.000Z'
  };
```

with:

```ts
  const pin1: PinEntry = {
    id: 'pin1',
    tripId: 't1',
    label: 'Cliffs of Moher',
    note: 'Windiest place I have ever stood',
    order: 0,
    createdAt: '2026-07-10T00:00:00.000Z'
  };
  const pin2: PinEntry = {
    id: 'pin2',
    tripId: 't1',
    label: 'Shibuya Crossing',
    note: null,
    order: 1,
    createdAt: '2026-07-11T00:00:00.000Z'
  };
```

(The four existing tests using `pin1`/`pin2` need no other changes — their `toEqual` assertions reference these same fixture objects, so adding `order` to the fixtures is sufficient.)

- [ ] **Step 3: Write the new failing tests**

Add to `src/lib/storage/pins.test.ts`, after the existing `describe('pins repository', ...)` block's closing `});`:

```ts
describe('listPins order backfill', () => {
  it('backfills order from array position for legacy pins with no stored order', () => {
    localStorage.setItem(
      'trailune:pins',
      JSON.stringify([
        { id: 'legacy1', tripId: 't1', label: 'First', note: null, createdAt: '2026-07-01T00:00:00.000Z' },
        { id: 'legacy2', tripId: 't1', label: 'Second', note: null, createdAt: '2026-07-02T00:00:00.000Z' }
      ])
    );

    const pins = listPins('t1');

    expect(pins.find((p) => p.id === 'legacy1')?.order).toBe(0);
    expect(pins.find((p) => p.id === 'legacy2')?.order).toBe(1);
  });

  it('preserves an explicit order value instead of overwriting it with the array-index default', () => {
    localStorage.setItem(
      'trailune:pins',
      JSON.stringify([
        { id: 'a', tripId: 't1', label: 'A', note: null, order: 5, createdAt: '2026-07-01T00:00:00.000Z' },
        { id: 'b', tripId: 't1', label: 'B', note: null, order: 2, createdAt: '2026-07-02T00:00:00.000Z' }
      ])
    );

    const pins = listPins('t1');

    expect(pins.find((p) => p.id === 'a')?.order).toBe(5);
    expect(pins.find((p) => p.id === 'b')?.order).toBe(2);
  });
});

describe('reorderPins', () => {
  it('rewrites order for pins in the given trip based on their position in the id list', () => {
    savePin({ id: 'p1', tripId: 't1', label: 'A', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });
    savePin({ id: 'p2', tripId: 't1', label: 'B', note: null, order: 1, createdAt: '2026-07-02T00:00:00.000Z' });
    savePin({ id: 'p3', tripId: 't1', label: 'C', note: null, order: 2, createdAt: '2026-07-03T00:00:00.000Z' });

    reorderPins('t1', ['p3', 'p1', 'p2']);

    const pins = listPins('t1');
    expect(pins.find((p) => p.id === 'p3')?.order).toBe(0);
    expect(pins.find((p) => p.id === 'p1')?.order).toBe(1);
    expect(pins.find((p) => p.id === 'p2')?.order).toBe(2);
  });

  it('does not affect pins belonging to a different trip', () => {
    savePin({ id: 'p1', tripId: 't1', label: 'A', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });
    savePin({ id: 'q1', tripId: 't2', label: 'X', note: null, order: 0, createdAt: '2026-07-01T00:00:00.000Z' });

    reorderPins('t1', ['p1']);

    expect(listPins('t2').find((p) => p.id === 'q1')?.order).toBe(0);
  });
});
```

Update the import line at the top of `pins.test.ts` to include `reorderPins`:

```ts
import { listPins, savePin, deletePin, deletePinsForTrip, reorderPins } from './pins';
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/pins.test.ts`
Expected: FAIL — `reorderPins` is not exported from `./pins`, and `listPins` does not yet backfill `order`

- [ ] **Step 5: Implement the backfill and `reorderPins`**

In `src/lib/storage/pins.ts`, replace:

```ts
export function listPins(tripId: string): PinEntry[] {
  return readAll().filter((p) => p.tripId === tripId);
}
```

with:

```ts
export function listPins(tripId: string): PinEntry[] {
  return readAll()
    .filter((p) => p.tripId === tripId)
    .map((p, i) => ({ order: i, ...p }));
}
```

Then add, after the existing `deletePinsForTrip` function (at the end of the file):

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

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/pins.test.ts`
Expected: PASS — all tests in the file green, including the four new ones

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/storage/pins.ts src/lib/storage/pins.test.ts
git commit -m "feat: add ordering and reorderPins to pins data layer"
```

---

### Task 2: Route-chain summary and ordered rendering

**Files:**
- Modify: `src/lib/components/PinsList.svelte`

**Interfaces:**
- Consumes: `PinEntry.order` and `reorderPins` from Task 1 (not called yet in this task — wired up in Task 3).
- Produces: a `pins` array always sorted by `order` ascending, used by Task 3's drag handlers.

- [ ] **Step 1: Sort pins by order on load**

In `src/lib/components/PinsList.svelte`, replace:

```ts
  function load() {
    pins = listPins(tripId);
  }
```

with:

```ts
  function load() {
    pins = listPins(tripId).sort((a, b) => a.order - b.order);
  }
```

- [ ] **Step 2: Append new pins at the end of the order**

Replace:

```ts
    savePin({
      id: generateId(),
      tripId,
      label: label.trim(),
      note: note.trim() ? note.trim() : null,
      createdAt: new Date().toISOString()
    });
```

with:

```ts
    savePin({
      id: generateId(),
      tripId,
      label: label.trim(),
      note: note.trim() ? note.trim() : null,
      order: pins.length,
      createdAt: new Date().toISOString()
    });
```

- [ ] **Step 3: Render the chain summary**

Replace:

```svelte
<section class="space-y-6">
  {#if pins.length === 0}
```

with:

```svelte
<section class="space-y-6">
  {#if pins.length >= 2}
    <p class="font-mono text-sm text-[var(--color-ink-soft)]">
      {pins.map((p) => p.label).join(' → ')}
    </p>
  {/if}

  {#if pins.length === 0}
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 5: Run svelte-check**

Run: `npm run check`
Expected: same error count as the `main` baseline (no new errors)

- [ ] **Step 6: Manually verify in the browser**

Start the dev server, open a trip's Pins tab, add 3 pins (e.g. "Dublin", "Doha", "Sydney"), and confirm:
- The chain summary reads `Dublin → Doha → Sydney` above the list.
- Adding a single pin shows no chain summary (only appears at 2+).
- The list still renders each pin's label/note and remove button exactly as before.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/PinsList.svelte
git commit -m "feat: show route-chain summary on ordered pins"
```

---

### Task 3: Drag-and-drop reordering

**Files:**
- Modify: `src/lib/components/PinsList.svelte`

**Interfaces:**
- Consumes: `reorderPins` from `$lib/storage/storage` (re-exported from `pins.ts` via `storage.ts`'s existing `export * from './pins'`), the sorted `pins` array from Task 2.
- Produces: nothing consumed by later tasks — this is the only remaining task.

- [ ] **Step 1: Import `reorderPins` and add drag state**

In `src/lib/components/PinsList.svelte`, replace:

```ts
  import { listPins, savePin, deletePin } from '$lib/storage/storage';
```

with:

```ts
  import { listPins, savePin, deletePin, reorderPins } from '$lib/storage/storage';
```

Immediately after the existing:

```ts
  let pins: PinEntry[] = $state([]);
```

add:

```ts
  let draggedId: string | null = $state(null);
```

- [ ] **Step 2: Add drag handlers**

Immediately before the existing `function remove(pin: PinEntry) {` function, add:

```ts
  function handleDragStart(pin: PinEntry) {
    draggedId = pin.id;
  }

  function handleDragOver(event: DragEvent, targetPin: PinEntry) {
    event.preventDefault();
    if (!draggedId || draggedId === targetPin.id) return;
    const fromIndex = pins.findIndex((p) => p.id === draggedId);
    const toIndex = pins.findIndex((p) => p.id === targetPin.id);
    if (fromIndex === -1 || toIndex === -1) return;
    const reordered = [...pins];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    pins = reordered;
  }

  function handleDrop() {
    reorderPins(tripId, pins.map((p) => p.id));
    load();
  }

  function handleDragEnd() {
    draggedId = null;
  }
```

- [ ] **Step 3: Wire up the list item markup**

Replace:

```svelte
      {#each pins as pin (pin.id)}
        <li
          class="group flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]"
        >
          <div class="min-w-0">
            <p class="font-display text-base font-bold text-[var(--color-ink)]">{pin.label}</p>
            {#if pin.note}
              <p class="mt-1 text-sm text-[var(--color-ink-soft)]">{pin.note}</p>
            {/if}
          </div>
```

with:

```svelte
      {#each pins as pin (pin.id)}
        <li
          draggable="true"
          ondragstart={() => handleDragStart(pin)}
          ondragover={(e) => handleDragOver(e, pin)}
          ondrop={handleDrop}
          ondragend={handleDragEnd}
          class="group flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)] {draggedId === pin.id ? 'opacity-50' : ''}"
        >
          <div class="flex min-w-0 items-start gap-2">
            <svg
              class="mt-1 size-4 shrink-0 cursor-grab text-[var(--color-ink-soft)]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" />
              <circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" />
              <circle cx="15" cy="18" r="1.5" />
            </svg>
            <div class="min-w-0">
              <p class="font-display text-base font-bold text-[var(--color-ink)]">{pin.label}</p>
              {#if pin.note}
                <p class="mt-1 text-sm text-[var(--color-ink-soft)]">{pin.note}</p>
              {/if}
            </div>
          </div>
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 5: Run svelte-check**

Run: `npm run check`
Expected: same error count as the `main` baseline (no new errors)

- [ ] **Step 6: Manually verify in the browser**

With the same 3 seeded pins ("Dublin", "Doha", "Sydney") from Task 2's verification, confirm on desktop (mouse drag):
- Dragging "Sydney" to the top of the list reorders it there, both in the list and in the chain summary (`Sydney → Dublin → Doha`).
- Reloading the page preserves the new order (confirms `reorderPins` persisted correctly).
- The drag-handle icon is visible on each row and the dragged row shows reduced opacity while dragging.
- Deleting the middle pin after reordering still leaves the remaining two in the correct relative order.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/PinsList.svelte
git commit -m "feat: add drag-and-drop reordering to pins"
```
