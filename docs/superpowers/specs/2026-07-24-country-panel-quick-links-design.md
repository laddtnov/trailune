# Country Panel Quick Links — Design Spec

Date: 2026-07-24

## Overview

This is a slice of `docs/ROADMAP.md` §1 "The Living Map" — the click-to-open side panel is listed as *partially shipped*: clicking a visited country on `/map` already opens a bottom panel listing that country's trips, but each trip is just a single link into the trip hub (defaulting to its Journal tab). This cycle extends that panel with direct quick links into each trip's Gallery, Journal, and Packing tabs, so a country with a busy travel history doesn't require an extra click-through-then-click-a-tab round trip.

## Goals

- The trip hub page (`src/routes/trips/[id]/+page.svelte`) reads an optional `?tab=` query parameter on load and opens directly to that tab if it's a valid tab id, falling back to the current default (`journal`) otherwise.
- The map page's (`src/routes/map/+page.svelte`) existing "selected country" bottom panel gains, for each trip in that country's trip list, three small icon quick-links — Journal, Gallery, Packing — that link to `/trips/{id}?tab=journal|gallery|packing` respectively.
- A country with multiple trips gets independent quick-links per trip row — no shared or aggregated state between trips.

## Non-goals

- No cross-trip aggregation (e.g. a single "all photos from every trip to France" view) — each quick-link opens exactly one trip's tab.
- No quick-links added to the hover popover (`CountryPopover.svelte`) — only the click-to-open panel changes.
- The Packing quick-link goes to that specific trip's own trip-scoped packing list, not the shared packing-template pages.
- No new data model and no new pure-logic module — this wires an existing SvelteKit query-param convention through two already-existing pages.

## Architecture

- **`src/routes/trips/[id]/+page.svelte`** (modify) — in the existing `onMount`, after resolving `trip`, read `page.url.searchParams.get('tab')`. If the value is one of the existing tab ids (`'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont'`), initialize `activeTab` to it; otherwise leave the current default (`'journal'`) unchanged. This is strictly additive — a request with no `tab` param, or an invalid one, behaves exactly as it does today.
- **`src/routes/map/+page.svelte`** (modify) — the existing `{#if selectedCode}` panel's trip list (`{#each tripsForSelected as trip}`) currently renders one `<a href={`/trips/${trip.id}`}>{trip.name}</a>` per trip. Each list item gains a row of three small icon links immediately after the trip name — Journal, Gallery, Packing — each an `<a href={`/trips/${trip.id}?tab=...`}>` with an inline SVG icon and an `aria-label` (e.g. `"Open {trip.name}'s journal"`). The existing trip-name link is unchanged in behavior (still opens the trip hub, landing on Journal by default via the unchanged fallback).

## Data flow & interaction notes

- No new state, no new storage reads — `tripsForSelected` (already computed on the map page) is exactly the list these quick-links render against.
- The trip hub page's `?tab=` handling is a one-time read at mount, not a live-reactive binding — navigating between tabs afterward continues to update only the in-memory `activeTab` state, exactly as today (no URL sync on tab-click, matching the existing tab-button behavior).

## Edge cases

- **Country not yet visited** (`tripsForSelected.length === 0`): the panel's existing "Add a trip here to fill it in." message is unchanged; there are no quick-links to render since there's no trip to link into.
- **Invalid or missing `?tab=` value**: falls back to `'journal'`, identical to today's hardcoded default.
- **A trip visits the same country via multiple legs** (e.g. a round-trip through the same country twice in `trip.countries`): `tripsForSelected` already de-duplicates at the trip level (a trip either includes the country or doesn't), so this doesn't produce duplicate rows — no change needed from today's behavior.

## Testing

- Manual browser verification only (this project's established convention for page-level navigation/UI changes of this kind, consistent with how the original click-to-open panel and the zoom-to-country feature were verified) — confirm each quick-link lands directly on the correct tab for a single-trip country, confirm a multi-trip country renders independent quick-links per trip row, and confirm an unvisited country's panel is unchanged.
