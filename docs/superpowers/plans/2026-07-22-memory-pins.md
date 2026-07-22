# Memory Pins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `PinEntry` data concept (label + optional note, scoped to a trip) with a new Pins tab in the trip hub, closing out the fourth slice of `docs/ROADMAP.md` §3.

**Architecture:** A new `localStorage`-backed storage module (`pins.ts`) mirrors the existing `checklist.ts` CRUD pattern exactly, re-exported through `storage.ts` and wired into the existing `deleteTripCascade`. A new `PinsList.svelte` component (structurally close to `DoDontList.svelte`, but simpler — no checkboxes, no two-column layout) is wired into the trip hub as a new tab.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No coordinates field on `PinEntry` in this cycle — deferred entirely.
- No photo attachment on pins.
- No checklist/checkbox behavior — pins are not a to-do list.
- No map integration in this cycle (no plotting pins anywhere) — this ships the data concept and its trip-hub list UI only.
- New tab order: Journal, Gallery, Map, Pins, Packing, Tips, Do's & Don'ts.
- A pin can never be created with a blank/whitespace-only label.
- Deleting a trip must also delete its pins, via `deleteTripCascade`.

---

### Task 1: `PinEntry` type, `pins.ts` storage module, and cascade wiring

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/storage/pins.ts`
- Test: `src/lib/storage/pins.test.ts`
- Modify: `src/lib/storage/storage.ts`
- Modify: `src/lib/storage/storage.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks — this is the foundational data-layer task.
- Produces: `PinEntry` type; `listPins(tripId: string): PinEntry[]`, `savePin(pin: PinEntry): void`, `deletePin(id: string): void`, `deletePinsForTrip(tripId: string): void` — all re-exported from `$lib/storage/storage` and consumed by Task 2's `PinsList.svelte`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage/pins.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { listPins, savePin, deletePin, deletePinsForTrip } from './pins';
import type { PinEntry } from '$lib/types';

beforeEach(() => {
  localStorage.clear();
});

describe('pins repository', () => {
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

  it('lists pins scoped to a trip', () => {
    savePin(pin1);
    savePin(pin2);
    savePin({ ...pin1, id: 'pin3', tripId: 't2' });
    expect(listPins('t1')).toEqual([pin1, pin2]);
  });

  it('updates a pin in place', () => {
    savePin(pin1);
    savePin({ ...pin1, note: 'Updated note' });
    expect(listPins('t1')).toEqual([{ ...pin1, note: 'Updated note' }]);
  });

  it('deletes a single pin', () => {
    savePin(pin1);
    deletePin('pin1');
    expect(listPins('t1')).toEqual([]);
  });

  it('deletes all pins for a trip without touching other trips', () => {
    savePin(pin1);
    savePin(pin2);
    savePin({ ...pin1, id: 'pin3', tripId: 't2' });
    deletePinsForTrip('t1');
    expect(listPins('t1')).toEqual([]);
    expect(listPins('t2')).toEqual([{ ...pin1, id: 'pin3', tripId: 't2' }]);
  });
});
```

Add to the existing `describe('deleteTripCascade', ...)` block in `src/lib/storage/storage.test.ts` (after its existing tests), and add `savePin`, `listPins` to that file's existing import from `./storage`:

```ts
  it('removes the trip pins', () => {
    const trip = createTrip({ name: 'Ireland', startDate: '2026-06-01', endDate: '2026-06-10', countries: ['IE'] });
    savePin({ id: generateId(), tripId: trip.id, label: 'Cliffs of Moher', note: null, createdAt: new Date().toISOString() });

    deleteTripCascade(trip.id);

    expect(listPins(trip.id)).toEqual([]);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- pins.test.ts`
Expected: FAIL — `src/lib/storage/pins.ts` does not exist yet.

Run: `npm run test -- storage.test.ts`
Expected: FAIL — `savePin`/`listPins` are not exported from `./storage` yet.

- [ ] **Step 3: Add `PinEntry` to `types.ts`**

In `src/lib/types.ts`, add (after the existing `TipEntry` interface, at the end of the file):

```ts
export interface PinEntry {
  id: string;
  tripId: string;
  label: string;
  note: string | null;
  createdAt: string;
}
```

- [ ] **Step 4: Create `pins.ts`**

Create `src/lib/storage/pins.ts`:

```ts
import type { PinEntry } from '$lib/types';

const PINS_KEY = 'trailune:pins';

function readAll(): PinEntry[] {
  const raw = localStorage.getItem(PINS_KEY);
  return raw ? (JSON.parse(raw) as PinEntry[]) : [];
}

function writeAll(items: PinEntry[]): void {
  localStorage.setItem(PINS_KEY, JSON.stringify(items));
}

export function listPins(tripId: string): PinEntry[] {
  return readAll().filter((p) => p.tripId === tripId);
}

export function savePin(pin: PinEntry): void {
  const items = readAll();
  const idx = items.findIndex((p) => p.id === pin.id);
  if (idx === -1) items.push(pin);
  else items[idx] = pin;
  writeAll(items);
}

export function deletePin(id: string): void {
  writeAll(readAll().filter((p) => p.id !== id));
}

export function deletePinsForTrip(tripId: string): void {
  writeAll(readAll().filter((p) => p.tripId !== tripId));
}
```

- [ ] **Step 5: Wire `pins.ts` into `storage.ts`**

In `src/lib/storage/storage.ts`, add the re-export alongside the existing ones:

```ts
export * from './local';
export * from './checklist';
export * from './tips';
export * from './pins';
export { getPhoto, deletePhoto } from './photos';
```

Add the import at the top of the file, alongside the existing repository imports:

```ts
import * as trips from './local';
import * as checklist from './checklist';
import * as photoStore from './photos';
import * as tipsRepo from './tips';
import * as pinsRepo from './pins';
```

In `deleteTripCascade`, add a call to `deletePinsForTrip` — insert it right after the existing `checklist.deleteDoDontItemsForTrip(tripId);` line:

```ts
  trips.deleteJournalEntriesForTrip(tripId);
  checklist.deletePackingItemsForTrip(tripId);
  checklist.deleteDoDontItemsForTrip(tripId);
  pinsRepo.deletePinsForTrip(tripId);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test -- pins.test.ts storage.test.ts`
Expected: PASS (all tests in both files)

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass.

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/storage/pins.ts src/lib/storage/pins.test.ts src/lib/storage/storage.ts src/lib/storage/storage.test.ts
git commit -m "feat: add memory pins data model and storage layer"
```

---

### Task 2: `PinsList.svelte` and trip hub wiring

**Files:**
- Create: `src/lib/components/PinsList.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: `listPins`, `savePin`, `deletePin` from Task 1's `$lib/storage/storage` (already re-exported); `PinEntry` from `$lib/types`; `generateId` from `$lib/utils/id` (existing).
- Produces: `PinsList.svelte` with a single required prop `{ tripId: string }` — a self-contained unit, nothing later depends on its internals.

- [ ] **Step 1: Create `PinsList.svelte`**

Create `src/lib/components/PinsList.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listPins, savePin, deletePin } from '$lib/storage/storage';
  import { generateId } from '$lib/utils/id';
  import type { PinEntry } from '$lib/types';

  let { tripId }: { tripId: string } = $props();

  let pins: PinEntry[] = $state([]);
  let label = $state('');
  let note = $state('');

  function load() {
    pins = listPins(tripId);
  }

  onMount(load);

  function add(event: SubmitEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    savePin({
      id: generateId(),
      tripId,
      label: label.trim(),
      note: note.trim() ? note.trim() : null,
      createdAt: new Date().toISOString()
    });
    label = '';
    note = '';
    load();
  }

  function remove(pin: PinEntry) {
    deletePin(pin.id);
    load();
  }
</script>

<section class="space-y-6">
  {#if pins.length === 0}
    <div
      class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-10 text-center"
    >
      <p class="text-[var(--color-ink-soft)]">No pins yet. Add a place worth remembering below.</p>
    </div>
  {:else}
    <ul class="space-y-3">
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
          <button
            type="button"
            onclick={() => remove(pin)}
            aria-label={`Remove ${pin.label}`}
            class="grid size-7 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100"
          >
            <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.25">
              <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  <form
    onsubmit={add}
    class="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
  >
    <h2 class="font-display text-base font-bold">Pin a place</h2>
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Place name</span>
      <input
        bind:value={label}
        required
        placeholder="e.g. Cliffs of Moher"
        class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      />
    </label>
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Note (optional)</span>
      <input
        bind:value={note}
        placeholder="What made it memorable?"
        class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      />
    </label>
    <button
      type="submit"
      class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:bg-[var(--color-accent-hover)]"
    >
      Add pin
    </button>
  </form>
</section>
```

Note: `label.trim()`/`note.trim()` guard against whitespace-only input — an empty-after-trim label is rejected by the `if (!label.trim()) return;` check before `savePin` is ever called, and a whitespace-only note is normalized to `null` rather than stored as an empty/blank string.

- [ ] **Step 2: Wire the new tab into the trip hub**

In `src/routes/trips/[id]/+page.svelte`, add the import alongside the existing component imports:

```ts
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import DoDontList from '$lib/components/DoDontList.svelte';
  import TipsList from '$lib/components/TipsList.svelte';
  import StarRating from '$lib/components/StarRating.svelte';
  import PhotoGallery from '$lib/components/PhotoGallery.svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import PinsList from '$lib/components/PinsList.svelte';
```

Change the `activeTab` type declaration:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

to:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

Change the `tabs` array:

```ts
  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'map' as const, label: 'Map' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" }
  ];
```

to:

```ts
  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'map' as const, label: 'Map' },
    { id: 'pins' as const, label: 'Pins' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" }
  ];
```

Change the tab-content branch chain:

```svelte
    {:else if activeTab === 'gallery'}
      <PhotoGallery {tripId} />
    {:else if activeTab === 'map'}
      <WorldMap visitedCodes={new Set(trip.countries)} />
    {:else if activeTab === 'packing'}
      <PackingChecklist tripId={tripId} />
    {:else if activeTab === 'tips'}
      <TipsList {tripId} />
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
```

to:

```svelte
    {:else if activeTab === 'gallery'}
      <PhotoGallery {tripId} />
    {:else if activeTab === 'map'}
      <WorldMap visitedCodes={new Set(trip.countries)} />
    {:else if activeTab === 'pins'}
      <PinsList {tripId} />
    {:else if activeTab === 'packing'}
      <PackingChecklist tripId={tripId} />
    {:else if activeTab === 'tips'}
      <TipsList {tripId} />
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
```

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass — this task adds no new test file (no unit tests for Svelte components in this codebase; `PinsList.svelte`'s only real logic — `listPins`/`savePin`/`deletePin` — is already tested in Task 1).

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open a trip hub. Confirm the tab order is Journal, Gallery, Map, Pins, Packing, Tips, Do's & Don'ts.
2. Open the Pins tab with no pins yet. Confirm the "No pins yet" empty state renders.
3. Add a pin with just a place name (no note). Confirm it appears in the list with no note line shown.
4. Add a pin with both a place name and a note. Confirm both render.
5. Try submitting the add-form with an empty or whitespace-only place name. Confirm no pin is created.
6. Delete a pin. Confirm it disappears from the list immediately.
7. Delete the whole trip via the existing "Delete trip" button. Confirm you're returned to the trips list, then create a fresh trip and confirm no orphaned pins from the deleted trip appear anywhere.
8. Switch through all four theme presets on `/settings` and revisit the Pins tab. Confirm the card, empty-state, and form colors all read correctly in each theme.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/PinsList.svelte "src/routes/trips/[id]/+page.svelte"
git commit -m "feat: add pins tab to trip hub"
```

---

## Self-Review Notes

- **Spec coverage:** the `PinEntry` type (Task 1), the `pins.ts` CRUD module and its re-export (Task 1), the `deleteTripCascade` wiring (Task 1), the add/list/delete UI with the required-label and optional-note behavior (Task 2), the exact tab order (Task 2 Step 2), the empty state (Task 2 Step 1), and the full manual test matrix from the spec's Testing section (Task 2 Step 4) are all covered. The explicit non-goals (no coordinates, no photo, no checkbox, no map integration) are correctly absent from every task.
- **Placeholder scan:** no TBD/TODO; every step contains complete, final code.
- **Type consistency:** `PinEntry` (Task 1) is consumed identically in Task 2's `PinsList.svelte` (`pins: PinEntry[]`, `pin.id`, `pin.label`, `pin.note`, `pin.tripId`); `listPins(tripId: string): PinEntry[]`, `savePin(pin: PinEntry): void`, and `deletePin(id: string): void` signatures match their only call sites exactly.
