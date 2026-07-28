<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import Skeleton from './Skeleton.svelte';
  import { padBBox, type ViewBox } from '$lib/mapZoom';
  import { computeArcPath } from '$lib/flightRoute';
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

  function applyIntensityClass(path: Element, code: string) {
    const tier = getIntensityTier(visitCounts.get(code) ?? 0);
    path.classList.toggle('intensity-1', tier === 1);
    path.classList.toggle('intensity-2', tier === 2);
    path.classList.toggle('intensity-3', tier === 3);
  }

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
    rect.style.fill = 'var(--color-ink-band-soft)';
    pattern.appendChild(rect);

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '0');
    line.setAttribute('x2', '0');
    line.setAttribute('y2', '8');
    line.style.stroke = 'var(--color-ink-band)';
    line.style.strokeWidth = '2';
    pattern.appendChild(line);

    defs.appendChild(pattern);
  }

  onMount(async () => {
    const res = await fetch('/world-map.svg');
    const svgText = await res.text();
    if (!svgContainer) return;
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    if (svg) {
      injectScratchPattern(svg as unknown as SVGSVGElement);
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

    const group = document.createElementNS(svgNS, 'g');
    group.setAttribute('class', 'flight-route');
    svg.appendChild(group);

    const reduced = prefersReducedMotion();
    const legCount = points.length - 1;
    const totalRouteBudgetMs = 3000;
    const legDuration = Math.min(800, Math.max(80, totalRouteBudgetMs / legCount));
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

  .world-map :global(path.unvisited-coating) {
    fill: url(#scratch-coating);
  }

  .world-map :global(path.scratch-overlay) {
    pointer-events: none;
    transition: clip-path 0.1s linear;
  }

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
