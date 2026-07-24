# Dream Map — Design Spec

Date: 2026-07-24

## Overview

This is the last unbuilt item in `docs/ROADMAP.md` §1 "The Living Map." A separate wishlist map: countries not yet visited, each optionally rated (1-5 stars) with a short note ("Dream destination", "Northern Lights"), rendered on their own page in a distinct color from the main map's visited-country styling.

## Goals

- A new `/dream-map` page with its own world map, showing:
  - Already-visited countries in a plain/muted, non-interactive style (context only).
  - Countries with a wishlist entry in one single distinct "wishlist" accent color.
  - All other countries in the same muted style as visited, but clickable to add a new wishlist entry.
- Clicking any non-visited country opens a small panel to set/edit a 1-5 star rating and a short free-text note, with Save (and Delete, if an entry already exists).
- Below the map, a simple list of every current wishlist entry (country name, stars, note), sorted by rating descending; clicking a row opens the same edit panel as clicking the country on the map.
- A country that becomes visited (appears in `trips`-derived `visitedCodes`) is automatically excluded from the Dream Map's wishlist display — no manual cleanup.
- Added to main nav, positioned after Map: Trips, Map, Dream Map, Timeline, Calendar, Packing, Stats, Settings.

## Non-goals

- No color-by-rating scale — every wishlist country renders in the same single accent color regardless of star rating (rating is only shown in the panel/list, not encoded visually on the map).
- No hover popover on the Dream Map — interaction is click-only, unlike the main map's hover-to-preview behavior.
- No flight-route, reveal-animation, or scratch-coating behavior on this page — those are specific to the visited-countries map.
- No automatic deletion of underlying wishlist data when a country becomes visited — the entry is filtered out of the display, not destroyed, so if the corresponding trip is later deleted, the original rating/note reappears automatically.
- No limit on how many countries can be wishlisted, and no required rating or note (a country can be added with just a click and no rating set, though the star picker defaults to prompting a selection before Save is meaningful — see Edge cases).

## Architecture

- **`src/lib/types.ts`** (modify) — add:
  ```ts
  export interface WishlistEntry {
    id: string;
    countryCode: string;
    rating: number; // 1-5
    note: string;
    createdAt: string;
  }
  ```

- **`src/lib/storage/wishlist.ts`** (new) — mirrors the existing `pins.ts` storage module pattern exactly:
  ```ts
  import type { WishlistEntry } from '$lib/types';

  const WISHLIST_KEY = 'trailune:wishlist';

  function readAll(): WishlistEntry[] {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? (JSON.parse(raw) as WishlistEntry[]) : [];
  }

  function writeAll(items: WishlistEntry[]): void {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
  }

  export function listWishlist(): WishlistEntry[] {
    return readAll();
  }

  export function saveWishlistEntry(entry: WishlistEntry): void {
    const items = readAll();
    const idx = items.findIndex((e) => e.id === entry.id);
    if (idx === -1) items.push(entry);
    else items[idx] = entry;
    writeAll(items);
  }

  export function deleteWishlistEntry(id: string): void {
    writeAll(readAll().filter((e) => e.id !== id));
  }
  ```
  One entry per country is an app-level convention (enforced by the page's lookup-by-`countryCode` logic before creating a new entry), not a type-level constraint.

- **`src/app.css`** (modify) — adds one new CSS custom property, `--color-wishlist`, to the base `@theme` block and to each of the four theme-preset blocks (`travel-journal`, `explorer-night`, `golden-sunset`, `polar-morning`), following the exact pattern already used for `--color-trip-1` through `--color-trip-5`. A distinct hue from both `--color-accent` (terracotta) and `--color-teal` (visited-country color on the main map), and from the `--color-trip-*` palette (unrelated calendar feature).

- **`src/lib/components/DreamMap.svelte`** (new) — a dedicated, smaller sibling to `WorldMap.svelte`, not a mode/variant of it (keeps `WorldMap.svelte` from absorbing an unrelated concern). Props:
  ```ts
  let {
    visitedCodes,
    wishlistCodes,
    oncountryclick
  }: {
    visitedCodes: Set<string>;
    wishlistCodes: Set<string>;
    oncountryclick?: (code: string) => void;
  } = $props();
  ```
  Reuses `padBBox`/`ViewBox` from `$lib/mapZoom` (already extracted and shared) for click-to-zoom, and the same fetch-`/world-map.svg`-and-inject-into-a-container `onMount` pattern as `WorldMap.svelte`, but omits everything specific to the main map: no hover listeners/popover wiring, no reveal-peel animation, no flight-route rendering, no `newlyVisitedCodes`. Each path gets exactly one of three classes: `.visited` (muted, non-interactive — no click listener attached), `.wishlisted` (fill: `var(--color-wishlist)`, clickable), or the default/unstyled state (muted like `.visited` but clickable — clicking calls `oncountryclick(code)` and zooms in, same as the main map's click-to-zoom). `.visited` paths get no click listener at all (not just a style difference), so they are non-interactive as specified.

- **`src/routes/dream-map/+page.svelte`** (new) — loads trips (for `visitedCodes`, reusing the same trips-storage + `loadWorldCountries()` pattern already used on `/map` and `/`), loads `listWishlist()` for entries, computes `wishlistCodes` as the set of entry country codes *excluding any code already in `visitedCodes`* (this is the "auto-remove" filtering — applied at render time, not by deleting data). Renders `<DreamMap {visitedCodes} {wishlistCodes} oncountryclick={openPanel} />`, the wishlist list below it (sorted by `rating` descending, each row showing the country's display name via `loadWorldCountries()`'s existing code-to-name lookup, its stars, and its note), and a panel (shown when a country is selected) with:
  - A 1-5 star picker (five clickable star buttons, matching this project's rating-input convention already used for journal entry ratings).
  - A note `<textarea>`.
  - Save button: looks up any existing entry for that country by `countryCode`, and calls `saveWishlistEntry` with either the existing entry's `id` (update) or a freshly generated `id` (create).
  - Delete button (shown only when editing an existing entry): calls `deleteWishlistEntry(entry.id)`.
  - Clicking a visited country never opens this panel, since `DreamMap.svelte` attaches no click listener to `.visited` paths.

- **`src/routes/+layout.svelte`** (modify) — nav array gains `{ href: '/dream-map', label: 'Dream Map' }`, inserted immediately after the existing Map entry.

## Data flow & interaction notes

- `visitedCodes` is derived from trips exactly the same way the main `/map` page already computes it — no new derivation logic, just reused on this new page.
- `wishlistCodes` passed to `DreamMap.svelte` is always pre-filtered to exclude visited codes; `DreamMap.svelte` itself has no knowledge of trips or visit-derivation, it only renders the two sets it's given.
- The wishlist list below the map reads from the same filtered set as the map (never shows a visited country's stale entry), keeping the two views consistent without duplicating the filtering logic in two places — the page computes the filtered list once and passes derived data to both the map and the list.
- Clicking a country and clicking its corresponding list row both funnel into the same "open panel for this code" handler, so Save/Delete behavior is identical regardless of entry point.

## Edge cases

- **Country becomes visited while it has a wishlist entry**: the entry is not deleted from storage — it simply stops appearing (filtered out of both the map's `wishlistCodes` and the list) the next time trips/wishlist data is loaded. If the user later deletes that trip (making the country unvisited again), the original rating/note reappears automatically with no extra logic needed, since filtering is purely derived at render time.
- **Country with no wishlist entry, no rating set yet**: clicking it opens the panel with no stars selected and an empty note; Save is only meaningful once at least one star is picked (a 0-star save is not stored — the Save button is disabled until a rating of 1-5 is selected, avoiding a meaningless zero-star wishlist entry).
- **Clicking an already-visited country**: no-op — no click listener exists on `.visited` paths in `DreamMap.svelte`, so no panel opens.
- **Empty wishlist**: the list section shows an empty-state message ("No dream destinations yet — click a country on the map to add one.") instead of an empty list.
- **Two different themes' `--color-wishlist` values**: each theme preset defines its own value (following the `--color-trip-*` precedent), so the wishlist color stays visually consistent with each theme's palette rather than clashing.

## Testing

- **`storage/wishlist.ts`**: Vitest unit tests — `listWishlist` returns an empty array with nothing stored, `saveWishlistEntry` inserts a new entry and updates an existing one (matched by `id`), `deleteWishlistEntry` removes only the targeted entry and leaves others intact.
- **`DreamMap.svelte` and the `/dream-map` page**: manual browser verification (this project's established convention for map/CRUD UI) — visited countries render muted and are non-clickable, non-visited countries are clickable and open the add panel, an existing wishlist entry's country renders in the distinct wishlist color and clicking it opens the panel pre-filled with Edit/Delete available, saving/deleting updates both the map color and the list immediately, the list is sorted by rating descending, and marking a wishlisted country's trip as visited (adding a real trip there) removes it from both the map and the list without deleting the underlying data (verified by then deleting that trip and confirming the entry reappears with its original rating/note).
