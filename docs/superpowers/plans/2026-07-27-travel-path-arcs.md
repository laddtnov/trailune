# Travel Path Arcs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/map`, animated arcs connect every visited country in first-visit order across the user's entire trip history, reusing the existing per-trip flight-route rendering machinery unchanged.

**Architecture:** A new pure function, `computeGlobalRouteCodes`, sorts all trips by `startDate` and flattens them into a deduplicated (first-occurrence-only) country-code sequence. The `/map` page passes this sequence to `WorldMap.svelte`'s existing `routeCodes` prop — the same prop the trip hub's per-trip Map tab already uses, requiring zero changes to `WorldMap.svelte` itself.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- `WorldMap.svelte` must not be modified — this feature only supplies a different `routeCodes` value to an existing, unmodified prop (spec: Architecture, Non-goals).
- A country revisited on a later trip must not produce a new leg back to it — each country appears exactly once, at its first-visit position (spec: Goals, Edge cases).
- The full route re-animates on every `/map` page load — no "only animate new legs" logic (spec: Goals, Non-goals).
- `computeGlobalRouteCodes` must not mutate the `trips` array passed to it (spec: Testing).

---

### Task 1: `computeGlobalRouteCodes` pure function

**Files:**
- Modify: `src/lib/flightRoute.ts`
- Modify: `src/lib/flightRoute.test.ts`

**Interfaces:**
- Consumes: `Trip` type from `$lib/types` (existing).
- Produces: `export function computeGlobalRouteCodes(trips: Trip[]): string[]` — consumed by Task 2's `/map` page.

- [ ] **Step 1: Write the failing tests**

Add to the end of `src/lib/flightRoute.test.ts` (add `import type { Trip } from '$lib/types';` alongside the existing imports at the top of the file, and a `makeTrip` helper before the new `describe` block):

```ts
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

describe('computeGlobalRouteCodes', () => {
  it('orders countries by trip startDate regardless of input array order', () => {
    const trips = [
      makeTrip({ id: 't2', startDate: '2026-06-01', countries: ['DE'] }),
      makeTrip({ id: 't1', startDate: '2026-01-01', countries: ['JP'] })
    ];
    expect(computeGlobalRouteCodes(trips)).toEqual(['JP', 'DE']);
  });

  it('keeps a trip\'s own countries in that trip\'s stored order', () => {
    const trips = [makeTrip({ id: 't1', startDate: '2026-01-01', countries: ['FR', 'DE', 'IT'] })];
    expect(computeGlobalRouteCodes(trips)).toEqual(['FR', 'DE', 'IT']);
  });

  it('keeps only the first occurrence of a country revisited on a later trip', () => {
    const trips = [
      makeTrip({ id: 't1', startDate: '2026-01-01', countries: ['JP'] }),
      makeTrip({ id: 't2', startDate: '2026-06-01', countries: ['DE'] }),
      makeTrip({ id: 't3', startDate: '2026-09-01', countries: ['JP'] })
    ];
    expect(computeGlobalRouteCodes(trips)).toEqual(['JP', 'DE']);
  });

  it('returns a list shorter than 2 when the trip history covers only one country total', () => {
    const trips = [
      makeTrip({ id: 't1', startDate: '2026-01-01', countries: ['JP'] }),
      makeTrip({ id: 't2', startDate: '2026-06-01', countries: ['JP'] })
    ];
    expect(computeGlobalRouteCodes(trips).length).toBeLessThan(2);
  });

  it('does not mutate the input trips array', () => {
    const trips = [
      makeTrip({ id: 't2', startDate: '2026-06-01', countries: ['DE'] }),
      makeTrip({ id: 't1', startDate: '2026-01-01', countries: ['JP'] })
    ];
    const originalOrder = trips.map((t) => t.id);
    computeGlobalRouteCodes(trips);
    expect(trips.map((t) => t.id)).toEqual(originalOrder);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/flightRoute.test.ts`
Expected: FAIL with "computeGlobalRouteCodes is not defined" (or a TypeScript import error)

- [ ] **Step 3: Write the implementation**

Add to the top of `src/lib/flightRoute.ts` (alongside a new `Trip` import) and append the new function after `computeArcPath`:

```ts
import type { Trip } from '$lib/types';
```

```ts
export function computeGlobalRouteCodes(trips: Trip[]): string[] {
  const sorted = [...trips].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  const seen = new Set<string>();
  const codes: string[] = [];
  for (const trip of sorted) {
    for (const code of trip.countries) {
      if (seen.has(code)) continue;
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/flightRoute.test.ts`
Expected: PASS (10/10 tests — 5 existing `computeArcPath` tests plus the 5 new `computeGlobalRouteCodes` tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/flightRoute.ts src/lib/flightRoute.test.ts
git commit -m "feat: add computeGlobalRouteCodes for cross-trip travel path ordering"
```

---

### Task 2: Wire the global route into `/map`

**Files:**
- Modify: `src/routes/map/+page.svelte`

**Interfaces:**
- Consumes: `computeGlobalRouteCodes` from `$lib/flightRoute` (Task 1).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Import the function and derive the route**

In `src/routes/map/+page.svelte`, replace:

```ts
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import type { Trip } from '$lib/types';
```

with:

```ts
  import { getLastSeenVisitedCodes, setLastSeenVisitedCodes } from '$lib/storage/mapViewState';
  import { computeGlobalRouteCodes } from '$lib/flightRoute';
  import type { Trip } from '$lib/types';
```

Then replace:

```ts
  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
```

with:

```ts
  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let globalRouteCodes = $derived(computeGlobalRouteCodes(trips));
```

- [ ] **Step 2: Pass the route to `WorldMap`**

Replace:

```svelte
  <WorldMap {visitedCodes} {newlyVisitedCodes} oncountryclick={handleClick} oncountryhover={handleHover} />
```

with:

```svelte
  <WorldMap
    {visitedCodes}
    {newlyVisitedCodes}
    routeCodes={globalRouteCodes}
    oncountryclick={handleClick}
    oncountryhover={handleHover}
  />
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; the `/map` page is manually verified per this project's established convention)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server, go to `/map` with at least 3 trips logged across different countries and dates (seed `localStorage['trailune:trips']` directly if needed), and confirm:
- On page load, arcs animate in leg-by-leg connecting the countries in the order their trips' `startDate`s occurred, ending at the most-recently-first-visited country.
- If any country was visited on more than one trip, no extra leg arcs back to it on its later visit — it appears only once, at its earliest position.
- Reloading the page replays the full animation again from the start (not just newly-added legs).
- With `prefers-reduced-motion: reduce` enabled, all legs render immediately with no staggered animation (same as the existing per-trip route's reduced-motion behavior).
- The route still composes correctly with the existing scratch-map coating/reveal, hover popover, and click-to-zoom on this page — nothing else on `/map` regresses.
- A trip history covering 0 or 1 total country shows no route arcs at all.

- [ ] **Step 5: Commit**

```bash
git add src/routes/map/+page.svelte
git commit -m "feat: draw global travel path arcs on the main map"
```
