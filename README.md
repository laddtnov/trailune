# Trailune

<p>
  <img alt="SvelteKit" src="https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
  <img alt="Vitest" src="https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white" />
  <img alt="Vercel" src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" />
</p>

**Track every journey.**

[🌐 Live demo](https://trailune.laddtnov.xyz/)

Trailune is a personal travel tracker: log trips with photo journal entries and notes, keep a packing checklist so nothing gets forgotten, track a per-trip Do's & Don'ts list, and see visited countries fill in on a world map as you go.

This is a **v1, local-only build**. There's no backend and no account system — everything runs entirely in your browser. Trip, journal, and packing data live in `localStorage`; photos live in `IndexedDB`. A backend (and the multi-device sync it would enable) is a deliberate v2 addition, not a missing piece of v1.

## Screenshots

| Trips | World map | Trip hub |
|---|---|---|
| ![Trips list](docs/screenshots/trips.png) | ![World map](docs/screenshots/map.png) | ![Trip hub](docs/screenshots/trip-hub.png) |

## Table of contents

- [Screenshots](#screenshots)
- [Features](#features)
- [How it's built](#how-its-built)
- [Routes](#routes)
- [Data model](#data-model)
- [Getting started](#getting-started)
- [Testing](#testing)
- [Deploying](#deploying)
- [Project structure](#project-structure)
- [Deferred to v2](#deferred-to-v2)
- [Credits](#credits)

## Features

- **Trips** — create a trip with a name, a date range, and the countries visited on it. Delete a trip and everything under it (journal entries, packing items, photos, do's & don'ts) is cleaned up with it.
- **Journal** — add dated entries with a note and one or more photos per trip. Edit or delete any entry later; full-size photos are shown on the entry page, thumbnails in the list.
- **Packing checklist** — maintain one reusable packing *template*, grouped by category (Documents, Electronics, Clothing, Toiletries, Other). Every new trip copies that template into its own checklist automatically, so recurring items like "passport" or "charger" never need re-typing — and checking something off on one trip never touches the shared template or any other trip.
- **Do's & Don'ts** — a simple two-column checklist per trip for reminders and warnings you want on hand while traveling.
- **World map** — a clickable SVG world map that highlights every country you've visited. Visited state is *derived* from your trips' data, not a separate toggle, so the map and your trip list can never drift out of sync.

## How it's built

Trailune runs entirely client-side — no server, no API calls, no accounts:

- **[SvelteKit](https://svelte.dev/docs/kit)** (Svelte 5 runes, TypeScript) for the app shell and routing.
- **`localStorage`** for structured data (trips, journal entries, packing items, do's/don'ts) via small repository modules with a shared read/write pattern.
- **`IndexedDB`** (via [`idb`](https://github.com/jakearchibald/idb)) for photo blobs, since binary data doesn't belong in `localStorage`.
- A single **storage facade** (`src/lib/storage/storage.ts`) composes the repositories and owns the app's two cross-cutting rules: copying the packing template onto a new trip, and cascading deletes (trip → journal entries → packing items → do's/don'ts → photos) so nothing is ever orphaned.
- The **world map** is a static, bundled SVG with countries as `<path>` elements keyed by ISO code — highlighting a country is a CSS class toggle, with no map/geo service involved.

## Routes

| Route | Purpose |
|---|---|
| `/` | Trips list — create a new trip here |
| `/map` | World map with visited-country stats |
| `/trips/[id]` | Trip hub — Journal / Packing / Do's & Don'ts tabs |
| `/trips/[id]/entry/[entryId]` | View, edit, or delete a single journal entry |
| `/packing-template` | Edit the reusable packing template |

## Data model

```ts
Trip          { id, name, startDate, endDate, countries: string[] }
JournalEntry  { id, tripId, date, note, photoIds: string[] }
Photo         { id, blob, thumbnailBlob }
PackingItem   { id, tripId | null, category, label, checked }  // tripId: null = shared template
DoDontItem    { id, tripId, type: 'do' | 'dont', text, checked }
```

## Getting started

```sh
npm install
npm run dev
```

Open the printed `localhost` URL in your browser.

## Testing

The storage layer (repositories, the storage facade, and pure utility functions) has a full Vitest suite. UI behavior is verified manually, since this is a small solo v1 project.

```sh
npm run test
```

## Deploying

Trailune deploys to [Vercel](https://vercel.com) via GitHub Actions: every push to `main` builds and promotes to production, and every pull request gets its own preview deployment. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Project structure

```
src/
  lib/
    storage/       # localStorage repositories, IndexedDB photo store, storage facade
    components/    # WorldMap, TripCard, PackingChecklist, DoDontList
    utils/         # id generation, thumbnail generation
    countries.ts   # parses the world map SVG into a { code, name } list
  routes/          # SvelteKit pages (see Routes above)
static/
  world-map.svg    # bundled world map asset
docs/superpowers/  # design spec + implementation plan for this build
```

## Deferred to v2

Intentionally out of scope for this build:

- Currency exchange tips
- "Getting to city center" local transit guidance
- A user ranking/badge system
- A backend and real database (enabling multi-device sync and accounts)

## Credits

- World map SVG adapted from [tomi5/visited-countries-map](https://github.com/tomi5/visited-countries-map) (MIT), itself sourced from [Simplemaps.com](https://simplemaps.com/).
- Full design spec and implementation plan live in [`docs/superpowers/`](docs/superpowers/).
