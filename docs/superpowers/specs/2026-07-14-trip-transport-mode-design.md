# Trip transport mode: tabs + animated card icons — Design Spec

Date: 2026-07-14

## Overview

Trips gain a **transport mode** (Flight / Train / Road / Boat / Other). This powers two things: filter tabs on the trips list, and a mode-specific icon + animation on each trip card's header banner, replacing the current random hash-based cover/plane icon.

## Goals

- Add `transportMode` to the `Trip` data model.
- Trips list page gets a tab bar (`All / Flight / Train / Road / Boat / Other`) that filters the visible trips. `All` is the default, so the page looks unchanged until the user filters.
- Each `TripCard` header banner shows an icon matching its trip's mode (plane, train, car, boat, bicycle) instead of the current fixed plane icon.
- On hover, the icon drifts/slides across the banner — extends the existing hover-only, `prefers-reduced-motion`-respecting animation pattern already used for the nav's globe-spin and letter-hop.
- The New Trip form gets a single-select row of 5 icon buttons for choosing the mode, defaulting to Flight.

## Non-goals

- No migration write to existing localStorage data — legacy trips without `transportMode` are treated as `'flight'` at read time only; nothing is rewritten until the user edits that trip.
- No change to trip data other than adding this one field — countries, dates, name, etc. are untouched.
- No backend/API — this is entirely client-side, consistent with the rest of v1.

## Data Model

```ts
type TransportMode = 'flight' | 'train' | 'road' | 'boat' | 'other';

Trip { id, name, startDate, endDate, countries: string[], transportMode: TransportMode }
```

- `transportMode` is required on new trips (created via the form, defaulting to `'flight'` if the user doesn't change the selection).
- The trips repository's read path defaults `transportMode` to `'flight'` for any trip loaded from storage that lacks the field (backward compatibility for the 4 existing sample trips and any real user data from before this change).

## Card Header (`TripCard.svelte`)

Each mode maps to one fixed gradient + one fixed icon (replacing the current 3-way random-hash cover rotation):

| Mode | Gradient | Icon |
|---|---|---|
| Flight | terracotta (existing default gradient) | plane |
| Train | teal (existing 2nd gradient) | train |
| Road | rust (existing 3rd gradient) | car |
| Boat | blue (new) | boat |
| Other | green (new) | bicycle |

Hover animation: the icon translates off to the left (plane also rotates slightly, boat drifts down a touch) over `0.6s cubic-bezier(0.25, 1, 0.5, 1)`, gated behind `@media (prefers-reduced-motion: reduce)` same as the nav animations. Confirmed via the visual companion mockup (approved 2026-07-14).

## Trips List Tabs (`+page.svelte`)

- A row of 6 tabs above the trip grid: `All`, `Flight`, `Train`, `Road`, `Boat`, `Other`.
- `All` selected by default.
- Filtering is a pure `$derived` over the existing in-memory `trips` array (client-side, no new storage reads) — filters to trips whose `transportMode` matches the active tab.
- Tab bar styling follows the existing pill/badge pattern already used elsewhere on this page (active = filled accent pill, inactive = outlined).

## New Trip Form

- A row of 5 icon buttons (plane/train/car/boat/bicycle), single-select, same interaction pattern as the existing country-chip toggle buttons in the dialog.
- Defaults to Flight selected.
- Selected mode is passed into `createTrip()` alongside name/dates/countries.

## Testing

- Storage layer: extend the existing Vitest suite to cover the `transportMode` default-fallback on read, and that `createTrip` persists the selected mode.
- UI (tabs, card icon, form buttons): verified manually via the dev server, consistent with this project's existing manual-verification approach for UI.
