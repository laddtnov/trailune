<script lang="ts">
  import { onMount } from 'svelte';

  let {
    visitedCodes,
    oncountryclick
  }: { visitedCodes: Set<string>; oncountryclick?: (code: string) => void } = $props();

  let svgContainer: HTMLDivElement | undefined = $state();

  onMount(async () => {
    const res = await fetch('/world-map.svg');
    const svgText = await res.text();
    if (!svgContainer) return;
    svgContainer.innerHTML = svgText;
    const svg = svgContainer.querySelector('svg');
    svg?.setAttribute('class', 'world-map-svg');
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      path.addEventListener('click', () => oncountryclick?.(path.id));
      path.classList.toggle('visited', visitedCodes.has(path.id));
    });
  });

  $effect(() => {
    if (!svgContainer) return;
    svgContainer.querySelectorAll('path[id]').forEach((path) => {
      path.classList.toggle('visited', visitedCodes.has(path.id));
    });
  });
</script>

<div class="world-map" bind:this={svgContainer}></div>

<style>
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

  @media (prefers-reduced-motion: reduce) {
    .world-map :global(path) {
      transition: fill 0.2s ease;
    }
    .world-map :global(path:hover),
    .world-map :global(path.visited:hover) {
      transform: none;
    }
  }
</style>
