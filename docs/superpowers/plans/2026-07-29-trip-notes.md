# Trip Notes Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The trip hub gains a "Notes" tab — a single auto-saving free-form scratchpad per trip.

**Architecture:** A new `TripNote` type and `notes.ts` storage module (mirroring the existing `pins.ts` CRUD shape, but one record per trip instead of many), wired into `deleteTripCascade`. A new `TripNotes.svelte` component holds the textarea, debounced auto-save, and a simple Saving/Saved indicator; the trip hub page gets a new tab entry.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- One note per trip (upserted, not appended) — no multiple-notes-per-trip concept (spec: Non-goals).
- Plain text only, no rich text/markdown (spec: Non-goals).
- Auto-save ~500ms after typing stops, plus an immediate save on blur as a safety net — no explicit Save button (spec: Goals).
- Deleting a trip must remove its note via the existing cascade-delete mechanism (spec: Goals, Architecture).
- The Saving/Saved indicator has no auto-fade: "Saving…" shows the instant a keystroke happens, "Saved" once the debounced write completes, persisting until the next keystroke; nothing shows before the first edit (spec: Architecture).

---

### Task 1: Notes data layer

**Files:**
- Modify: `src/lib/types.ts`
- Create: `src/lib/storage/notes.ts`
- Modify: `src/lib/storage/storage.ts`
- Test: `src/lib/storage/notes.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks (this is the foundational task).
- Produces: `TripNote` type (`{ tripId: string; text: string; updatedAt: string }`), `export function getNote(tripId: string): TripNote | undefined`, `export function saveNote(tripId: string, text: string): void`, `export function deleteNoteForTrip(tripId: string): void` — all re-exported via `$lib/storage/storage` for Task 2's `TripNotes.svelte` to import.

- [ ] **Step 1: Add the `TripNote` type**

In `src/lib/types.ts`, add (near the other entry types like `PinEntry`):

```ts
export interface TripNote {
  tripId: string;
  text: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/storage/notes.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getNote, saveNote, deleteNoteForTrip } from './notes';

beforeEach(() => {
  localStorage.clear();
});

describe('notes repository', () => {
  it('returns undefined when no note exists for a trip', () => {
    expect(getNote('t1')).toBeUndefined();
  });

  it('creates a new note when none exists', () => {
    saveNote('t1', 'Remember to pack sunscreen');

    const note = getNote('t1');
    expect(note?.tripId).toBe('t1');
    expect(note?.text).toBe('Remember to pack sunscreen');
    expect(note?.updatedAt).toBeTruthy();
  });

  it('updates an existing note in place rather than creating a duplicate', () => {
    saveNote('t1', 'First draft');
    saveNote('t1', 'Revised draft');

    expect(getNote('t1')?.text).toBe('Revised draft');
  });

  it('removes a trip note without affecting other trips', () => {
    saveNote('t1', 'Trip 1 note');
    saveNote('t2', 'Trip 2 note');

    deleteNoteForTrip('t1');

    expect(getNote('t1')).toBeUndefined();
    expect(getNote('t2')?.text).toBe('Trip 2 note');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/notes.test.ts`
Expected: FAIL — cannot resolve `./notes` (module does not exist yet)

- [ ] **Step 4: Implement the notes storage module**

Create `src/lib/storage/notes.ts`:

```ts
import type { TripNote } from '$lib/types';

const NOTES_KEY = 'trailune:notes';

function readAll(): TripNote[] {
  const raw = localStorage.getItem(NOTES_KEY);
  return raw ? (JSON.parse(raw) as TripNote[]) : [];
}

function writeAll(items: TripNote[]): void {
  localStorage.setItem(NOTES_KEY, JSON.stringify(items));
}

export function getNote(tripId: string): TripNote | undefined {
  return readAll().find((n) => n.tripId === tripId);
}

export function saveNote(tripId: string, text: string): void {
  const items = readAll();
  const idx = items.findIndex((n) => n.tripId === tripId);
  const note: TripNote = { tripId, text, updatedAt: new Date().toISOString() };
  if (idx === -1) items.push(note);
  else items[idx] = note;
  writeAll(items);
}

export function deleteNoteForTrip(tripId: string): void {
  writeAll(readAll().filter((n) => n.tripId !== tripId));
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/notes.test.ts`
Expected: PASS — all 4 tests green

- [ ] **Step 6: Re-export from storage.ts and wire into cascade delete**

In `src/lib/storage/storage.ts`, replace:

```ts
import * as pinsRepo from './pins';
```

with:

```ts
import * as pinsRepo from './pins';
import * as notesRepo from './notes';
```

Replace:

```ts
export * from './pins';
```

with:

```ts
export * from './pins';
export * from './notes';
```

In the existing `deleteTripCascade` function, replace:

```ts
  pinsRepo.deletePinsForTrip(tripId);
```

with:

```ts
  pinsRepo.deletePinsForTrip(tripId);
  notesRepo.deleteNoteForTrip(tripId);
```

- [ ] **Step 7: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 8: Commit**

```bash
git add src/lib/types.ts src/lib/storage/notes.ts src/lib/storage/notes.test.ts src/lib/storage/storage.ts
git commit -m "feat: add trip notes data layer"
```

---

### Task 2: `TripNotes.svelte` and trip hub wiring

**Files:**
- Create: `src/lib/components/TripNotes.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: `getNote`, `saveNote` from `$lib/storage/storage` (Task 1).
- Produces: nothing consumed by later tasks — this is the only remaining task.

- [ ] **Step 1: Create the component**

Create `src/lib/components/TripNotes.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { getNote, saveNote } from '$lib/storage/storage';

  let { tripId }: { tripId: string } = $props();

  let text = $state('');
  let saveState: 'idle' | 'saving' | 'saved' = $state('idle');
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    text = getNote(tripId)?.text ?? '';
  });

  function scheduleSave() {
    saveState = 'saving';
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      saveNote(tripId, text);
      saveState = 'saved';
    }, 500);
  }

  function saveNow() {
    if (timeoutId) clearTimeout(timeoutId);
    saveNote(tripId, text);
    saveState = 'saved';
  }
</script>

<section class="space-y-2">
  <textarea
    bind:value={text}
    oninput={scheduleSave}
    onblur={saveNow}
    rows="12"
    placeholder="Packing reminders, confirmation numbers, loose thoughts — anything that doesn't fit the journal."
    class="w-full resize-y rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
  ></textarea>
  {#if saveState === 'saving'}
    <p class="text-xs text-[var(--color-ink-soft)]">Saving…</p>
  {:else if saveState === 'saved'}
    <p class="text-xs text-[var(--color-ink-soft)]">Saved</p>
  {/if}
</section>
```

- [ ] **Step 2: Add the Notes tab to the trip hub**

In `src/routes/trips/[id]/+page.svelte`, replace:

```ts
  import PinsList from '$lib/components/PinsList.svelte';
```

with:

```ts
  import PinsList from '$lib/components/PinsList.svelte';
  import TripNotes from '$lib/components/TripNotes.svelte';
```

Replace:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

with:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' | 'notes' = $state('journal');
```

Replace:

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

with:

```ts
  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'map' as const, label: 'Map' },
    { id: 'pins' as const, label: 'Pins' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" },
    { id: 'notes' as const, label: 'Notes' }
  ];
```

Replace:

```ts
  const validTabs = ['journal', 'gallery', 'map', 'pins', 'packing', 'tips', 'dodont'] as const;
```

with:

```ts
  const validTabs = ['journal', 'gallery', 'map', 'pins', 'packing', 'tips', 'dodont', 'notes'] as const;
```

Replace:

```svelte
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
```

with:

```svelte
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {:else if activeTab === 'notes'}
      <TripNotes {tripId} />
    {/if}
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 4: Run svelte-check**

Run: `npm run check`
Expected: same error count as the `main` baseline (no new errors)

- [ ] **Step 5: Manually verify in the browser**

Start the dev server, open a trip's Notes tab, and confirm:
- Typing shows "Saving…" immediately, then "Saved" after ~500ms of no typing.
- Reloading the page after "Saved" appears preserves the text.
- Typing and immediately switching to another tab (before 500ms elapses) still saves the text — confirmed by switching back to Notes or reloading.
- Deleting the trip (via the existing "Delete trip" action) removes its note from `localStorage` (`trailune:notes`, checked via browser devtools) along with everything else.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TripNotes.svelte src/routes/trips/\[id\]/+page.svelte
git commit -m "feat: add Notes tab to trip hub"
```
