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

Trailune is a personal travel tracker: log trips with photo journal entries, an ordered list of waypoints per trip, packing checklists, and local tips, then watch a living world map, a year-grouped timeline, a travel calendar, and your stats fill in automatically as you go. It installs as a PWA and works offline.

This is a **v1, local-only build**. There's no backend and no account system — everything runs entirely in your browser. All structured data lives in `localStorage`; photos live in `IndexedDB`. The one exception is the footer feedback form, which calls a small standalone serverless function to send an email — sending email needs a server-side secret that can't live in browser code, so it's the one place this app talks to a server. A full backend (and the multi-device sync it would enable) is a deliberate v2 addition, not a missing piece of v1.

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

- **Trips** — create a trip with a name, a date range, the countries visited, and a transport mode (flight, train, road, boat, other). Filter your trip list by mode. Trip cards show a real photo header once a trip has one (the first journal photo, chronologically), falling back to a mode-colored gradient otherwise. Delete a trip and everything under it — journal entries, packing items, photos, do's & don'ts, tips, pins, and its note — is cleaned up with it.
- **Journal, reframed as a diary** — dated entries with a note, one or more photos, and an optional 1-5 star rating, shown in a postcard-style layout (photo left, date/note/stars right). Edit or delete any entry later; full-size photos on the entry page, thumbnails in the list.
- **Journey waypoints** — the trip hub's Pins tab holds an *ordered* list of places (drag-and-drop to reorder), with a route-chain summary above the list once a trip has 2+ pins (`Dublin → Doha → Sydney`). Every pin is a waypoint; an optional note travels with each one.
- **Trip notes** — a single free-form scratchpad per trip, auto-saving ~500ms after you stop typing (plus an instant save on blur), for anything that doesn't fit the dated journal or categorized tips.
- **Photo gallery per trip** — a dedicated Gallery tab aggregating every photo from a trip's journal entries and tips into one grid, with a lightbox viewer.
- **Destination preview** — a card in the trip hub (shown on every tab) with each visited country's currency, UTC offset, and a hemisphere-aware season/climate blurb computed from the trip's actual travel dates — backed by a bundled static reference table covering all 211 countries the map supports, no live API.
- **Packing checklist, as cards** — ticket-style cards (category icon, label, a rotated "PACKED" stamp) instead of checkbox rows, with five named templates (General, Beach Holiday, Business Trip, Camping, Winter). New trips pick a template on creation, which copies that template's items into the trip's own checklist — editing one trip's checklist never touches the shared template or any other trip.
- **Do's & Don'ts** — a simple two-column checklist per trip for reminders and warnings you want on hand while traveling.
- **Tips** — local notes per trip, tagged by category (currency, places to avoid, transit, sightseeing), with an optional photo attached to each.
- **The Living Map** — a clickable SVG world map that highlights every country you've visited, *derived* from your trips' data so it can never drift out of sync. Visited countries play a one-time reveal animation with a scratch-style peel-away texture; hovering or tapping shows a rich stats popover (visit count, total days, longest stay, first/last visited year); clicking zooms smoothly into that country. Across your whole history, animated **travel path arcs** connect every country you've visited in first-visit order, and a **visit-intensity heatmap** deepens a country's fill the more times you've been there. A trip's own Map tab additionally draws an **animated flight route** between that trip's countries in visited order.
- **Dream Map** — a `/dream-map` page for rating and noting not-yet-visited countries (1-5 stars + a note), shown on their own wishlist map plus a sorted list.
- **Journey timeline** — a `/timeline` page grouping every trip by year (most recent first), with country flags, a season badge, and duration per entry, plus a "Compact view" toggle that collapses to a one-line-per-year summary (flags + country count) with click-to-jump back into the full view.
- **Travel calendar** — a `/calendar` page: a GitHub-style yearly heatmap of "travel days," each day colored by which trip it belongs to, with a hover tooltip, a per-year legend, and prev/next year navigation.
- **Home dashboard & stats** — the home page greets you with a time-of-day-aware summary, a quick stats strip, and a rank/level progress bar (Beginner → Trailblazer, derived from your country count, with a level-up reveal animation) once you've logged a trip. A dedicated `/stats` page breaks it down further — countries and continents visited, trips logged, flights taken, total days travelled, longest trip, average trip length — and repeats the same rank/tier framing ("N countries until Traveler") shown on the home hero.
- **Achievements** — milestone badges (Explorer, Continental Traveller, Photographer, Globetrotter) on `/stats`, unlocked automatically as your trip history grows, with a one-time reveal animation.
- **Year in Review** — a `/stats/year` page with a year picker and an annual recap: countries visited, trips taken, flights taken, days abroad, most-visited country, longest trip, and most active month.
- **Dynamic themes** — four selectable color themes (Travel Journal, Explorer Night, Golden Sunset, Polar Morning) on `/settings`. Switching themes re-colors the whole app instantly and persists across sessions.
- **Ambient delight details** — two slowly-drifting theme-colored gradient blobs behind all content, skeleton loading placeholders, a one-time passport-stamp animation on trip creation, a subtle paper-grain background texture, gentle page transitions, and animated stat counters — all respecting `prefers-reduced-motion`.
- **Installable & offline** — Trailune is a PWA: install it to your home screen or desktop, and it keeps working without a connection once it's been loaded.
- **Feedback** — a footer link opens a quick feedback form that emails your message straight to the developer.

## How it's built

Trailune runs almost entirely client-side — no accounts, and the only server call is the feedback form:

- **[SvelteKit](https://svelte.dev/docs/kit)** (Svelte 5 runes, TypeScript) for the app shell and routing, built via `adapter-static` with an SPA fallback so the whole app can be installed and run offline.
- **`localStorage`** for structured data (trips, journal entries, packing items, do's/don'ts, tips, pins, notes, wishlist entries) via small repository modules with a shared read/write pattern.
- **`IndexedDB`** (via [`idb`](https://github.com/jakearchibald/idb)) for photo blobs, since binary data doesn't belong in `localStorage`.
- A single **storage facade** (`src/lib/storage/storage.ts`) composes the repositories and owns the app's cross-cutting rules: copying a packing template onto a new trip, and cascading deletes (trip → journal entries → packing items → do's/don'ts → tips → pins → note → photos) so nothing is ever orphaned.
- The **world map** is a static, bundled SVG with countries as `<path>` elements keyed by ISO code — highlighting a country is a CSS class toggle, with no map/geo service involved. Flight-route and travel-path-arc waypoint positions are derived at render time from that same SVG's geometry — no separate coordinate dataset. Per-country stats and site-wide trip stats (`src/lib/countryStats.ts`, `src/lib/tripStats.ts`, `src/lib/yearInReview.ts`, `src/lib/travelCalendar.ts`) are pure functions over the existing trip list — nothing is stored twice.
- **PWA support** via `@vite-pwa/sveltekit` — a generated manifest, a service worker precaching the app shell, and an offline-capable SPA fallback.
- **Feedback** posts to a standalone Vercel serverless function (`api/feedback.ts`) that sends an email via [Resend](https://resend.com) — kept entirely outside SvelteKit's routing since the rest of the app has no server runtime under `adapter-static`.

## Routes

| Route | Purpose |
|---|---|
| `/` | Trips list — hero + quick stats strip + rank progress bar, filter by transport mode, create a new trip here |
| `/map` | The Living Map — reveal/scratch animations, travel path arcs, visit-intensity heatmap, hover/tap stats popover, zoom-to-country on click |
| `/dream-map` | Wishlist countries — rate and note places you haven't visited yet |
| `/timeline` | Journey timeline — trips grouped by year, with a Compact view toggle |
| `/calendar` | Travel calendar — a yearly heatmap of travel days, colored per trip |
| `/stats` | Full stats breakdown plus Achievements and the rank/tier banner |
| `/stats/year` | Year in Review — a year picker and an annual recap of that year's trips |
| `/trips/[id]` | Trip hub — Journal / Gallery / Map / Pins / Packing / Tips / Do's & Don'ts / Notes tabs |
| `/trips/[id]/entry/[entryId]` | View, edit, or delete a single journal entry |
| `/packing-template` | Edit any of the five reusable packing templates |
| `/settings` | Choose one of four color themes |

## Data model

```ts
Trip          { id, name, startDate, endDate, countries: string[], transportMode, createdAt }
JournalEntry  { id, tripId, date, note, photoIds: string[], rating? }
Photo         { id, blob, thumbnailBlob, createdAt }
PackingItem   { id, tripId | null, templateId | null, category, label, checked }  // tripId: null = shared template
DoDontItem    { id, tripId, type: 'do' | 'dont', text, checked }
TipEntry      { id, tripId, category, note, photoId: string | null, createdAt }
PinEntry      { id, tripId, label, note: string | null, order, createdAt }        // ordered waypoint
TripNote      { tripId, text, updatedAt }                                        // one per trip
WishlistEntry { id, countryCode, rating, note, createdAt }
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
    storage/       # localStorage repositories (trips, tips, checklist, pins, notes, wishlist,
                    # map/level/achievement view state), IndexedDB photo store, storage facade
    components/    # WorldMap, CountryPopover, TripCard, PackingChecklist, DoDontList, TipsList,
                    # PinsList, TripNotes, PhotoGallery, DestinationPreview, DreamMap,
                    # CalendarHeatmap, StarRating, AmbientBackground, FeedbackDialog, Skeleton
    utils/         # id generation, thumbnail generation
    countries.ts   # parses the world map SVG into a { code, name } list
    continents.ts  # country-code -> continent lookup, covers every code in world-map.svg
    countryReference.ts, destinationPreview.ts  # static country data + season/climate logic
    flightRoute.ts, scratchReveal.ts, visitIntensity.ts  # map animation/rendering helpers
    countryStats.ts, tripStats.ts, yearInReview.ts, travelCalendar.ts, journeyTimeline.ts
                    # pure derived-metric functions consumed by /map, /, /stats, /stats/year,
                    # /calendar, and /timeline
    packingTemplates.ts  # the five named packing template definitions
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

Intentionally out of scope for this build — see [`docs/ROADMAP.md`](docs/ROADMAP.md) for the fuller idea backlog, including everything shipped so far:

- **"On this day" memories** — surfacing a past trip on its anniversary; needs date-matching logic over journal entries/pins.
- **Globe mode** — an alternative 3D globe view of the map (Three.js/Cesium or similar), a meaningfully larger scope than anything else here.
- **AI Travel Summary** — a natural-language recap generated after a trip ends; needs a backend-shape decision first (an LLM API key can't be called from the browser).
- **Expenses, Documents, and live Weather** trip-hub tabs — each is a genuinely new feature (budget tracking, file attachments, a live weather API) deserving its own design cycle.
- A full backend and real database, enabling multi-device sync and accounts.

## Credits

- World map SVG adapted from [tomi5/visited-countries-map](https://github.com/tomi5/visited-countries-map) (MIT), itself sourced from [Simplemaps.com](https://simplemaps.com/).
- Full design spec and implementation plan live in [`docs/superpowers/`](docs/superpowers/).
