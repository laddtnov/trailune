<script lang="ts">
  import { computeDestinationPreview } from '$lib/destinationPreview';
  import type { Trip } from '$lib/types';
  import type { CountryInfo } from '$lib/countries';

  let { trip, countries }: { trip: Trip; countries: CountryInfo[] } = $props();

  let entries = $derived(computeDestinationPreview(trip));
  let countryNames = $derived(new Map(countries.map((c) => [c.code, c.name])));

  function formatUtcOffset(hours: number): string {
    const sign = hours < 0 ? '-' : '+';
    const abs = Math.abs(hours);
    const wholeHours = Math.floor(abs);
    const minutes = Math.round((abs - wholeHours) * 60);
    if (minutes === 0) return `UTC${sign}${wholeHours}`;
    return `UTC${sign}${wholeHours}:${String(minutes).padStart(2, '0')}`;
  }
</script>

{#if entries.length > 0}
  <div class="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
    {#each entries as entry (entry.code)}
      <div class="rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
        <h3 class="font-display text-base font-bold">{countryNames.get(entry.code) ?? entry.code}</h3>
        <dl class="mt-2 space-y-1 text-sm text-[var(--color-ink-soft)]">
          <div class="flex justify-between gap-2">
            <dt>Currency</dt>
            <dd class="text-right text-[var(--color-ink)]">{entry.currency.code} &middot; {entry.currency.name}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Timezone</dt>
            <dd class="text-right text-[var(--color-ink)]">{formatUtcOffset(entry.utcOffsetHours)}</dd>
          </div>
          <div class="flex justify-between gap-2">
            <dt>Season</dt>
            <dd class="text-right text-[var(--color-ink)]">{entry.season} &middot; {entry.seasonBlurb}</dd>
          </div>
        </dl>
      </div>
    {/each}
  </div>
{/if}
