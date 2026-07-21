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

Trailune is a personal travel tracker: log trips with photo journal entries and notes, keep a packing checklist so nothing gets forgotten, track a per-trip Do's & Don'ts and local tips list, and watch your visited countries and stats fill in automatically as you go. It installs as a PWA and works offline.

This is a **v1, local-only build**. There's no backend and no account system — everything runs entirely in your browser. Trip, journal, packing, and tips data live in `localStorage`; photos live in `IndexedDB`. The one exception is the footer feedback form, which calls a small standalone serverless function to send an email — sending email needs a server-side secret that can't live in browser code, so it's the one place this app talks to a server. A full backend (and the multi-device sync it would enable) is a deliberate v2 addition, not a missing piece of v1.

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

- **Trips** — create a trip with a name, a date range, the countries visited, and a transport mode (flight, train, road, boat, other). Filter your trip list by mode. Delete a trip and everything under it (journal entries, packing items, photos, do's & don'ts, tips) is cleaned up with it.
- **Journal** — add dated entries with a note and one or more photos per trip. Edit or delete any entry later; full-size photos are shown on the entry page, thumbnails in the list.
- **Packing checklist** — maintain one reusable packing *template*, grouped by category (Documents, Electronics, Clothing, Toiletries, Other). Every new trip copies that template into its own checklist automatically, so recurring items like "passport" or "charger" never need re-typing — and checking something off on one trip never touches the shared template or any other trip.
- **Do's & Don'ts** — a simple two-column checklist per trip for reminders and warnings you want on hand while traveling.
- **Tips** — local notes per trip, tagged by category (currency, places to avoid, transit, sightseeing), with an optional photo attached to each.
- **The Living Map** — a clickable SVG world map that highlights every country you've visited. Visited state is *derived* from your trips' data, not a separate toggle, so the map and your trip list can never drift out of sync. Newly-visited countries play a one-time reveal animation (staggered if a trip added several at once), hovering or tapping a visited country shows a quick stats popover (visit count, days there, last visit date), the visited-countries counter is an animated progress bar, and clicking a country smoothly zooms the map in on it (resetting on an outside click).
- **Home dashboard & stats** — the home page greets you with a time-of-day-aware summary, a quick stats strip, and a rank/level progress bar (Beginner → Trailblazer, derived from your country count, with a level-up reveal animation) once you've logged a trip. A dedicated `/stats` page breaks it down further: countries and continents visited, trips logged, flights taken, total days travelled, longest trip, and average trip length — all derived from your trips, nothing to maintain separately.
- **Achievements** — milestone badges (Explorer, Continental Traveller, Photographer, Globetrotter) on `/stats`, unlocked automatically as your trip history grows, with a one-time reveal animation the first time you see a newly-unlocked badge.
- **Year in Review** — a `/stats/year` page with a year picker and an annual recap: countries visited, trips taken, flights taken, days abroad, most-visited country, longest trip, and most active month, all for a single selected year.
- **Dynamic themes** — four selectable color themes (Travel Journal, Explorer Night, Golden Sunset, Polar Morning) on a `/settings` page. Switching themes re-colors the whole app instantly and persists across sessions.
- **Ambient delight details** — skeleton loading placeholders instead of blank screens, a one-time passport-stamp animation when a trip is created, a subtle paper-grain background texture, and gentle fade transitions between pages.
- **Installable & offline** — Trailune is a PWA: install it to your home screen or desktop, and it keeps working without a connection once it's been loaded.
- **Feedback** — a footer link opens a quick feedback form that emails your message straight to the developer.

## How it's built

Trailune runs almost entirely client-side — no accounts, and the only server call is the feedback form:

- **[SvelteKit](https://svelte.dev/docs/kit)** (Svelte 5 runes, TypeScript) for the app shell and routing, built via `adapter-static` with an SPA fallback so the whole app can be installed and run offline.
- **`localStorage`** for structured data (trips, journal entries, packing items, do's/don'ts, tips) via small repository modules with a shared read/write pattern.
- **`IndexedDB`** (via [`idb`](https://github.com/jakearchibald/idb)) for photo blobs, since binary data doesn't belong in `localStorage`.
- A single **storage facade** (`src/lib/storage/storage.ts`) composes the repositories and owns the app's cross-cutting rules: copying the packing template onto a new trip, and cascading deletes (trip → journal entries → packing items → do's/don'ts → tips → photos) so nothing is ever orphaned.
- The **world map** is a static, bundled SVG with countries as `<path>` elements keyed by ISO code — highlighting a country is a CSS class toggle, with no map/geo service involved. Per-country stats and the site-wide trip stats (`src/lib/countryStats.ts`, `src/lib/tripStats.ts`) are pure functions over the existing trip list — nothing is stored twice.
- **PWA support** via `@vite-pwa/sveltekit` — a generated manifest, a service worker precaching the app shell, and an offline-capable SPA fallback.
- **Feedback** posts to a standalone Vercel serverless function (`api/feedback.ts`) that sends an email via [Resend](https://resend.com) — kept entirely outside SvelteKit's routing since the rest of the app has no server runtime under `adapter-static`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Trips list — hero + quick stats strip + rank progress bar, filter by transport mode, create a new trip here |
| `/map` | The Living Map — reveal animations, hover/tap stats popover, animated progress bar, zoom-to-country on click |
| `/stats` | Full stats breakdown: countries, continents, trips, flights, days, longest trip, average length, plus Achievements |
| `/stats/year` | Year in Review — a year picker and an annual recap of that year's trips |
| `/trips/[id]` | Trip hub — Journal / Packing / Do's & Don'ts / Tips tabs |
| `/trips/[id]/entry/[entryId]` | View, edit, or delete a single journal entry |
| `/packing-template` | Edit the reusable packing template |
| `/settings` | Choose one of four color themes (Travel Journal, Explorer Night, Golden Sunset, Polar Morning) |

## Data model

```ts
Trip          { id, name, startDate, endDate, countries: string[], transportMode, createdAt }
JournalEntry  { id, tripId, date, note, photoIds: string[] }
Photo         { id, blob, thumbnailBlob, createdAt }
PackingItem   { id, tripId | null, category, label, checked }  // tripId: null = shared template
DoDontItem    { id, tripId, type: 'do' | 'dont', text, checked }
TipEntry      { id, tripId, category, note, photoId: string | null, createdAt }
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
    storage/       # localStorage repositories (trips, tips, checklist, map view state),
                    # IndexedDB photo store, storage facade
    components/    # WorldMap, CountryPopover, TripCard, PackingChecklist, DoDontList,
                    # TipsList, FeedbackDialog, Skeleton
    utils/         # id generation, thumbnail generation
    countries.ts   # parses the world map SVG into a { code, name } list
    continents.ts  # country-code -> continent lookup, covers every code in world-map.svg
    countryStats.ts, tripStats.ts, yearInReview.ts  # pure derived-metric functions
                    # consumed by /map, /, /stats, and /stats/year
    achievements.ts, levels.ts  # derived milestone badges and the rank/level system
    mapZoom.ts     # pure viewBox-padding math backing the map's zoom-to-country
    theme.ts       # reading/writing/applying the selected color theme
    PwaRegister.svelte  # registers the service worker
  routes/          # SvelteKit pages (see Routes above)
api/
  feedback.ts      # standalone Vercel serverless function backing the feedback form
static/
  world-map.svg    # bundled world map asset
docs/
  ROADMAP.md         # future-ideas backlog for the app's differentiator vision
  superpowers/       # design specs + implementation plans, one pair per feature
```

## Deferred to v2

Intentionally out of scope for this build:

- Ambient background motion (subtle moving gradients/parallax) — a smaller polish item beyond the dynamic themes and tiny-details work already shipped
- A full backend and real database (enabling multi-device sync and accounts)

See [`docs/ROADMAP.md`](docs/ROADMAP.md) for the fuller idea backlog, including what's shipped so far.

## Credits

- World map SVG adapted from [tomi5/visited-countries-map](https://github.com/tomi5/visited-countries-map) (MIT), itself sourced from [Simplemaps.com](https://simplemaps.com/).
- Full design spec and implementation plan live in [`docs/superpowers/`](docs/superpowers/).
