# Richer Country Popover — Design Spec

Date: 2026-07-27

## Overview

This is the second item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas" (after the stats copy fixes). It extends the main map's existing hover/tap popover (`CountryPopover.svelte`, backed by `countryStats.ts`'s `getCountryStats`) with more of the data already implicit in a country's trip history: longest stay, and first/latest visit year.

## Goals

- The popover's main stats line changes from `{N} trips · {N} days · Last visit {Mon Year}` to `{N} trips · {N} days · Longest stay {N} days`.
- A new second line shows visit-year range: `Visited in {year}` when a country has only ever been visited in one calendar year, or `First visited {year} · Last visited {year}` when visits span multiple years.
- The existing "View trips →" button is unchanged — it already opens the country's click-to-open trip panel, which is what the roadmap's "View history →" idea asked for.

## Non-goals

- No "progress-style visual" (e.g. a visit-count bar) — the roadmap's own wording was vague on what this would represent, and nothing about a per-country visual progress indicator fit naturally without inventing a new comparison metric. Skipped.
- No naming which specific trip produced the longest stay — duration only, keeping the popover compact. The trip name is one click away via "View trips →".
- No schema changes — everything here is derived from existing `Trip` records (`startDate`, `endDate`, `countries`), the same data `getCountryStats` already reads.
- No changes to the click-to-open side panel itself, or to `WorldMap.svelte`'s hover/click wiring — this is scoped entirely to `countryStats.ts` and `CountryPopover.svelte`.

## Architecture

- **`src/lib/countryStats.ts`** (modify) — `CountryStats` changes from:
  ```ts
  export interface CountryStats {
    visitCount: number;
    totalDays: number;
    lastVisitDate: string;
  }
  ```
  to:
  ```ts
  export interface CountryStats {
    visitCount: number;
    totalDays: number;
    longestStayDays: number;
    firstVisitYear: number;
    lastVisitYear: number;
  }
  ```
  `lastVisitDate` is removed — its only consumer was the popover's month-precision "Last visit" line, which this spec replaces with the year-range line below. `getCountryStats` computes:
  - `longestStayDays`: the maximum of `daysInTrip(trip)` across all of that country's matching trips.
  - `firstVisitYear` / `lastVisitYear`: the min and max of `new Date(trip.startDate).getFullYear()` across all matching trips.

- **`src/lib/components/CountryPopover.svelte`** (modify) — the main stats paragraph changes to:
  ```
  {visitCount} {trip/trips} · {totalDays} {day/days} · Longest stay {longestStayDays} {day/days}
  ```
  A new paragraph below it renders:
  - `Visited in {firstVisitYear}` when `firstVisitYear === lastVisitYear`
  - `First visited {firstVisitYear} · Last visited {lastVisitYear}` otherwise
  The existing `formatLastVisit` helper and its only call site are removed, since `lastVisitDate` no longer exists on `CountryStats`. The "View trips →" button and its `onviewtrips` prop are untouched.

## Data flow & interaction notes

- `src/routes/map/+page.svelte` (the only current consumer of `getCountryStats`/`CountryPopover`) needs no code changes — it already just passes through whatever `CountryStats` shape `getCountryStats` returns and forwards it to the popover as a prop.
- All three new fields are computed the same way `visitCount`/`totalDays` already are today: filtered from the full `trips` array by `trip.countries.includes(code)`, with no new storage reads.

## Edge cases

- **Single-visit country**: `firstVisitYear === lastVisitYear`, so the popover shows the collapsed `Visited in {year}` form rather than a redundant repeated year.
- **Multiple trips to the same country in the same year**: still collapses to `Visited in {year}` (both extremes equal), which is correct — the distinction being surfaced is "does this span multiple calendar years," not "how many separate visits."
- **Longest stay tie** (two trips of equal duration): `Math.max` naturally picks that duration regardless of which trip produced it, since only the number is shown, not the trip.

## Testing

- **`countryStats.ts`**: extend the existing Vitest suite — `longestStayDays` returns the correct maximum across multiple trips to the same country (including a tie case); `firstVisitYear`/`lastVisitYear` correctly derive from `startDate` across trips spanning multiple years, and are equal for a country with only one visit (or multiple visits within the same year).
- **`CountryPopover.svelte`**: manual browser verification (this project's established convention for this component) — a single-visit country shows `Visited in {year}`; a country visited across multiple years shows `First visited … · Last visited …`; the longest-stay figure matches the actual longest trip; "View trips →" still opens the click panel correctly; singular/plural wording (`1 trip` vs `2 trips`, `1 day` vs `2 days`) still reads correctly at every count.
