<script lang="ts">
  import type { Trip, TransportMode } from '$lib/types';

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

  const modeConfig: Record<TransportMode, { gradient: string; icon: 'plane' | 'train' | 'car' | 'boat' | 'bike' }> = {
    flight: { gradient: 'from-[oklch(62%_0.15_35)] to-[oklch(70%_0.13_60)]', icon: 'plane' },
    train: { gradient: 'from-[oklch(55%_0.1_195)] to-[oklch(64%_0.09_170)]', icon: 'train' },
    road: { gradient: 'from-[oklch(58%_0.13_20)] to-[oklch(64%_0.14_45)]', icon: 'car' },
    boat: { gradient: 'from-[oklch(52%_0.1_230)] to-[oklch(62%_0.09_210)]', icon: 'boat' },
    other: { gradient: 'from-[oklch(50%_0.11_145)] to-[oklch(60%_0.1_130)]', icon: 'bike' }
  };

  const mode = $derived(modeConfig[trip.transportMode]);
</script>

<a
  href={`/trips/${trip.id}`}
  class="group block overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-300 ease-[var(--ease-out-quart)] hover:-translate-y-1 hover:shadow-[var(--shadow-card-hover)]"
>
  <div
    class="relative flex h-28 items-end overflow-hidden bg-gradient-to-br p-4 {mode.gradient}"
  >
    {#if mode.icon === 'plane'}
      <svg
        class="mode-icon plane pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M21.7 3.3a1 1 0 0 0-1-.24L3.35 8.94a1 1 0 0 0-.06 1.88l7.15 2.74 2.74 7.15a1 1 0 0 0 1.88-.06l5.88-17.35a1 1 0 0 0-.24-1Z"
        />
      </svg>
    {:else if mode.icon === 'train'}
      <svg
        class="mode-icon train pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <rect x="5" y="3" width="14" height="14" rx="4" />
        <path d="M5 12h14M8 17l-2 3M16 17l2 3" />
        <circle cx="9" cy="15" r="0.8" fill="currentColor" />
        <circle cx="15" cy="15" r="0.8" fill="currentColor" />
      </svg>
    {:else if mode.icon === 'car'}
      <svg
        class="mode-icon car pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <path d="M4 16l1.5-5A2 2 0 0 1 7.4 9.5h9.2A2 2 0 0 1 18.5 11l1.5 5" />
        <rect x="3" y="16" width="18" height="4" rx="1.5" />
        <circle cx="7.5" cy="20" r="1.3" fill="currentColor" />
        <circle cx="16.5" cy="20" r="1.3" fill="currentColor" />
      </svg>
    {:else if mode.icon === 'boat'}
      <svg
        class="mode-icon boat pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <path d="M4 14h16l-2 5H6l-2-5Z" />
        <path d="M8 14V6l7 4-3 1.6M12 3v3" />
      </svg>
    {:else}
      <svg
        class="mode-icon bike pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M6 17l4-8h4l4 8M10 9h4M10 9L8 5h3" />
      </svg>
    {/if}
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

<style>
  .mode-icon {
    transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  }

  :global(.group:hover) .mode-icon.plane {
    transform: translate(-140%, 30%) rotate(-8deg);
  }

  :global(.group:hover) .mode-icon.train,
  :global(.group:hover) .mode-icon.car,
  :global(.group:hover) .mode-icon.bike {
    transform: translateX(-160%);
  }

  :global(.group:hover) .mode-icon.boat {
    transform: translate(-150%, 4px);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .mode-icon.plane,
    :global(.group:hover) .mode-icon.train,
    :global(.group:hover) .mode-icon.car,
    :global(.group:hover) .mode-icon.boat,
    :global(.group:hover) .mode-icon.bike {
      transform: none;
    }
  }
</style>
