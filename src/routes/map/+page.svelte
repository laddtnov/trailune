<script lang="ts">
  import { onMount } from 'svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let selectedCode: string | null = $state(null);

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let tripsForSelected = $derived(
    selectedCode ? trips.filter((t) => t.countries.includes(selectedCode as string)) : []
  );
  let selectedName = $derived(
    selectedCode ? (countries.find((c) => c.code === selectedCode)?.name ?? selectedCode) : ''
  );

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
  });

  function handleClick(code: string) {
    selectedCode = code;
  }
</script>

<h1>World Map</h1>
<p>{visitedCodes.size} / {countries.length} countries visited</p>

<WorldMap {visitedCodes} oncountryclick={handleClick} />

{#if selectedCode}
  <div class="selected-panel">
    <h2>{selectedName}</h2>
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
