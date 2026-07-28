# Rank-System Personality on /stats — Design Spec

Date: 2026-07-28

## Overview

This is the next item picked up from `docs/ROADMAP.md` §7 "Polishing Ideas." The shipped 7-tier rank system (`getLevelProgress`/`LEVELS` in `src/lib/levels.ts`) currently only appears on the home hero. This surfaces the same tier framing on `/stats`, so the leveling personality feels consistent beyond the home page rather than home-page-only.

## Goals

- `/stats` gains a new banner, above the existing stats grid, showing the user's current tier: emoji + tier name as a heading, the tier's subtitle line, and "N countries until {next tier's name}" — reusing the exact same copy pattern already shipped on the home hero.
- When the user has reached the top tier (Trailblazer, no next level), the banner shows an appropriate "reached the top" line instead of an "until" line with nothing to count toward.
- The banner participates in the page's existing loading skeleton the same way the other stat cards already do — it only renders once `stats` has loaded.

## Non-goals

- No level-up celebration/reveal animation on `/stats` — that moment ("🎉 Level Up!") is tied to the instant a new country is added via the home page's trip-creation flow, and doesn't make sense as a static page's re-triggerable UI. `/stats` only shows current status.
- No changes to `src/lib/levels.ts` — `getLevelProgress` and `LEVELS` are reused exactly as they exist today, with no new fields or logic.
- No changes to `/map` or any other page this cycle — scoped to `/stats` only, per the roadmap's own example; other pages can get this treatment in a later pass if desired.
- No new data model — the banner is derived entirely from `stats.totalCountries`, which `/stats` already computes.

## Architecture

- **`src/routes/stats/+page.svelte`** (modify) — imports `getLevelProgress` from `$lib/levels` alongside the existing imports, and adds:
  ```ts
  let levelProgress = $derived(stats ? getLevelProgress(stats.totalCountries) : null);
  ```
  Renders a new banner in the `{:else if stats}` branch, between the existing page header (`<h1>Your stats</h1>` / subtitle) and the stats grid `<div>`:
  ```svelte
  {#if levelProgress}
    <div class="mt-6 rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <h2 class="font-display text-xl font-bold">
        {levelProgress.level.emoji} {levelProgress.level.name}
      </h2>
      <p class="mt-1 text-sm text-[var(--color-ink-soft)]">{levelProgress.level.subtitle}</p>
      {#if levelProgress.nextLevel}
        <p class="mt-2 text-sm text-[var(--color-ink-soft)]">
          {levelProgress.countriesToNext} countr{levelProgress.countriesToNext === 1 ? 'y' : 'ies'} until {levelProgress.nextLevel.name}
        </p>
      {:else}
        <p class="mt-2 text-sm text-[var(--color-ink-soft)]">
          You've reached the top tier — there's nowhere further to go.
        </p>
      {/if}
    </div>
  {/if}
  ```
  This exactly mirrors the home hero's existing copy pattern (`{countriesToNext} countr{y/ies} until {nextLevel.name}`) for consistency, and its singular/plural handling.

## Data flow & interaction notes

- `stats.totalCountries` is already computed on this page via `computeTripStats(trips, countries)` in the existing `onMount`; `levelProgress` is purely derived from that same value, no new data reads.
- No interaction — this is a static, read-only display. No click, no dismiss, no persisted "seen" state (unlike the home hero's level-up celebration, which does track a "last seen level" for its one-time reveal — that mechanism is untouched and irrelevant here).

## Edge cases

- **Max tier (Trailblazer, 175+ countries)**: `levelProgress.nextLevel` is `null`, so the banner shows the "reached the top tier" line instead of an "until" line referencing a non-existent next level.
- **Zero trips / stats not yet loaded**: the banner simply doesn't render (guarded by `{#if levelProgress}`, which is `null` until `stats` exists) — consistent with how the rest of the stats grid already handles the loading and empty states.
- **Exactly 1 country remaining to next tier**: singular "country" is used, matching the existing pluralization pattern already proven correct on the home hero.

## Testing

- No new pure-logic tests — this reuses `getLevelProgress`/`LEVELS`, which already have their own test coverage in `src/lib/levels.test.ts`.
- Manual browser verification (this project's established convention for this kind of read-only stats UI): confirm the banner shows the correct emoji/tier/subtitle for a few different country counts spanning multiple tiers, the "N countries until {next}" line is correct and pluralizes properly at the boundary (1 vs. 2+), and the max-tier case renders the "reached the top" message with no broken reference to a next tier.
