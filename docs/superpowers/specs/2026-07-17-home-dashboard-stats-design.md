# Home Dashboard & Stats — Design Spec

Date: 2026-07-17

## Overview

This turns `docs/ROADMAP.md` §2 ("Home Dashboard & Stats") into a scoped, buildable feature: a warmer home-page hero with a quick stats strip, and a new `/stats` page with a full metric breakdown. Everything is derived from existing trip data — no new user-entered fields, consistent with the app's differentiator thesis. This is a scoped slice of the roadmap section; **Achievements** and **Year in Review ("Wrapped")** are deferred to their own future brainstorm cycles.

## Goals

- **Home page hero**: when trips exist, the plain "Your trips" header is replaced with a warmer, time-of-day-aware greeting plus a one-line summary (e.g. "Good afternoon. 12 countries explored, 18 trips logged."). The existing zero-trips empty state is unchanged.
- **Header stats strip**: a compact row of 4 stat tiles (visited countries, world %, trips, travel days) rendered on the home page, just below the hero, only when at least one trip exists.
- **`/stats` page**: a new route with a full metric breakdown — countries visited (+ % of world), continents visited (of 7), total trips, flights taken, total days travelled, longest trip (name + day count), average trip length. Reachable via a new "Stats" nav link.

## Non-goals

- No Achievements (milestone badges) — deferred.
- No Year in Review / "Wrapped" annual recap — deferred.
- No new user-entered data of any kind — every metric here is a derived read over the existing `Trip[]` list and the existing world country list.
- No changes to the trip list, trip cards, or trip creation flow beyond the hero copy above the list.

## Architecture

Two new modules, one new route, and two small edits to existing files:

- **`src/lib/continents.ts`** (new) — a static country-code → continent lookup covering every country code present in `world-map.svg`, plus a `CONTINENTS` constant listing the 7 continent names. Pure data, no runtime dependencies.
  ```ts
  export type Continent =
    | 'Africa' | 'Antarctica' | 'Asia' | 'Europe'
    | 'North America' | 'Oceania' | 'South America';
  export const CONTINENTS: readonly Continent[] = [ /* the 7, in a fixed order */ ];
  export function getContinent(countryCode: string): Continent | null;
  ```
- **`src/lib/countryStats.ts`** (modify) — export the existing private `daysInTrip(trip: Trip): number` helper (currently unexported) so `tripStats.ts` can reuse the exact same inclusive day-count formula instead of duplicating it. No behavior change to this file.
- **`src/lib/tripStats.ts`** (new) — the single source of truth for every stat both the home page and `/stats` page render:
  ```ts
  export interface TripStats {
    totalCountries: number;
    percentWorld: number;
    totalContinents: number;
    totalTrips: number;
    totalFlights: number;
    totalDays: number;
    longestTrip: { name: string; days: number } | null;
    averageTripDays: number;
  }
  export function computeTripStats(trips: Trip[], countries: CountryInfo[]): TripStats;
  ```
- **`src/routes/stats/+page.svelte`** (new) — loads trips and countries the same way `/map` and `/` already do (`listTrips()`, `loadWorldCountries()`), calls `computeTripStats`, and renders a card grid of all 7 metrics.
- **`src/routes/+page.svelte`** (modify) — the header block gains a conditional hero (time-of-day greeting + summary line) and a 4-tile stats strip below it, both driven by `computeTripStats` (a subset of its fields). Only rendered when `trips.length > 0`; the existing zero-trips empty state is untouched.
- **`src/routes/+layout.svelte`** (modify) — `navItems` gains `{ href: '/stats', label: 'Stats' }` after Packing.

## Metric definitions

- **`totalCountries`** — size of the union of all `trip.countries` across every trip (identical logic to the map page's `visitedCodes`).
- **`percentWorld`** — `Math.round((totalCountries / countries.length) * 100)`. Whole-percent rounding, matching the existing convention on `/map` (not a decimal, for consistency between the two pages).
- **`totalContinents`** — size of the set of continents resolved via `getContinent()` for every visited country code. A code with no lookup entry is silently excluded rather than throwing (shouldn't happen in practice, since the lookup is built from the same country list, but this keeps the function total).
- **`totalTrips`** — `trips.length`.
- **`totalFlights`** — count of trips where `trip.transportMode === 'flight'`.
- **`totalDays`** — sum of `daysInTrip(trip)` (imported from `countryStats.ts`) across all trips.
- **`longestTrip`** — the trip with the largest `daysInTrip` value, as `{ name, days }`; `null` when there are zero trips. Ties resolve to whichever trip is encountered first in the array — no explicit tie-breaking rule, since ties are rare and not worth extra logic.
- **`averageTripDays`** — `totalDays / totalTrips`, rounded to one decimal place (`Math.round(x * 10) / 10`); `0` when there are zero trips.

**Zero-trips behavior**: `computeTripStats([], countries)` returns a fully-populated object with all-zero/null fields (never `null` itself) — this means neither consumer needs to special-case "no stats yet" in their data layer; each page's existing/new empty-state UI handles the zero case entirely in the template.

## UI

**Home page hero** (`src/routes/+page.svelte`): when `trips.length > 0`, the current static `<h1>Your trips</h1>` / subtitle pair is replaced with a greeting computed from `new Date().getHours()` (Morning <12, Afternoon 12–17, Evening ≥17) plus a summary line built from `computeTripStats`'s `totalCountries` and `totalTrips` (e.g. "Good afternoon. 12 countries explored, 18 trips logged."). When `trips.length === 0`, the header is unchanged from today ("Your trips" / "Every journey starts with the first pin.") — the existing empty-state card below it is also unchanged.

Directly below the header (only when `trips.length > 0`), a stats strip: 4 small stat tiles in a row (`grid-cols-[repeat(auto-fit,minmax(120px,1fr))]` or similar, matching the app's existing card token styling — `--color-card`, `--radius-lg`, `--shadow-card`) showing Visited (countries), World % , Trips, Travel days.

**`/stats` page** (new): page header ("Your stats" or similar) followed by a card grid of all 7 metrics, following the same page-header + card-grid visual pattern already established on `/map`. Longest trip renders as "Japan Trip · 14 days"; average trip length as "6.4 days". Zero-trips empty state: a dashed-border placeholder card matching the existing "No trips yet" treatment on `/`, prompting the user to log a trip first (with a link back to `/`).

**Nav**: "Stats" added to `navItems` in `+layout.svelte`, after "Packing".

## Testing

Following this project's established convention (Vitest for pure logic, manual browser verification for UI):

- Vitest unit tests for `continents.ts`: spot-check a handful of country codes resolve to the correct continent, and a coverage test asserting every country code present in `world-map.svg` (via the existing `parseCountriesFromSvg`/`loadWorldCountries` machinery) has a `getContinent()` entry — so a future new country added to the SVG can't silently fall through the lookup.
- Vitest unit tests for `tripStats.ts`: zero-trips shape (all fields zero/null, no division-by-zero), single trip, multiple trips spanning one continent vs. multiple, flights count, longest-trip selection (including a tie case), and average-days rounding.
- Manual browser verification: home page hero and stats strip render correctly with zero trips (unchanged from today) and with several trips seeded; `/stats` page renders all seven metrics correctly against seeded multi-country, multi-continent trip data, and shows its own empty state with zero trips; the new "Stats" nav link navigates correctly and highlights as active.
