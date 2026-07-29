# Rank-System Personality on /stats Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/stats` shows a tier banner (emoji, tier name, subtitle, progress to next tier) reusing the already-shipped rank system, matching the home hero's existing copy pattern.

**Architecture:** A single-task change — `/stats` imports the existing `getLevelProgress` from `$lib/levels`, derives a `levelProgress` value from the page's already-computed `stats.totalCountries`, and renders one new banner card between the page header and the stats grid.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript.

## Global Constraints

- No changes to `src/lib/levels.ts` — `getLevelProgress`/`LEVELS` are reused exactly as they exist today (spec: Non-goals).
- No level-up celebration/reveal animation on this page — static status display only (spec: Non-goals, Goals).
- Scoped to `/stats` only this cycle — no changes to `/map` or any other page (spec: Non-goals).
- The banner only renders once `stats` has loaded, participating in the page's existing loading/empty states the same way the rest of the stats grid does (spec: Goals, Edge cases).

---

### Task 1: Tier banner on `/stats`

**Files:**
- Modify: `src/routes/stats/+page.svelte`

**Interfaces:**
- Consumes: `getLevelProgress` from `$lib/levels` (existing, unmodified) and the page's own existing `stats: TripStats | null` state.
- Produces: nothing consumed by later tasks — this is the only task.

- [ ] **Step 1: Import `getLevelProgress` and derive `levelProgress`**

In `src/routes/stats/+page.svelte`, replace:

```ts
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
```

with:

```ts
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
  import { getLevelProgress } from '$lib/levels';
```

Then, immediately after the existing:

```ts
  let stats: TripStats | null = $state(null);
```

add:

```ts
  let levelProgress = $derived(stats ? getLevelProgress(stats.totalCountries) : null);
```

- [ ] **Step 2: Render the banner**

Replace:

```svelte
{:else if stats}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
```

with:

```svelte
{:else if stats}
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
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests, since it purely re-renders values from an already-tested `getLevelProgress`; the page is manually verified per this project's established convention)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, seed `localStorage['trailune:trips']` to produce a few different total country counts, and confirm on `/stats`:
- A count in the "Beginner" tier (0-2 countries) shows 🌱 Beginner, its subtitle, and "N countries until Traveler" (pluralized correctly).
- A count exactly 1 country away from the next tier shows the singular "1 country until {next}".
- A count of 175+ (Trailblazer, max tier) shows the "reached the top tier" message with no broken "until" reference.
- The banner appears above the stats grid, styled consistently with the other stat cards, and only renders once loading completes (no banner during the skeleton state, no banner in the zero-trips empty state).

- [ ] **Step 5: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat: show rank tier banner on /stats"
```
