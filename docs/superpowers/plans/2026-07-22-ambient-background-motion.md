# Ambient Background Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two slowly-drifting, theme-colored gradient blobs behind all page content, rendered once in the root layout, closing out `docs/ROADMAP.md` §5's last open item.

**Architecture:** A single new presentational component, `AmbientBackground.svelte`, containing two blurred, absolutely-positioned `<div>`s inside a fixed full-viewport wrapper, each animating via a CSS `@keyframes` drift. Rendered once near the top of `src/routes/+layout.svelte` so it appears on every route.

**Tech Stack:** SvelteKit 2 / Svelte 5, plain CSS (`@keyframes`, `filter: blur()`, CSS custom properties) — no JavaScript, no new dependencies.

## Global Constraints

- No new npm dependencies.
- No changes to `Trip`, `JournalEntry`, `TipEntry`, or any other existing type in `src/lib/types.ts`.
- No JavaScript-driven animation or scroll listeners — pure CSS `@keyframes`, matching the existing paper-texture/nav-animation pattern.
- No new reduced-motion code path — must rely entirely on the existing global `@media (prefers-reduced-motion: reduce)` block in `app.css`, which already zeroes `animation-duration` on `*`.
- Blob colors must reference `var(--color-accent)` and `var(--color-teal)` (not fixed color values), so the component re-colors automatically under all four theme presets with no per-theme code.
- Opacity `0.22` on both blobs (the approved "Option C — more colorful" intensity from brainstorming) — an exact value, not a placeholder to be tuned later.

---

### Task 1: `AmbientBackground.svelte` and layout wiring

**Files:**
- Create: `src/lib/components/AmbientBackground.svelte`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: nothing from other tasks — this is a self-contained, prop-less, stateless component.
- Produces: nothing consumed elsewhere in this plan (a single default export used once in the layout).

- [ ] **Step 1: Create `AmbientBackground.svelte`**

Create `src/lib/components/AmbientBackground.svelte`:

```svelte
<div class="ambient-background" aria-hidden="true">
  <div class="blob accent"></div>
  <div class="blob teal"></div>
</div>

<style>
  .ambient-background {
    position: fixed;
    inset: 0;
    overflow: hidden;
    z-index: -1;
    pointer-events: none;
  }

  .blob {
    position: absolute;
    width: 420px;
    height: 420px;
    border-radius: 50%;
    filter: blur(70px);
    opacity: 0.22;
    animation: ambient-drift 18s ease-in-out infinite alternate;
  }

  .blob.accent {
    background: var(--color-accent);
    top: -140px;
    left: -100px;
  }

  .blob.teal {
    background: var(--color-teal);
    bottom: -160px;
    right: -120px;
    animation-duration: 22s;
    animation-delay: -6s;
  }

  @keyframes ambient-drift {
    0% {
      transform: translate(0, 0) scale(1);
    }
    50% {
      transform: translate(40px, 30px) scale(1.08);
    }
    100% {
      transform: translate(-30px, 20px) scale(0.96);
    }
  }
</style>
```

Note: `aria-hidden="true"` marks this as decorative-only for screen readers, matching the purely visual role described in the spec. `z-index: -1` keeps it behind all normal-flow content without needing every other element in the app to declare a higher `z-index`.

- [ ] **Step 2: Render it once in the root layout**

In `src/routes/+layout.svelte`, find the imports:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Change to:

```ts
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import AmbientBackground from '$lib/components/AmbientBackground.svelte';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Find the `<svelte:head>` block, right before the `<header>` element:

```svelte
<svelte:head>
  {@html webManifestLink}
</svelte:head>

<header
```

Change to:

```svelte
<svelte:head>
  {@html webManifestLink}
</svelte:head>

<AmbientBackground />

<header
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open the home page. Confirm two large, softly-blurred, colorful blobs are visible behind the header/content, slowly drifting, without blocking any clicks (try clicking "New trip" and nav links).
2. Navigate to `/map`, `/stats`, `/settings`, and a trip hub page. Confirm the blobs are present and consistent on every page (same app-wide scope as the paper texture).
3. Open `/settings` and switch through all four themes (Travel Journal, Explorer Night, Golden Sunset, Polar Morning). Confirm the blobs re-color correctly for each — since they reference `var(--color-accent)`/`var(--color-teal)`, no code change should be needed for this to already work; just verify it visually.
4. Resize the browser window and scroll a long page (e.g. `/stats/year` or a trip hub with journal entries). Confirm no horizontal or vertical scrollbar appears as a result of the blobs, and that they don't reposition/jump when scrolling (they should stay fixed to the viewport, not the page content).
5. Toggle `prefers-reduced-motion` (via OS settings or browser devtools emulation) and reload. Confirm the blobs are present but frozen in place, with no drift animation.

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass (this task adds no new test file — `AmbientBackground.svelte` is presentational with no logic to test, matching this project's convention for similar components like `Skeleton.svelte`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/AmbientBackground.svelte src/routes/+layout.svelte
git commit -m "feat: add ambient drifting background blobs"
```

---

## Self-Review Notes

- **Spec coverage:** the two-blob drift animation at the approved intensity (Option C, opacity 0.22), app-wide rendering via the root layout, theme-color reuse via CSS custom properties, and reliance on the existing reduced-motion override — every spec section maps to Step 1/2 above. No other task is needed given the small, single-component scope.
- **Placeholder scan:** no TBD/TODO; the step contains complete, final code including the exact approved opacity and animation timings from the spec.
- **Type consistency:** N/A — this component has no props, exported types, or function signatures for other tasks to consume; it's a single self-contained visual unit.
