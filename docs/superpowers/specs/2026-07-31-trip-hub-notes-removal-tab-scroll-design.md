# Trip Hub: Remove Notes Tab & Fix Mobile Tab Overflow — Design Spec

Date: 2026-07-31

## Overview

The trip hub (`/trips/[id]`) has 8 tabs (Journal, Gallery, Map, Pins, Packing, Tips, Do's & Don'ts, Notes). Two problems reported:

1. The **Notes** tab (a single free-form scratchpad per trip, added in the "Trip hub expansion" cycle) duplicates the per-entry note field already on every Journal entry, from the user's perspective — remove it.
2. The tab bar (`nav` element, `src/routes/trips/[id]/+page.svelte`) has no overflow handling — on narrow/mobile viewports, 8 (soon 7) tab labels overflow the container width, breaking layout.

## Goals

- Remove the Notes tab and its feature entirely: component, storage layer, type, tab entry, cascade-delete hook.
- Purge any previously saved note data from `localStorage` (one-time, since the whole feature is gone, not per-trip).
- Fix the tab bar so it never overflows the page on mobile: tabs scroll horizontally instead of wrapping or shrinking unreadably.

## Non-goals

- No changes to the Journal tab's per-entry note field (`note: string | null` on `JournalEntry`) — that's the intended, non-duplicate note-taking surface and is unaffected.
- No redesign of the tab bar's visual style beyond adding scroll behavior — same tab markup, colors, active-indicator underline.
- No changes to any other trip hub tab's content.

## Architecture

### Notes removal

- **Delete** `src/lib/components/TripNotes.svelte` (the tab's only consumer of the notes storage layer).
- **Delete** `src/lib/storage/notes.ts` (`getNote`, `saveNote`, `deleteNoteForTrip` — confirmed via grep to have no other consumers besides `TripNotes.svelte` and `storage.ts`'s barrel re-export/cascade-delete call).
- **Remove** `TripNote` interface from `src/lib/types.ts:70-74`.
- **Modify** `src/lib/storage/storage.ts`:
  - Remove `import * as notesRepo from './notes';` and `export * from './notes';`.
  - Remove the `notesRepo.deleteNoteForTrip(tripId);` line from `deleteTripCascade`.
- **Modify** `src/routes/trips/[id]/+page.svelte`:
  - Remove `import TripNotes from '$lib/components/TripNotes.svelte';`.
  - Remove `'notes'` from the `activeTab` union type and `validTabs` array.
  - Remove the `{ id: 'notes' as const, label: 'Notes' }` entry from `tabs`.
  - Remove the `{:else if activeTab === 'notes'} <TripNotes {tripId} /> {/if}` block.
- **Modify** `src/routes/+layout.svelte`: add a new `onMount` (this file has no existing `onMount`) that runs once per app load:
  ```ts
  onMount(() => {
    localStorage.removeItem('trailune:notes');
  });
  ```
  This purges any previously saved note data unconditionally — safe because after this change no code ever writes to that key again, so repeated removal on every load is a harmless no-op once the key is gone.
- **Delete** `src/lib/storage/notes.test.ts` if it exists (grep first — none was found during exploration, but check before assuming).

### Mobile tab-bar overflow fix

- **Modify** `src/routes/trips/[id]/+page.svelte`'s tab `nav` element (currently `class="mt-6 flex gap-1 border-b border-[var(--color-card-border)]"`):
  - Add `overflow-x-auto` and `flex-nowrap` so tabs scroll horizontally instead of wrapping.
  - Add `shrink-0` to each tab `<button>`'s class list so labels never compress below their natural width while scrolling.
- No other markup changes — same tab styling, active-tab underline indicator, click behavior.

## Data flow & edge cases

- **Existing trips with saved notes**: their note text becomes unreachable the moment the tab/UI is removed; the `+layout.svelte` purge then deletes the underlying `localStorage['trailune:notes']` entry entirely on next app load. No migration/export path — this is a deliberate, user-approved full deletion of the feature and its data.
- **Trip deletion cascade**: after removing `notesRepo.deleteNoteForTrip(tripId)` from `deleteTripCascade`, deleting a trip no longer touches note data at all (nothing left to delete once the global purge has run).
- **URL deep-linking to `?tab=notes`**: since `'notes'` is removed from `validTabs`, a stale bookmark/link with `?tab=notes` will fail the `validTabs.includes(requestedTab)` check in `onMount` and silently fall through to the default `activeTab` (`'journal'`) — consistent with how any other invalid `?tab=` value is already handled today.
- **Tab bar scroll on desktop**: with only 7 tabs remaining and `overflow-x-auto`, desktop viewports (where all 7 already fit) show no visible change — `overflow-x-auto` only activates a scrollbar/scroll behavior when content actually exceeds the container width.

## Testing

- No new automated tests — this is a deletion (removing `notes.test.ts` if present) plus a template/class-list change to existing, already-covered UI. This project has no existing component-level test precedent for trip-hub tab UI (`WorldMap.svelte`, other tab content components, etc. are all manually verified only).
- Manual verification: run the full suite after deletion to confirm no import errors/broken references; open `/trips/[id]` at a mobile viewport width and confirm the tab bar scrolls horizontally with no page-level horizontal overflow; confirm Notes tab/route is fully gone (no console errors, no dead nav entry); confirm deleting a trip still cascades cleanly; confirm `localStorage['trailune:notes']` is absent after a fresh app load.
