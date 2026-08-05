# Trailune Roadmap — Differentiator Vision & Future Ideas

Date: 2026-07-16

This is a living idea backlog, not a commitment or a spec. Nothing here is scheduled; each idea still needs its own brainstorm → spec → plan cycle before it gets built. The point of this document is to capture the vision in one place and organize it around what actually makes Trailune worth using, instead of a scattered feature list.

## The differentiator thesis

Trailune's edge isn't any single feature — it's that **everything is derived from what you actually did, not manually maintained**. The world map doesn't have a "mark as visited" toggle; visited state falls out of your trips' country lists automatically, so it can never drift out of sync the way most trackers' checklists do. Every idea below should be judged against this thesis: does it deepen "the app reflects your real trips," or does it add a parallel data entry surface that could drift out of sync? The ideas that lean hardest into the thesis (the living map, stats, achievements, year-in-review) are the strongest differentiator candidates. The ones that are pure UI polish (ambient design, themes, tiny details) are still worth doing, but they're delight multipliers, not the differentiator itself.

## 1. The Living Map (core differentiator — do this first)

**Status: ✅ Shipped.**

The map should stop being a static "here's where you've been" page and become the app's centerpiece — the visual proof that the derived-data thesis works.

- ✅ **Country animation on trip creation**: adding a trip with Japan → the country outline glows, the fill spreads in, the "visited countries" counter ticks up. Originally a reveal-pulse animation, now superseded by the scratch-peel reveal below.
- ✅ **Hover effect**: hovering (or tapping, on touch) a visited country shows a small popover — visit count, total days there, last trip date.
- ✅ **Click-to-open side panel**: clicking a country opens a panel listing its trips, each with quick-link icons (Journal, Gallery, Packing) that jump directly into that trip's matching tab — powered by the trip hub reading an optional `?tab=` query param on load. A country with multiple trips gets independent quick-links per trip row.
- ✅ **Scratch map**: unvisited countries render with a permanent foil/coating texture (diagonal hatch pattern); adding a trip peels that coating away via a jagged scratch-style reveal instead of a uniform fade/glow.
- ✅ **Explorer progress bar**: the bare count was replaced with an animated progress bar on `/map`.
- ✅ **Zoom-to-country on click**: not originally listed here, but shipped as part of the Ambient Delight Details cycle (§5) — clicking a country smoothly zooms the map to it, resetting on an outside click.
- ✅ **Dream map**: a separate `/dream-map` page for not-yet-visited countries — click one to rate it 1-5 stars and add a short note, rendered in a distinct wishlist color on its own map plus a sorted list below. A country auto-drops from the wishlist the moment a trip covers it, without losing the underlying rating/note if that trip is later removed.

**Feasibility**: entirely client-side. All of it operates on data already in `localStorage` (trips → countries). No backend needed.

## 2. Home Dashboard & Stats

**Status: ✅ Shipped**, including one addition beyond what was originally scoped here.

- ✅ **Home dashboard hero**: the home page now greets you with a time-of-day-aware summary once trips exist.
- ✅ **Header stats strip**: a quick "Visited / World explored / Trips / Travel days" strip, all derived from trip data.
- ✅ **Statistics dashboard**: the `/stats` page — countries, continents, trips, flights, total days travelled, longest trip, average trip length.
- ✅ **Achievements**: Explorer, Continental Traveller, Photographer, Globetrotter — derived milestone badges on `/stats`, with a continent→country lookup table added to back them.
- ✅ **Year in Review ("Wrapped")**: a `/stats/year` page with a year picker and an annual recap (countries, trips, flights, days abroad, most-visited country, longest trip, most active month). Shipped as an in-app view only — no image export in this cycle.
- ✅ **Rank/Level system** *(addition — not originally listed here)*: a 7-tier system (Beginner → Trailblazer) derived from country count, shown on the home hero with a progress bar and a level-up reveal animation. Complements the Achievements' one-off badges with an always-visible sense of overall progress.

**Feasibility confirmed**: entirely client-side, same reasoning as the map. No backend needed for any of the above.

## 3. Journal, Memories & Timeline

**Status: ✅ Fully shipped.**

- ✅ **Journal reframed as a diary**: an optional 1-5 star rating on each entry, settable on both the add-entry and edit forms, plus a postcard-split card layout (photo left, date/note/stars right) replacing the old thin list row — a visual treatment change, not a data model change beyond the optional rating field.
- ✅ **Journey timeline**: a new `/timeline` page — trips grouped by year (most recent first), each entry showing country flags/names, a season badge, and duration, in a responsive layout (alternating centered spine on desktop, single rail on mobile) — a different view over the same trip data, no new data model.
- ✅ **Photo gallery per trip**: two new trip hub tabs — Gallery (a grid aggregating every photo from that trip's journal entries and tips, with a lightbox viewer) and Map (a non-interactive highlight of just that trip's countries, reusing the existing `WorldMap` component). A per-trip Timeline tab was scoped out of this cycle as a separate future idea.
- ✅ **Memory pins**: a new `PinEntry` data concept (label + optional note, scoped to a trip) and a new Pins tab in the trip hub — the first idea in §3 that genuinely extends the data model rather than just re-presenting existing data. Coordinates and photo attachment were explicitly deferred; no map integration in this cycle.
- ✅ **Travel calendar**: a new `/calendar` page — a GitHub-style yearly heatmap (7×53 grid) of "travel days," each day colored by which trip it belongs to (colors assigned deterministically by chronological trip order, stable across years), with a hover tooltip, a per-year legend, and prev/next year navigation. Purely derived from existing trip date ranges, no new data model.

**Feasibility**: mostly client-side re-presentation of existing data. Memory pins was the one item that needed a small new schema addition (something like a `PinEntry` similar in shape to `TipEntry`).

## 4. Trip Experience Polish

**Status: ✅ Fully shipped.**

- ✅ **Packing as cards, not checkboxes**: packing items render as ticket-style cards (category icon, label, a rotated "PACKED" stamp badge with a settle animation) instead of checkbox rows, plus **five named packing templates** — General (the former single shared template, untouched) plus Beach Holiday, Business Trip, Camping, and Winter, each of the latter four pre-seeded with curated starter items the first time it's opened. The `/packing-template` page gained a template-tab switcher, and the new-trip dialog gained a template picker (defaulting to General) that copies the chosen template's items into the trip.
- ✅ **Destination preview**: a card per country in the trip hub (visible above the tabs, on every tab) showing currency, UTC offset, and a hemisphere-aware season + climate blurb computed from the trip's actual travel date — a Southern-hemisphere country correctly gets the opposite season from a Northern one on the same date. Backed by a bundled static reference table covering all 211 countries the app's world map supports; no live weather or exchange-rate API.
- ✅ **Animated flight route**: opening a multi-country trip's Map tab draws a curved "flight path" arc between its countries, in visited order, one leg at a time — plus a small marker at each waypoint. Waypoint positions are derived at render time from the map's own SVG geometry, no separate coordinate dataset. A single-country trip's Map tab is unchanged.

**Feasibility**: packing cards and templates are pure UI + a small data model addition (named templates instead of one shared template). Destination preview is client-side if backed by a bundled static reference table; a live weather API would need the same "can't expose a secret key from the browser" treatment as the Resend integration.

## 5. Ambient Design & Feel

**Status: ✅ Fully shipped.**

- ✅ **Ambient motion**: two slowly-drifting, blurred gradient blobs (theme-colored via `var(--color-accent)`/`var(--color-teal)`) rendered app-wide behind all content — "the app breathes" via pure CSS `@keyframes`, no JS/scroll listeners, respecting `prefers-reduced-motion` through the existing global override.
- ✅ **Dynamic themes**: four named presets — Travel Journal, Explorer Night, Golden Sunset, Polar Morning — selectable from a new `/settings` page, applied instantly via CSS custom-property overrides, persisted locally. No auto dark-mode detection — purely manual choice.
- ✅ **Tiny details**: passport-stamp animation when a trip is added, soft paper texture in the background, gentle page transitions, animated counters (on `/stats` and `/stats/year`), smooth map zoom-to-country, skeleton loaders instead of spinners. The one item *not* built as originally framed is a **compass loading spinner** — superseded by skeleton loaders, which cover the same "blank while loading" gap more consistently across pages. Confetti was correctly never added.

**Feasibility confirmed**: entirely client-side CSS/animation work (plus a small `data-theme` attribute + localStorage mechanism for themes), no data model changes.

## 6. AI Travel Summary

- After a trip ends, generate a short natural-language summary ("Your Australian adventure — 7 days, visited Sydney/Blue Mountains/Bondi, most memorable day: Sydney Harbour, 982km travelled").

**Feasibility**: this is the one idea here that needs a real backend decision, same shape as the feedback form's Resend integration — an LLM API key can't be called directly from the browser. Options: (a) a standalone Vercel Function (like `api/feedback.ts`) that calls an LLM API server-side with the trip data passed in the request body, or (b) skip the AI framing and just write a good deterministic summary template client-side (no API key, no cost, no backend) — worth deciding which before this one gets brainstormed, since it changes the scope from "one small function" to "ongoing API cost + prompt design."

## 7. Polishing Ideas (from a user feedback pass, 2026-07-17)

**Status: 🚧 In progress.**

A batch of concrete refinements and bigger visual concepts, gathered after living with the shipped Living Map, stats, achievements, and rank system for a while. Grouped from smallest to largest.

**Small copy/formatting fixes** (no new data, no new logic — just presentation):
- ✅ **Average trip length**: rounded to a whole number with a clear label — `9 days avg.` instead of `8.7 days`.
- ✅ **Longest trip**: recomposed into one non-contradictory sentence — the exact day count leads (`11-day trip`), with the trip's own name shown as a caption below, instead of stacking the name above a separate day count that could clash with it (e.g. a trip literally named "Two Weeks in Chile" that actually ran 11 days).

- ✅ **Richer country popover**: the popover's main line now reads "Visited · N trips · N days · Longest stay N days", with a second line showing "Visited in {year}" (single-year) or "First visited {year} · Last visited {year}" (multi-year) — replacing the old month-precision "Last visit [date]". The existing "View trips →" button already covered the "View history" idea, so no new affordance was needed there. No "progress-style visual" was added — the roadmap's own wording was vague on what it would represent.

**Visual connections on the map** (the biggest visual idea here):
- ✅ **Travel path arcs**: on `/map`, animated arcs connect every visited country in first-visit order across the user's entire trip history, reusing the per-trip Animated Flight Route's rendering machinery (`WorldMap.svelte`'s `routeCodes` prop) unchanged — a country revisited on a later trip doesn't get a duplicate leg back to it. The shared animation timing was recomputed to a fixed total-time budget rather than a flat per-leg duration, so the draw time stays bounded regardless of how many countries are in the route.
- ✅ **Visit-intensity heatmap**: on `/map`, a country's fill saturates in 3 tiers based on visit count (1 visit = light, 2-4 = medium, 5+ = deep, matching today's existing "visited" look exactly). The trip hub's own Map tab is unaffected, since it only ever shows one trip's countries at a time.

- ✅ **Lean into the rank system's personality** (extends the shipped rank/level feature): `/stats` now shows the same tier framing as the home hero — emoji, tier name, subtitle, and "N countries until {next tier}" (or a top-tier message for Trailblazer) — reusing `getLevelProgress()`/`LEVELS` unmodified. Scoped to `/stats` only this cycle; other pages can get it later if desired.

- ✅ **Memory timeline** (extends the existing "Journey timeline" idea in §3, made concrete): the year-grouped vertical timeline itself was already shipped in §3. This cycle added the missing "zoomed out" half — a manual "Compact view" toggle on `/timeline` showing one row per year (year + that year's unique country flags/count, deduped), with click-to-jump back to full view scrolled to that year.

- ✅ **Trip card hero treatment** ("the single biggest UX improvement," per this feedback pass): home page trip cards now show a real photo header — the first photo from the earliest-dated journal entry — instead of a plain gradient, with a strengthened dark scrim keeping the transport icon/country badge legible even over bright photos. Trips with no journal photo yet keep the original gradient unchanged. No new `Trip` field or upload UI — purely derived from existing journal-entry photo data; tip photos and auto-fetched stock photos (Unsplash, etc.) were both scoped out of this cycle.

- ✅ **Journey path within a trip** (a new data concept, similar in shape to memory pins from §3): every memory pin is now an ordered waypoint (`PinEntry.order`), with drag-and-drop reordering in the Pins tab and a route-chain summary (e.g. `Dublin → Doha → Sydney`) shown above the list once a trip has 2+ pins. No separate waypoint concept was introduced — every pin doubles as a waypoint. No map/arc visualization this cycle (would need city-level coordinates, a bigger lift); touch-drag reordering on mobile isn't guaranteed (native HTML5 DnD's known limitation).

- ✅ **Trip hub expansion**: of the five candidates (Photos, Expenses, Documents, Notes, Weather), Photos already shipped in §3 (the Gallery tab), and Expenses/Documents/Weather remain explicitly deferred (each needs its own feature cycle or a backend-shape decision). This cycle added the one remaining lightweight candidate: a **Notes** tab — a single free-form auto-saving scratchpad per trip (500ms debounce, plus an immediate save on blur), for anything that doesn't fit the dated Journal or categorized Tips. Plain text only, one note per trip, no rich text formatting. (removed 2026-07-31 — duplicated the journal entry note field)

**"On this day" memories**:
- Surface a past trip on its anniversary — "One year ago today: 🇯🇵 Kyoto — you visited Fushimi Inari Shrine." Needs date-matching logic comparing today's date against past journal-entry/memory-pin dates, resurfaced on the home page or in a notification-style prompt. Depends on memory pins (§3) existing first, since a plain journal note doesn't currently carry a discrete "location visited" concept.

- ✅ **Globe mode**: a new `/globe` route with an interactive 3D globe (Three.js + `three-globe`) showing visited vs. unvisited countries, derived from the same trip data as the flat map. MVP scope: binary visited/unvisited coloring (reads the current theme's accent color), drag-to-rotate and scroll/pinch-zoom only — no popover, path arcs, or heatmap tiers on the globe this cycle (those remain flat-map-only). Bundled a Natural Earth 110m country-boundary GeoJSON dataset (`static/world-countries.geojson`), joined by ISO alpha-2 code with a manual override for the dataset's invalid France/Norway codes.

## 8. Backend & Accounts (planned — not started)

**Status: 📋 Planned.** This is the largest architectural change on this roadmap. Today Trailune is 100% local-first: every byte of user data lives in the browser (`localStorage` + IndexedDB), and the only server code in the repo is `api/feedback.ts` (a single Vercel Function that forwards the feedback form to Resend). Adding accounts introduces server-side state, a database, and an auth provider for the first time.

### 8.1 Profile page (the visible surface)

A new `/profile` route, added to the main nav alongside Settings:

- **Signed out**: the page shows the value proposition (your trips, on every device) plus two buttons — **Sign up** and **Sign in**.
- **Signed in**: the page shows the account (email, avatar/initial, member-since date) and a **Sign out** button.
- Auth state drives the whole page — one component, two states, no separate signed-in/signed-out routes.

This is the piece the user actually sees, but it is the *last* thing to build, not the first: the buttons are meaningless until there is something behind them.

### 8.2 The decision that has to come first: what does an account actually do?

Accounts are not a feature on their own. Before any of this gets brainstormed, one question has to be answered, because it changes the scope by an order of magnitude:

- **(a) Auth only — accounts, but data stays local.** Sign in gives you an identity and nothing else; trips still live in this browser only. Cheap to build, but close to pointless from the user's side — "I signed in and my trips didn't follow me" is a worse experience than no account at all.
- **(b) Auth + cloud sync (the real goal).** Signing in on a new device restores your trips, journal, photos, pins, tips, packing lists, and wishlist. This is what users mean when they ask for an account. It is also a genuine backend project: database, schema, sync logic, conflict resolution, and photo storage.

Assume (b) is the target and (a) is a stepping stone at most. Building (a) and stopping there would be shipping the login screen without the product behind it.

### 8.3 What has to be built for (b)

**Auth provider**: needs a real decision, not a default. Options worth weighing: Supabase Auth, Clerk, Auth.js/Lucia self-hosted, or a Vercel-native option. Criteria: free tier that survives a hobby project, email/password + at least one social provider, works with SvelteKit + `adapter-static` (note: the app currently prerenders every route — a session-aware `/profile` may force a rendering-mode change, the same class of constraint the Globe Mode work ran into with SSR).

**Database**: the local data model is already well-defined and maps cleanly to relational tables. Current storage inventory that would need server-side equivalents:

| Local key / store | Contents |
|---|---|
| `trailune:trips` | Trip records |
| `trailune:journalEntries` | Journal entries (with `photoIds`) |
| `trailune:pins` | Memory pins / journey waypoints |
| `trailune:tips` | Tip entries (some with `photoId`) |
| `trailune:packingItems` | Packing checklist items |
| `trailune:doDontItems` | Do's & Don'ts items |
| `trailune:wishlist` | Dream Map wishlist countries |
| `trailune:theme` | Selected theme (arguably device-local, not account-level) |
| `trailune:*-last-seen` (x3) | UI "what's new" markers — device-local, should NOT sync |
| `trailune-photos` (IndexedDB) | Photo blobs + thumbnails |

Every record already carries an `id` and most carry a `tripId`, so a `user_id` column plus the existing shapes is close to the whole schema. The `*-last-seen` keys and probably `theme` deliberately stay device-local.

**Photo storage** is the expensive part and deserves its own decision. Photos are currently full-size blobs in IndexedDB with generated thumbnails. Syncing them means object storage (Vercel Blob, Supabase Storage, S3/R2) and real, ongoing, per-user cost that scales with usage — unlike everything else on this roadmap, which is free to run. Options include syncing thumbnails only, capping per-account storage, or deferring photo sync to a later phase than text data.

**Sync strategy**: local-first apps do not get to ignore conflicts. Minimum viable approach is last-write-wins per record using an `updatedAt` timestamp, which is honest about its limitations (edit the same trip on two devices offline, one edit loses). Anything better (per-field merge, CRDTs) is a much larger project. Offline behaviour must be preserved — the app is a PWA and currently works fully offline; sync should be additive, never a hard dependency for using the app.

**Migration for existing users**: everyone using Trailune today has local data and no account. On first sign-in, their existing local data should be uploaded and adopted into the new account rather than silently replaced by an empty server state. This is the single easiest place in this whole section to destroy a user's data, and needs to be designed deliberately, not discovered during implementation.

### 8.4 Suggested phasing

1. Decide (a) vs (b), the auth provider, and the photo-storage approach — three decisions, before any code.
2. Auth + `/profile` page with sign up / sign in / sign out working against the chosen provider. No sync yet.
3. Server schema + sync for text data (trips, entries, pins, tips, checklists, wishlist), including the first-sign-in migration of existing local data.
4. Photo sync, if the cost model holds up.

Phase 2 is the user-visible ask in 8.1 and is genuinely small once the provider is chosen. Phases 3 and 4 are where the actual work lives.

## Suggested order

1. ✅ **The Living Map** — fully shipped, including scratch map and dream map.
2. ✅ **Home Dashboard & Stats** — shipped, including Achievements, Year in Review, and the Rank/Level system addition.
3. ✅ **Journal, Memories & Timeline** (§3) — fully shipped.
4. ✅ **Trip Experience Polish** (§4) — fully shipped.
5. ✅ **Ambient Design & Feel** — fully shipped (tiny details, dynamic themes, and ambient background motion).
6. **§7 Polishing Ideas** — nearly done; only "on this day" memories remains unstarted.
7. **Backend & Accounts** (§8) — planned, not started. The biggest remaining project by far, and the one that unblocks §6: once a backend exists, the AI Travel Summary's "we'd need a server for the API key" problem solves itself.
8. **AI Travel Summary** (§6) — needs a backend-shape decision first; lowest priority until that's resolved (or until §8 lands and resolves it).
