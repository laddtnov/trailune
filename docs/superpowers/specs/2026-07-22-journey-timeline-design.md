# Journey Timeline — Design Spec

Date: 2026-07-22

## Overview

This is the second slice of `docs/ROADMAP.md` §3 "Journal, Memories & Timeline" (the journal reframe shipped first, in PR #33). It adds a new `/timeline` page: a vertical, year-grouped view of all trips, showing country, season, and duration for each. It is a pure re-presentation of existing `Trip` data — no data model changes.

## Goals

- A new `/timeline` route, linked from the main nav.
- Trips grouped by year (most recent year first), ordered reverse-chronologically within each year.
- Each trip entry shows: all countries visited on that trip (with flag emoji), a season badge derived from the start date, the date range, and duration in days.
- Responsive layout: a centered alternating-spine timeline at ≥640px, collapsing to a single left-aligned rail below that breakpoint.
- Reuses existing derivation logic (`daysInTrip` from `countryStats.ts`) and the UTC-safe year-parsing pattern already established in `yearInReview.ts`.

## Non-goals

- No click-through from a timeline entry into its trip hub in this cycle — v1 is read-only. A future entry-to-trip link is a natural extension but out of scope here.
- No hemisphere-aware season logic — seasons are a fixed Northern-hemisphere month lookup (Dec-Feb Winter, Mar-May Spring, Jun-Aug Summer, Sep-Nov Fall), regardless of the destination's actual hemisphere. This is an accepted simplification, not a bug to fix later.
- No new data model or schema changes — `Trip` is unchanged.
- No filtering, search, or year-picker controls — the full timeline renders in one scroll, unlike `/stats/year`'s year-select pattern.

## Architecture

- **`src/lib/journeyTimeline.ts`** (new) — pure derivation module:
  - `getSeasonLabel(dateIso: string): 'Winter' | 'Spring' | 'Summer' | 'Fall'` — derives a season from the month of an ISO date string, using a fixed Northern-hemisphere lookup.
  - `groupTripsByYear(trips: Trip[]): Array<{ year: number; trips: Trip[] }>` — groups trips by the year parsed directly from `startDate` (same string-slicing approach as `yearInReview.ts`'s `tripYear()`, avoiding local-timezone `Date.getFullYear()` bugs), sorted with the most recent year first, and trips within each year sorted most-recent-first by `startDate`.
- **`src/routes/timeline/+page.svelte`** (new) — loads trips via the existing `listTrips()` storage function and world countries via the existing `loadWorldCountries()` (same pattern as the home page), calls `groupTripsByYear` and `getSeasonLabel`, and renders the responsive timeline layout described below.
- **`src/routes/+layout.svelte`** (modify) — add `{ href: '/timeline', label: 'Timeline' }` to the `navItems` array, positioned after Map and before Packing.

## Data flow & interaction notes

- No new storage functions — `listTrips()` and `loadWorldCountries()` already exist and are reused as-is.
- `groupTripsByYear` and `getSeasonLabel` are pure functions with no side effects, taking trips/dates in and returning derived display data — no component needs to know how the grouping or season logic works internally.
- For a trip with multiple countries, all are listed on its timeline entry (e.g. "🇯🇵 Japan, 🇰🇷 South Korea"), joined by the country lookup already available via `CountryInfo[]` (same list the home page already loads for its country-picker).

## Edge cases

- **No trips yet**: render the existing empty-state pattern already used elsewhere in the app (e.g. the journal tab's "No journal entries yet" treatment) — a simple centered message, no page-specific illustration.
- **Trip missing a matching `CountryInfo`** (should not normally happen, but the country list is loaded async): fall back to displaying the raw country code, matching how other pages in this app already handle an unresolved country lookup.
- **Responsive breakpoint**: the alternating-spine and single-rail layouts are two CSS presentations of the same markup and data, switched via a Tailwind breakpoint (`sm:`) — not two separate component trees, avoiding logic duplication between the two visual modes.

## Testing

- **`journeyTimeline.ts`** gets unit tests (Vitest, following the `yearInReview.ts` convention exactly): season-label derivation for at least one date in each of the four seasons, year-grouping and ordering (most recent year and most recent trip-within-year first), and correct grouping across a year boundary.
- **`/timeline` page**: manual browser verification (this project's established convention for UI/layout work) — confirm the alternating spine renders correctly at desktop width, confirm it collapses to the single left rail at mobile width, confirm season badges and multi-country lists render correctly, and confirm the empty state shows correctly with no trips.
