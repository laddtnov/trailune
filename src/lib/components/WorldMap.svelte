<script lang="ts">
  import { onMount, tick } from 'svelte';
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

  let svgContainer: HTMLDivElement | undefined = $state();
  let lastPointerType = 'mouse';
  let loaded = $state(false);
  let svgEl: SVGSVGElement | undefined;
  let originalViewBox: ViewBox = [0, 0, 2000, 900];

  const viewBoxTween = tweened<ViewBox>([0, 0, 2000, 900], { duration: 500, easing: cubicOut });

  function prefersReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  let revealIndex = 0;

  function applyRevealClass(path: Element, code: string) {
    if (!newlyVisitedCodes.has(code)) return;
    const delay = revealIndex * 80;
    revealIndex += 1;
    setTimeout(() => {
      path.classList.add('revealing');
      setTimeout(() => path.classList.remove('revealing'), 600);
    }, delay);
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
    revealIndex = 0;
    if (svg) {
      // Wait for Svelte to flush the `hidden` class removal before measuring
      // path geometry — getBBox() reads zero-size boxes while the container
      // (and thus the SVG) is still display:none.
      await tick();
      buildFlightRoute(svg as unknown as SVGSVGElement);
    }
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      const code = path.id;
      path.addEventListener('pointerdown', (e) => {
        const pe = e as PointerEvent;
        lastPointerType = pe.pointerType;
        if (pe.pointerType === 'touch' || pe.pointerType === 'pen') {
          oncountryhover?.(code, { x: pe.clientX, y: pe.clientY });
        }
      });
      path.addEventListener('click', () => {
        if (lastPointerType === 'touch' || lastPointerType === 'pen') return;
        oncountryclick?.(code);
        const bbox = (path as unknown as SVGGraphicsElement).getBBox();
        viewBoxTween.set(padBBox(bbox), prefersReducedMotion() ? { duration: 0 } : undefined);
      });
      path.addEventListener('pointerenter', (e) => {
        const pe = e as PointerEvent;
        if (pe.pointerType !== 'mouse') return;
        oncountryhover?.(code, { x: pe.clientX, y: pe.clientY });
      });
      path.addEventListener('pointerleave', (e) => {
        const pe = e as PointerEvent;
        if (pe.pointerType !== 'mouse') return;
        oncountryhover?.(null, null);
      });
      path.classList.toggle('visited', visitedCodes.has(code));
      applyRevealClass(path, code);
    });
  });

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
    const target = event.target as Element;
    if (target.closest('path[id]') || target.closest('.country-popover')) return;
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
    cursor: pointer;
    transform-box: fill-box;
    transform-origin: center;
    transition:
      fill 0.2s var(--ease-out-quart),
      transform 0.2s var(--ease-out-quart),
      filter 0.2s var(--ease-out-quart);
  }
  .world-map :global(path:hover) {
    fill: var(--color-teal);
    transform: scale(1.015);
  }
  .world-map :global(path.visited) {
    fill: var(--color-accent);
    filter: drop-shadow(0 0 6px color-mix(in oklch, var(--color-accent) 55%, transparent));
  }
  .world-map :global(path.visited:hover) {
    fill: var(--color-accent-hover);
    transform: scale(1.02);
  }

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
