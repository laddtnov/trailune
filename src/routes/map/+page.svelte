<script lang="ts">
  import { onMount } from 'svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries } from '$lib/countries';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let totalCountries = $state(0);
  let selectedCode: string | null = $state(null);

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let tripsForSelected = $derived(
    selectedCode ? trips.filter((t) => t.countries.includes(selectedCode as string)) : []
  );

  onMount(async () => {
    trips = listTrips();
    totalCountries = (await loadWorldCountries()).length;
  });

  function handleClick(code: string) {
    selectedCode = code;
  }
</script>

<h1>World Map</h1>
<p>{visitedCodes.size} / {totalCountries} countries visited</p>

<WorldMap {visitedCodes} oncountryclick={handleClick} />

{#if selectedCode}
  <div class="selected-panel">
    <h2>{selectedCode}</h2>
    {#if tripsForSelected.length > 0}
      <ul>
        {#each tripsForSelected as trip (trip.id)}
          <li><a href={`/trips/${trip.id}`}>{trip.name}</a></li>
        {/each}
      </ul>
    {:else}
      <p>Not visited yet.</p>
    {/if}
  </div>
{/if}
