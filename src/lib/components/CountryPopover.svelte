<script lang="ts">
  import type { CountryStats } from '$lib/countryStats';

  let {
    countryName,
    stats,
    x,
    y,
    onviewtrips
  }: {
    countryName: string;
    stats: CountryStats;
    x: number;
    y: number;
    onviewtrips?: () => void;
  } = $props();
</script>

<div
  class="country-popover"
  style={`left: ${x}px; top: ${y}px;`}
  role="status"
>
  <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">Visited</p>
  <h3 class="mt-0.5 font-display text-base font-bold">{countryName}</h3>
  <p class="mt-1 text-sm text-[var(--color-ink-soft)]">
    {stats.visitCount}
    {stats.visitCount === 1 ? 'trip' : 'trips'} &middot; {stats.totalDays}
    {stats.totalDays === 1 ? 'day' : 'days'} &middot; Longest stay {stats.longestStayDays}
    {stats.longestStayDays === 1 ? 'day' : 'days'}
  </p>
  <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">
    {#if stats.firstVisitYear === stats.lastVisitYear}
      Visited in {stats.firstVisitYear}
    {:else}
      First visited {stats.firstVisitYear} &middot; Last visited {stats.lastVisitYear}
    {/if}
  </p>
  {#if onviewtrips}
    <button
      type="button"
      class="mt-2 text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
      onclick={onviewtrips}
    >
      View trips &rarr;
    </button>
  {/if}
</div>

<style>
  .country-popover {
    position: fixed;
    z-index: 30;
    max-width: 16rem;
    transform: translate(-50%, calc(-100% - 0.75rem));
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-card-border);
    background: var(--color-card);
    padding: 0.75rem 1rem;
    box-shadow: var(--shadow-pop);
    pointer-events: auto;
  }
</style>
