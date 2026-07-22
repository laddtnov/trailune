# Diary-Style Journal Reframe — Design Spec

Date: 2026-07-22

## Overview

This is the first slice of `docs/ROADMAP.md` §3 "Journal, Memories & Timeline" — the diary-style journal reframe. It adds an optional 1-5 star rating to journal entries and replaces the current thin list-row layout in the trip hub's Journal tab with a "postcard split" card (photo on the left, text and stars on the right).

§3 as a whole bundles five independent sub-ideas (journal reframe, journey timeline, photo gallery tabs, memory pins, travel calendar heatmap); this spec covers only the journal reframe. The others will get their own spec → plan → build cycles.

## Goals

- Add an optional 1-5 star rating to `JournalEntry`, settable on both the quick "Add an entry" form and the entry detail/edit page.
- Replace the current compact list row in the trip hub's Journal tab with a postcard-split card: a fixed-width photo panel on the left (or the existing image-placeholder icon when there's no photo), date/note/stars on the right.
- Ratings are entirely optional — entries with no rating render with no star row at all, so existing entries (which have none) don't look broken or incomplete.

## Non-goals

- No mood-emoji picker — stars only, per the approved choice.
- No rating shown anywhere outside the journal list/detail views in this cycle (no stats/year-in-review integration) — that's a possible future extension, not in scope here.
- No changes to photo storage, journal entry deletion, or any other existing journal behavior beyond adding the rating field and the card layout.

## Architecture

- **`src/lib/types.ts`** (modify) — add `rating?: number;` to `JournalEntry` (1-5, `undefined` = not rated). No other fields change; no migration needed since the field is optional and existing entries simply lack it.
- **`src/lib/components/StarRating.svelte`** (new) — a small reusable component with two modes:
  - **Interactive** (used in both forms): click a star to set the rating 1-5; clicking the currently-set star again clears it back to unset. Emits the rating value via a bound prop (`bind:value`).
  - **Read-only** (used in the list card and detail view header): renders filled/outline stars for a given rating; renders nothing at all when the rating is `undefined`.
- **`src/routes/trips/[id]/+page.svelte`** (modify):
  - The "Add an entry" form gains a `StarRating` picker (interactive mode) alongside the existing date/photos/note fields, wired into the existing `addJournalEntry` call.
  - The Journal tab's entry list swaps its current row markup for the postcard-split card: left panel is the entry's first photo thumbnail (existing thumbnail-loading logic, unchanged) or, when absent, the same image-placeholder icon/tinted background already used today; right panel holds the date, note, and a read-only `StarRating` (rendered only if `entry.rating` is set).
- **`src/routes/trips/[id]/entry/[entryId]/+page.svelte`** (modify) — the edit form gains the same interactive `StarRating` picker, pre-filled from `entry.rating` (or left unset), wired into the existing `saveJournalEntry` call.

## Data flow & interaction notes

- No new storage functions. `addJournalEntry` and `saveJournalEntry` already accept and persist whatever fields are passed on the entry object — they simply start receiving an optional `rating` alongside `date`/`note`/`photoFiles` (or the full entry object, for `saveJournalEntry`).
- `StarRating`'s interactive mode is a fully self-contained, prop-driven component: it takes a bound numeric value (`number | undefined`) and updates it on click. Neither form needs to know how stars are rendered internally.
- The list card and detail page both read `entry.rating` directly — no derived/computed state involved.

## Edge cases

- **No rating set**: the star row is entirely absent (not shown as 5 outline stars) in both the postcard card and the detail view, so the ~110 existing entries created before this feature don't suddenly look "incomplete."
- **Clearing a rating**: clicking the already-selected star (e.g. clicking star 3 when the rating is already 3) resets the rating to `undefined`, giving users a way to unset a rating without a separate "clear" control.
- **No-photo entries in the postcard layout**: reuse the existing image-placeholder icon and tinted background from today's journal row, sized to fill the same left-panel slot a real thumbnail would occupy — no new icon/asset needed.

## Testing

Following this project's established convention (manual browser verification for UI-only changes, no pure logic to unit test beyond what already exists for entry CRUD):

- Add a new entry with a rating set; confirm it persists and displays correctly in both the list card and after opening the entry.
- Add a new entry with no rating; confirm no star row appears anywhere for it.
- Edit an existing (unrated) entry to add a rating; confirm it now shows correctly in the list.
- Edit a rated entry and click its current star value again; confirm the rating clears.
- Confirm photo-less entries render the placeholder icon correctly in the new postcard layout.
- Check the postcard layout and star colors read correctly across all four theme presets (Travel Journal, Explorer Night, Golden Sunset, Polar Morning).
