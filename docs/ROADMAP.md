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

- ✅ **Trip hub expansion**: of the five candidates (Photos, Expenses, Documents, Notes, Weather), Photos already shipped in §3 (the Gallery tab), and Expenses/Documents/Weather remain explicitly deferred (each needs its own feature cycle or a backend-shape decision). This cycle added the one remaining lightweight candidate: a **Notes** tab — a single free-form auto-saving scratchpad per trip (500ms debounce, plus an immediate save on blur), for anything that doesn't fit the dated Journal or categorized Tips. Plain text only, one note per trip, no rich text formatting.

**"On this day" memories**:
- Surface a past trip on its anniversary — "One year ago today: 🇯🇵 Kyoto — you visited Fushimi Inari Shrine." Needs date-matching logic comparing today's date against past journal-entry/memory-pin dates, resurfaced on the home page or in a notification-style prompt. Depends on memory pins (§3) existing first, since a plain journal note doesn't currently carry a discrete "location visited" concept.

**Globe mode** (long-term, aspirational):
- An alternative 3D globe view of the map (via a library like Three.js or Cesium) that users can spin, as a premium-feeling alternative to the flat SVG map. Meaningfully larger scope than anything else in this list — a new rendering technology, not a CSS/data change — and should only be considered once the flat map's remaining ideas (path arcs, heatmap) are exhausted.

## Suggested order

1. ✅ **The Living Map** — fully shipped, including scratch map and dream map.
2. ✅ **Home Dashboard & Stats** — shipped, including Achievements, Year in Review, and the Rank/Level system addition.
3. ✅ **Journal, Memories & Timeline** (§3) — fully shipped.
4. ✅ **Trip Experience Polish** (§4) — fully shipped.
5. ✅ **Ambient Design & Feel** — fully shipped (tiny details, dynamic themes, and ambient background motion).
6. **§7 Polishing Ideas** — in progress; small copy/formatting fixes done, remaining sub-ideas (richer country popover, map visual upgrades, rank personality, memory timeline, trip hero images, journey waypoints, trip hub expansion, "on this day" memories, globe mode) not yet started.
7. **AI Travel Summary** (§6) — needs a backend-shape decision first; lowest priority until that's resolved.
