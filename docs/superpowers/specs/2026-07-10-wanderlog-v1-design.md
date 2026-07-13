# Trailune v1 — Design Spec

Date: 2026-07-10

## Overview

Trailune ("Track every journey.") is a personal travel tracker: log trips with photo journal entries and notes, plan packing so nothing gets forgotten, keep a Do's & Don'ts list per trip, and see visited countries on a world map. This spec covers **v1 scope only**. Currency exchange tips, "getting to town center" tips, and the user ranking/badge system are explicitly deferred to a v2.

## Goals (v1)

- Log trips, each with a photo + note journal.
- Reusable packing template that seeds a per-trip checklist, so recurring items (passport, charger, etc.) aren't re-typed every trip.
- Per-trip Do's & Don'ts checklist.
- World map showing visited countries, derived from trip data.
- Runs fully locally on `localhost` with no backend — a backend is a planned v2 addition, not part of this build.

## Non-goals (v1)

- Currency exchange guidance.
- "How to get to city center" transit tips.
- User accounts, ranks, or badges.
- Any server/backend/database — see Data Storage below.
- Multi-device sync.

## Tech Stack

- **SvelteKit**, dev server on localhost.
- **No backend.** Persistence is entirely client-side:
  - `localStorage` for trip/journal/packing/do-dont metadata (small, structured JSON).
  - `IndexedDB` for photo blobs (binary-safe, larger capacity).
  - All storage access goes through a single `storage.ts` module so the eventual backend swap only touches that module, not UI components.
- **World map**: a static, bundled SVG world map component. Countries are `<path>` elements keyed by ISO code; "visited" is a CSS class toggle by id. No external map/geo API — works fully offline.
- **Testing**: Vitest for the storage module (template-copy logic, IndexedDB read/write). UI flows verified manually (solo v1 project).

## Routes

| Route | Purpose |
|---|---|
| `/` | Trips list (landing page) |
| `/map` | World map, visited countries highlighted |
| `/trips/[id]` | Trip hub — Journal / Packing / Do's & Don'ts tabs |
| `/trips/[id]/entry/[entryId]` | Journal entry detail/edit |
| `/packing-template` | Edit the reusable default packing list |

## Data Model

```ts
Trip {
  id: string
  name: string
  startDate: string   // ISO date
  endDate: string
  countries: string[] // ISO country codes; drives map highlighting
  createdAt: string
}

JournalEntry {
  id: string
  tripId: string
  date: string
  note: string
  photoIds: string[]  // references into the Photo store
}

Photo {
  id: string
  blob: Blob
  thumbnailBlob: Blob
  createdAt: string
}

PackingItem {
  id: string
  tripId: string | null  // null = lives on the reusable template
  category: 'Documents' | 'Electronics' | 'Clothing' | 'Toiletries' | 'Other'
  label: string
  checked: boolean
}

DoDontItem {
  id: string
  tripId: string
  type: 'do' | 'dont'
  text: string
  checked: boolean
}
```

Rules:
- Creating a new trip copies every `PackingItem` where `tripId === null` into new items scoped to the new trip's `tripId`. Per-trip edits never mutate the shared template.
- A country appears "visited" on the map if and only if it's listed in some trip's `countries[]`. There is no separate manual toggle — map state is always derived from trip data, so the two can't drift out of sync.

## Screens

- **Trips list (`/`)** — cards per trip (name, dates, country names/flags). "+ New Trip" opens a form: name, start/end date, countries visited (picked via a mini country picker or by clicking the map). Empty state prompts creating the first trip.
- **World Map (`/map`)** — SVG map, visited countries highlighted in the accent color, a stat line (e.g. "12 / 195 countries visited"). Clicking a highlighted country shows which trip(s) went there.
- **Trip hub (`/trips/[id]`)** — passport-style header (trip name, dates, country stamps) with three tabs:
  - *Journal*: reverse-chronological entries (photo thumbnail + note snippet + date). "+ Add entry" opens a form (date, note, photo upload).
  - *Packing*: checklist grouped by category, checkbox to mark packed, inline add/remove.
  - *Do's & Don'ts*: two lists ("Do" / "Don't"), add/check off/remove items inline.
- **Packing template (`/packing-template`)** — edit the master list that seeds every new trip's packing checklist.

## Feature Behavior

- **Photo upload**: user selects image file(s) → a client-side canvas resize produces a thumbnail for fast list rendering; the original is stored in IndexedDB and referenced by id from the `JournalEntry`.
- **Map interaction**: country-level only (not city/pin-level) — clicking a country toggles/reveals its visited state; highlighting is a CSS class keyed by the SVG path's ISO id.
- All checklists (packing, do/don't) and the journal are edited inline — no separate "edit mode" toggle.

## Error Handling

Since this is local-only, error surfaces are narrow:
- Photo too large → cap file size client-side with a friendly message.
- IndexedDB unavailable (e.g. private browsing) → fallback message explaining photos won't persist this session.
- Empty states everywhere data can be empty: no trips yet, no journal entries yet, empty packing template, etc.

## Visual Design

Warm travel/passport aesthetic: cream/paper background tones, stamped-passport and postcard motifs, serif (Georgia-style) headings with monospace accents for stamp/label details, warm terracotta/teal accent palette.

## Naming

App name: **Trailune**. Slogan: "Track every journey."

## Deferred to v2

- Currency exchange tips (where/how to exchange currency).
- "Getting to city center" local transit guidance.
- User ranking/badge system.
- Backend + real database, enabling multi-device sync.
