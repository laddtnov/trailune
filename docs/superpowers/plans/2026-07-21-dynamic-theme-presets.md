# Dynamic Theme Presets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add four selectable color themes (Travel Journal, Explorer Night, Golden Sunset, Polar Morning), a new `/settings` page to pick between them, and localStorage persistence with no flash-of-wrong-theme on load.

**Architecture:** Four `:root[data-theme="..."]` CSS blocks in `app.css` override the same `--color-*` custom properties the app already reads everywhere via `var(--color-x)`, so switching the `data-theme` attribute on `<html>` re-themes the whole app with zero component changes. A small `src/lib/theme.ts` module handles reading/writing the choice; a tiny inline script in `app.html` applies it before first paint; a new Settings page provides the picker UI.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, plain CSS custom properties (Tailwind v4 `@theme`), Vitest.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- No ambient background motion in this cycle — deferred to its own future cycle.
- No `prefers-color-scheme` auto-detection or auto-switching — every preset is a manual, explicit choice; first-time visitors default to `'travel-journal'`.
- `getStoredTheme()` must fall back to `'travel-journal'` for both an empty and an unrecognized/invalid stored value.

---

### Task 1: `theme.ts` — the theme utility module

**Files:**
- Create: `src/lib/theme.ts`
- Test: `src/lib/theme.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (used by Task 3's inline script conceptually, and directly by Task 4):
  ```ts
  export interface ThemePreset {
    id: string;
    name: string;
  }
  export const THEMES: readonly ThemePreset[];
  export function getStoredTheme(): string;
  export function setStoredTheme(id: string): void;
  export function applyTheme(id: string): void;
  ```

- [ ] **Step 1: Write the failing tests**

Create `src/lib/theme.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from './theme';

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

describe('THEMES', () => {
  it('lists all four presets with travel-journal first', () => {
    expect(THEMES.map((t) => t.id)).toEqual([
      'travel-journal',
      'explorer-night',
      'golden-sunset',
      'polar-morning'
    ]);
  });
});

describe('getStoredTheme', () => {
  it('returns travel-journal when nothing has been stored yet', () => {
    expect(getStoredTheme()).toBe('travel-journal');
  });

  it('returns travel-journal when the stored value is not a known theme id', () => {
    localStorage.setItem('trailune:theme', 'not-a-real-theme');
    expect(getStoredTheme()).toBe('travel-journal');
  });

  it('returns the stored value when it is a valid theme id', () => {
    localStorage.setItem('trailune:theme', 'golden-sunset');
    expect(getStoredTheme()).toBe('golden-sunset');
  });
});

describe('setStoredTheme', () => {
  it('persists the given id to localStorage', () => {
    setStoredTheme('polar-morning');
    expect(localStorage.getItem('trailune:theme')).toBe('polar-morning');
  });
});

describe('applyTheme', () => {
  it('sets the data-theme attribute on the document element', () => {
    applyTheme('explorer-night');
    expect(document.documentElement.getAttribute('data-theme')).toBe('explorer-night');
  });

  it('also persists the choice to localStorage', () => {
    applyTheme('golden-sunset');
    expect(localStorage.getItem('trailune:theme')).toBe('golden-sunset');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: FAIL — `Cannot find module './theme'`.

- [ ] **Step 3: Implement `theme.ts`**

Create `src/lib/theme.ts`:

```ts
const STORAGE_KEY = 'trailune:theme';
const DEFAULT_THEME = 'travel-journal';

export interface ThemePreset {
  id: string;
  name: string;
}

export const THEMES: readonly ThemePreset[] = [
  { id: 'travel-journal', name: 'Travel Journal' },
  { id: 'explorer-night', name: 'Explorer Night' },
  { id: 'golden-sunset', name: 'Golden Sunset' },
  { id: 'polar-morning', name: 'Polar Morning' }
];

function isValidTheme(id: string): boolean {
  return THEMES.some((theme) => theme.id === id);
}

export function getStoredTheme(): string {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidTheme(stored)) return stored;
  return DEFAULT_THEME;
}

export function setStoredTheme(id: string): void {
  localStorage.setItem(STORAGE_KEY, id);
}

export function applyTheme(id: string): void {
  document.documentElement.setAttribute('data-theme', id);
  setStoredTheme(id);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/theme.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/theme.ts src/lib/theme.test.ts
git commit -m "feat: add theme utility module for dynamic theme presets"
```

---

### Task 2: Theme preset CSS tokens

**Files:**
- Modify: `src/app.css`

**Interfaces:**
- Consumes: the `data-theme` attribute values defined by Task 1's `THEMES` (`'travel-journal'`, `'explorer-night'`, `'golden-sunset'`, `'polar-morning'`) — this task's CSS selectors must match those exact strings.
- Produces: nothing consumed by later tasks (pure CSS).

- [ ] **Step 1: Add the four explicit theme blocks**

In `src/app.css`, find the end of the existing `@theme { ... }` block (right before its closing `}`, i.e. right after the `--ease-out-expo` line):

```css
  /* Motion: exponential ease-out, no bounce. */
  --ease-out-quart: cubic-bezier(0.25, 1, 0.5, 1);
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

Leave that block completely unchanged (it is the Travel Journal preset's values and remains the default). Immediately after that closing `}`, and before the `@layer base { ... }` block, add:

```css
:root[data-theme='travel-journal'] {
  --color-canvas: oklch(98% 0.003 60);
  --color-canvas-dim: oklch(95.5% 0.004 60);
  --color-ink: oklch(21% 0.025 40);
  --color-ink-soft: oklch(42% 0.03 42);
  --color-ink-band: oklch(24% 0.032 38);
  --color-ink-band-soft: oklch(34% 0.03 40);
  --color-card: oklch(97.5% 0.018 66);
  --color-card-border: oklch(87% 0.035 55);
  --color-accent: oklch(57% 0.17 35);
  --color-accent-hover: oklch(51% 0.17 34);
  --color-accent-active: oklch(46% 0.16 34);
  --color-accent-soft: oklch(93% 0.045 40);
  --color-accent-ink: oklch(98% 0.01 60);
  --color-teal: oklch(53% 0.09 195);
  --color-teal-hover: oklch(47% 0.09 195);
  --color-teal-soft: oklch(92% 0.035 195);
  --color-danger: oklch(48% 0.19 25);
  --color-danger-hover: oklch(42% 0.19 25);
  --color-danger-soft: oklch(93% 0.045 25);
  --color-success: oklch(58% 0.13 150);
  --color-success-soft: oklch(93% 0.04 150);
}

:root[data-theme='explorer-night'] {
  --color-canvas: oklch(18% 0.02 260);
  --color-canvas-dim: oklch(15% 0.02 260);
  --color-ink: oklch(92% 0.01 90);
  --color-ink-soft: oklch(70% 0.015 250);
  --color-ink-band: oklch(12% 0.02 260);
  --color-ink-band-soft: oklch(20% 0.02 258);
  --color-card: oklch(24% 0.025 255);
  --color-card-border: oklch(34% 0.03 255);
  --color-accent: oklch(72% 0.15 80);
  --color-accent-hover: oklch(66% 0.15 80);
  --color-accent-active: oklch(61% 0.15 80);
  --color-accent-soft: oklch(32% 0.06 80);
  --color-accent-ink: oklch(18% 0.02 260);
  --color-teal: oklch(65% 0.1 195);
  --color-teal-hover: oklch(59% 0.1 195);
  --color-teal-soft: oklch(28% 0.05 195);
  --color-danger: oklch(65% 0.17 25);
  --color-danger-hover: oklch(59% 0.17 25);
  --color-danger-soft: oklch(30% 0.07 25);
  --color-success: oklch(68% 0.13 150);
  --color-success-soft: oklch(28% 0.06 150);
}

:root[data-theme='golden-sunset'] {
  --color-canvas: oklch(96% 0.02 50);
  --color-canvas-dim: oklch(93% 0.025 50);
  --color-ink: oklch(24% 0.04 30);
  --color-ink-soft: oklch(45% 0.05 35);
  --color-ink-band: oklch(30% 0.06 30);
  --color-ink-band-soft: oklch(40% 0.06 32);
  --color-card: oklch(94% 0.05 45);
  --color-card-border: oklch(84% 0.07 40);
  --color-accent: oklch(60% 0.2 20);
  --color-accent-hover: oklch(54% 0.2 19);
  --color-accent-active: oklch(49% 0.19 19);
  --color-accent-soft: oklch(91% 0.06 30);
  --color-accent-ink: oklch(98% 0.01 50);
  --color-teal: oklch(50% 0.09 195);
  --color-teal-hover: oklch(44% 0.09 195);
  --color-teal-soft: oklch(90% 0.04 195);
  --color-danger: oklch(46% 0.19 25);
  --color-danger-hover: oklch(40% 0.19 25);
  --color-danger-soft: oklch(90% 0.05 25);
  --color-success: oklch(56% 0.13 150);
  --color-success-soft: oklch(90% 0.045 150);
}

:root[data-theme='polar-morning'] {
  --color-canvas: oklch(97% 0.008 230);
  --color-canvas-dim: oklch(94% 0.01 230);
  --color-ink: oklch(25% 0.02 240);
  --color-ink-soft: oklch(48% 0.02 235);
  --color-ink-band: oklch(28% 0.03 235);
  --color-ink-band-soft: oklch(38% 0.03 235);
  --color-card: oklch(95% 0.015 220);
  --color-card-border: oklch(85% 0.025 220);
  --color-accent: oklch(55% 0.12 220);
  --color-accent-hover: oklch(49% 0.12 219);
  --color-accent-active: oklch(44% 0.11 219);
  --color-accent-soft: oklch(92% 0.03 220);
  --color-accent-ink: oklch(98% 0.008 220);
  --color-teal: oklch(52% 0.09 195);
  --color-teal-hover: oklch(46% 0.09 195);
  --color-teal-soft: oklch(91% 0.03 195);
  --color-danger: oklch(47% 0.18 25);
  --color-danger-hover: oklch(41% 0.18 25);
  --color-danger-soft: oklch(91% 0.045 25);
  --color-success: oklch(57% 0.12 150);
  --color-success-soft: oklch(91% 0.04 150);
}
```

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`. In the browser devtools console, run `document.documentElement.setAttribute('data-theme', 'explorer-night')` and confirm the whole page re-colors (background, cards, accent buttons, nav) to the dark palette. Repeat for `'golden-sunset'` and `'polar-morning'`, then `'travel-journal'` to confirm it matches the current look exactly (no visual change from before this task). Also try removing the attribute entirely (`document.documentElement.removeAttribute('data-theme')`) — confirm it falls back to the Travel Journal look, since that's still the base `@theme` block's values.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (CSS-only change, no logic affected).

- [ ] **Step 4: Commit**

```bash
git add src/app.css
git commit -m "feat: add CSS token overrides for four theme presets"
```

---

### Task 3: Flash-prevention inline script

**Files:**
- Modify: `src/app.html`

**Interfaces:**
- Consumes: the same localStorage key Task 1 uses (`'trailune:theme'`) and the same theme ids (`'travel-journal'`, `'explorer-night'`, `'golden-sunset'`, `'polar-morning'`) — this task does NOT import `theme.ts` (it must run before any JS module loads), so the key and valid-id list are duplicated here intentionally, in plain vanilla JS.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Add the inline script**

In `src/app.html`, find:

```html
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
		<title>Trailune — Track every journey.</title>
		%sveltekit.head%
	</head>
```

Change to:

```html
		<link rel="icon" href="%sveltekit.assets%/favicon.svg" type="image/svg+xml" />
		<title>Trailune — Track every journey.</title>
		<script>
			(function () {
				var validThemes = ['travel-journal', 'explorer-night', 'golden-sunset', 'polar-morning'];
				var stored = localStorage.getItem('trailune:theme');
				if (stored && validThemes.indexOf(stored) !== -1) {
					document.documentElement.setAttribute('data-theme', stored);
				}
			})();
		</script>
		%sveltekit.head%
	</head>
```

Note: this intentionally omits setting `data-theme` at all when there's no stored value (rather than explicitly setting `'travel-journal'`), since the base `@theme` block already produces that exact look with no attribute present — this avoids a redundant attribute write on every first-time visit while still being visually identical to Task 2's explicit `:root[data-theme='travel-journal']` block.

- [ ] **Step 2: Manually verify in the browser**

Run: `npm run dev`. In the browser devtools console, run `localStorage.setItem('trailune:theme', 'explorer-night')`, then hard-reload the page (not a client-side navigation). Confirm the page renders in the Explorer Night palette immediately, with no visible flash of the Travel Journal colors first. Then run `localStorage.removeItem('trailune:theme')` and hard-reload again — confirm it's back to Travel Journal.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (this is a static HTML change with no testable logic — `app.html` is not covered by Vitest in this project, consistent with it never having been under test before).

- [ ] **Step 4: Commit**

```bash
git add src/app.html
git commit -m "feat: prevent theme flash on load with inline script"
```

---

### Task 4: Settings page and nav link

**Files:**
- Create: `src/routes/settings/+page.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `THEMES`, `getStoredTheme`, `applyTheme` from `$lib/theme` (Task 1); the four `data-theme` CSS blocks from Task 2; the flash-prevention script from Task 3 (no direct code dependency, just needs to already be in place for a coherent experience).
- Produces: nothing consumed by later tasks in this plan.

- [ ] **Step 1: Create the Settings page**

Create `src/routes/settings/+page.svelte`:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { THEMES, getStoredTheme, applyTheme } from '$lib/theme';

  const PREVIEW_COLORS: Record<string, { canvas: string; card: string; accent: string; band: string; accentInk: string }> = {
    'travel-journal': {
      canvas: 'oklch(98% 0.003 60)',
      card: 'oklch(97.5% 0.018 66)',
      accent: 'oklch(57% 0.17 35)',
      band: 'oklch(24% 0.032 38)',
      accentInk: 'oklch(98% 0.01 60)'
    },
    'explorer-night': {
      canvas: 'oklch(18% 0.02 260)',
      card: 'oklch(24% 0.025 255)',
      accent: 'oklch(72% 0.15 80)',
      band: 'oklch(12% 0.02 260)',
      accentInk: 'oklch(18% 0.02 260)'
    },
    'golden-sunset': {
      canvas: 'oklch(96% 0.02 50)',
      card: 'oklch(94% 0.05 45)',
      accent: 'oklch(60% 0.2 20)',
      band: 'oklch(30% 0.06 30)',
      accentInk: 'oklch(98% 0.01 50)'
    },
    'polar-morning': {
      canvas: 'oklch(97% 0.008 230)',
      card: 'oklch(95% 0.015 220)',
      accent: 'oklch(55% 0.12 220)',
      band: 'oklch(28% 0.03 235)',
      accentInk: 'oklch(98% 0.008 220)'
    }
  };

  let selectedTheme = $state('travel-journal');

  onMount(() => {
    selectedTheme = getStoredTheme();
  });

  function selectTheme(id: string) {
    selectedTheme = id;
    applyTheme(id);
  }
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Choose the look of your journal.</p>
</div>

<div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
  {#each THEMES as theme (theme.id)}
    <button
      type="button"
      aria-pressed={selectedTheme === theme.id}
      onclick={() => selectTheme(theme.id)}
      class="overflow-hidden rounded-[var(--radius-lg)] border-2 text-left shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 {selectedTheme ===
      theme.id
        ? 'border-[var(--color-accent)]'
        : 'border-transparent'}"
    >
      <div style="background: {PREVIEW_COLORS[theme.id].canvas}; padding: 12px;">
        <div style="background: {PREVIEW_COLORS[theme.id].band}; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; color: {PREVIEW_COLORS[
          theme.id
        ].accentInk};">
          Trailune
        </div>
        <div
          style="background: {PREVIEW_COLORS[theme.id].card}; border-radius: 8px; padding: 8px 10px; margin-top: 8px;"
        >
          <div
            style="display: inline-block; background: {PREVIEW_COLORS[theme.id]
              .accent}; color: {PREVIEW_COLORS[theme.id].accentInk}; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600;"
          >
            New trip
          </div>
        </div>
      </div>
      <div class="bg-[var(--color-card)] p-4">
        <p class="font-display text-lg font-bold">{theme.name}</p>
      </div>
    </button>
  {/each}
</div>
```

- [ ] **Step 2: Add the nav link**

In `src/routes/+layout.svelte`, find:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' }
  ];
```

Change to:

```ts
  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' }
  ];
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`.

1. Open `/settings` via the nav link. Confirm all four preset cards render with distinct live-color previews matching the approved mockup, and the currently-active theme (Travel Journal, by default) shows a highlighted border.
2. Click each of the other three presets in turn. Confirm the whole app re-themes instantly (check the nav bar, this settings page itself, and navigate to `/`, `/map`, `/stats` to confirm those pages also re-theme) with no reload.
3. Reload the page after selecting a non-default theme. Confirm it persists (same theme still active, matching border still highlighted) with no flash of Travel Journal.
4. Spot-check Trips, Map, Stats, and Packing pages under each of the four themes for basic visual coherence (text is readable against its background, buttons are visibly distinct from cards).

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all tests pass (this task adds no new test file — it's a presentational page consuming already-tested logic from Task 1).

- [ ] **Step 5: Commit**

```bash
git add src/routes/settings/+page.svelte src/routes/+layout.svelte
git commit -m "feat: add Settings page with theme picker"
```

---

## Self-Review Notes

- **Spec coverage:** the theme utility module with tests (Task 1), the four CSS token blocks matching the approved palette values verbatim (Task 2), flash prevention (Task 3), and the Settings page with nav link (Task 4) — all spec sections have a task. Ambient background motion and auto dark-mode detection are explicitly out of scope per the spec's Non-goals, and no task implements them.
- **Placeholder scan:** no TBD/TODO; all steps contain complete code.
- **Type consistency:** `ThemePreset`/`THEMES`/`getStoredTheme`/`setStoredTheme`/`applyTheme` are defined once in Task 1 and consumed identically in Task 4's imports. The `data-theme` attribute values (`'travel-journal'`, `'explorer-night'`, `'golden-sunset'`, `'polar-morning'`) are consistent across Task 1's `THEMES` array, Task 2's CSS selectors, and Task 3's inline script's `validThemes` array.
- **Cross-task note:** Task 3 intentionally duplicates the storage key and valid-id list from Task 1 rather than importing `theme.ts`, since the inline script must run before any JS module (including Svelte's own bundle) loads — this duplication is necessary, not an oversight, and is called out explicitly in Task 3's Interfaces section.
- **Task 4's `PREVIEW_COLORS` duplication is also intentional:** the Settings page must show all four themes' colors simultaneously as static previews regardless of which theme is currently active on `<html>` (a `var(--color-x)` reference would only ever reflect the live theme, not the other three cards), so the hero swatch values from Task 2's CSS blocks are duplicated as inline literals here. If a preset's palette changes in the future, both Task 2's CSS and Task 4's `PREVIEW_COLORS` need updating together.
