# Living Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing `/map` page into the "Living Map" — a country-reveal animation for newly-visited countries, a hover/tap stats popover, and an animated progress bar — all derived from existing trip data with no schema changes.

**Architecture:** Two new pure/storage modules (`countryStats.ts`, `mapViewState.ts`) supply data; `WorldMap.svelte` gains reveal-animation and hover/tap-position props; a new `CountryPopover.svelte` renders the stats card; `map/+page.svelte` orchestrates last-seen diffing, the animated counter/progress bar, and popover state alongside the existing click-panel state.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, `svelte/motion` (`tweened`, already part of the `svelte` package — no new dependency), Vitest + jsdom for unit tests.

## Global Constraints

- No new npm dependencies — `tweened` comes from `svelte/motion`, already available via the existing `svelte` dependency.
- No changes to `Trip`, `JournalEntry`, or any other existing type in `src/lib/types.ts`.
- All new localStorage access follows the existing repo pattern (`src/lib/storage/tips.ts`): a single `readAll`/`writeAll`-style pair keyed by one `trailune:` prefixed key, no external state library.
- Reveal animation and popover both respect `prefers-reduced-motion: reduce` — scale/pulse must be suppressed, matching the existing `WorldMap.svelte` reduced-motion media query block (lines 64-72 as of this plan).
- The existing full side panel (`selectedCode` state and its markup in `src/routes/map/+page.svelte`) is not modified in substance — only reused as the target of the popover's "View trips →" affordance and the touch double-tap.
- Desktop click behavior is unchanged: clicking a country path opens the full side panel directly, regardless of hover/popover state.

---

### Task 1: `countryStats.ts` — per-country derived stats

**Files:**
- Create: `src/lib/countryStats.ts`
- Test: `src/lib/countryStats.test.ts`

**Interfaces:**
- Consumes: `Trip` type from `src/lib/types.ts` (fields: `id`, `startDate`, `endDate`, `countries: string[]`).
- Produces:
  ```ts
  export interface CountryStats {
    visitCount: number;
    totalDays: number;
    lastVisitDate: string;
  }
  export function getCountryStats(code: string, trips: Trip[]): CountryStats | null
  ```
  Later tasks (popover component, map page) import `getCountryStats` and the `CountryStats` type from this exact path.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/countryStats.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getCountryStats } from './countryStats';
import type { Trip } from '$lib/types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    countries: ['FR'],
    transportMode: 'flight',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('getCountryStats', () => {
  it('returns null for a country with no trips', () => {
    const trips = [makeTrip({ countries: ['FR'] })];
    expect(getCountryStats('DE', trips)).toBeNull();
  });

  it('counts a single trip: visitCount 1, inclusive day count, lastVisitDate = endDate', () => {
    const trips = [makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 1,
      totalDays: 5,
      lastVisitDate: '2026-01-05'
    });
  });

  it('sums days and counts visits across multiple trips to the same country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' }),
      makeTrip({ id: 't2', countries: ['FR', 'DE'], startDate: '2026-03-01', endDate: '2026-03-03' })
    ];
    expect(getCountryStats('FR', trips)).toEqual({
      visitCount: 2,
      totalDays: 8,
      lastVisitDate: '2026-03-03'
    });
  });

  it('picks the maximum endDate as lastVisitDate regardless of trip order', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'], startDate: '2026-03-01', endDate: '2026-03-03' }),
      makeTrip({ id: 't2', countries: ['FR'], startDate: '2026-01-01', endDate: '2026-01-05' })
    ];
    expect(getCountryStats('FR', trips)?.lastVisitDate).toBe('2026-03-03');
  });

  it('ignores trips that do not include the requested country', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['FR'] }),
      makeTrip({ id: 't2', countries: ['DE'] })
    ];
    expect(getCountryStats('FR', trips)?.visitCount).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/countryStats.test.ts`
Expected: FAIL — `Cannot find module './countryStats'` (file doesn't exist yet).

- [ ] **Step 3: Implement `countryStats.ts`**

Create `src/lib/countryStats.ts`:

```ts
import type { Trip } from '$lib/types';

export interface CountryStats {
  visitCount: number;
  totalDays: number;
  lastVisitDate: string;
}

function daysInTrip(trip: Trip): number {
  const start = new Date(trip.startDate).getTime();
  const end = new Date(trip.endDate).getTime();
  return Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
}

export function getCountryStats(code: string, trips: Trip[]): CountryStats | null {
  const matching = trips.filter((trip) => trip.countries.includes(code));
  if (matching.length === 0) return null;

  const totalDays = matching.reduce((sum, trip) => sum + daysInTrip(trip), 0);
  const lastVisitDate = matching.reduce(
    (latest, trip) => (trip.endDate > latest ? trip.endDate : latest),
    matching[0].endDate
  );

  return { visitCount: matching.length, totalDays, lastVisitDate };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/countryStats.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/countryStats.ts src/lib/countryStats.test.ts
git commit -m "feat: add getCountryStats for per-country visit/day/last-visit derivation"
```

---

### Task 2: `mapViewState.ts` — last-seen visited countries storage

**Files:**
- Create: `src/lib/storage/mapViewState.ts`
- Test: `src/lib/storage/mapViewState.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  ```ts
  export function getLastSeenVisitedCodes(): Set<string>
  export function setLastSeenVisitedCodes(codes: Set<string>): void
  ```
  The map page (Task 5) imports both functions from this exact path.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/storage/mapViewState.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from './mapViewState';

beforeEach(() => {
  localStorage.clear();
});

describe('mapViewState', () => {
  it('returns an empty set when nothing has been stored yet', () => {
    expect(getLastSeenVisitedCodes()).toEqual(new Set());
  });

  it('round-trips a set of codes through storage', () => {
    setLastSeenVisitedCodes(new Set(['FR', 'DE']));
    expect(getLastSeenVisitedCodes()).toEqual(new Set(['FR', 'DE']));
  });

  it('overwrites the previously stored set rather than merging', () => {
    setLastSeenVisitedCodes(new Set(['FR']));
    setLastSeenVisitedCodes(new Set(['DE']));
    expect(getLastSeenVisitedCodes()).toEqual(new Set(['DE']));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/mapViewState.test.ts`
Expected: FAIL — `Cannot find module './mapViewState'`.

- [ ] **Step 3: Implement `mapViewState.ts`**

Create `src/lib/storage/mapViewState.ts`:

```ts
const LAST_SEEN_KEY = 'trailune:map-last-seen';

export function getLastSeenVisitedCodes(): Set<string> {
  const raw = localStorage.getItem(LAST_SEEN_KEY);
  if (!raw) return new Set();
  return new Set(JSON.parse(raw) as string[]);
}

export function setLastSeenVisitedCodes(codes: Set<string>): void {
  localStorage.setItem(LAST_SEEN_KEY, JSON.stringify(Array.from(codes)));
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/mapViewState.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage/mapViewState.ts src/lib/storage/mapViewState.test.ts
git commit -m "feat: add mapViewState repo for last-seen visited countries"
```

---

### Task 3: `CountryPopover.svelte` — stats popover component

**Files:**
- Create: `src/lib/components/CountryPopover.svelte`

**Interfaces:**
- Consumes: `CountryStats` type from `src/lib/countryStats.ts` (Task 1).
- Produces: a component with this prop contract, imported by `WorldMap.svelte` (Task 4) and `map/+page.svelte` (Task 5):
  ```ts
  let {
    countryName,
    stats,
    x,
    y,
    onviewtrips
  }: {
    countryName: string;
    stats: CountryStats;
    x: number;
    y: number;
    onviewtrips?: () => void;
  } = $props();
  ```
  `x`/`y` are viewport pixel coordinates (from a `PointerEvent`'s `clientX`/`clientY`) used to position the popover via inline `style`. `onviewtrips` fires when the user activates the "View trips →" affordance.

This component has no unit tests — it's a presentational component styled with the project's existing CSS variables, verified manually per the project's established convention (see Task 6's manual verification and the spec's Testing section).

- [ ] **Step 1: Implement the component**

Create `src/lib/components/CountryPopover.svelte`:

```svelte
<script lang="ts">
  import type { CountryStats } from '$lib/countryStats';

  let {
    countryName,
    stats,
    x,
    y,
    onviewtrips
  }: {
    countryName: string;
    stats: CountryStats;
    x: number;
    y: number;
    onviewtrips?: () => void;
  } = $props();

  function formatLastVisit(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }
</script>

<div
  class="country-popover"
  style={`left: ${x}px; top: ${y}px;`}
  role="status"
>
  <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">Visited</p>
  <h3 class="mt-0.5 font-display text-base font-bold">{countryName}</h3>
  <p class="mt-1 text-sm text-[var(--color-ink-soft)]">
    {stats.visitCount}
    {stats.visitCount === 1 ? 'trip' : 'trips'} &middot; {stats.totalDays}
    {stats.totalDays === 1 ? 'day' : 'days'} &middot; Last visit {formatLastVisit(stats.lastVisitDate)}
  </p>
  {#if onviewtrips}
    <button
      type="button"
      class="mt-2 text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
      onclick={onviewtrips}
    >
      View trips &rarr;
    </button>
  {/if}
</div>

<style>
  .country-popover {
    position: fixed;
    z-index: 30;
    max-width: 16rem;
    transform: translate(-50%, calc(-100% - 0.75rem));
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-card-border);
    background: var(--color-card);
    padding: 0.75rem 1rem;
    box-shadow: var(--shadow-pop);
    pointer-events: auto;
  }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/CountryPopover.svelte
git commit -m "feat: add CountryPopover component for country stats display"
```

---

### Task 4: `WorldMap.svelte` — reveal animation and hover/tap reporting

**Files:**
- Modify: `src/lib/components/WorldMap.svelte`

**Interfaces:**
- Consumes: nothing new from earlier tasks (this task only changes `WorldMap.svelte`'s own prop contract).
- Produces (new prop/callback contract consumed by `map/+page.svelte` in Task 5):
  ```ts
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
  ```
  `oncountryhover` fires with `(code, { x, y })` on `pointerenter`/`pointerdown` over a country path (using `event.clientX`/`clientY`), and with `(null, null)` on `pointerleave` (desktop) — this single callback covers both hover (desktop) and tap (touch), since `pointerdown` fires on both pointer types.

- [ ] **Step 1: Update the script block**

Replace the `<script>` block in `src/lib/components/WorldMap.svelte`:

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

  function applyRevealClass(path: Element, code: string) {
    if (!newlyVisitedCodes.has(code)) return;
    path.classList.add('revealing');
    setTimeout(() => path.classList.remove('revealing'), 600);
  }

  onMount(async () => {
    const res = await fetch('/world-map.svg');
    const svgText = await res.text();
    if (!svgContainer) return;
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.addEventListener('click', () => oncountryclick?.(code));
      path.addEventListener('pointerenter', (e) => {
        oncountryhover?.(code, { x: (e as PointerEvent).clientX, y: (e as PointerEvent).clientY });
      });
      path.addEventListener('pointerleave', () => oncountryhover?.(null, null));
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });

  $effect(() => {
    if (!svgContainer) return;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });
</script>
```

- [ ] **Step 2: Add reveal animation styles**

In the same file's `<style>` block, add after the existing `.world-map :global(path.visited:hover)` rule:

```css
  .world-map :global(path.revealing) {
    animation: reveal-pulse 0.6s var(--ease-out-quart);
  }

  @keyframes reveal-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent);
    }
    50% {
      transform: scale(1.08);
      filter: drop-shadow(0 0 10px color-mix(in oklch, var(--color-accent) 70%, transparent));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 6px color-mix(in oklch, var(--color-accent) 55%, transparent));
    }
  }
```

And extend the existing reduced-motion block to suppress it:

```css
  @media (prefers-reduced-motion: reduce) {
    .world-map :global(path) {
      transition: fill 0.2s ease;
    }
    .world-map :global(path:hover),
    .world-map :global(path.visited:hover) {
      transform: none;
    }
    .world-map :global(path.revealing) {
      animation: none;
    }
  }
```

- [ ] **Step 3: Manually verify no regressions**

Run: `npm run test`
Expected: existing test suite still passes (this component has no dedicated test file today — confirm via `npx vitest run` that no other test imports break due to the prop signature change; grep for existing usages).

Run: `grep -rn "WorldMap" src/routes` to confirm the only consumer is `src/routes/map/+page.svelte`, which Task 5 updates next — this file alone using the old 2-prop signature is expected until Task 5 lands.

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/WorldMap.svelte
git commit -m "feat: add reveal animation and hover/tap position reporting to WorldMap"
```

---

### Task 5: Wire it into `/map` — last-seen diffing, animated counter, popover, panel

**Files:**
- Modify: `src/routes/map/+page.svelte`

**Interfaces:**
- Consumes:
  - `getCountryStats` from `src/lib/countryStats.ts` (Task 1)
  - `getLastSeenVisitedCodes`, `setLastSeenVisitedCodes` from `src/lib/storage/mapViewState.ts` (Task 2)
  - `CountryPopover` component from `src/lib/components/CountryPopover.svelte` (Task 3), with its `{ countryName, stats, x, y, onviewtrips }` prop contract
  - `WorldMap` component's updated prop contract from Task 4 (`newlyVisitedCodes`, `oncountryhover`)
- Produces: nothing consumed by later tasks (this is the last task in the plan).

- [ ] **Step 1: Replace the script block**

Replace the `<script>` block in `src/routes/map/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import CountryPopover from '$lib/components/CountryPopover.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { getCountryStats, type CountryStats } from '$lib/countryStats';
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let selectedCode: string | null = $state(null);
  let newlyVisitedCodes: Set<string> = $state(new Set());

  let hoveredCode: string | null = $state(null);
  let hoveredStats: CountryStats | null = $state(null);
  let hoverPosition: { x: number; y: number } | null = $state(null);

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let tripsForSelected = $derived(
    selectedCode ? trips.filter((t) => t.countries.includes(selectedCode as string)) : []
  );
  let selectedName = $derived(
    selectedCode ? (countries.find((c) => c.code === selectedCode)?.name ?? selectedCode) : ''
  );
  let hoveredName = $derived(
    hoveredCode ? (countries.find((c) => c.code === hoveredCode)?.name ?? hoveredCode) : ''
  );

  const visitedCount = tweened(0, { duration: 600, easing: cubicOut });
  let percentVisited = $derived(
    countries.length > 0 ? Math.round(($visitedCount / countries.length) * 100) : 0
  );

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();

    const currentVisited = new Set(trips.flatMap((t) => t.countries));
    const lastSeen = getLastSeenVisitedCodes();
    const diff = new Set([...currentVisited].filter((code) => !lastSeen.has(code)));

    setLastSeenVisitedCodes(currentVisited);

    if (diff.size > 0) {
      newlyVisitedCodes = diff;
      visitedCount.set(currentVisited.size - diff.size, { duration: 0 });
      visitedCount.set(currentVisited.size);
    } else {
      visitedCount.set(currentVisited.size, { duration: 0 });
    }
  });

  function handleClick(code: string) {
    selectedCode = code;
  }

  function handleHover(code: string | null, position: { x: number; y: number } | null) {
    if (!code || !position) {
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    const stats = getCountryStats(code, trips);
    if (!stats) {
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    if (hoveredCode === code) {
      // Second activation on the same country (touch double-tap) opens the full panel.
      selectedCode = code;
      hoveredCode = null;
      hoveredStats = null;
      hoverPosition = null;
      return;
    }
    hoveredCode = code;
    hoveredStats = stats;
    hoverPosition = position;
  }

  function handleViewTrips() {
    if (!hoveredCode) return;
    selectedCode = hoveredCode;
    hoveredCode = null;
    hoveredStats = null;
    hoverPosition = null;
  }
</script>
```

- [ ] **Step 2: Replace the progress badge markup**

Replace the counter badge `<div>` in the template (the one currently showing `{visitedCodes.size} / {countries.length} countries`):

```svelte
  <div class="flex flex-col gap-1.5 rounded-[var(--radius-lg)] bg-[var(--color-card)] px-5 py-3 shadow-[var(--shadow-card)]">
    <div class="flex items-baseline gap-2">
      <span class="font-display text-3xl font-bold text-[var(--color-accent)]">{Math.round($visitedCount)}</span>
      <span class="text-sm text-[var(--color-ink-soft)]">/ {countries.length} countries &middot; {percentVisited}%</span>
    </div>
    <div class="h-1.5 w-40 overflow-hidden rounded-full bg-[var(--color-ink-band-soft)]">
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
        style={`width: ${percentVisited}%;`}
      ></div>
    </div>
  </div>
```

- [ ] **Step 3: Wire the new `WorldMap` props and add the popover**

Update the `<WorldMap>` element and add the popover right after it:

```svelte
  <WorldMap {visitedCodes} {newlyVisitedCodes} oncountryclick={handleClick} oncountryhover={handleHover} />

  {#if hoveredCode && hoveredStats && hoverPosition}
    <CountryPopover
      countryName={hoveredName}
      stats={hoveredStats}
      x={hoverPosition.x}
      y={hoverPosition.y}
      onviewtrips={handleViewTrips}
    />
  {/if}
```

Leave the existing `{#if selectedCode}` full-panel block below this unchanged.

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open `/map` with at least one trip already created. Confirm the progress bar renders at the correct percentage and no reveal animation plays (nothing "new" since this is a repeat visit after Task complete).
2. Create a trip with a country not yet visited. Navigate to `/map`. Confirm: the new country's path pulses once, the counter/progress bar animate from the old to new count, and reloading the page again does not replay the animation.
3. On desktop, hover a visited country: confirm the popover shows trip count / days / last visit near the cursor, and moving off hides it. Click the same country: confirm the existing full side panel still opens directly (unaffected by hover).
4. Resize to a mobile viewport (or use browser touch emulation). Tap a visited country: confirm the popover appears. Tap the same country again: confirm the full side panel opens (or tap "View trips →" in the popover to the same effect).
5. Enable "reduce motion" (OS-level or via browser devtools rendering emulation) and repeat step 2: confirm the counter/bar still update but no pulse/scale animation plays.

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all tests pass, including the new `countryStats.test.ts` and `mapViewState.test.ts` suites from Tasks 1–2.

- [ ] **Step 6: Commit**

```bash
git add src/routes/map/+page.svelte
git commit -m "feat: wire Living Map reveal animation, stats popover, and progress bar into /map"
```

---

## Self-Review Notes

- **Spec coverage:** reveal animation (Tasks 4–5), stats popover (Tasks 1, 3, 5), animated progress bar (Task 5), click-panel reuse via popover's "View trips" and touch double-tap (Task 5), reduced-motion handling (Tasks 4–5), Vitest coverage for `countryStats`/`mapViewState` (Tasks 1–2) — all spec sections have a task.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `CountryStats` defined in Task 1 is used identically in Tasks 3 and 5; `WorldMap`'s `oncountryhover` signature defined in Task 4 matches its only call site in Task 5; `mapViewState`'s two functions are used with matching names/signatures in Task 5.
