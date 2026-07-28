# Visit-Intensity Heatmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/map`, a country visited more than once renders in an increasingly saturated color (3 tiers: 1 visit / 2-4 visits / 5+ visits) instead of today's flat "visited" color.

**Architecture:** A new pure-logic module (`visitIntensity.ts`) computes per-country visit counts and maps a count to one of three tiers. `WorldMap.svelte` gains an optional `visitCounts` prop and toggles a matching `intensity-N` class alongside its existing `.visited` class; two new CSS rules override the fill for tiers 1 and 2 (tier 3 already matches the existing `.visited` look). The `/map` page supplies `visitCounts`; the trip hub's Map tab is untouched and keeps its current flat styling.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- Exactly 3 tiers, no continuous scale: 1 visit = tier 1, 2-4 visits = tier 2, 5+ visits = tier 3 (spec: Goals, Non-goals).
- Tier 3 must render identically to today's existing `.visited` styling — no new CSS rule needed for it (spec: Goals, Architecture).
- The trip hub's own Map tab (`src/routes/trips/[id]/+page.svelte`) must not be modified — it never supplies `visitCounts`, so it keeps its current flat styling by falling back to the prop's default (spec: Non-goals, Data flow).
- No new data model — `visitCounts` is derived entirely from existing `Trip.countries` at render time (spec: Non-goals).

---

### Task 1: `visitIntensity.ts` pure functions

**Files:**
- Create: `src/lib/visitIntensity.ts`
- Create: `src/lib/visitIntensity.test.ts`

**Interfaces:**
- Consumes: `Trip` type from `$lib/types` (existing).
- Produces: `export function computeVisitCounts(trips: Trip[]): Map<string, number>` and `export function getIntensityTier(count: number): 1 | 2 | 3 | null` — consumed by Task 2's `WorldMap.svelte` and Task 3's `/map` page.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/visitIntensity.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeVisitCounts, getIntensityTier } from './visitIntensity';
import type { Trip } from '$lib/types';

function makeTrip(overrides: Partial<Trip>): Trip {
  return {
    id: 't1',
    name: 'Trip',
    startDate: '2026-01-01',
    endDate: '2026-01-05',
    countries: [],
    transportMode: 'flight',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  };
}

describe('computeVisitCounts', () => {
  it('returns an empty map for no trips', () => {
    expect(computeVisitCounts([])).toEqual(new Map());
  });

  it('counts a country once per trip that includes it', () => {
    const trips = [
      makeTrip({ id: 't1', countries: ['JP'] }),
      makeTrip({ id: 't2', countries: ['JP', 'FR'] }),
      makeTrip({ id: 't3', countries: ['JP'] })
    ];
    const counts = computeVisitCounts(trips);
    expect(counts.get('JP')).toBe(3);
    expect(counts.get('FR')).toBe(1);
  });

  it('does not include a country with zero trips', () => {
    const trips = [makeTrip({ id: 't1', countries: ['JP'] })];
    expect(computeVisitCounts(trips).has('DE')).toBe(false);
  });
});

describe('getIntensityTier', () => {
  it('returns null for 0', () => {
    expect(getIntensityTier(0)).toBeNull();
  });

  it('returns tier 1 for exactly 1', () => {
    expect(getIntensityTier(1)).toBe(1);
  });

  it('returns tier 2 for 2 and for 4', () => {
    expect(getIntensityTier(2)).toBe(2);
    expect(getIntensityTier(4)).toBe(2);
  });

  it('returns tier 3 for 5 and for a much higher number', () => {
    expect(getIntensityTier(5)).toBe(3);
    expect(getIntensityTier(50)).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/visitIntensity.test.ts`
Expected: FAIL with "Failed to resolve import './visitIntensity'" (module doesn't exist yet)

- [ ] **Step 3: Write the implementation**

Create `src/lib/visitIntensity.ts`:

```ts
import type { Trip } from '$lib/types';

export function computeVisitCounts(trips: Trip[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const trip of trips) {
    for (const code of trip.countries) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }
  }
  return counts;
}

export function getIntensityTier(count: number): 1 | 2 | 3 | null {
  if (count <= 0) return null;
  if (count === 1) return 1;
  if (count <= 4) return 2;
  return 3;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/visitIntensity.test.ts`
Expected: PASS (9/9 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/visitIntensity.ts src/lib/visitIntensity.test.ts
git commit -m "feat: add visit-count and intensity-tier pure functions"
```

---

### Task 2: `WorldMap.svelte` — intensity classes

**Files:**
- Modify: `src/lib/components/WorldMap.svelte`

**Interfaces:**
- Consumes: `getIntensityTier` from `$lib/visitIntensity` (Task 1).
- Produces: `WorldMap.svelte` gains prop `visitCounts?: Map<string, number>` — consumed by Task 3's `/map` page. The trip hub's Map tab does not need to pass it.

- [ ] **Step 1: Import the tier function and add the new prop**

In `src/lib/components/WorldMap.svelte`, replace:

```ts
  import { SCRATCH_CLIP_KEYFRAMES } from '$lib/scratchReveal';

  let {
    visitedCodes,
    newlyVisitedCodes = new Set(),
    routeCodes = [],
    oncountryclick,
    oncountryhover
  }: {
    visitedCodes: Set<string>;
    newlyVisitedCodes?: Set<string>;
    routeCodes?: string[];
    oncountryclick?: (code: string) => void;
    oncountryhover?: (code: string | null, position: { x: number; y: number } | null) => void;
  } = $props();
```

with:

```ts
  import { SCRATCH_CLIP_KEYFRAMES } from '$lib/scratchReveal';
  import { getIntensityTier } from '$lib/visitIntensity';

  let {
    visitedCodes,
    newlyVisitedCodes = new Set(),
    routeCodes = [],
    visitCounts = new Map(),
    oncountryclick,
    oncountryhover
  }: {
    visitedCodes: Set<string>;
    newlyVisitedCodes?: Set<string>;
    routeCodes?: string[];
    visitCounts?: Map<string, number>;
    oncountryclick?: (code: string) => void;
    oncountryhover?: (code: string | null, position: { x: number; y: number } | null) => void;
  } = $props();
```

- [ ] **Step 2: Add a helper that applies the correct intensity class**

Add this new function above `onMount` (after `applyRevealClass`/`spawnScratchOverlay`, before the `svgNS` constant):

```ts
  function applyIntensityClass(path: Element, code: string) {
    const tier = getIntensityTier(visitCounts.get(code) ?? 0);
    path.classList.toggle('intensity-1', tier === 1);
    path.classList.toggle('intensity-2', tier === 2);
    path.classList.toggle('intensity-3', tier === 3);
  }
```

- [ ] **Step 3: Call the helper alongside every existing `.visited` toggle**

In `onMount`, replace:

```ts
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });

  $effect(() => {
    if (!svgContainer) return;
    revealIndex = 0;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });
```

with:

```ts
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyIntensityClass(path, code);
      applyRevealClass(path, code);
    });
  });

  $effect(() => {
    if (!svgContainer) return;
    revealIndex = 0;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyIntensityClass(path, code);
      applyRevealClass(path, code);
    });
  });
```

- [ ] **Step 4: Add the two new CSS rules**

Replace:

```css
  .world-map :global(path.visited) {
    fill: var(--color-accent);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--color-accent) 55%, transparent));
  }
  .world-map :global(path.visited:hover) {
    fill: var(--color-accent-hover);
    transform: scale(1.02);
  }
```

with:

```css
  .world-map :global(path.visited) {
    fill: var(--color-accent);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--color-accent) 55%, transparent));
  }
  .world-map :global(path.visited.intensity-1) {
    fill: color-mix(in oklch, var(--color-accent) 45%, var(--color-ink-band-soft));
    filter: drop-shadow(0 0 4px color-mix(in oklch, var(--color-accent) 30%, transparent));
  }
  .world-map :global(path.visited.intensity-2) {
    fill: color-mix(in oklch, var(--color-accent) 70%, var(--color-ink-band-soft));
    filter: drop-shadow(0 0 5px color-mix(in oklch, var(--color-accent) 45%, transparent));
  }
  .world-map :global(path.visited:hover) {
    fill: var(--color-accent-hover);
    transform: scale(1.02);
  }
```

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; `WorldMap.svelte` is manually verified in Task 3, once it's wired into a real page with real visit-count data)

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/WorldMap.svelte
git commit -m "feat: add visit-intensity tier classes to WorldMap"
```

---

### Task 3: Wire `visitCounts` into `/map`

**Files:**
- Modify: `src/routes/map/+page.svelte`

**Interfaces:**
- Consumes: `computeVisitCounts` from `$lib/visitIntensity` (Task 1); `WorldMap`'s `visitCounts` prop (Task 2).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Import the function and derive visit counts**

In `src/routes/map/+page.svelte`, replace:

```ts
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import { computeGlobalRouteCodes } from '$lib/flightRoute';
  import type { Trip } from '$lib/types';
```

with:

```ts
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import { computeGlobalRouteCodes } from '$lib/flightRoute';
  import { computeVisitCounts } from '$lib/visitIntensity';
  import type { Trip } from '$lib/types';
```

Then replace:

```ts
  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let globalRouteCodes = $derived(computeGlobalRouteCodes(trips));
```

with:

```ts
  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let globalRouteCodes = $derived(computeGlobalRouteCodes(trips));
  let visitCounts = $derived(computeVisitCounts(trips));
```

- [ ] **Step 2: Pass `visitCounts` to `WorldMap`**

Replace:

```svelte
  <WorldMap
    {visitedCodes}
    {newlyVisitedCodes}
    routeCodes={globalRouteCodes}
    oncountryclick={handleClick}
    oncountryhover={handleHover}
  />
```

with:

```svelte
  <WorldMap
    {visitedCodes}
    {newlyVisitedCodes}
    routeCodes={globalRouteCodes}
    {visitCounts}
    oncountryclick={handleClick}
    oncountryhover={handleHover}
  />
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; the `/map` page is manually verified per this project's established convention)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, seed `localStorage['trailune:trips']` with trips so that at least one country has exactly 1 visit, one has 2-4 visits, and one has 5+ visits, then go to `/map` and confirm:
- The 1-visit country renders visibly lighter than the 5+-visit country.
- The 2-4-visit country renders visibly between the two.
- A country with zero visits is unaffected (unvisited coating unchanged).
- The trip hub's own Map tab (`/trips/<id>`, Map tab) renders its countries with the same flat color as before this change — unaffected.
- The scratch-coating reveal and the global travel-path arcs (both already shipped) still work correctly alongside this change.

- [ ] **Step 5: Commit**

```bash
git add src/routes/map/+page.svelte
git commit -m "feat: wire visit-intensity heatmap into the main map"
```
