# Trailune Roadmap — Differentiator Vision & Future Ideas

Date: 2026-07-16

This is a living idea backlog, not a commitment or a spec. Nothing here is scheduled; each idea still needs its own brainstorm → spec → plan cycle before it gets built. The point of this document is to capture the vision in one place and organize it around what actually makes Trailune worth using, instead of a scattered feature list.

## The differentiator thesis

Trailune's edge isn't any single feature — it's that **everything is derived from what you actually did, not manually maintained**. The world map doesn't have a "mark as visited" toggle; visited state falls out of your trips' country lists automatically, so it can never drift out of sync the way most trackers' checklists do. Every idea below should be judged against this thesis: does it deepen "the app reflects your real trips," or does it add a parallel data entry surface that could drift out of sync? The ideas that lean hardest into the thesis (the living map, stats, achievements, year-in-review) are the strongest differentiator candidates. The ones that are pure UI polish (ambient design, themes, tiny details) are still worth doing, but they're delight multipliers, not the differentiator itself.

## 1. The Living Map (core differentiator — do this first)

The map should stop being a static "here's where you've been" page and become the app's centerpiece — the visual proof that the derived-data thesis works.

- **Country animation on trip creation**: adding a trip with Japan → the country outline glows, the fill spreads in, the "visited countries" counter ticks up (11 → 12). Makes the derive-not-toggle mechanic *visible* and satisfying, rather than invisible plumbing.
- **Hover effect**: hovering a country shows a small popover — visit count, total days there, last trip date — instead of nothing. All of this is already computable from existing trip data; no new fields needed.
- **Click-to-open side panel**: clicking a visited country opens a panel listing every trip taken there, with quick links into photos/journal/packing for that country's trips.
- **Scratch map**: countries reveal with a "scratching a physical map" animation instead of an instant fill — same underlying data, more tactile.
- **Explorer progress bar**: replace the bare "18 / 211" with a visual progress bar and "193 countries left" framing.
- **Dream map**: a *separate* wishlist map (not-yet-visited countries you want to go), explicitly distinct from the derived visited map so the two data sources never get confused — this one's user-entered, like a real wishlist.

**Feasibility**: entirely client-side. All of it operates on data already in `localStorage` (trips → countries). No backend needed. This is the natural next step after the transport-mode and tips work.

## 2. Home Dashboard & Stats

- **Home dashboard hero**: replace the current empty-state-first landing with "Good evening. 18 countries explored. 193 left. Your next adventure starts here." — a warmer first impression when trips already exist, not just for the empty state.
- **Header stats strip**: "Visited: 12 countries · World explored: 5.7% · Trips: 18 · Travel days: 142" — all derived, all computable from existing trip data (date ranges + country lists).
- **Statistics dashboard**: countries, continents, trips, flights (derived from `transportMode === 'flight'` count), total days travelled, longest trip, average trip length.
- **Achievements**: "Explorer" (first country), "Continental Traveller" (a full continent), "Photographer" (100 photos), "Globetrotter" (25 countries) — derived milestones, not user-set goals. Needs a continent→country lookup table added to the existing country data.
- **Year in Review ("Wrapped")**: an annual recap — countries, flights, days abroad, most-visited country, longest trip, most active month. Shareable, no account/backend needed since it's just a rendered summary of local data (image export would need a canvas/screenshot library if you want it downloadable as an image).

**Feasibility**: entirely client-side, same reasoning as the map. The continent-lookup and "most active month" aggregation are the only new logic needed — everything else is a derived read over existing storage.

## 3. Journal, Memories & Timeline

- **Journal reframed as a diary**: mood/rating stars, cover-style layout per entry, instead of a plain note list — visual treatment change, not a data model change.
- **Journey timeline**: a vertical, year-grouped timeline of trips (country, duration, season) — a different view over the same trip data, not new data.
- **Photo gallery per trip**: gallery / map / journal / timeline tabs within a trip, reusing photos already attached to journal entries and tips.
- **Memory pins**: pin specific *locations* within a trip (Cliffs of Moher, Shibuya Crossing), not just countries — this is a genuinely new data concept (a pin needs at least a label and could optionally have coordinates for a future in-country map), and the first idea here that meaningfully extends the data model rather than just re-presenting it.
- **Travel calendar**: a yearly heatmap-style view of which days were "travel days," derived from trip date ranges.

**Feasibility**: mostly client-side re-presentation of existing data. Memory pins is the one item that needs a small new schema addition (something like a `PinEntry` similar in shape to `TipEntry`).

## 4. Trip Experience Polish

- **Packing as cards, not checkboxes**: visual packing cards per category instead of the current checklist UI, plus **packing templates** (Beach Holiday, Business Trip, Camping, Winter) as starting points distinct from the existing single shared template.
- **Destination preview**: before a trip, show typical weather/season, currency, and timezone for the destination country. This needs a small static reference dataset (country → currency/timezone is stable and can be bundled; typical-season weather is more of an approximation than live data) — doesn't need a live weather API to deliver most of the value.
- **Animated flight route**: opening a multi-leg trip shows an animated route line between the countries visited in order.

**Feasibility**: packing cards and templates are pure UI + a small data model addition (named templates instead of one shared template). Destination preview is client-side if backed by a bundled static reference table; a live weather API would need the same "can't expose a secret key from the browser" treatment as the Resend integration.

## 5. Ambient Design & Feel

- **Ambient motion**: very subtle moving gradients, cloud drift, tiny parallax — "the app should breathe," explicitly not distracting.
- **Dynamic themes**: beyond light/dark — "Travel Journal," "Explorer Night," "Golden Sunset," "Polar Morning" as named theme presets.
- **Tiny details** (the ones users actually remember): compass rotates while loading, a passport-stamp animation when a trip is added, soft paper texture in the background, gentle page transitions, animated counters, smooth map zoom, skeleton loaders instead of spinners. Explicitly **no confetti** — keep the tone elegant, not playful.

**Feasibility**: entirely client-side CSS/animation work, no data model changes. This is the same category of work as the existing globe-spin/letter-hop nav animations and the trip-card icon animations — a natural extension of a pattern already established in this codebase.

## 6. AI Travel Summary

- After a trip ends, generate a short natural-language summary ("Your Australian adventure — 7 days, visited Sydney/Blue Mountains/Bondi, most memorable day: Sydney Harbour, 982km travelled").

**Feasibility**: this is the one idea here that needs a real backend decision, same shape as the feedback form's Resend integration — an LLM API key can't be called directly from the browser. Options: (a) a standalone Vercel Function (like `api/feedback.ts`) that calls an LLM API server-side with the trip data passed in the request body, or (b) skip the AI framing and just write a good deterministic summary template client-side (no API key, no cost, no backend) — worth deciding which before this one gets brainstormed, since it changes the scope from "one small function" to "ongoing API cost + prompt design."

## Suggested order

1. **The Living Map** — the strongest fit for the differentiator thesis and the most natural next step given the transport-mode/tips work already done.
2. **Home Dashboard & Stats** — reuses the same derived-data mechanics as the map; a good second wave.
3. **Ambient Design & tiny details** — cheap, high perceived-quality wins, can be interleaved with anything else.
4. **Journal/Memories/Timeline**, **Trip Experience polish** — bigger individually, worth their own brainstorm sessions when picked up.
5. **AI Travel Summary** — needs a backend-shape decision first; lowest priority until that's resolved.
