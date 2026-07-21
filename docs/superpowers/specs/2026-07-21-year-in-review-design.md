# Year in Review — Design Spec

Date: 2026-07-21

## Overview

This implements `docs/ROADMAP.md` §2's "Year in Review ('Wrapped')" idea: an annual recap of a user's travel — countries, trips, flights, days abroad, most-visited country, longest trip, and most active month for a given year — derived entirely from existing trip data, with no new data model, no new dependencies, and no image export in this cycle.

## Goals

- A new page presenting a year-by-year travel recap, linked from the existing `/stats` page.
- A year picker that lets the user switch between any year that has trip data, defaulting to the most recent year with trips.
- All stats computed via a new pure module (`computeYearInReview`), following the same derivation pattern already established by `tripStats.ts` and `countryStats.ts`.
- A staggered reveal-in animation on load, matching the "delight" tone of prior features (Achievements, Rank System, Ambient Delight Details), respecting `prefers-reduced-motion`.

## Non-goals

- No image export / downloadable share image — deferred, since it would require a new canvas/screenshot dependency (e.g. `html-to-image`). This cycle is an in-app view only.
- No story-style slideshow (one-stat-at-a-time with next/back controls) — deferred in favor of a single scrollable page, matching `/stats`'s existing layout model.
- No new data model changes — every stat here is derived read-only from the existing `Trip[]` shape.

## Architecture

- **`src/lib/yearInReview.ts`** (new) — exports `computeYearInReview(trips: Trip[], year: number): YearInReview` and a helper to list the distinct years present across all trips (`getAvailableYears(trips: Trip[]): number[]`, sorted descending). A trip is assigned to a year by its `startDate`'s year — consistent with how the rest of the app already treats a trip as one indivisible unit (e.g. `longestTrip` in `tripStats.ts` never splits a trip across a boundary).
- **`src/routes/stats/year/+page.svelte`** (new) — the Year in Review page itself: a year picker (built from `getAvailableYears`, defaulting to the first/most recent entry), and the six stat cards/sections rendered from `computeYearInReview`'s output. Follows the same `onMount` → load trips → compute stats pattern as `src/routes/stats/+page.svelte`.
- **`src/routes/stats/+page.svelte`** (modify) — add a link/card to `/stats/year`, in the same visual language as the existing stat cards.

## Data flow & metrics

`computeYearInReview(trips, year)` filters `trips` to those whose `startDate` falls in `year`, then derives:

- **Countries visited**: distinct country codes across the year's trips.
- **Trips taken**: count of the year's trips.
- **Flights taken**: count of the year's trips with `transportMode === 'flight'`.
- **Total days abroad**: sum of `daysInTrip(trip)` (reusing `countryStats.ts`'s existing helper) across the year's trips.
- **Most-visited country**: the country code appearing in the most trips that year, tie-broken by earliest first-visit date within the year.
- **Longest trip**: the single longest trip that year, in the same `{ name, days }` shape already used by `tripStats.ts`'s `longestTrip`.
- **Most active month**: the calendar month (within the year) with the most travel days, computed by clipping each trip's date range to the year and bucketing by month.

## Edge cases

- **No trips at all**: the year picker has no years to offer; the page shows an empty state directing back to `/`, matching the tone of the app's existing "No trips yet" states.
- **Single-country or single-trip years**: stats that are normally a "most of" comparison (most-visited country, longest trip) simply show that one value — no special-casing needed beyond standard conditionals, since the derivation naturally degrades to the trivial case.
- **Year-boundary-spanning trip** (e.g. Dec 29–Jan 3): counted entirely under its `startDate`'s year, per the Architecture section above.

## Testing

Following this project's established convention (Vitest for pure logic, manual browser verification for animation/UI):

- Vitest unit tests for `computeYearInReview` and `getAvailableYears` in `src/lib/yearInReview.ts`: correct year-filtering (trips outside the selected year excluded), most-visited-country tie-breaking, most-active-month calculation across a trip spanning multiple months, and the empty-year edge case.
- Manual browser verification: year picker switches correctly between years with data and defaults to the most recent year with trips; empty state renders when there are no trips at all; the staggered reveal-in animation plays on load and skips to steady state under `prefers-reduced-motion`; the new link/card on `/stats` renders and navigates correctly to `/stats/year`.
