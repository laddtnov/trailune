<script lang="ts">
  import type { Trip } from '$lib/types';

  let { trip }: { trip: Trip } = $props();
</script>

<a class="trip-card" href={`/trips/${trip.id}`}>
  <h3>{trip.name}</h3>
  <p>{trip.startDate} &ndash; {trip.endDate}</p>
  <p>{trip.countries.length} {trip.countries.length === 1 ? 'country' : 'countries'}</p>
</a>

<style>
  .trip-card {
    display: block;
    background: var(--color-paper-dark);
    border: 1px solid var(--color-border);
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 12px;
    text-decoration: none;
    color: var(--color-ink);
  }
</style>
