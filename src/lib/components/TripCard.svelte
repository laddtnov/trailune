<script lang="ts">
  import type { Trip } from '$lib/types';

  let { trip }: { trip: Trip } = $props();

  function formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatYear(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
  }

  const coverIndex = $derived(
    Math.abs(
      trip.id.split('').reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 7)
    ) % 3
  );

  const covers = [
    'from-[oklch(62%_0.15_35)] to-[oklch(70%_0.13_60)]',
    'from-[oklch(55%_0.1_195)] to-[oklch(64%_0.09_170)]',
    'from-[oklch(58%_0.13_20)] to-[oklch(64%_0.14_45)]'
  ];
</script>

<a
  href={`/trips/${trip.id}`}
  class="group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
>
  <div
    class="relative flex h-28 items-end overflow-hidden bg-gradient-to-br p-4 {covers[coverIndex]}"
  >
    <svg
      class="pointer-events-none absolute -right-4 -top-4 size-24 text-white/15"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path
        d="M21.7 3.3a1 1 0 0 0-1-.24L3.35 8.94a1 1 0 0 0-.06 1.88l7.15 2.74 2.74 7.15a1 1 0 0 0 1.88-.06l5.88-17.35a1 1 0 0 0-.24-1Z"
      />
    </svg>
    <span
      class="rounded-full border border-white/40 bg-black/10 px-3 py-1 font-mono text-xs font-medium tracking-wide text-white backdrop-blur-sm"
    >
      {trip.countries.length}
      {trip.countries.length === 1 ? 'country' : 'countries'}
    </span>
  </div>

  <div class="p-5">
    <h3
      class="truncate font-display text-lg font-bold text-[var(--color-ink)] transition-colors group-hover:text-[var(--color-accent)]"
    >
      {trip.name}
    </h3>
    <p class="mt-1.5 font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
      {formatDate(trip.startDate)} &ndash; {formatDate(trip.endDate)}
      {#if formatYear(trip.startDate)}
        &middot; {formatYear(trip.startDate)}
      {/if}
    </p>
  </div>
</a>
