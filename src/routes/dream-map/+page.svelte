<script lang="ts">
  import { onMount } from 'svelte';
  import DreamMap from '$lib/components/DreamMap.svelte';
  import StarRating from '$lib/components/StarRating.svelte';
  import { listTrips } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import { listWishlist, saveWishlistEntry, deleteWishlistEntry } from '$lib/storage/wishlist';
  import { generateId } from '$lib/utils/id';
  import type { Trip, WishlistEntry } from '$lib/types';

  let trips: Trip[] = $state([]);
  let countries: CountryInfo[] = $state([]);
  let entries: WishlistEntry[] = $state([]);
  let selectedCode: string | null = $state(null);
  let panelRating: number | undefined = $state();
  let panelNote = $state('');

  let visitedCodes = $derived(new Set(trips.flatMap((t) => t.countries)));
  let visibleEntries = $derived(entries.filter((e) => !visitedCodes.has(e.countryCode)));
  let wishlistCodes = $derived(new Set(visibleEntries.map((e) => e.countryCode)));
  let sortedEntries = $derived([...visibleEntries].sort((a, b) => b.rating - a.rating));
  let selectedEntry = $derived(
    selectedCode ? (visibleEntries.find((e) => e.countryCode === selectedCode) ?? null) : null
  );
  let selectedName = $derived(
    selectedCode ? (countries.find((c) => c.code === selectedCode)?.name ?? selectedCode) : ''
  );

  function countryName(code: string): string {
    return countries.find((c) => c.code === code)?.name ?? code;
  }

  onMount(async () => {
    trips = listTrips();
    countries = await loadWorldCountries();
    entries = listWishlist();
  });

  function openPanel(code: string) {
    selectedCode = code;
    const existing = visibleEntries.find((e) => e.countryCode === code);
    panelRating = existing?.rating;
    panelNote = existing?.note ?? '';
  }

  function closePanel() {
    selectedCode = null;
    panelRating = undefined;
    panelNote = '';
  }

  function handleSave() {
    if (!selectedCode || panelRating === undefined) return;
    const existing = visibleEntries.find((e) => e.countryCode === selectedCode);
    const entry: WishlistEntry = {
      id: existing?.id ?? generateId(),
      countryCode: selectedCode,
      rating: panelRating,
      note: panelNote,
      createdAt: existing?.createdAt ?? new Date().toISOString()
    };
    saveWishlistEntry(entry);
    entries = listWishlist();
    closePanel();
  }

  function handleDelete() {
    if (!selectedEntry) return;
    deleteWishlistEntry(selectedEntry.id);
    entries = listWishlist();
    closePanel();
  }
</script>

<div class="mx-auto max-w-3xl px-4 py-8">
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Dream Map</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">
    Countries you haven't visited yet, rated and noted for someday.
  </p>

  <div class="mt-6 rounded-[var(--radius-xl)] bg-[var(--color-ink-band)] p-4">
    <DreamMap {visitedCodes} {wishlistCodes} oncountryclick={openPanel} />
  </div>

  {#if selectedCode}
    <div class="mt-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-[var(--color-ink)]">{selectedName}</h2>
        <button type="button" class="text-sm text-[var(--color-ink-soft)]" onclick={closePanel}>
          Close
        </button>
      </div>
      <div class="mt-3">
        <StarRating bind:value={panelRating} />
      </div>
      <textarea
        bind:value={panelNote}
        placeholder="Why is this a dream destination?"
        rows="2"
        class="mt-3 w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] p-2 text-sm text-[var(--color-ink)]"
      ></textarea>
      <div class="mt-3 flex gap-2">
        <button
          type="button"
          class="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-[var(--color-accent-ink)] disabled:opacity-50"
          disabled={panelRating === undefined}
          onclick={handleSave}
        >
          Save
        </button>
        {#if selectedEntry}
          <button
            type="button"
            class="rounded-[var(--radius-md)] border border-[var(--color-danger)] px-3 py-1.5 text-sm font-medium text-[var(--color-danger)]"
            onclick={handleDelete}
          >
            Delete
          </button>
        {/if}
      </div>
    </div>
  {/if}

  <div class="mt-8">
    <h2 class="font-semibold text-[var(--color-ink)]">Your dream destinations</h2>
    {#if sortedEntries.length === 0}
      <p class="mt-2 text-sm text-[var(--color-ink-soft)]">
        No dream destinations yet — click a country on the map to add one.
      </p>
    {:else}
      <ul class="mt-2 space-y-2">
        {#each sortedEntries as entry (entry.id)}
          <li>
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-card)] px-3 py-2 text-left"
              onclick={() => openPanel(entry.countryCode)}
            >
              <span class="font-medium text-[var(--color-ink)]">{countryName(entry.countryCode)}</span>
              <StarRating value={entry.rating} readonly />
            </button>
            {#if entry.note}
              <p class="mt-1 px-1 text-sm text-[var(--color-ink-soft)]">{entry.note}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
