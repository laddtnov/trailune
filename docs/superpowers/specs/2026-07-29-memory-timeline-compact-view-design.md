# Memory Timeline — Compact Year-List View — Design Spec

Date: 2026-07-29

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas": *"Memory timeline (extends the existing 'Journey timeline' idea in §3, made concrete)."*

Investigation before design: the `/timeline` page (shipped in §3) already implements almost the entire bullet — a year-grouped vertical timeline with flags, country names, season badges, and day counts, in a responsive alternating-rail layout (`src/routes/timeline/+page.svelte`, `src/lib/journeyTimeline.ts`). The only piece of the §7 bullet not yet built is its second half: *"a longer-term view collapsing to just the year list (2019–2026) when zoomed out."* This spec scopes that missing piece only.

## Goals

- `/timeline` gains a toggle (e.g. "Compact view" / "Full view") that switches between the existing full timeline and a new condensed year-list view.
- The compact view shows one row per year: the year, flags of that year's unique countries, and a count (e.g. `2025 · 🇹🇷🇯🇵 2 countries`).
- Clicking a year row in compact view switches back to full view and scrolls that year's section into view.
- Pure re-presentation of existing trip data — no new data model, no changes to trip storage.

## Non-goals

- No changes to the existing full-view timeline's layout, styling, or data (`journeyTimeline.ts`'s `groupTripsByYear`, `getSeasonLabel`, `countryCodeToFlag` are reused unmodified).
- No auto-collapse behavior based on year count — the toggle is always manual, regardless of how many years of history exist (per user decision).
- No persistence of the toggle's state across page visits — it always starts in full view on page load.
- No new trip-level data (e.g. no per-year notes or highlights) — the compact view is derived entirely from `trips` grouped by `groupTripsByYear`.

## Architecture

- **`src/lib/journeyTimeline.ts`** (modify) — add one small export:
  ```ts
  export function uniqueCountriesInYear(group: TimelineYearGroup): string[] {
    return [...new Set(group.trips.flatMap((trip) => trip.countries))];
  }
  ```
  This mirrors the existing per-trip-then-dedup convention already used elsewhere in the codebase (e.g. `countryStats.ts`, `visitIntensity.ts`) for counting unique countries across multiple trips.

- **`src/routes/timeline/+page.svelte`** (modify):
  - Add `let view: 'full' | 'compact' = $state('full');` and a toggle button in the page header, next to the `<h1>`/subtitle block:
    ```svelte
    <button
      class="mt-2 rounded-[var(--radius-md)] border border-[var(--color-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
      onclick={() => (view = view === 'full' ? 'compact' : 'full')}
    >
      {view === 'full' ? 'Compact view' : 'Full view'}
    </button>
    ```
  - Add `id="year-{group.year}"` to each year's existing `<h2>` heading in the full-view branch, so compact view can scroll to it.
  - Add a new compact-view branch (only reachable when `trips.length > 0`, alongside the existing loading/empty/full branches):
    ```svelte
    {:else if view === 'compact'}
      <div class="mt-8 space-y-2">
        {#each yearGroups as group (group.year)}
          <button
            class="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-card)] p-4 text-left shadow-[var(--shadow-card)] transition hover:bg-[var(--color-card-hover)]"
            onclick={() => jumpToYear(group.year)}
          >
            <span class="font-display text-lg font-bold">{group.year}</span>
            <span class="text-sm text-[var(--color-ink-soft)]">
              {uniqueCountriesInYear(group).map(countryCodeToFlag).join('')}
              {uniqueCountriesInYear(group).length} {uniqueCountriesInYear(group).length === 1 ? 'country' : 'countries'}
            </span>
          </button>
        {/each}
      </div>
    {/if}
    ```
  - Add the jump handler:
    ```ts
    function jumpToYear(year: number) {
      view = 'full';
      requestAnimationFrame(() => {
        document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    ```
    The `requestAnimationFrame` wait is necessary because the full-view DOM (and the target `id="year-{year}"` element) doesn't exist until after `view` flips and Svelte re-renders.
  - The toggle button itself is only rendered once `trips.length > 0` (i.e., inside the same branch structure as the existing loading/empty checks), so it never appears during loading or on the zero-trips empty state.

## Data flow & interaction notes

- `yearGroups` (already `$derived(groupTripsByYear(trips))`) is the single source for both full and compact views — no separate data fetch or computation path.
- `uniqueCountriesInYear(group)` is called directly in the template per row; with realistic trip-history sizes (a handful of years, a handful of trips each) this is cheap enough to not need memoizing as a separate `$derived`.
- Toggle state is local, ephemeral `$state` — resets to `'full'` on navigation away and back, consistent with the "no persistence" non-goal.

## Edge cases

- **Zero trips**: toggle button and both view branches are unreachable; the existing empty-state message is unaffected.
- **Single year of history**: toggle still renders (for consistency across all history lengths, per user decision) — compact view just shows one row.
- **A year with multiple trips to the same country** (e.g. two separate trips to Japan in the same year): `uniqueCountriesInYear` dedupes via `Set`, so the country's flag and count appear once, not twice — matching the existing dedup convention used by `countryStats.ts` and `visitIntensity.ts`.

## Testing

- **New unit test** for `uniqueCountriesInYear` in `src/lib/journeyTimeline.test.ts`: verify it dedupes a repeated country across two trips in the same year group, and returns an empty array for a year group with no trips (defensive — not expected to occur in practice, but cheap to cover).
- No new tests for the full/compact toggle itself or the scroll-jump behavior — this is view-only interaction on already-tested data, consistent with this project's established convention of manual browser verification for this class of read-only stats/timeline UI.
- Manual browser verification: confirm the toggle switches views correctly, the compact view's flag/count line matches the countries actually in that year's trips, and clicking a compact row lands back in full view scrolled to the correct year's heading.
