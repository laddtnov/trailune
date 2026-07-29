# Memory Timeline Compact View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/timeline` gains a manual toggle between the existing full vertical timeline and a new compact year-list view (year + unique-country flags/count per year), with click-to-jump from compact back to full view.

**Architecture:** A small pure-logic addition (`uniqueCountriesInYear` in `journeyTimeline.ts`) plus UI wiring in `+page.svelte` — a `view` state toggle, a new compact-view template branch, and a scroll-to-year jump handler. No new data model; both views read the same `yearGroups` derived value already on the page.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No changes to `groupTripsByYear`, `getSeasonLabel`, or `countryCodeToFlag` — reused exactly as they exist today (spec: Architecture, Non-goals).
- Toggle is always manual (no auto-collapse by year count) and never persists across navigation — resets to `'full'` on load (spec: Non-goals).
- Toggle button only renders when `trips.length > 0` — hidden during loading and on the zero-trips empty state (spec: Architecture, Edge cases).
- Compact view's per-year country count/flags must dedupe countries within that year (a repeated country across two trips in the same year counts once), matching the existing dedup convention in `countryStats.ts`/`visitIntensity.ts` (spec: Edge cases).

---

### Task 1: `uniqueCountriesInYear` helper

**Files:**
- Modify: `src/lib/journeyTimeline.ts`
- Test: `src/lib/journeyTimeline.test.ts`

**Interfaces:**
- Consumes: existing `TimelineYearGroup` interface (`{ year: number; trips: Trip[] }`), existing `Trip.countries: string[]`.
- Produces: `export function uniqueCountriesInYear(group: TimelineYearGroup): string[]` — later used by Task 2's template as `uniqueCountriesInYear(group).map(countryCodeToFlag).join('')` and `.length`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/journeyTimeline.test.ts`, after the existing `countryCodeToFlag` describe block:

```ts
describe('uniqueCountriesInYear', () => {
  it('dedupes a country visited on two separate trips in the same year', () => {
    const group = {
      year: 2025,
      trips: [
        makeTrip({ id: '1', startDate: '2025-01-01', countries: ['JP'] }),
        makeTrip({ id: '2', startDate: '2025-06-01', countries: ['JP', 'FR'] })
      ]
    };
    expect(uniqueCountriesInYear(group)).toEqual(['JP', 'FR']);
  });

  it('returns an empty array for a year group with no trips', () => {
    expect(uniqueCountriesInYear({ year: 2025, trips: [] })).toEqual([]);
  });
});
```

Update the import line at the top of the file to include the new function:

```ts
import { getSeasonLabel, groupTripsByYear, countryCodeToFlag, uniqueCountriesInYear } from './journeyTimeline';
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/journeyTimeline.test.ts`
Expected: FAIL — `uniqueCountriesInYear` is not exported from `./journeyTimeline`

- [ ] **Step 3: Implement the helper**

In `src/lib/journeyTimeline.ts`, add after the existing `groupTripsByYear` function:

```ts
export function uniqueCountriesInYear(group: TimelineYearGroup): string[] {
  return [...new Set(group.trips.flatMap((trip) => trip.countries))];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/journeyTimeline.test.ts`
Expected: PASS — all tests in the file green, including the two new ones

- [ ] **Step 5: Commit**

```bash
git add src/lib/journeyTimeline.ts src/lib/journeyTimeline.test.ts
git commit -m "feat: add uniqueCountriesInYear helper for memory timeline compact view"
```

---

### Task 2: Compact view toggle on `/timeline`

**Files:**
- Modify: `src/routes/stats/../timeline/+page.svelte` (i.e. `src/routes/timeline/+page.svelte`)

**Interfaces:**
- Consumes: `uniqueCountriesInYear` and `countryCodeToFlag` from `$lib/journeyTimeline` (Task 1), existing `yearGroups` derived value, existing `trips: Trip[]` state.
- Produces: nothing consumed by later tasks — this is the only remaining task.

- [ ] **Step 1: Import the new helper**

In `src/routes/timeline/+page.svelte`, replace:

```ts
  import { groupTripsByYear, getSeasonLabel, countryCodeToFlag } from '$lib/journeyTimeline';
```

with:

```ts
  import { groupTripsByYear, getSeasonLabel, countryCodeToFlag, uniqueCountriesInYear } from '$lib/journeyTimeline';
```

- [ ] **Step 2: Add view state and jump handler**

Immediately after the existing:

```ts
  let loading = $state(true);
```

add:

```ts
  let view: 'full' | 'compact' = $state('full');
```

Immediately after the existing `formatDateRange` function (right before the closing `</script>` tag), add:

```ts
  function jumpToYear(year: number) {
    view = 'full';
    requestAnimationFrame(() => {
      document.getElementById(`year-${year}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }
```

- [ ] **Step 3: Add the toggle button to the page header**

Replace:

```svelte
<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Journey timeline</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Every trip you've logged, year by year.</p>
</div>
```

with:

```svelte
<div class="flex flex-wrap items-start justify-between gap-3">
  <div>
    <h1 class="font-display text-3xl font-bold sm:text-4xl">Journey timeline</h1>
    <p class="mt-1 text-[var(--color-ink-soft)]">Every trip you've logged, year by year.</p>
  </div>
  {#if !loading && trips.length > 0}
    <button
      class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] px-3 py-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition hover:text-[var(--color-ink)]"
      onclick={() => (view = view === 'full' ? 'compact' : 'full')}
    >
      {view === 'full' ? 'Compact view' : 'Full view'}
    </button>
  {/if}
</div>
```

- [ ] **Step 4: Add an anchor id to each year heading in full view**

Replace:

```svelte
      <h2 class="mt-10 text-left font-display text-2xl font-bold first:mt-0 sm:text-center">{group.year}</h2>
```

with:

```svelte
      <h2 id="year-{group.year}" class="mt-10 text-left font-display text-2xl font-bold first:mt-0 sm:text-center">{group.year}</h2>
```

- [ ] **Step 5: Gate the full-view branch on `view === 'full'` and add the compact-view branch**

Replace:

```svelte
{:else}
  <div class="mt-8">
    {#each yearGroups as group (group.year)}
```

with:

```svelte
{:else if view === 'full'}
  <div class="mt-8">
    {#each yearGroups as group (group.year)}
```

Then, replace the closing of that block:

```svelte
      </div>
    {/each}
  </div>
{/if}
```

with:

```svelte
      </div>
    {/each}
  </div>
{:else}
  <div class="mt-8 space-y-2">
    {#each yearGroups as group (group.year)}
      <button
        class="flex w-full items-center justify-between rounded-[var(--radius-lg)] bg-[var(--color-card)] p-4 text-left shadow-[var(--shadow-card)] transition hover:bg-[var(--color-card-hover)]"
        onclick={() => jumpToYear(group.year)}
      >
        <span class="font-display text-lg font-bold">{group.year}</span>
        <span class="text-sm text-[var(--color-ink-soft)]">
          {uniqueCountriesInYear(group).map(countryCodeToFlag).join('')}
          {uniqueCountriesInYear(group).length}
          {uniqueCountriesInYear(group).length === 1 ? 'country' : 'countries'}
        </span>
      </button>
    {/each}
  </div>
{/if}
```

The full `{#if loading} ... {:else if trips.length === 0} ... {:else if view === 'full'} ... {:else} ... {/if}` chain now covers: loading skeleton, empty state, full timeline, compact list — in that order, matching the existing branch structure with the new compact branch appended last.

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task only adds template/state changes over already-tested data; the page is manually verified per this project's established convention)

- [ ] **Step 7: Run svelte-check**

Run: `npm run check`
Expected: same error count as the `main` baseline (no new errors introduced) — if the count increases, inspect the reported location before proceeding, since this codebase has previously hit `$derived`/type-narrowing regressions caught only by this check.

- [ ] **Step 8: Manually verify in the browser**

Start the dev server, seed `localStorage['trailune:trips']` with trips spanning at least 2 years (one year having two trips to the same country), and confirm on `/timeline`:
- The toggle button reads "Compact view" initially and only appears once trips have loaded.
- Clicking it switches to the compact list: each year shows its flags and a correctly-deduped country count (a country visited twice in the same year still shows once).
- Clicking a year row in compact view switches back to full view and smoothly scrolls to that year's heading.
- With zero trips, the toggle button and both view branches are absent; only the existing empty-state message shows.

- [ ] **Step 9: Commit**

```bash
git add src/routes/timeline/+page.svelte
git commit -m "feat: add compact year-list view toggle to memory timeline"
```
