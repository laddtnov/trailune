# Animated Flight Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Opening a multi-country trip's Map tab draws an animated curved route line between its countries, in visited order, leg by leg.

**Architecture:** A pure function computes a single quadratic-bezier arc between two points, always bowing the same rotational direction relative to travel direction. `WorldMap.svelte` gains an optional `routeCodes` prop; when it has 2+ entries, the component resolves each code's rendered country centroid via `getBBox()` and draws one arc per consecutive pair, animating each leg's reveal in sequence via the standard SVG stroke-dasharray/stroke-dashoffset technique.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, native SVG DOM APIs.

## Global Constraints

- Arcs must bow in a consistent rotational direction relative to travel direction — reversing the two endpoints must mirror the arc to the geometrically opposite side, never flip randomly (spec: Architecture, Testing).
- No route is drawn for a trip with fewer than 2 resolvable countries (spec: Edge cases).
- An unresolvable country code (no matching `<path>` in the map) is skipped, not an error (spec: Edge cases).
- The animation plays once, automatically, the first time the Map tab renders a qualifying route — no replay control in this cycle (spec: Non-goals).
- Under `prefers-reduced-motion: reduce`, the full route renders immediately with no sequential draw-in (spec: Edge cases).
- `routeCodes` is exactly `trip.countries` — no new data model or storage (spec: Data flow & interaction notes).

---

### Task 1: `flightRoute.ts` — arc path computation

**Files:**
- Create: `src/lib/flightRoute.ts`
- Test: `src/lib/flightRoute.test.ts`

**Interfaces:**
- Consumes: nothing — this is the foundational task.
- Produces: `computeArcPath(from: { x: number; y: number }, to: { x: number; y: number }, curvature?: number): string` — consumed by `WorldMap.svelte` in Task 2.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/flightRoute.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeArcPath } from './flightRoute';

function parseQuadratic(d: string) {
  const match = d.match(
    /^M ([\d.-]+) ([\d.-]+) Q ([\d.-]+) ([\d.-]+) ([\d.-]+) ([\d.-]+)$/
  );
  if (!match) throw new Error(`path did not match expected format: ${d}`);
  const [, mx, my, cx, cy, ex, ey] = match.map(Number) as unknown as number[];
  return { start: { x: mx, y: my }, control: { x: cx, y: cy }, end: { x: ex, y: ey } };
}

describe('computeArcPath', () => {
  it('returns a well-formed single quadratic-bezier path string', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    expect(() => parseQuadratic(d)).not.toThrow();
  });

  it('starts and ends exactly at the given points', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 });
    const { start, end } = parseQuadratic(d);
    expect(start).toEqual({ x: 0, y: 0 });
    expect(end).toEqual({ x: 10, y: 0 });
  });

  it('offsets the control point perpendicular to the line by curvature * distance', () => {
    const d = computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.15);
    const { control } = parseQuadratic(d);
    // Straight horizontal line, midpoint (5, 0); perpendicular offset is purely vertical.
    expect(control.x).toBeCloseTo(5, 5);
    expect(Math.abs(control.y)).toBeCloseTo(1.5, 5);
  });

  it('bows to the geometrically opposite side when the endpoints are reversed', () => {
    const forward = parseQuadratic(computeArcPath({ x: 0, y: 0 }, { x: 10, y: 0 }, 0.15));
    const reversed = parseQuadratic(computeArcPath({ x: 10, y: 0 }, { x: 0, y: 0 }, 0.15));
    expect(forward.control.y).toBeCloseTo(-reversed.control.y, 5);
  });

  it('falls back to a degenerate straight path when from and to coincide', () => {
    const d = computeArcPath({ x: 5, y: 5 }, { x: 5, y: 5 });
    expect(d).toBe('M 5 5 L 5 5');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/flightRoute.test.ts`
Expected: FAIL with "Cannot find module './flightRoute'"

- [ ] **Step 3: Write the implementation**

Create `src/lib/flightRoute.ts`:

```ts
export function computeArcPath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  curvature = 0.15
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance === 0) {
    return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  }

  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;

  // Perpendicular to the direction of travel, rotated 90° counterclockwise,
  // so every leg bows the same way regardless of travel direction.
  const perpX = -dy / distance;
  const perpY = dx / distance;

  const offset = curvature * distance;
  const controlX = midX + perpX * offset;
  const controlY = midY + perpY * offset;

  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/flightRoute.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/flightRoute.ts src/lib/flightRoute.test.ts
git commit -m "feat: add flight route arc path computation"
```

---

### Task 2: `WorldMap.svelte` route rendering + trip hub wiring

**Files:**
- Modify: `src/lib/components/WorldMap.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: `computeArcPath` from `$lib/flightRoute` (Task 1).
- Produces: `WorldMap.svelte` gains prop `routeCodes?: string[]` — nothing consumed by later tasks, this is the final task.

- [ ] **Step 1: Add the `routeCodes` prop and import**

In `src/lib/components/WorldMap.svelte`, replace:

```ts
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Skeleton from './Skeleton.svelte';
  import { padBBox, type ViewBox } from '$lib/mapZoom';

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

with:

```ts
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Skeleton from './Skeleton.svelte';
  import { padBBox, type ViewBox } from '$lib/mapZoom';
  import { computeArcPath } from '$lib/flightRoute';

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

- [ ] **Step 2: Add the route-building function**

In `src/lib/components/WorldMap.svelte`, replace:

```ts
  function handleOutsideClick(event: PointerEvent) {
```

with:

```ts
  function buildFlightRoute(svg: SVGSVGElement) {
    if (routeCodes.length < 2) return;

    const points: { x: number; y: number }[] = [];
    for (const code of routeCodes) {
      const path = svg.querySelector(`path[id="${code}"]`) as SVGGraphicsElement | null;
      if (!path) continue;
      const bbox = path.getBBox();
      points.push({ x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 });
    }
    if (points.length < 2) return;

    const svgNS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'flight-route');
    svg.appendChild(group);

    const reduced = prefersReducedMotion();
    const legDuration = 800;
    let cumulativeDelay = 0;

    for (let i = 0; i < points.length - 1; i++) {
      const legPath = document.createElementNS(svgNS, 'path') as SVGPathElement;
      legPath.setAttribute('class', 'flight-leg');
      legPath.setAttribute('d', computeArcPath(points[i], points[i + 1]));
      group.appendChild(legPath);

      const length = legPath.getTotalLength();
      legPath.style.strokeDasharray = `${length}`;

      if (reduced) {
        legPath.style.strokeDashoffset = '0';
      } else {
        legPath.style.strokeDashoffset = `${length}`;
        legPath.style.transition = `stroke-dashoffset ${legDuration}ms var(--ease-out-quart)`;
        const delay = cumulativeDelay;
        setTimeout(() => {
          legPath.style.strokeDashoffset = '0';
        }, delay);
        cumulativeDelay += legDuration;
      }
    }

    for (const point of points) {
      const marker = document.createElementNS(svgNS, 'circle');
      marker.setAttribute('class', 'flight-waypoint');
      marker.setAttribute('cx', String(point.x));
      marker.setAttribute('cy', String(point.y));
      marker.setAttribute('r', '6');
      group.appendChild(marker);
    }
  }

  function handleOutsideClick(event: PointerEvent) {
```

- [ ] **Step 3: Call it once the SVG is loaded**

In `src/lib/components/WorldMap.svelte`, replace:

```ts
    loaded = true;
    revealIndex = 0;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
```

with:

```ts
    loaded = true;
    revealIndex = 0;
    if (svg) buildFlightRoute(svg as unknown as SVGSVGElement);
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
```

- [ ] **Step 4: Add the route/marker CSS**

In `src/lib/components/WorldMap.svelte`, replace:

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
</style>
```

with:

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

  .world-map :global(.flight-leg) {
    fill: none;
    stroke: var(--color-accent);
    stroke-width: 3;
    stroke-linecap: round;
    pointer-events: none;
  }

  .world-map :global(.flight-waypoint) {
    fill: var(--color-accent);
    stroke: var(--color-canvas);
    stroke-width: 1;
    pointer-events: none;
  }
</style>
```

- [ ] **Step 5: Wire `routeCodes` into the trip hub's Map tab**

In `src/routes/trips/[id]/+page.svelte`, replace:

```svelte
      <WorldMap visitedCodes={new Set(trip.countries)} />
```

with:

```svelte
      <WorldMap visitedCodes={new Set(trip.countries)} routeCodes={trip.countries} />
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests of its own; `WorldMap.svelte`'s route rendering is manually verified per this project's established convention, the same way the existing zoom-to-country feature was verified)

- [ ] **Step 7: Manually verify in the browser**

Start the dev server, open a multi-country trip's Map tab, and confirm:
- Curved arcs draw in one at a time, in visited order, each starting only after the previous one finishes.
- A small marker appears at each country's centroid.
- A single-country trip's Map tab shows no route and looks exactly as it did before this change.
- With the OS/browser's reduced-motion setting simulated, the full route appears immediately with no sequential draw-in.
- The existing zoom-to-country click behavior, hover popovers, and visited-country highlighting still all work unchanged.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/WorldMap.svelte src/routes/trips/\[id\]/+page.svelte
git commit -m "feat: animate a curved flight route between a trip's countries"
```
