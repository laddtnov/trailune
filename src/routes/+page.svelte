<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips, createTrip } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import type { Trip } from '$lib/types';
  import TripCard from '$lib/components/TripCard.svelte';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let showForm = $state(false);
  let name = $state('');
  let startDate = $state('');
  let endDate = $state('');
  let selectedCountries: Set<string> = $state(new Set());

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
  });

  function toggleCountry(code: string) {
    const next = new Set(selectedCountries);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    selectedCountries = next;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    createTrip({ name, startDate, endDate, countries: Array.from(selectedCountries) });
    trips = listTrips();
    name = '';
    startDate = '';
    endDate = '';
    selectedCountries = new Set();
    showForm = false;
  }
</script>

<h1>Trips</h1>

{#if trips.length === 0}
  <p>No trips yet. Start your first one!</p>
{/if}

<div class="trip-list">
  {#each trips as trip (trip.id)}
    <TripCard {trip} />
  {/each}
</div>

<button onclick={() => (showForm = !showForm)}>{showForm ? 'Cancel' : '+ New Trip'}</button>

{#if showForm}
  <form onsubmit={submit}>
    <label>Name <input bind:value={name} required /></label>
    <label>Start <input type="date" bind:value={startDate} required /></label>
    <label>End <input type="date" bind:value={endDate} required /></label>
    <fieldset>
      <legend>Countries visited</legend>
      <div class="country-grid">
        {#each countries as country (country.code)}
          <label>
            <input
              type="checkbox"
              checked={selectedCountries.has(country.code)}
              onchange={() => toggleCountry(country.code)}
            />
            {country.name}
          </label>
        {/each}
      </div>
    </fieldset>
    <button type="submit">Create Trip</button>
  </form>
{/if}

<style>
  .country-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 4px 12px;
    max-height: 240px;
    overflow-y: auto;
    padding: 8px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
  }
</style>
