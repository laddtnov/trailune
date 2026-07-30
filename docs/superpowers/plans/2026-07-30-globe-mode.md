# Globe Mode (MVP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new `/globe` page renders an interactive 3D globe (via `three`/`three-globe`) showing visited countries highlighted and unvisited countries neutral, with drag-to-rotate and scroll/pinch-to-zoom.

**Architecture:** A pure data-loading module (`globeCountries.ts`) parses a bundled Natural Earth country-boundary GeoJSON asset into ready-to-render features. A `Globe.svelte` component wraps `three-globe`/Three.js (scene, camera, renderer, `TrackballControls`, render loop) and colors each country feature by visited/unvisited state. A new `/globe` route wires trips data into the component, and a nav link is added.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, `three` (^0.185.1), `three-globe` (^2.45.2).

## Global Constraints

- Binary visited/unvisited coloring only — no popover, no arcs, no heatmap tiers, no scratch-reveal animation this cycle (spec: Non-goals).
- No changes to the existing flat map (`/map`, `WorldMap.svelte`) — this is an additive, separate page (spec: Non-goals).
- The visited-country color must come from the current theme's `--color-accent` CSS custom property, read once at mount — not hardcoded (spec: Goals, Architecture).
- No auto-rotation — rotation only happens via direct user drag (spec: Non-goals).
- The bundled country dataset is `static/world-countries.geojson` (Natural Earth 110m admin-0 countries, ~480KB, 177 features) — **already present in the repo working tree**, verified to use the `ISO_A2` property for two-letter country codes, matching every other country code in this app. Four features have an invalid `ISO_A2` of `-99` (France, Norway, N. Cyprus, Somaliland) — a known data-quality quirk in this dataset. France and Norway are real, commonly-visited countries and must be corrected via a manual override (`France` → `FR`, `Norway` → `NO`); N. Cyprus and Somaliland are disputed territories not present in this app's own flat-map country list and are correctly left excluded. Antarctica (`AQ`) is a valid alpha-2 code in this dataset but is **not** present in the flat map's 211-country list (`static/world-map.svg` has no `id="AQ"` path) — exclude it from the globe too, for consistency between the two maps' notion of "country."

---

### Task 1: Country data loader

**Files:**
- Already present (bundled asset, not created by this task): `static/world-countries.geojson`
- Create: `src/lib/globeCountries.ts`
- Test: `src/lib/globeCountries.test.ts`

**Interfaces:**
- Consumes: the bundled `static/world-countries.geojson` file via `fetch('/world-countries.geojson')`.
- Produces: `export interface GlobeCountryFeature { type: 'Feature'; properties: Record<string, unknown> & { ISO_A2: string }; geometry: { type: string; coordinates: unknown }; }` and `export async function loadGlobeCountries(): Promise<GlobeCountryFeature[]>` and `export function getFeatureCode(feature: GlobeCountryFeature): string` — used by Task 2's `Globe.svelte`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/globeCountries.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadGlobeCountries, getFeatureCode, type GlobeCountryFeature } from './globeCountries';

function makeFeature(overrides: Partial<GlobeCountryFeature['properties']> & { NAME?: string }): GlobeCountryFeature {
  return {
    type: 'Feature',
    properties: { ISO_A2: 'JP', NAME: 'Japan', ...overrides },
    geometry: { type: 'Polygon', coordinates: [] }
  };
}

describe('loadGlobeCountries', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          type: 'FeatureCollection',
          features: [
            makeFeature({ ISO_A2: 'JP', NAME: 'Japan' }),
            makeFeature({ ISO_A2: 'XYZ', NAME: 'Bad Code' }),
            makeFeature({ ISO_A2: '-99', NAME: 'France' }),
            makeFeature({ ISO_A2: '-99', NAME: 'Norway' }),
            makeFeature({ ISO_A2: '-99', NAME: 'N. Cyprus' }),
            makeFeature({ ISO_A2: 'AQ', NAME: 'Antarctica' })
          ]
        })
      }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches the bundled GeoJSON asset from the correct path', async () => {
    await loadGlobeCountries();
    expect(fetch).toHaveBeenCalledWith('/world-countries.geojson');
  });

  it('keeps a feature with a valid two-letter ISO_A2 code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.ISO_A2 === 'JP')).toBe(true);
  });

  it('filters out a feature with a non-two-letter code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.NAME === 'Bad Code')).toBe(false);
  });

  it('overrides the invalid ISO_A2 for France to FR', async () => {
    const features = await loadGlobeCountries();
    const france = features.find((f) => f.properties.NAME === 'France');
    expect(france?.properties.ISO_A2).toBe('FR');
  });

  it('overrides the invalid ISO_A2 for Norway to NO', async () => {
    const features = await loadGlobeCountries();
    const norway = features.find((f) => f.properties.NAME === 'Norway');
    expect(norway?.properties.ISO_A2).toBe('NO');
  });

  it('excludes N. Cyprus, which has no override and an invalid code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.NAME === 'N. Cyprus')).toBe(false);
  });

  it('excludes Antarctica even though AQ is a valid two-letter code', async () => {
    const features = await loadGlobeCountries();
    expect(features.some((f) => f.properties.ISO_A2 === 'AQ')).toBe(false);
  });
});

describe('getFeatureCode', () => {
  it('returns the properties.ISO_A2 value', () => {
    const feature = makeFeature({ ISO_A2: 'FR' });
    expect(getFeatureCode(feature)).toBe('FR');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/globeCountries.test.ts`
Expected: FAIL — cannot resolve `./globeCountries` (module does not exist yet)

- [ ] **Step 3: Implement the loader**

Create `src/lib/globeCountries.ts`:

```ts
export interface GlobeCountryFeature {
  type: 'Feature';
  properties: Record<string, unknown> & { ISO_A2: string };
  geometry: { type: string; coordinates: unknown };
}

const ISO_A2_OVERRIDES: Record<string, string> = {
  France: 'FR',
  Norway: 'NO'
};

export async function loadGlobeCountries(): Promise<GlobeCountryFeature[]> {
  const res = await fetch('/world-countries.geojson');
  const data = await res.json();

  return (data.features as GlobeCountryFeature[])
    .map((feature) => {
      const name = feature.properties.NAME as string | undefined;
      const override = name ? ISO_A2_OVERRIDES[name] : undefined;
      if (!override) return feature;
      return { ...feature, properties: { ...feature.properties, ISO_A2: override } };
    })
    .filter((feature) => /^[A-Z]{2}$/.test(feature.properties.ISO_A2))
    .filter((feature) => feature.properties.ISO_A2 !== 'AQ');
}

export function getFeatureCode(feature: GlobeCountryFeature): string {
  return feature.properties.ISO_A2;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/globeCountries.test.ts`
Expected: PASS — all 8 tests green

- [ ] **Step 5: Commit**

```bash
git add static/world-countries.geojson src/lib/globeCountries.ts src/lib/globeCountries.test.ts
git commit -m "feat: add globe country data loader and bundled GeoJSON asset"
```

---

### Task 2: `Globe.svelte`, `/globe` route, and nav link

**Files:**
- Modify: `package.json` (add `three` and `three-globe` dependencies)
- Create: `src/lib/components/Globe.svelte`
- Create: `src/routes/globe/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `loadGlobeCountries`, `getFeatureCode`, `type GlobeCountryFeature` from `$lib/globeCountries` (Task 1).
- Produces: nothing consumed by later tasks — this is the only remaining task.

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install three@^0.185.1 three-globe@^2.45.2
```

Expected: `package.json`'s `dependencies` gains both entries; `npm install` completes with no errors (three-globe's peer dependency requirement is `three: '>=0.154'`, satisfied by `0.185.1`).

- [ ] **Step 2: Create the Globe component**

Create `src/lib/components/Globe.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import * as THREE from 'three';
  import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
  import ThreeGlobe from 'three-globe';
  import { loadGlobeCountries, getFeatureCode } from '$lib/globeCountries';

  let { visitedCodes }: { visitedCodes: Set<string> } = $props();

  let container: HTMLDivElement | undefined = $state();
  let animationFrameId: number | undefined;
  let renderer: THREE.WebGLRenderer | undefined;
  let controls: TrackballControls | undefined;

  onMount(async () => {
    if (!container) return;

    const visitedColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim() || '#e08e45';
    const neutralColor = '#2a2a2a';

    const features = await loadGlobeCountries();

    const globe = new ThreeGlobe()
      .polygonsData(features)
      .polygonCapColor((feature) => (visitedCodes.has(getFeatureCode(feature as any)) ? visitedColor : neutralColor))
      .polygonSideColor(() => 'rgba(0, 0, 0, 0.15)')
      .polygonStrokeColor(() => '#111111')
      .polygonAltitude(0.006);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

    const camera = new THREE.PerspectiveCamera(50, width / height);
    camera.position.z = 350;

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    container.appendChild(renderer.domElement);

    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 120;
    controls.rotateSpeed = 4;
    controls.zoomSpeed = 0.8;
    controls.noPan = true;

    function animate() {
      controls!.update();
      renderer!.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
  });

  onDestroy(() => {
    if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
    controls?.dispose();
    renderer?.dispose();
  });
</script>

<div bind:this={container} class="h-[70vh] w-full"></div>
```

- [ ] **Step 3: Create the `/globe` route**

Create `src/routes/globe/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import type { Trip } from '$lib/types';
  import Globe from '$lib/components/Globe.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';

  let trips: Trip[] = $state([]);
  let loading = $state(true);

  const visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));

  onMount(() => {
    trips = listTrips();
    loading = false;
  });
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Globe</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Every country you've visited, in three dimensions.</p>
</div>

{#if loading}
  <div class="mt-8">
    <Skeleton height="70vh" width="100%" />
  </div>
{:else}
  <div class="mt-8">
    <Globe {visitedCodes} />
  </div>
{/if}
```

- [ ] **Step 4: Add the nav link**

In `src/routes/+layout.svelte`, replace:

```ts
    { href: '/calendar', label: 'Calendar' },
```

with:

```ts
    { href: '/calendar', label: 'Calendar' },
    { href: '/globe', label: 'Globe' },
```

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 6: Run svelte-check**

Run: `npm run check`
Expected: same error count as the pre-existing baseline (no new errors) — if new errors appear, inspect them; a common source with a new third-party dependency is missing/incompatible type declarations, which would need a targeted fix, not a blanket suppression.

- [ ] **Step 7: Manually verify in the browser**

Start the dev server, seed a few trips via `localStorage`, and confirm on `/globe`:
- The globe renders (a dark sphere with country outlines), with visited countries colored in the current theme's accent color and unvisited countries neutral.
- Dragging with the mouse rotates the globe; scrolling (or pinch on trackpad) zooms in and out.
- Switching themes on `/settings`, then reloading `/globe`, changes the visited-country color to match the new theme's accent.
- With zero trips, the globe still renders fully neutral (no crash, no empty state needed beyond the existing loading skeleton).
- No console errors, and no lingering animation frame after navigating away from `/globe` to another page (confirm by checking `chrome://` or devtools performance — the render loop should stop, not silently continue rendering an unmounted canvas).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json src/lib/components/Globe.svelte src/routes/globe/+page.svelte src/routes/+layout.svelte
git commit -m "feat: add /globe 3D globe view with drag-rotate and zoom"
```
