# Trip Hub: Remove Notes Tab & Fix Mobile Tab Overflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the trip hub's Notes tab (component, storage layer, type, data) entirely since it duplicates the Journal entry note field, and fix the trip hub's tab bar so it never overflows the viewport on mobile.

**Architecture:** Two independent, sequential changes to the trip hub (`src/routes/trips/[id]/+page.svelte`) and its supporting files: (1) remove the Notes feature end-to-end (component, storage module, type, tab entry, cascade-delete hook, plus a one-time `localStorage` purge in the root layout), (2) add horizontal-scroll CSS classes to the tab `nav` so the remaining 7 tabs scroll instead of overflowing on narrow viewports.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Tailwind v4, Vitest.

## Global Constraints

- No changes to `JournalEntry.note` or the Journal tab's per-entry note field — that stays exactly as-is (per spec's Non-goals).
- No visual/behavioral change to any tab besides Notes (removed) and the tab bar container itself (scroll behavior added).
- The `localStorage` purge for `trailune:notes` must be unconditional and safe to run on every app load (no guard needed — `removeItem` on an absent key is a no-op).
- Desktop tab bar must look and behave identically to today (per spec: `overflow-x-auto` only activates when content exceeds container width, which won't happen with 7 tabs on desktop).

---

### Task 1: Remove the Notes tab feature entirely

**Files:**
- Delete: `src/lib/components/TripNotes.svelte`
- Delete: `src/lib/storage/notes.ts`
- Modify: `src/lib/types.ts` (remove `TripNote` interface, lines 70-74)
- Modify: `src/lib/storage/storage.ts` (remove notes import/re-export/cascade-delete call)
- Modify: `src/routes/trips/[id]/+page.svelte` (remove Notes tab entry, import, activeTab type member, validTabs member, and rendered content block)
- Modify: `src/routes/+layout.svelte` (add one-time `localStorage` purge)

**Interfaces:**
- Consumes: nothing from other tasks (this task is independent of Task 2).
- Produces: nothing new. Confirms via `npx vitest run` that no other file references the deleted `getNote`/`saveNote`/`deleteNoteForTrip`/`TripNote`/`TripNotes` symbols (Task 2 does not depend on any of these).

- [ ] **Step 1: Delete the Notes component and storage module**

```bash
rm src/lib/components/TripNotes.svelte
rm src/lib/storage/notes.ts
```

- [ ] **Step 2: Remove the `TripNote` type**

In `src/lib/types.ts`, delete lines 70-74:

```ts
export interface TripNote {
  tripId: string;
  text: string;
  updatedAt: string;
}
```

(Leave a single blank line where the block was, matching the file's existing spacing between interfaces — don't leave a double blank line.)

- [ ] **Step 3: Remove notes wiring from the storage barrel**

In `src/lib/storage/storage.ts`, remove this import line:

```ts
import * as notesRepo from './notes';
```

Remove this re-export line:

```ts
export * from './notes';
```

In `deleteTripCascade`, remove this line:

```ts
  notesRepo.deleteNoteForTrip(tripId);
```

(The function's other cascade-delete calls — `trips.deleteJournalEntriesForTrip`, `checklist.deletePackingItemsForTrip`, `checklist.deleteDoDontItemsForTrip`, `pinsRepo.deletePinsForTrip`, and the tips-deletion block below it — are unchanged.)

- [ ] **Step 4: Remove the Notes tab from the trip hub page**

In `src/routes/trips/[id]/+page.svelte`:

Remove this import:

```ts
  import TripNotes from '$lib/components/TripNotes.svelte';
```

Change the `activeTab` type declaration from:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' | 'notes' = $state('journal');
```

to:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

Change the `tabs` array from:

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

Change the `validTabs` array from:

```ts
  const validTabs = ['journal', 'gallery', 'map', 'pins', 'packing', 'tips', 'dodont', 'notes'] as const;
```

to:

```ts
  const validTabs = ['journal', 'gallery', 'map', 'pins', 'packing', 'tips', 'dodont'] as const;
```

Remove the rendered Notes block. Change:

```svelte
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {:else if activeTab === 'notes'}
      <TripNotes {tripId} />
    {/if}
```

to:

```svelte
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
```

- [ ] **Step 5: Add the one-time localStorage purge to the root layout**

In `src/routes/+layout.svelte`, add an `onMount` import and call. This file currently has no `onMount` — add the import alongside the existing Svelte imports, and call it after the existing `let` / `const` declarations, before the `</script>` closing tag.

Change the imports from:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import AmbientBackground from '$lib/components/AmbientBackground.svelte';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

to:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import AmbientBackground from '$lib/components/AmbientBackground.svelte';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Add this after the `isActive` function definition (the last piece of script logic before `</script>`):

```ts
  onMount(() => {
    localStorage.removeItem('trailune:notes');
  });
```

- [ ] **Step 6: Run the full test suite to confirm no broken references**

Run: `npx vitest run`
Expected: all tests pass (same count as before this task, minus any tests that lived in a deleted file — there is no `notes.test.ts` today, confirmed by search, so the count should be unchanged).

- [ ] **Step 7: Run type-check to confirm no dangling references**

Run: `npm run check`
Expected: same baseline error count as before this task (16 pre-existing errors), with no new errors referencing `TripNote`, `TripNotes`, `getNote`, `saveNote`, or `deleteNoteForTrip`.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/TripNotes.svelte src/lib/storage/notes.ts src/lib/types.ts src/lib/storage/storage.ts src/routes/trips/\[id\]/+page.svelte src/routes/+layout.svelte
git commit -m "feat: remove trip hub Notes tab (duplicates journal entry notes)"
```

(The `rm` in Step 1 stages deletions automatically when you `git add` the deleted paths — use `git add -A` if the plain `git add` of deleted paths doesn't stage them in your shell.)

---

### Task 2: Fix mobile tab-bar overflow

**Files:**
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: the `tabs` array and tab-bar markup as left by Task 1 (7 tabs, no Notes entry).
- Produces: nothing consumed by later tasks — this is the final task in the plan.

- [ ] **Step 1: Add horizontal-scroll classes to the tab bar container**

In `src/routes/trips/[id]/+page.svelte`, find the tab bar `nav` element:

```svelte
  <nav class="mt-6 flex gap-1 border-b border-[var(--color-card-border)]">
```

Change it to:

```svelte
  <nav class="mt-6 flex flex-nowrap gap-1 overflow-x-auto border-b border-[var(--color-card-border)]">
```

- [ ] **Step 2: Prevent tab buttons from shrinking while scrolling**

Find the tab button's class list:

```svelte
        class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab.id
          ? 'text-[var(--color-ink)]'
          : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}"
```

Change it to:

```svelte
        class="relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab.id
          ? 'text-[var(--color-ink)]'
          : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}"
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: builds cleanly, same output as before this task (this is a class-list-only change, no logic change — no test assertions apply here).

- [ ] **Step 4: Manual verification**

Start the dev server, open `/trips/[id]` for any existing trip, and using browser devtools' responsive/mobile viewport mode (e.g. 375px wide):
- Confirm the tab bar scrolls horizontally with touch/trackpad swipe and does not wrap or cause the page itself to scroll horizontally.
- Confirm all 7 tab labels remain fully readable (no truncation/wrapping) while scrolled.
- Resize to a desktop width (e.g. 1280px) and confirm all 7 tabs fit in one row with no scrollbar and no visual change from before this task.

- [ ] **Step 5: Commit**

```bash
git add src/routes/trips/\[id\]/+page.svelte
git commit -m "fix: prevent trip hub tab bar from overflowing on mobile"
```
