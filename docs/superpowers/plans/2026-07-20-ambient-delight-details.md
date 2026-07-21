# Ambient Delight Details Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add six small, independent visual/interaction touches — skeleton loaders, a passport-stamp trip-creation animation, a soft paper texture, gentle page transitions, animated `/stats` counters, and zoom-to-country on map click — to make the app feel more finished, with no new data or backend.

**Architecture:** A new generic `Skeleton.svelte` component reused across three pages; small, self-contained additions to `TripCard.svelte`, `app.css`, `+layout.svelte`, `stats/+page.svelte`, and `WorldMap.svelte`; one new pure module (`mapZoom.ts`) for the one piece of genuinely testable logic (bounding-box padding math).

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, `svelte/motion`/`svelte/transition`/`svelte/easing` (already part of the `svelte` package), Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- No dynamic theme presets and no persistent ambient background motion in this cycle — both deferred to their own future cycles per the spec's non-goals.
- Every new animation must skip straight to its final/steady state when `prefers-reduced-motion: reduce` is set — either via the existing global CSS override in `app.css` (which already zeroes all `animation-duration`/`transition-duration` on `*`), or, for JS-driven tweens (`tweened` stores), via an explicit `window.matchMedia('(prefers-reduced-motion: reduce)').matches` check before animating, matching the pattern already established in `src/routes/+page.svelte`'s rank-system level-up animation.
- Skeleton loaders must never render alongside real content or the real empty state — exactly one of "loading skeleton" / "real content" is visible at a time.
- The passport-stamp animation is single-shot per creation (no localStorage tracking needed) — it fires once, synchronously, right after the user's own create-trip action, unlike the Living Map/Achievements reveal patterns which diff against a persisted "last seen" state across page loads.
- Map zoom-to-country must reset when the user clicks/taps outside both the clicked country and the existing country popover (`.country-popover`), reusing the same two-exclusion check already used by the existing tap-outside-to-dismiss logic in `map/+page.svelte`.

---

### Task 1: `Skeleton.svelte` and loading states on Trips, Stats, and Map

**Files:**
- Create: `src/lib/components/Skeleton.svelte`
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/stats/+page.svelte`
- Modify: `src/lib/components/WorldMap.svelte`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by no other task in this plan — this is a self-contained UI addition, though `Skeleton.svelte`'s prop shape is documented here for reference by anyone extending it later):
  ```ts
  // Skeleton.svelte props
  { width?: string; height?: string; radius?: string }
  ```

- [ ] **Step 1: Create `Skeleton.svelte`**

Create `src/lib/components/Skeleton.svelte`:

```svelte
<script lang="ts">
  let {
    width = '100%',
    height = '1rem',
    radius = 'var(--radius-md)'
  }: { width?: string; height?: string; radius?: string } = $props();
</script>

<div class="skeleton" style={`width: ${width}; height: ${height}; border-radius: ${radius};`}></div>

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-card) 25%,
      var(--color-card-border) 50%,
      var(--color-card) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-sweep 1.4s ease-in-out infinite;
  }

  @keyframes skeleton-sweep {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
      background: var(--color-card-border);
    }
  }
</style>
```

- [ ] **Step 2: Add a loading skeleton to the Trips list page**

In `src/routes/+page.svelte`, add the import and state. Find:

```ts
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
```

Change to:

```ts
  import type { Trip, TransportMode } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
```

Find the `trips`/`countries` state declarations:

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
```

Change to:

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let loading = $state(true);
```

Find the `onMount` block:

```ts
  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();

    if (trips.length === 0) return;
```

Change to:

```ts
  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    loading = false;

    if (trips.length === 0) return;
```

Now find the three top-level template blocks that render below the hero — the stats strip, the transport-mode tabs, and the trip grid/empty-state block:

```svelte
{#if trips.length > 0 && countries.length > 0}
  <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Visited</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">World explored</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.percentWorld}%</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Trips</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
      <p class="text-xs text-[var(--color-ink-soft)]">Travel days</p>
      <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
    </div>
  </div>
{/if}

{#if trips.length > 0}
  <div class="mt-6 flex flex-wrap gap-1.5">
    {#each tabs as tab (tab.value)}
      <button
        type="button"
        aria-pressed={activeTab === tab.value}
        onclick={() => (activeTab = tab.value)}
        class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {activeTab ===
        tab.value
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
          : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
{/if}

{#if trips.length === 0}
```

Wrap all three of these blocks (through to the trip-grid block's closing `{/if}`, i.e. everything from `{#if trips.length > 0 && countries.length > 0}` down to the `{/if}` that closes the `{#if trips.length === 0}...{:else if filteredTrips.length === 0}...{:else}...{/if}` chain) in a `{#if loading}...{:else}...{/if}`:

```svelte
{#if loading}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
    {#each { length: 3 } as _, i (i)}
      <div class="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)]">
        <Skeleton height="7rem" radius="0px" />
        <div class="space-y-2 p-5">
          <Skeleton height="1.25rem" width="70%" />
          <Skeleton height="0.875rem" width="50%" />
        </div>
      </div>
    {/each}
  </div>
{:else}
  {#if trips.length > 0 && countries.length > 0}
    <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
        <p class="text-xs text-[var(--color-ink-soft)]">Visited</p>
        <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
        <p class="text-xs text-[var(--color-ink-soft)]">World explored</p>
        <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.percentWorld}%</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
        <p class="text-xs text-[var(--color-ink-soft)]">Trips</p>
        <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] px-4 py-3 shadow-[var(--shadow-card)]">
        <p class="text-xs text-[var(--color-ink-soft)]">Travel days</p>
        <p class="font-display text-xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
      </div>
    </div>
  {/if}

  {#if trips.length > 0}
    <div class="mt-6 flex flex-wrap gap-1.5">
      {#each tabs as tab (tab.value)}
        <button
          type="button"
          aria-pressed={activeTab === tab.value}
          onclick={() => (activeTab = tab.value)}
          class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {activeTab ===
          tab.value
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
            : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
        >
          {tab.label}
        </button>
      {/each}
    </div>
  {/if}

  {#if trips.length === 0}
    <div
      class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
    >
      <div
        class="grid size-20 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
      >
        <svg viewBox="0 0 24 24" class="size-10" fill="none" stroke="currentColor" stroke-width="1.75">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
          />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      </div>
      <h2 class="mt-6 font-display text-2xl font-bold">No trips yet</h2>
      <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
        Log where you're going, what you packed, and what you saw. Your map starts filling in the
        moment you add your first trip.
      </p>
      <button
        type="button"
        onclick={openForm}
        class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
      >
        Start your first trip
      </button>
    </div>
  {:else if filteredTrips.length === 0}
    <div
      class="mt-10 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center text-[var(--color-ink-soft)]"
    >
      No trips match this filter yet.
    </div>
  {:else}
    <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
      {#each filteredTrips as trip (trip.id)}
        <TripCard {trip} />
      {/each}
    </div>
  {/if}
{/if}
```

- [ ] **Step 3: Add a loading skeleton to the Stats page**

In `src/routes/stats/+page.svelte`, add the import. Find:

```ts
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
```

Change to:

```ts
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
  import Skeleton from '$lib/components/Skeleton.svelte';
```

Find the `trips`/`countries`/`stats` state:

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let stats: TripStats | null = $state(null);
```

Change to:

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let stats: TripStats | null = $state(null);
  let loading = $state(true);
```

Find the end of `onMount`:

```ts
    newlyUnlockedIds = new Set([...currentUnlockedIds].filter((id) => !lastSeen.has(id)));
    setLastSeenUnlockedIds(currentUnlockedIds);
  });
```

Change to:

```ts
    newlyUnlockedIds = new Set([...currentUnlockedIds].filter((id) => !lastSeen.has(id)));
    setLastSeenUnlockedIds(currentUnlockedIds);
    loading = false;
  });
```

Now find the two top-level template blocks (the stats grid/empty-state, and the Achievements section):

```svelte
{#if stats && stats.totalTrips === 0}
```

...through the closing `{/if}` of the `{#if achievements.length > 0}` block. Wrap both in `{#if loading}...{:else}...{/if}`:

```svelte
{#if loading}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
    {#each { length: 7 } as _, i (i)}
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <Skeleton height="0.875rem" width="60%" />
        <div class="mt-2">
          <Skeleton height="1.75rem" width="40%" />
        </div>
      </div>
    {/each}
  </div>
{:else}
  {#if stats && stats.totalTrips === 0}
    <div
      class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
    >
      <h2 class="font-display text-2xl font-bold">No stats yet</h2>
      <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
        Log your first trip and your stats will start filling in automatically.
      </p>
      <a
        href="/"
        class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
      >
        Log a trip
      </a>
    </div>
  {:else if stats}
    <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Countries visited</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.percentWorld}% of the world</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Continents visited</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalContinents}</p>
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">of 7</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Trips logged</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Flights taken</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalFlights}</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Total days travelled</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Longest trip</p>
        {#if stats.longestTrip}
          <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">{stats.longestTrip.name}</p>
          <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.longestTrip.days} days</p>
        {/if}
      </div>
      <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p class="text-sm text-[var(--color-ink-soft)]">Average trip length</p>
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.averageTripDays} days</p>
      </div>
    </div>
  {/if}

  {#if achievements.length > 0}
    <div class="mt-10">
      <h2 class="font-display text-2xl font-bold">Achievements</h2>
      <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
        {#each achievements as achievement (achievement.id)}
          <div
            class="rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)] {achievement.unlocked
              ? 'bg-[var(--color-card)]'
              : 'bg-[var(--color-card)]/60'} {newlyUnlockedIds.has(achievement.id) ? 'achievement-revealing' : ''}"
          >
            <div class="flex items-center gap-2">
              <span class="sr-only">{achievement.unlocked ? 'Unlocked: ' : 'Locked: '}</span>
              {#if achievement.unlocked}
                <svg aria-hidden="true" viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-accent)]" fill="none" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              {:else}
                <svg aria-hidden="true" viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-ink-soft)]" fill="none" stroke="currentColor" stroke-width="1.6">
                  <rect x="5" y="11" width="14" height="9" rx="2" />
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                </svg>
              {/if}
              <p
                class="font-display text-lg font-bold {achievement.unlocked
                  ? 'text-[var(--color-ink)]'
                  : 'text-[var(--color-ink-soft)]'}"
              >
                {achievement.name}
              </p>
            </div>
            <p class="mt-1.5 text-sm text-[var(--color-ink-soft)]">{achievement.description}</p>
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/if}
```

- [ ] **Step 4: Add a loading skeleton to the Map page (inside `WorldMap.svelte`)**

In `src/lib/components/WorldMap.svelte`, add the import and state. Find:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';

  let {
    visitedCodes,
    newlyVisitedCodes = new Set(),
    oncountryclick,
    oncountryhover
  }: {
    visitedCodes: Set<string>;
    newlyVisitedCodes?: Set<string>;
    oncountryclick?: (code: string) => void;
    oncountryhover?: (code: string | null, position: { x: number; y: number } | null) => void;
  } = $props();

  let svgContainer: HTMLDivElement | undefined = $state();
  let lastPointerType = 'mouse';
```

Change to:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import Skeleton from './Skeleton.svelte';

  let {
    visitedCodes,
    newlyVisitedCodes = new Set(),
    oncountryclick,
    oncountryhover
  }: {
    visitedCodes: Set<string>;
    newlyVisitedCodes?: Set<string>;
    oncountryclick?: (code: string) => void;
    oncountryhover?: (code: string | null, position: { x: number; y: number } | null) => void;
  } = $props();

  let svgContainer: HTMLDivElement | undefined = $state();
  let lastPointerType = 'mouse';
  let loaded = $state(false);
```

Find the end of the `onMount` function's setup (right after the reveal-index reset, before the `forEach`):

```ts
    svg?.setAttribute('class', 'world-map-svg');
    revealIndex = 0;
```

Change to:

```ts
    svg?.setAttribute('class', 'world-map-svg');
    loaded = true;
    revealIndex = 0;
```

Find the template:

```svelte
<div class="world-map" bind:this={svgContainer}></div>
```

Change to:

```svelte
{#if !loaded}
  <div style="aspect-ratio: 2000 / 900;">
    <Skeleton width="100%" height="100%" radius="var(--radius-xl)" />
  </div>
{/if}
<div class="world-map" bind:this={svgContainer} class:hidden={!loaded}></div>
```

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open the Trips page (with existing trip data from prior manual testing, or seed a couple of trips via localStorage). Use the browser devtools network throttling (or a brief artificial delay if needed to observe reliably) to confirm 3 skeleton card placeholders render before the real trip cards/stats strip/tabs appear, and that skeletons never appear at the same time as the real "No trips yet" empty state.
2. Open `/stats` and confirm 7 skeleton cards render before the real metric grid and Achievements section appear.
3. Open `/map` and confirm a skeleton rectangle (matching the map's aspect ratio) renders before the world map SVG appears.
4. Toggle `prefers-reduced-motion` and confirm the skeleton shimmer stops animating (static color instead) on all three pages.

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass (this task adds no new test file — `Skeleton.svelte` is presentational with no logic to test, matching this project's convention for components like `CountryPopover.svelte`).

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/Skeleton.svelte src/routes/+page.svelte src/routes/stats/+page.svelte src/lib/components/WorldMap.svelte
git commit -m "feat: add skeleton loading states to Trips, Stats, and Map pages"
```

---

### Task 2: Passport-stamp animation on trip creation

**Files:**
- Modify: `src/lib/components/TripCard.svelte`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the `stamping` prop and animation to `TripCard.svelte`**

Find the props declaration:

```ts
  let { trip }: { trip: Trip } = $props();
```

Change to:

```ts
  let { trip, stamping = false }: { trip: Trip; stamping?: boolean } = $props();
```

Find the outer `<a>` element's class attribute:

```svelte
<a
  href={`/trips/${trip.id}`}
  class="group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
>
```

Change to:

```svelte
<a
  href={`/trips/${trip.id}`}
  class="group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)] {stamping ? 'stamping' : ''}"
>
```

Find the `<style>` block's closing `@media (prefers-reduced-motion: reduce)` section:

```css
  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .mode-icon.plane,
    :global(.group:hover) .mode-icon.train,
    :global(.group:hover) .mode-icon.car,
    :global(.group:hover) .mode-icon.boat,
    :global(.group:hover) .mode-icon.bike {
      transform: none;
    }
  }
</style>
```

Change to:

```css
  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .mode-icon.plane,
    :global(.group:hover) .mode-icon.train,
    :global(.group:hover) .mode-icon.car,
    :global(.group:hover) .mode-icon.boat,
    :global(.group:hover) .mode-icon.bike {
      transform: none;
    }

    .stamping {
      animation: none;
    }
  }

  .stamping {
    animation: stamp-settle 0.4s var(--ease-out-quart);
  }

  @keyframes stamp-settle {
    0% {
      transform: scale(1.15) rotate(-6deg);
      opacity: 0.6;
    }
    100% {
      transform: scale(1) rotate(0deg);
      opacity: 1;
    }
  }
</style>
```

- [ ] **Step 2: Track the newly-created trip id and pass it down in `+page.svelte`**

Find the state declarations (after Task 1's changes, `loading` is already present):

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let loading = $state(true);
```

Change to:

```ts
  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let loading = $state(true);
  let justCreatedTripId: string | null = $state(null);
```

Find the `submit` function:

```ts
  function submit(event: SubmitEvent) {
    event.preventDefault();
    createTrip({ name, startDate, endDate, countries: Array.from(selectedCountries), transportMode });
    trips = listTrips();
    activeTab = 'all';
    resetForm();
    dialogEl?.close();
  }
```

Change to:

```ts
  function submit(event: SubmitEvent) {
    event.preventDefault();
    const newTrip = createTrip({
      name,
      startDate,
      endDate,
      countries: Array.from(selectedCountries),
      transportMode
    });
    trips = listTrips();
    activeTab = 'all';
    justCreatedTripId = newTrip.id;
    setTimeout(() => {
      justCreatedTripId = null;
    }, 400);
    resetForm();
    dialogEl?.close();
  }
```

Find the trip grid's `{#each}`:

```svelte
    <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
      {#each filteredTrips as trip (trip.id)}
        <TripCard {trip} />
      {/each}
    </div>
```

Change to:

```svelte
    <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
      {#each filteredTrips as trip (trip.id)}
        <TripCard {trip} stamping={trip.id === justCreatedTripId} />
      {/each}
    </div>
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`.

1. Create a new trip via the New Trip form. Confirm the dialog closes and the newly-created trip's card animates in with a brief stamp-settle effect (scale/rotate snapping to rest), while other cards in the grid are unaffected.
2. Confirm the animation doesn't replay if you interact with the page afterward (e.g., switching transport-mode tabs) without creating another trip.
3. Toggle `prefers-reduced-motion` and create another trip; confirm the card appears without the stamp animation.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (this task adds no new test file — the change is a UI animation with no new pure logic).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/TripCard.svelte src/routes/+page.svelte
git commit -m "feat: add passport-stamp animation on trip creation"
```

---

### Task 3: Soft paper texture

**Files:**
- Modify: `src/app.css`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the paper texture to the body background**

In `src/app.css`, find:

```css
@layer base {
  body {
    background: var(--color-canvas);
    color: var(--color-ink);
    font-family: var(--font-sans);
    margin: 0;
  }
```

Change to:

```css
@layer base {
  body {
    background-color: var(--color-canvas);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='paper-noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper-noise)' opacity='0.035'/%3E%3C/svg%3E");
    background-repeat: repeat;
    color: var(--color-ink);
    font-family: var(--font-sans);
    margin: 0;
  }
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`. Load any page and confirm a very subtle grain/paper texture is visible against the canvas background — subtle enough to read as "paper," not distracting or visible as a harsh pattern.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (CSS-only change, no logic affected).

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat: add soft paper texture to app background"
```

---

### Task 4: Gentle page transitions

**Files:**
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Wrap the page content in a keyed, transitioning block**

Find the imports:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Change to:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Find the `<main>` element:

```svelte
<main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
  {@render children()}
</main>
```

Change to:

```svelte
<main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
  {#key page.url.pathname}
    <div in:fade={{ duration: 200, easing: cubicOut }} out:fade={{ duration: 150, easing: cubicOut }}>
      {@render children()}
    </div>
  {/key}
</main>
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`. Navigate between Trips, Map, Stats, and Packing via the nav links. Confirm a brief, gentle fade plays on each route change — not jarring, not slow. Toggle `prefers-reduced-motion` and confirm the transition no longer plays (page content swaps instantly), since the existing global reduced-motion CSS override in `app.css` zeroes all animation/transition durations app-wide, including Svelte's transition-injected styles.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: add gentle fade transition on page navigation"
```

---

### Task 5: Animated counters on `/stats`

**Files:**
- Modify: `src/routes/stats/+page.svelte`

**Interfaces:**
- Consumes: nothing from other tasks (this task's `+page.svelte` changes are additive to Task 1's changes to the same file, applied afterward).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add tweened stores and set them from computed stats**

Find the imports:

```ts
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
```

Change to:

```ts
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { listTrips } from '$lib/storage/storage';
```

Find the state declarations (after Task 1's changes):

```ts
  let stats: TripStats | null = $state(null);
  let loading = $state(true);
```

Change to:

```ts
  let stats: TripStats | null = $state(null);
  let loading = $state(true);

  const totalCountriesT = tweened(0, { duration: 600, easing: cubicOut });
  const percentWorldT = tweened(0, { duration: 600, easing: cubicOut });
  const totalContinentsT = tweened(0, { duration: 600, easing: cubicOut });
  const totalTripsT = tweened(0, { duration: 600, easing: cubicOut });
  const totalFlightsT = tweened(0, { duration: 600, easing: cubicOut });
  const totalDaysT = tweened(0, { duration: 600, easing: cubicOut });
  const longestTripDaysT = tweened(0, { duration: 600, easing: cubicOut });
  const averageTripDaysT = tweened(0, { duration: 600, easing: cubicOut });
```

Also add a small helper right after the tweened store declarations:

```ts
  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
```

Find the line in `onMount` where `stats` is computed:

```ts
    stats = computeTripStats(trips, countries);

    achievements = getAchievements(trips);
```

Change to:

```ts
    stats = computeTripStats(trips, countries);
    const tweenOpts = prefersReducedMotion() ? { duration: 0 } : undefined;
    totalCountriesT.set(stats.totalCountries, tweenOpts);
    percentWorldT.set(stats.percentWorld, tweenOpts);
    totalContinentsT.set(stats.totalContinents, tweenOpts);
    totalTripsT.set(stats.totalTrips, tweenOpts);
    totalFlightsT.set(stats.totalFlights, tweenOpts);
    totalDaysT.set(stats.totalDays, tweenOpts);
    if (stats.longestTrip) longestTripDaysT.set(stats.longestTrip.days, tweenOpts);
    averageTripDaysT.set(stats.averageTripDays, tweenOpts);

    achievements = getAchievements(trips);
```

- [ ] **Step 2: Replace the static numbers in the template with the tweened values**

Find each of these seven lines in the metric-card grid and replace as shown:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($totalCountriesT)}</p>
```

```svelte
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.percentWorld}% of the world</p>
```

becomes:

```svelte
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{Math.round($percentWorldT)}% of the world</p>
```

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalContinents}</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($totalContinentsT)}</p>
```

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($totalTripsT)}</p>
```

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalFlights}</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($totalFlightsT)}</p>
```

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($totalDaysT)}</p>
```

```svelte
          <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.longestTrip.days} days</p>
```

becomes:

```svelte
          <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{Math.round($longestTripDaysT)} days</p>
```

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.averageTripDays} days</p>
```

becomes:

```svelte
        <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{$averageTripDaysT.toFixed(1)} days</p>
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`. Seed trip data covering all 7 metrics (multi-country, multi-continent, a flight trip, varying day counts). Open `/stats` and confirm every number counts up from 0 to its final value on load, instead of appearing instantly. Toggle `prefers-reduced-motion`, reload, and confirm every number appears immediately at its final value with no count-up animation.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/routes/stats/+page.svelte
git commit -m "feat: animate /stats metric counters on load"
```

---

### Task 6: Zoom-to-country on map click

**Files:**
- Create: `src/lib/mapZoom.ts`
- Test: `src/lib/mapZoom.test.ts`
- Modify: `src/lib/components/WorldMap.svelte`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used within this task's own `WorldMap.svelte` changes):
  ```ts
  export type ViewBox = [number, number, number, number];
  export function padBBox(bbox: { x: number; y: number; width: number; height: number }, paddingRatio?: number): ViewBox
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/mapZoom.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { padBBox } from './mapZoom';

describe('padBBox', () => {
  it('pads a bounding box by the given ratio on all sides', () => {
    const result = padBBox({ x: 100, y: 50, width: 200, height: 100 }, 0.2);
    expect(result).toEqual([60, 30, 280, 140]);
  });

  it('defaults to a 0.2 padding ratio when none is given', () => {
    const result = padBBox({ x: 0, y: 0, width: 100, height: 100 });
    expect(result).toEqual([-20, -20, 140, 140]);
  });

  it('handles a zero-size bbox without producing NaN', () => {
    const result = padBBox({ x: 10, y: 10, width: 0, height: 0 });
    expect(result).toEqual([10, 10, 0, 0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/mapZoom.test.ts`
Expected: FAIL — `Cannot find module './mapZoom'`.

- [ ] **Step 3: Implement `mapZoom.ts`**

Create `src/lib/mapZoom.ts`:

```ts
export type ViewBox = [number, number, number, number];

export function padBBox(
  bbox: { x: number; y: number; width: number; height: number },
  paddingRatio = 0.2
): ViewBox {
  const padX = bbox.width * paddingRatio;
  const padY = bbox.height * paddingRatio;
  return [bbox.x - padX, bbox.y - padY, bbox.width + padX * 2, bbox.height + padY * 2];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/mapZoom.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mapZoom.ts src/lib/mapZoom.test.ts
git commit -m "feat: add padBBox for map zoom viewBox calculation"
```

- [ ] **Step 6: Wire zoom-to-country into `WorldMap.svelte`**

Find the imports and state (after Task 1's changes):

```ts
<script lang="ts">
  import { onMount } from 'svelte';
  import Skeleton from './Skeleton.svelte';
```

Change to:

```ts
<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Skeleton from './Skeleton.svelte';
  import { padBBox, type ViewBox } from '$lib/mapZoom';
```

Find the state declarations (after Task 1's changes):

```ts
  let svgContainer: HTMLDivElement | undefined = $state();
  let lastPointerType = 'mouse';
  let loaded = $state(false);
```

Change to:

```ts
  let svgContainer: HTMLDivElement | undefined = $state();
  let lastPointerType = 'mouse';
  let loaded = $state(false);
  let svgEl: SVGSVGElement | undefined;
  let originalViewBox: ViewBox = [0, 0, 2000, 900];

  const viewBoxTween = tweened<ViewBox>([0, 0, 2000, 900], { duration: 500, easing: cubicOut });

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
```

Find the part of `onMount` (after Task 1's changes) that sets the SVG class and marks `loaded`:

```ts
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    loaded = true;
    revealIndex = 0;
```

Change to:

```ts
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    if (svg) {
      svgEl = svg as unknown as SVGSVGElement;
      const vb = svg.getAttribute('viewBox');
      if (vb) {
        const parts = vb.split(/\s+/).map(Number) as ViewBox;
        originalViewBox = parts;
        viewBoxTween.set(parts, { duration: 0 });
      }
    }
    loaded = true;
    revealIndex = 0;
```

Find the `click` listener inside the `forEach`:

```ts
      path.addEventListener('click', () => {
        if (lastPointerType === 'touch' || lastPointerType === 'pen') return;
        oncountryclick?.(code);
      });
```

Change to:

```ts
      path.addEventListener('click', () => {
        if (lastPointerType === 'touch' || lastPointerType === 'pen') return;
        oncountryclick?.(code);
        const bbox = (path as unknown as SVGGraphicsElement).getBBox();
        viewBoxTween.set(padBBox(bbox), prefersReducedMotion() ? { duration: 0 } : undefined);
      });
```

Add a new `$effect` right after the existing one (which toggles `visited`/`revealing` classes), to write the tween value onto the SVG element, and a window listener to reset on outside click. Find:

```ts
  $effect(() => {
    if (!svgContainer) return;
    revealIndex = 0;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });
</script>
```

Change to:

```ts
  $effect(() => {
    if (!svgContainer) return;
    revealIndex = 0;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });

  $effect(() => {
    if (svgEl) {
      svgEl.setAttribute('viewBox', $viewBoxTween.join(' '));
    }
  });

  function handleOutsideClick(event: PointerEvent) {
    const target = event.target as Element;
    if (target.closest('path[id]') || target.closest('.country-popover')) return;
    viewBoxTween.set(originalViewBox, prefersReducedMotion() ? { duration: 0 } : undefined);
  }
</script>

<svelte:window onpointerdown={handleOutsideClick} />
```

- [ ] **Step 7: Manually verify in the browser**

Run: `npm run dev`. Open `/map` with existing trip data.

1. Click a country. Confirm the map smoothly zooms/pans to center on it, alongside the existing popover/side-panel opening as before.
2. Click on empty ocean/background (outside any country and outside the popover). Confirm the map smoothly zooms back out to the full world view.
3. Click the country popover's "View trips →" link or content itself; confirm this does NOT reset the zoom (matching the existing exclusion for `.country-popover` already used by the pop-over's own dismiss logic).
4. Toggle `prefers-reduced-motion`; click a country and confirm the zoom jumps directly to the final zoomed position with no animated tween, then click outside and confirm it jumps directly back to the full world view.
5. Confirm existing map behavior (hover, tap-to-open-popover, reveal-pulse for newly-visited countries) all still work unaffected.

- [ ] **Step 8: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `mapZoom.test.ts` from this task.

- [ ] **Step 9: Commit**

```bash
git add src/lib/components/WorldMap.svelte
git commit -m "feat: add zoom-to-country animation on map click"
```

---

## Self-Review Notes

- **Spec coverage:** skeleton loaders on Trips/Stats/Map (Task 1), passport-stamp animation (Task 2), soft paper texture (Task 3), gentle page transitions (Task 4), animated `/stats` counters (Task 5), zoom-to-country with outside-click reset (Task 6), reduced-motion handling for every animation, Vitest coverage for the one genuinely pure piece of logic (`padBBox` in Task 6) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `ViewBox` type defined in Task 6's `mapZoom.ts` is used identically in `WorldMap.svelte`'s `originalViewBox`/`viewBoxTween` declarations within the same task; `Skeleton.svelte`'s prop shape from Task 1 is used identically in its three usages (Trips, Stats, Map); `stamping` prop added to `TripCard.svelte` in Task 2 matches its call site in the same task's `+page.svelte` changes.
- **Cross-task file sequencing note:** Tasks 1, 2, and 5 each modify `src/routes/+page.svelte` and/or `src/routes/stats/+page.svelte` in sequence, and Tasks 1 and 6 both modify `src/lib/components/WorldMap.svelte` in sequence — each task's "Find X" steps reference the file's state as left by the immediately preceding task that touched it, not the original pre-plan state.
