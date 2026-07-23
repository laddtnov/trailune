# Destination Preview — Design Spec

Date: 2026-07-23

## Overview

This is the second slice of `docs/ROADMAP.md` §4 "Trip Experience Polish" (packing cards + templates shipped first). Destination preview shows, for a trip's countries, the currency, timezone, and a season/climate blurb computed from the trip's actual travel dates — giving the user real trip-planning context without any live weather or exchange-rate API.

## Goals

- A static, bundled reference table covering every country code the app's world map already supports, with currency, a representative UTC offset, and hemisphere.
- A pure computation that turns a trip's countries + start date into a season (hemisphere-aware — Southern-hemisphere countries get correctly flipped seasons) plus a one-line generic climate blurb for that season.
- A new section in the trip hub, shown above the tab navigation regardless of which tab is active, with one card per country in the trip.
- Each card shows: country name, currency (code + name), UTC offset, and season + climate blurb.

## Non-goals

- No live weather API and no live currency exchange rates — everything is static/bundled, per the roadmap's explicit framing.
- No per-country weather blurb — the four season blurbs (Winter/Spring/Summer/Fall) are generic and shared across every country; not modeled with finer per-region nuance (e.g. no distinction for tropical/equatorial countries with less seasonal variance).
- No multiple-timezone handling per country — one representative UTC offset (typically the capital city's) per country, even for countries that legally span several timezones.
- No display in the trip-creation dialog in this cycle — this ships only in the trip hub, for a trip that already exists.
- No user-editable/override reference data.

## Architecture

- **`src/lib/countryReference.ts`** (new) — a static reference table, one entry per country code already supported by `src/lib/countries.ts`'s parsed map data (~200 entries):
  ```ts
  export interface CountryReference {
    currency: { code: string; name: string };
    utcOffsetHours: number;
    hemisphere: 'N' | 'S';
  }
  export const COUNTRY_REFERENCE: Record<string, CountryReference> = { /* ~200 entries */ };
  ```
  `utcOffsetHours` supports fractional values (e.g. `5.5` for India, `5.75` for Nepal) since several real countries use half/quarter-hour offsets. `hemisphere` is a simplified binary classification (based on the country's capital/majority landmass) used only to flip the season calculation — not a precise geographic model. This table is keyed purely by code; country *display names* are not duplicated here since `loadWorldCountries()` already resolves those elsewhere in the app.
- **`src/lib/destinationPreview.ts`** (new) — pure functions, no storage/schema changes:
  - `type Season = 'Winter' | 'Spring' | 'Summer' | 'Fall'` (matching `journeyTimeline.ts`'s existing `Season` type).
  - `getHemisphereAwareSeason(dateIso: string, hemisphere: 'N' | 'S'): Season` — for `'N'`, identical month-boundary logic to `journeyTimeline.ts`'s `getSeasonLabel`; for `'S'`, the same boundaries but the resulting season is the opposite of the Northern-hemisphere result for that month (Winter↔Summer, Spring↔Fall).
  - `SEASON_BLURBS: Record<Season, string>` — one short generic climate description per season, reused across every country.
  - `interface DestinationPreviewEntry { code: string; currency: { code: string; name: string }; utcOffsetHours: number; season: Season; seasonBlurb: string }`
  - `computeDestinationPreview(trip: Trip): DestinationPreviewEntry[]` — maps `trip.countries` to entries using `COUNTRY_REFERENCE` and `trip.startDate`, silently skipping any code with no `COUNTRY_REFERENCE` entry (defensive; shouldn't occur given full coverage).
- **`src/lib/components/DestinationPreview.svelte`** (new) — props `{ trip: Trip; countries: CountryInfo[] }`. Calls `computeDestinationPreview(trip)`, resolves each entry's country name by looking it up in the `countries` prop (matching by code), and renders one card per entry: country name, currency (`"JPY · Japanese Yen"`-style), UTC offset (formatted as `"UTC+9"` or `"UTC+5:30"` for fractional offsets), and season + blurb (`"Winter · Cold, occasional snow"`-style). Renders nothing if `trip.countries` is empty or every code is unmatched.
- **`src/routes/trips/[id]/+page.svelte`** (modify) — adds a `countries: CountryInfo[]` state loaded via `loadWorldCountries()` in `onMount` (the same pattern already used on the home page), and renders `<DestinationPreview {trip} {countries} />` immediately after the trip's `<header>` and before the tab `<nav>`, so it's visible above the tabs on every tab.

## Data flow & interaction notes

- Season is computed once, from `trip.startDate` only — a trip spanning a season boundary (e.g. a long trip crossing from winter into spring) shows only the arrival season, not a second card or a range.
- The reference table and the season/blurb logic are both pure and fully bundled at build time — the component makes no network requests.
- `DestinationPreview.svelte` doesn't own any data-loading beyond what's passed to it as props; the trip hub page is responsible for loading `countries` and passing both `trip` and `countries` in, keeping the component itself easily testable in isolation.

## Edge cases

- **Country code missing from `COUNTRY_REFERENCE`**: `computeDestinationPreview` skips it rather than crashing or rendering a broken card — defensive only, since the table is built for full coverage of every code the map already supports.
- **Trip with zero countries**: `DestinationPreview.svelte` renders nothing (no empty-state card), since a trip is not expected to exist with no countries at all in current usage.
- **Fractional UTC offsets**: formatted as `"UTC+5:30"` (hours:minutes), not a decimal like `"UTC+5.5"`.
- **Southern-hemisphere flip**: verified explicitly in tests — e.g. a July trip to a Northern-hemisphere country computes Summer, while a July trip to a Southern-hemisphere country computes Winter.

## Testing

- **`destinationPreview.ts`** gets Vitest unit tests: `getHemisphereAwareSeason` correctness for both hemispheres across all four season boundaries; `computeDestinationPreview` returns one correctly-shaped entry per country in `trip.countries`, in the same order; an unknown country code is silently skipped; a trip with an empty `countries` array returns an empty result.
- **`countryReference.ts`** gets a structural Vitest test rather than hand-verifying all ~200 rows individually: every entry has a 3-letter uppercase `currency.code`, a non-empty `currency.name`, a numeric `utcOffsetHours`, and `hemisphere` is exactly `'N'` or `'S'`.
- **`DestinationPreview.svelte` and its wiring into the trip hub**: manual browser verification (this project's established convention for read-only info-card UI) — confirm cards render for single- and multi-country trips, currency/offset/season values look correct for a couple of known real-world countries in both hemispheres, and nothing renders (no broken layout) for the defensive empty-countries case.
