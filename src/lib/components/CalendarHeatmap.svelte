<script lang="ts">
  import { buildYearWeeks, computeYearHeatmap, assignTripColors } from '$lib/travelCalendar';
  import type { Trip } from '$lib/types';

  let { trips, year }: { trips: Trip[]; year: number } = $props();

  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTH_LABELS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];

  let weeks = $derived(buildYearWeeks(year));
  let heatmapDays = $derived(computeYearHeatmap(trips, year));
  let tripColors = $derived(assignTripColors(trips));
  let dayTripMap = $derived(new Map(heatmapDays.map((day) => [day.date, day.tripId])));
  let tripsById = $derived(new Map(trips.map((trip) => [trip.id, trip])));
  let legendTrips = $derived.by(() => {
    const visibleIds = new Set(heatmapDays.map((day) => day.tripId));
    return trips.filter((trip) => visibleIds.has(trip.id));
  });

  function monthLabelForWeek(weekIndex: number): string {
    const week = weeks[weekIndex];
    const firstDate = week.find((date) => date !== null);
    if (!firstDate) return '';
    const day = Number(firstDate.slice(8, 10));
    if (day > 7) return '';
    return MONTH_LABELS[Number(firstDate.slice(5, 7)) - 1];
  }
</script>

<div class="overflow-x-auto">
  <div class="inline-flex gap-2">
    <div class="flex flex-col gap-1 pt-5 text-xs text-[var(--color-ink-soft)]">
      {#each DAY_LABELS as label (label)}
        <span class="h-3 leading-3">{label}</span>
      {/each}
    </div>
    <div class="flex flex-col">
      <div class="flex gap-1 text-xs text-[var(--color-ink-soft)]">
        {#each weeks as _, weekIndex (weekIndex)}
          <span class="w-3">{monthLabelForWeek(weekIndex)}</span>
        {/each}
      </div>
      <div class="mt-1 flex gap-1">
        {#each weeks as week, weekIndex (weekIndex)}
          <div class="flex flex-col gap-1">
            {#each week as date, dayIndex (dayIndex)}
              {@const tripId = date ? dayTripMap.get(date) : undefined}
              <div
                class="h-3 w-3 rounded-sm {date && !tripId ? 'bg-[var(--color-card-border)]' : ''}"
                style={tripId ? `background-color: ${tripColors.get(tripId)}` : undefined}
                title={date && tripId ? `${tripsById.get(tripId)?.name} · ${date}` : undefined}
              ></div>
            {/each}
          </div>
        {/each}
      </div>
    </div>
  </div>

  {#if legendTrips.length > 0}
    <div class="mt-4 flex flex-wrap gap-3">
      {#each legendTrips as trip (trip.id)}
        <div class="flex items-center gap-1.5 text-sm text-[var(--color-ink-soft)]">
          <span class="h-3 w-3 rounded-sm" style={`background-color: ${tripColors.get(trip.id)}`}></span>
          {trip.name}
        </div>
      {/each}
    </div>
  {/if}
</div>
