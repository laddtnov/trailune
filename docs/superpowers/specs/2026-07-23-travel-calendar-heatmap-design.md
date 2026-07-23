# Travel Calendar Heatmap — Design Spec

Date: 2026-07-23

## Overview

This is the fifth and final slice of `docs/ROADMAP.md` §3 "Journal, Memories & Timeline" (journal reframe, journey timeline, photo gallery/trip map, and memory pins shipped first). A yearly heatmap-style calendar, similar in spirit to a GitHub contributions graph, showing which days of the year were "travel days" — derived entirely from existing `Trip` date ranges. No new data model.

## Goals

- A new `/calendar` page showing one year at a time as a GitHub-style grid: 7 day-of-week rows × ~53 week columns.
- Every day inside any trip's `[startDate, endDate]` range is colored; the color identifies which trip it belongs to.
- Trip colors are assigned deterministically by chronological order (earliest trip first) cycling a fixed palette of existing CSS accent variables — no new `color` field on `Trip`.
- A legend below the grid maps each visible trip to its color.
- Hovering a colored day cell shows a tooltip with the trip name and date.
- Prev/next controls page between years, matching the existing `/stats/year` navigation pattern. Defaults to the most recent year that has trip data.
- Added to main nav, positioned after Timeline: Trips, Map, Timeline, Calendar, Packing, Stats, Settings.

## Non-goals

- No support for overlapping trips on the same day — the data model and UI both assume a day belongs to at most one trip, since this app tracks a single traveler's trips and overlaps don't occur in practice.
- No click-through from a day cell to its trip page — hover tooltip only, in this cycle.
- No new `Trip` schema fields (no color field, no per-day metadata) — everything is derived at render time from existing `startDate`/`endDate`/`countries`.

## Architecture

- **`src/app.css`** (modify) — adds five new CSS custom properties (`--color-trip-1` through `--color-trip-5`) to the base `:root` block and to each of the four existing theme-preset blocks, giving the trip-color palette theme-appropriate values everywhere the four presets already override `--color-accent`/`--color-teal`.
- **`src/lib/travelCalendar.ts`** (new) — pure functions, no storage/schema changes:
  - Reuses the existing `getAvailableYears(trips: Trip[]): number[]` from `src/lib/yearInReview.ts` (already sorted descending) — not duplicated.
  - `computeYearHeatmap(trips: Trip[], year: number): { date: string; tripId: string }[]` — iterates each trip's date range using the same UTC-safe `Date.UTC(...)` iteration pattern already used by `computeMostActiveMonth` in `yearInReview.ts`, keeping only days that fall in `year`, tagging each with its trip's `id`. Returned dates are `YYYY-MM-DD` strings.
  - `assignTripColors(trips: Trip[]): Map<string, string>` — sorts a copy of `trips` by `startDate` ascending, then assigns each trip's `id` a color from a fixed palette array by index modulo palette length, so color assignment stays stable regardless of which year is currently displayed. Palette: `['var(--color-trip-1)', 'var(--color-trip-2)', 'var(--color-trip-3)', 'var(--color-trip-4)', 'var(--color-trip-5)']` — five new dedicated CSS custom properties (not a reuse of `--color-danger`/`--color-success`, which carry red/green semantic meaning elsewhere in the app, and not `--color-accent`/`--color-teal`, which are already the app's primary UI accents). These five are added to `src/app.css` alongside the existing `:root` block and re-defined with theme-appropriate values inside each of the four theme-preset blocks (`Travel Journal`, `Explorer Night`, `Golden Sunset`, `Polar Morning`), matching how `--color-accent`/`--color-teal` are already redefined per-preset.
- **`src/lib/components/CalendarHeatmap.svelte`** (new) — props: `trips: Trip[]`, `year: number`. Internally calls `computeYearHeatmap` and `assignTripColors`, renders the 7×53 grid (each cell is a `<div>` sized/spaced via CSS grid, empty cells for days outside the year at the grid's start/end), colors travel-day cells per the trip's assigned color, and attaches a `title` attribute (native tooltip, matching this project's existing lightweight-tooltip convention — no new tooltip library) showing `"{trip.name} · {date}"`. Renders a legend below the grid: one row per trip visible in the current year, each showing a small color swatch and the trip name.
- **`src/routes/calendar/+page.svelte`** (new) — loads all trips via the existing trips storage module, computes `getAvailableYears(trips)`, tracks `year` as component state defaulting to the first (most recent) available year, renders prev/next buttons that step `year` by ±1 (disabled/no-op if stepping outside the available range is fine — the grid will just render an all-empty year, same as `/stats/year`'s existing behavior for years with no data), and renders `<CalendarHeatmap {trips} {year} />`. If `trips` is empty, shows an empty-state message instead of the grid.
- **`src/routes/+layout.svelte`** (modify) — nav array gains `{ href: '/calendar', label: 'Calendar' }` after the Timeline entry.

## Data flow & interaction notes

- No storage layer changes at all — this feature only reads existing `Trip` records via whatever the existing trips-listing function is (`storage.ts`'s trip listing), same as `/stats` and `/timeline` already do.
- Color assignment is global (computed from *all* trips, not just the ones in the displayed year), so a given trip's color never changes as the user pages between years — important since a trip spanning a year boundary appears (partially) in two adjacent years' grids and must look consistent in both.
- The legend only lists trips that have at least one day visible in the *currently displayed* year — not every trip in the app.

## Edge cases

- **Trip spans a year boundary**: only the days actually falling within the displayed `year` are colored in that year's grid; the remaining days show up when the user pages to the adjacent year. The trip's color is identical in both years since color assignment is global.
- **No trips at all**: `/calendar` shows an empty-state message ("No trips yet — add one to see your travel calendar.") instead of a grid, since there's no year to default to.
- **Year with zero trip days**: renders a fully empty (uncolored) grid — same non-special-cased behavior as `/stats/year` today.
- **Two trips can't land on the same day**: not handled/guarded against in code — out of scope per Non-goals, consistent with this being a single-traveler app.

## Testing

- **`travelCalendar.ts`** gets Vitest unit tests (pure functions, no DOM): `computeYearHeatmap` returns correct day tags for a single trip fully inside a year, correctly splits a trip that spans a year boundary (only the days in the requested year are returned), and correctly tags multiple non-overlapping trips in the same year. `assignTripColors` returns stable colors keyed by trip id, assigns them in chronological order, and cycles the palette once trips outnumber palette entries.
- **`CalendarHeatmap.svelte` and the `/calendar` page**: manual browser verification (this project's established convention for calendar/grid UI) — confirm the grid renders for a year with trip data, hover tooltips show the correct trip name + date, the legend matches the grid's colors, prev/next navigation moves between years correctly, and the empty state renders correctly with zero trips.
