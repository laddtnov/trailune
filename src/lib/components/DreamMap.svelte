<script lang="ts">
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Skeleton from './Skeleton.svelte';
  import { padBBox, type ViewBox } from '$lib/mapZoom';

  let {
    visitedCodes,
    wishlistCodes,
    oncountryclick
  }: {
    visitedCodes: Set<string>;
    wishlistCodes: Set<string>;
    oncountryclick?: (code: string) => void;
  } = $props();

  let svgContainer: HTMLDivElement | undefined = $state();
  let loaded = $state(false);
  let svgEl: SVGSVGElement | undefined;
  let originalViewBox: ViewBox = [0, 0, 2000, 900];

  const viewBoxTween = tweened<ViewBox>([0, 0, 2000, 900], { duration: 500, easing: cubicOut });

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function syncClasses() {
    // Read these props unconditionally (even if we bail out below) so the
    // reactive $effect that calls this function always tracks them as
    // dependencies. Without this, the effect's first runs happen before the
    // SVG paths exist, take the early return below, and never establish
    // visitedCodes/wishlistCodes as dependencies — so later updates (e.g.
    // saving a wishlist entry) never recolor the map.
    const visited = visitedCodes;
    const wishlisted = wishlistCodes;
    if (!svgContainer) return;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.classList.toggle('visited', visited.has(code));
      path.classList.toggle('wishlisted', wishlisted.has(code));
    });
  }

  onMount(async () => {
    const res = await fetch('/world-map.svg');
    const svgText = await res.text();
    if (!svgContainer) return;
    svgContainer.innerHTML = svgText;
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
    syncClasses();
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      if (visitedCodes.has(code)) return;
      path.addEventListener('click', () => {
        oncountryclick?.(code);
        const bbox = (path as unknown as SVGGraphicsElement).getBBox();
        viewBoxTween.set(padBBox(bbox), prefersReducedMotion() ? { duration: 0 } : undefined);
      });
    });
  });

  $effect(() => {
    syncClasses();
  });

  $effect(() => {
    if (svgEl) {
      svgEl.setAttribute('viewBox', $viewBoxTween.join(' '));
    }
  });

  function handleOutsideClick(event: PointerEvent) {
    const target = event.target as Element;
    if (target.closest('path[id]')) return;
    viewBoxTween.set(originalViewBox, prefersReducedMotion() ? { duration: 0 } : undefined);
  }
</script>

<svelte:window onpointerdown={handleOutsideClick} />

{#if !loaded}
  <div style="aspect-ratio: 2000 / 900;">
    <Skeleton width="100%" height="100%" radius="var(--radius-xl)" />
  </div>
{/if}
<div class="world-map" bind:this={svgContainer} class:hidden={!loaded}></div>

<style>
  .world-map.hidden {
    display: none;
  }

  .world-map :global(.world-map-svg) {
    width: 100%;
    height: auto;
  }
  .world-map :global(path) {
    fill: var(--color-ink-band-soft);
    stroke: var(--color-ink-band);
    stroke-width: 0.4;
    transition:
      fill 0.2s var(--ease-out-quart),
      filter 0.2s var(--ease-out-quart);
  }
  .world-map :global(path.wishlisted) {
    fill: var(--color-wishlist);
  }
  .world-map :global(path:not(.visited)) {
    cursor: pointer;
  }
  .world-map :global(path:not(.visited):hover) {
    filter: brightness(1.15);
  }

  @media (prefers-reduced-motion: reduce) {
    .world-map :global(path) {
      transition: fill 0.2s ease;
    }
    .world-map :global(path:not(.visited):hover) {
      filter: none;
    }
  }
</style>
