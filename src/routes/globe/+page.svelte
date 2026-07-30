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
