# Trailune Roadmap — Differentiator Vision & Future Ideas

Date: 2026-07-16

This is a living idea backlog, not a commitment or a spec. Nothing here is scheduled; each idea still needs its own brainstorm → spec → plan cycle before it gets built. The point of this document is to capture the vision in one place and organize it around what actually makes Trailune worth using, instead of a scattered feature list.

## The differentiator thesis

Trailune's edge isn't any single feature — it's that **everything is derived from what you actually did, not manually maintained**. The world map doesn't have a "mark as visited" toggle; visited state falls out of your trips' country lists automatically, so it can never drift out of sync the way most trackers' checklists do. Every idea below should be judged against this thesis: does it deepen "the app reflects your real trips," or does it add a parallel data entry surface that could drift out of sync? The ideas that lean hardest into the thesis (the living map, stats, achievements, year-in-review) are the strongest differentiator candidates. The ones that are pure UI polish (ambient design, themes, tiny details) are still worth doing, but they're delight multipliers, not the differentiator itself.

## 1. The Living Map (core differentiator — do this first)

**Status: ✅ Mostly shipped.**

The map should stop being a static "here's where you've been" page and become the app's centerpiece — the visual proof that the derived-data thesis works.

- ✅ **Country animation on trip creation**: adding a trip with Japan → the country outline glows, the fill spreads in, the "visited countries" counter ticks up. Shipped as the reveal-pulse animation on newly-visited countries.
- ✅ **Hover effect**: hovering (or tapping, on touch) a visited country shows a small popover — visit count, total days there, last trip date.
- ✅ **Click-to-open side panel**: clicking a country opens a panel listing its trips, each with quick-link icons (Journal, Gallery, Packing) that jump directly into that trip's matching tab — powered by the trip hub reading an optional `?tab=` query param on load. A country with multiple trips gets independent quick-links per trip row.
- **Scratch map**: not built — the current reveal is a fill/glow animation, not a "scratching a physical map" texture effect.
- ✅ **Explorer progress bar**: the bare count was replaced with an animated progress bar on `/map`.
- ✅ **Zoom-to-country on click**: not originally listed here, but shipped as part of the Ambient Delight Details cycle (§5) — clicking a country smoothly zooms the map to it, resetting on an outside click.
- **Dream map**: not built.

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

A batch of concrete refinements and bigger visual concepts, gathered after living with the shipped Living Map, stats, achievements, and rank system for a while. Grouped from smallest to largest.

**Small copy/formatting fixes** (no new data, no new logic — just presentation):
- **Average trip length**: `8.7 days` reads awkwardly. Round to a whole number and label it clearly — `9 days avg.` or `8 days (avg.)`.
- **Longest trip**: `two weeks to Chile` next to `10 days` is self-contradictory (10 days isn't two weeks). Pick one representation and use it consistently — e.g. `10-day trip to Chile`, dropping the "two weeks" approximation entirely.

**Richer country popover** (extends the Living Map's existing hover/tap popover — `CountryPopover.svelte`, already computing visit count/days/last-visit via `countryStats.ts`):
- Go further than the current "Visited · N trips · N days · Last visit [date]" line: add a small progress-style visual, **longest stay** at that country, **first visit year** and **latest visit year**, and a "View history →" affordance leading into the country's trip list (the existing click-to-open side panel already has this data — this would surface more of it directly in the popover itself, closing the gap between "quick glance" and "full panel").
- All of this is already computable from existing trip data; no schema changes, just extending `getCountryStats`'s return shape and the popover's markup.

**Visual connections on the map** (the biggest visual idea here):
- **Travel path arcs**: instead of isolated highlighted countries, draw animated lines connecting countries in the order they were visited (derived from trip `startDate` ordering) — "every trip becomes part of your travel story," the map gradually filling with route lines.
- **Visit-intensity heatmap**: countries visited multiple times render with increasingly saturated color (visited once = light, twice = medium, 5+ = deep) instead of a flat "visited" color — still a pure CSS/derived-data change to `WorldMap.svelte`'s existing visited-state styling, using visit counts already available via `countryStats.ts`.
- **Feasibility**: the heatmap intensity is a small, contained change (swap a boolean visited-class for a count-based intensity scale). The path arcs are a bigger visual feature — likely SVG line/curve elements computed from trip date ordering, animated similarly to the existing reveal-pulse pattern, but touching more of `WorldMap.svelte`'s rendering than prior Living Map work did.

**Lean into the rank system's personality** (extends the shipped rank/level feature):
- Where the app currently shows a raw number ("Countries visited: 3"), consider surfacing the tier framing instead — "🎒 Traveler · 3 countries visited · 2 until Adventurer" — in more places than just the home hero (e.g. the `/stats` page), so the leveling framing feels consistent app-wide rather than home-page-only.

**Memory timeline** (extends the existing "Journey timeline" idea in §3, made concrete):
- A year-grouped vertical timeline: `2024 → 🇩🇪 Germany, 7 days`, `2025 → 🇨🇱 Chile, 10 days`, `2026 → 🇦🇺 Australia, 8 days`, with a longer-term view collapsing to just the year list (2019–2026) when zoomed out. Pure re-presentation of existing trip data, grouped by year.

**Trip card hero treatment** ("the single biggest UX improvement," per this feedback pass):
- Replace the current gradient-background trip cards with a real hero image per trip — either a user-uploaded cover photo (fits the existing IndexedDB photo-storage pattern directly, no new infrastructure) or a stock photo pulled from an image API (Unsplash, etc. — this would need a new backend concern, since API keys can't be called from the browser, similar to the feedback form's Resend function).
- **Feasibility**: user-uploaded covers are straightforward — reuse the existing photo pipeline, add a "cover photo" concept to `Trip` or reuse the first journal photo. Auto-fetched stock photos are a bigger lift (new API integration, image licensing/caching considerations) and should be scoped separately if pursued.

**Journey path within a trip** (a new data concept, similar in shape to memory pins from §3):
- For multi-stop trips, show the actual route between cities/waypoints (e.g. `Dublin → Doha → Sydney`), not just the countries visited. This needs a genuinely new data concept — an ordered list of waypoints per trip — beyond what §3's memory pins (unordered location pins) already cover.

**Trip hub expansion**:
- Grow the trip hub's tab set beyond Journal/Packing/Do's & Don'ts/Tips toward: Photos (as its own tab, not just embedded in journal entries), Expenses, Documents, Notes, Weather. Expenses and Documents are genuinely new features (budget tracking, file attachments) — each deserving its own brainstorm cycle, not a quick addition. Weather would need a live API (same backend-shape question as the AI Travel Summary idea in §6).

**"On this day" memories**:
- Surface a past trip on its anniversary — "One year ago today: 🇯🇵 Kyoto — you visited Fushimi Inari Shrine." Needs date-matching logic comparing today's date against past journal-entry/memory-pin dates, resurfaced on the home page or in a notification-style prompt. Depends on memory pins (§3) existing first, since a plain journal note doesn't currently carry a discrete "location visited" concept.

**Globe mode** (long-term, aspirational):
- An alternative 3D globe view of the map (via a library like Three.js or Cesium) that users can spin, as a premium-feeling alternative to the flat SVG map. Meaningfully larger scope than anything else in this list — a new rendering technology, not a CSS/data change — and should only be considered once the flat map's remaining ideas (path arcs, heatmap) are exhausted.

## Suggested order

1. ✅ **The Living Map** — shipped (mostly; scratch map and dream map still open).
2. ✅ **Home Dashboard & Stats** — shipped, including Achievements, Year in Review, and the Rank/Level system addition.
3. ✅ **Ambient Design & Feel** — fully shipped (tiny details, dynamic themes, and ambient background motion).
4. **Journal/Memories/Timeline** (§3), **Trip Experience polish** (§4), **§7 Polishing Ideas** — bigger individually, worth their own brainstorm sessions when picked up. Nothing in these sections has been started yet.
5. **AI Travel Summary** (§6) — needs a backend-shape decision first; lowest priority until that's resolved.
