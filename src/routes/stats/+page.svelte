<script lang="ts">
  import { onMount } from 'svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { computeTripStats, type TripStats } from '$lib/tripStats';
  import { getAchievements, type Achievement } from '$lib/achievements';
  import { getLastSeenUnlockedIds, setLastSeenUnlockedIds } from '$lib/storage/achievementViewState';
  import type { Trip } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let stats: TripStats | null = $state(null);
  let achievements: Achievement[] = $state([]);
  let newlyUnlockedIds: Set<string> = $state(new Set());

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    stats = computeTripStats(trips, countries);

    achievements = getAchievements(trips);
    const currentUnlockedIds = new Set(achievements.filter((a) => a.unlocked).map((a) => a.id));
    const lastSeen = getLastSeenUnlockedIds();
    newlyUnlockedIds = new Set([...currentUnlockedIds].filter((id) => !lastSeen.has(id)));
    setLastSeenUnlockedIds(currentUnlockedIds);
  });
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Your stats</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Everything below is derived from the trips you've already logged.</p>
</div>

{#if stats && stats.totalTrips === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <h2 class="font-display text-2xl font-bold">No stats yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
      Log your first trip and your stats will start filling in automatically.
    </p>
    <a
      href="/"
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Log a trip
    </a>
  </div>
{:else if stats}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Countries visited</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalCountries}</p>
      <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.percentWorld}% of the world</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Continents visited</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalContinents}</p>
      <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">of 7</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Trips logged</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalTrips}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Flights taken</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalFlights}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Total days travelled</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.totalDays}</p>
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Longest trip</p>
      {#if stats.longestTrip}
        <p class="mt-1 font-display text-xl font-bold text-[var(--color-accent)]">{stats.longestTrip.name}</p>
        <p class="mt-0.5 text-sm text-[var(--color-ink-soft)]">{stats.longestTrip.days} days</p>
      {/if}
    </div>
    <div class="rounded-[var(--radius-lg)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
      <p class="text-sm text-[var(--color-ink-soft)]">Average trip length</p>
      <p class="mt-1 font-display text-3xl font-bold text-[var(--color-accent)]">{stats.averageTripDays} days</p>
    </div>
  </div>
{/if}

{#if achievements.length > 0}
  <div class="mt-10">
    <h2 class="font-display text-2xl font-bold">Achievements</h2>
    <div class="mt-4 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
      {#each achievements as achievement (achievement.id)}
        <div
          class="rounded-[var(--radius-lg)] p-5 shadow-[var(--shadow-card)] {achievement.unlocked
            ? 'bg-[var(--color-card)]'
            : 'bg-[var(--color-card)]/60'} {newlyUnlockedIds.has(achievement.id) ? 'achievement-revealing' : ''}"
        >
          <div class="flex items-center gap-2">
            {#if achievement.unlocked}
              <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-accent)]" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            {:else}
              <svg viewBox="0 0 24 24" class="size-5 shrink-0 text-[var(--color-ink-soft)]" fill="none" stroke="currentColor" stroke-width="1.6">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
            {/if}
            <p
              class="font-display text-lg font-bold {achievement.unlocked
                ? 'text-[var(--color-ink)]'
                : 'text-[var(--color-ink-soft)]'}"
            >
              {achievement.name}
            </p>
          </div>
          <p class="mt-1.5 text-sm text-[var(--color-ink-soft)]">{achievement.description}</p>
        </div>
      {/each}
    </div>
  </div>
{/if}

<style>
  .achievement-revealing {
    animation: reveal-pulse 0.6s var(--ease-out-quart);
  }

  @keyframes reveal-pulse {
    0% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent);
    }
    50% {
      transform: scale(1.05);
      filter: drop-shadow(0 0 10px color-mix(in oklch, var(--color-accent) 70%, transparent));
    }
    100% {
      transform: scale(1);
      filter: drop-shadow(0 0 0 transparent);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .achievement-revealing {
      animation: none;
    }
  }
</style>
