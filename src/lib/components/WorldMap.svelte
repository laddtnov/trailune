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
    fill: var(--color-paper-dark, #e4d4ab);
    stroke: var(--color-ink, #3a2e1f);
    stroke-width: 0.5;
    cursor: pointer;
    transition: fill 0.15s ease;
  }
  .world-map :global(path:hover) {
    fill: var(--color-accent-teal, #4a8b7c);
  }
  .world-map :global(path.visited) {
    fill: var(--color-accent-terracotta, #b5532c);
  }
</style>
