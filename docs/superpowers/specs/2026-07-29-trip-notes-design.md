# Trip Notes Tab — Design Spec

Date: 2026-07-29

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas": *"Trip hub expansion — Grow the trip hub's tab set beyond Journal/Packing/Do's & Don'ts/Tips toward: Photos, Expenses, Documents, Notes, Weather."*

Of those five candidates: Photos already shipped in §3 (the Gallery tab). Expenses and Documents are explicitly called out by the roadmap as "genuinely new features... each deserving its own brainstorm cycle." Weather explicitly needs a backend-shape decision (same open question as the AI Travel Summary in §6). That leaves Notes as the only remaining candidate that fits this cycle's scope — no new backend, no live API, no large feature design.

## Goals

- A new "Notes" tab in the trip hub, alongside the existing Journal/Gallery/Map/Pins/Packing/Tips/Do's & Don'ts tabs.
- A single free-form, auto-saving scratchpad per trip — for things that don't fit the dated Journal or the categorized Tips (packing reminders, confirmation numbers, loose thoughts).
- Changes save automatically (~500ms after typing stops, plus on blur) with a small visible indicator, no explicit Save button.
- Deleting a trip removes its note via the existing cascade-delete mechanism.

## Non-goals

- No multiple notes per trip — one scratchpad only, per this cycle's scope decision. A future cycle could revisit this if a single scratchpad proves insufficient.
- No rich text or markdown rendering — plain text only, consistent with this being a lightweight scratchpad rather than a new editing feature.
- No Expenses, Documents, or Weather tabs — all three explicitly out of scope, deferred to their own future cycles per the roadmap's own reasoning.
- No sync/conflict handling beyond what already exists for every other localStorage-backed entity in this app (single-device, single-user).

## Architecture

- **`src/lib/storage/notes.ts`** (new file, mirrors the existing `pins.ts` shape):
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
  One `TripNote` per trip (upserted, not appended) — the array holds at most one entry per `tripId`, unlike `pins.ts`/`tips.ts` which hold many entries per trip.

- **`src/lib/types.ts`** (modify) — add:
  ```ts
  export interface TripNote {
    tripId: string;
    text: string;
    updatedAt: string;
  }
  ```

- **`src/lib/storage/storage.ts`** (modify) — add `export * from './notes';` alongside the existing re-exports (`pins`, `tips`, `checklist`), and wire `notesRepo.deleteNoteForTrip(tripId)` into the existing `deleteTripCascade` function, alongside the existing `pinsRepo.deletePinsForTrip(tripId)` call.

- **`src/lib/components/TripNotes.svelte`** (new):
  - Props: `{ tripId: string }`.
  - `let text = $state('')`, loaded from `getNote(tripId)?.text ?? ''` on mount.
  - `let saveState: 'idle' | 'saving' | 'saved' = $state('idle')`.
  - A debounce timer (plain `let timeoutId: ReturnType<typeof setTimeout> | undefined`, not a Svelte rune, since it's an imperative side effect, not reactive state) is reset on every `oninput`: clear the previous timeout, set a new one for 500ms that calls `saveNote(tripId, text)` and sets `saveState = 'saved'`.
  - `onblur` on the textarea also triggers an immediate save (clearing any pending debounce timeout first) — this is the safety net for a user switching tabs or navigating away before the debounce fires.
  - A small text indicator near the textarea shows "Saving…" while `saveState === 'saving'` (set the instant `oninput` fires) and "Saved" once `saveState === 'saved'` (set when the debounced save actually runs) — no auto-fade or extra timer; "Saved" simply persists until the next keystroke flips it back to "Saving…". No indicator is shown in the initial `'idle'` state before the user has typed anything.
  - No debounce timer cleanup is needed on unmount beyond what `onblur` already covers, since navigating away from the tab or trip hub always blurs the textarea first.

- **`src/routes/trips/[id]/+page.svelte`** (modify):
  - `activeTab` type union gains `'notes'`.
  - `tabs` array gains `{ id: 'notes' as const, label: 'Notes' }`.
  - `validTabs` gains `'notes'`.
  - A new `{:else if activeTab === 'notes'}` branch renders `<TripNotes {tripId} />`.
  - `import TripNotes from '$lib/components/TripNotes.svelte';` added alongside the existing component imports.

## Data flow & interaction notes

- The note is loaded once on mount and held in local component `$state`; there's no polling or re-fetch — this is a single-user, single-device app, consistent with every other tab.
- Auto-save writes directly to `localStorage` via `saveNote`, synchronous and immediate once the debounce timer fires — no async round-trip, no loading spinner needed for the save itself.
- `deleteTripCascade`'s existing call site and pattern (a flat list of `xRepo.deleteXForTrip(tripId)` calls) is extended by exactly one line for notes, no restructuring of that function.

## Edge cases

- **Empty note, never edited**: `getNote` returns `undefined`, textarea starts empty, nothing is saved until the user actually types something (an empty string is a valid state but there's no unsaved-empty-note litter in storage from every trip that never gets a note).
- **User types, then immediately navigates away before the 500ms debounce fires**: the `onblur` handler's immediate save covers this — no data loss.
- **Trip deleted while its Notes tab has unsaved (mid-debounce) text**: acceptable data loss, consistent with how every other in-progress form input in this app is not preserved across a trip deletion (e.g. an unsaved journal-entry draft).
- **Very long note text**: no length cap — `localStorage`'s practical size limit (typically several MB) is the only ceiling, consistent with how this app already handles all its other free-text fields (journal notes, tip notes, pin notes) with no explicit length validation.

## Testing

- **New unit tests** in `src/lib/storage/notes.test.ts` (new file, following the existing per-module test convention used by `pins.test.ts`):
  - `getNote` returns `undefined` when no note exists for a trip.
  - `saveNote` creates a new note when none exists.
  - `saveNote` updates (upserts) an existing note in place rather than creating a duplicate entry.
  - `deleteNoteForTrip` removes a trip's note without affecting other trips' notes.
- **Manual browser verification** (this project's established convention for this class of interactive-but-simple UI): type into the Notes tab, wait ~500ms, confirm the "Saved" indicator appears and the text persists across a page reload; type and immediately switch tabs (before 500ms elapses), confirm the text is still saved (via the blur handler) after switching back; delete a trip with a note and confirm no orphaned note remains in `localStorage`.
