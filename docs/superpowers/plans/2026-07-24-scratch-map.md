# Scratch Map Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unvisited countries render with a permanent foil/coating texture, and newly-visited countries reveal it via a jagged scratch-peel animation instead of today's scale/glow pulse.

**Architecture:** A new pure data module supplies a fixed sequence of jagged `clip-path` polygon keyframes. `WorldMap.svelte` injects an SVG hatch pattern for the coating fill, applies it to unvisited countries, and — on reveal — clones the real path as a temporary coating overlay that shrinks away through the keyframes before being removed.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No new CSS custom properties — the coating pattern reuses the existing `--color-ink-band` and `--color-ink-band-soft` variables (spec: Non-goals).
- No user-driven scratching interaction — the reveal is fully automatic, derived only from the existing `visitedCodes`/`newlyVisitedCodes` props (spec: Non-goals, Data flow).
- No new `Trip` schema fields or storage changes — rendering-only (spec: Non-goals).
- `prefers-reduced-motion` must skip the coating class, the clone overlay, and the animation entirely — apply `.visited` directly and instantly (spec: Edge cases).
- Applies everywhere `WorldMap.svelte` is used (`/map` and each trip hub's Map tab) with no per-page branching — it's a consequence of which codes are in `visitedCodes`, not a prop (spec: Goals, Data flow).

---

### Task 1: `scratchReveal.ts` clip-path keyframes

**Files:**
- Create: `src/lib/scratchReveal.ts`
- Test: `src/lib/scratchReveal.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `export const SCRATCH_CLIP_KEYFRAMES: string[]` — consumed by Task 2's `WorldMap.svelte` to step a cloned overlay path's `clip-path` from full coverage to fully collapsed.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/scratchReveal.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SCRATCH_CLIP_KEYFRAMES } from './scratchReveal';

describe('SCRATCH_CLIP_KEYFRAMES', () => {
  it('has exactly 6 keyframes', () => {
    expect(SCRATCH_CLIP_KEYFRAMES).toHaveLength(6);
  });

  it('every keyframe is a valid polygon() string', () => {
    for (const [i, kf] of SCRATCH_CLIP_KEYFRAMES.entries()) {
      expect(kf, `keyframe ${i}`).toMatch(/^polygon\(.+\)$/);
    }
  });

  it('the first keyframe covers the full box (0%/100% extremes only)', () => {
    const first = SCRATCH_CLIP_KEYFRAMES[0];
    expect(first).toBe('polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)');
  });

  it('the last keyframe collapses to a single repeated point', () => {
    const last = SCRATCH_CLIP_KEYFRAMES[SCRATCH_CLIP_KEYFRAMES.length - 1];
    const points = last.slice('polygon('.length, -1).split(', ');
    expect(points.every((p) => p === points[0])).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/scratchReveal.test.ts`
Expected: FAIL with "Failed to resolve import './scratchReveal'" (module doesn't exist yet)

- [ ] **Step 3: Write the implementation**

Create `src/lib/scratchReveal.ts`:

```ts
export const SCRATCH_CLIP_KEYFRAMES: string[] = [
  'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
  'polygon(8% 4%, 100% 0%, 96% 62%, 40% 100%, 0% 88%)',
  'polygon(30% 10%, 92% 6%, 100% 55%, 68% 100%, 10% 96%, 0% 40%)',
  'polygon(55% 20%, 88% 30%, 90% 80%, 45% 96%, 20% 60%)',
  'polygon(70% 45%, 82% 55%, 60% 90%, 55% 60%)',
  'polygon(0% 0%, 0% 0%, 0% 0%, 0% 0%)'
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/scratchReveal.test.ts`
Expected: PASS (4/4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/scratchReveal.ts src/lib/scratchReveal.test.ts
git commit -m "feat: add scratch-reveal clip-path keyframes"
```

---

### Task 2: Coating texture + scratch-peel reveal in `WorldMap.svelte`

**Files:**
- Modify: `src/lib/components/WorldMap.svelte`

**Interfaces:**
- Consumes: `SCRATCH_CLIP_KEYFRAMES` from `src/lib/scratchReveal.ts` (Task 1).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Import the keyframes**

In `src/lib/components/WorldMap.svelte`, add to the top of the `<script>` block, alongside the existing imports:

```ts
  import { SCRATCH_CLIP_KEYFRAMES } from '$lib/scratchReveal';
```

- [ ] **Step 2: Inject the coating `<pattern>` into the SVG's `<defs>`**

In `onMount`, replace:

```ts
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    if (svg) {
```

with:

```ts
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    if (svg) {
      injectScratchPattern(svg as unknown as SVGSVGElement);
```

Then add this new function above `onMount` (after `applyRevealClass`, before `onMount`):

```ts
  const svgNS = 'http://www.w3.org/2000/svg';

  function injectScratchPattern(svg: SVGSVGElement) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(svgNS, 'defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    const pattern = document.createElementNS(svgNS, 'pattern');
    pattern.setAttribute('id', 'scratch-coating');
    pattern.setAttribute('patternUnits', 'userSpaceOnUse');
    pattern.setAttribute('width', '8');
    pattern.setAttribute('height', '8');
    pattern.setAttribute('patternTransform', 'rotate(45)');

    const rect = document.createElementNS(svgNS, 'rect');
    rect.setAttribute('width', '8');
    rect.setAttribute('height', '8');
    rect.setAttribute('fill', 'var(--color-ink-band-soft)');
    pattern.appendChild(rect);

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '0');
    line.setAttribute('y2', '8');
    line.setAttribute('stroke', 'var(--color-ink-band)');
    line.setAttribute('stroke-width', '2');
    pattern.appendChild(line);

    defs.appendChild(pattern);
  }
```

Note: there's already a top-level `const svgNS = 'http://www.w3.org/2000/svg';` declared inside `buildFlightRoute` further down this file — remove that inner declaration from `buildFlightRoute` since this new module-scope-within-script constant now covers it:

Replace, inside `buildFlightRoute`:

```ts
    const svgNS = 'http://www.w3.org/2000/svg';
    const group = document.createElementNS(svgNS, 'g');
```

with:

```ts
    const group = document.createElementNS(svgNS, 'g');
```

- [ ] **Step 3: Toggle a `.unvisited-coating` class alongside `.visited`**

In `onMount`, replace:

```ts
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
```

with:

```ts
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyRevealClass(path, code);
```

And in the `$effect` block, replace:

```ts
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
```

with:

```ts
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visitedCodes.has(code));
      path.classList.toggle('unvisited-coating', !visitedCodes.has(code) && !newlyVisitedCodes.has(code));
      applyRevealClass(path, code);
    });
```

- [ ] **Step 4: Replace `applyRevealClass`'s pulse animation with the scratch-peel overlay**

Replace the entire existing function:

```ts
  function applyRevealClass(path: Element, code: string) {
    if (!newlyVisitedCodes.has(code)) return;
    const delay = revealIndex * 80;
    revealIndex += 1;
    setTimeout(() => {
      path.classList.add('revealing');
      setTimeout(() => path.classList.remove('revealing'), 600);
    }, delay);
  }
```

with:

```ts
  function applyRevealClass(path: Element, code: string) {
    if (!newlyVisitedCodes.has(code)) return;
    const delay = revealIndex * 80;
    revealIndex += 1;
    setTimeout(() => {
      path.classList.add('visited');
      path.classList.remove('unvisited-coating');
      if (prefersReducedMotion()) return;
      spawnScratchOverlay(path as SVGPathElement);
    }, delay);
  }

  function spawnScratchOverlay(path: SVGPathElement) {
    const overlay = path.cloneNode(false) as SVGPathElement;
    overlay.removeAttribute('id');
    overlay.classList.remove('visited');
    overlay.classList.add('scratch-overlay');
    overlay.style.fill = 'url(#scratch-coating)';
    overlay.style.clipPath = SCRATCH_CLIP_KEYFRAMES[0];
    path.insertAdjacentElement('afterend', overlay);

    const totalDuration = 600;
    const stepDuration = totalDuration / (SCRATCH_CLIP_KEYFRAMES.length - 1);
    let step = 1;

    const interval = setInterval(() => {
      overlay.style.clipPath = SCRATCH_CLIP_KEYFRAMES[step];
      step += 1;
      if (step >= SCRATCH_CLIP_KEYFRAMES.length) {
        clearInterval(interval);
        overlay.remove();
      }
    }, stepDuration);
  }
```

- [ ] **Step 5: Add CSS for the coating and overlay**

Replace the existing reveal-pulse styles:

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

with:

```css
  .world-map :global(path.unvisited-coating) {
    fill: url(#scratch-coating);
  }

  .world-map :global(path.scratch-overlay) {
    pointer-events: none;
    transition: clip-path 0.1s linear;
  }
```

And update the reduced-motion media query — replace:

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
    .world-map :global(path.scratch-overlay) {
      transition: none;
    }
  }
```

- [ ] **Step 6: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; `WorldMap.svelte` is manually verified per this project's established convention)

- [ ] **Step 7: Manually verify in the browser**

Start the dev server and confirm:
- On `/map`, unvisited countries show the diagonal coating texture instead of a plain fill.
- Adding a new trip with one or more countries triggers a jagged scratch-peel animation on those countries (staggered if more than one), ending with the country in its normal solid `.visited` accent color and the coating fully gone.
- With `prefers-reduced-motion: reduce` enabled (via browser/OS setting or devtools emulation), newly-visited countries switch to `.visited` instantly with no coating flash and no overlay animation.
- A trip hub's own Map tab (`/trips/<id>`, Map tab) shows its already-visited countries normally, with no coating and no overlay.
- Hover, click-to-zoom, the country panel, and the flight-route rendering (where applicable) all still work unaffected.

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/WorldMap.svelte
git commit -m "feat: scratch-off coating texture and peel-reveal animation for the map"
```
