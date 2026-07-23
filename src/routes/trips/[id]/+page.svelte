<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getTrip, listJournalEntries, addJournalEntry, deleteTripCascade } from '$lib/storage/storage';
  import { loadWorldCountries, type CountryInfo } from '$lib/countries';
  import DestinationPreview from '$lib/components/DestinationPreview.svelte';
  import { getPhoto } from '$lib/storage/photos';
  import type { Trip, JournalEntry } from '$lib/types';
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import DoDontList from '$lib/components/DoDontList.svelte';
  import TipsList from '$lib/components/TipsList.svelte';
  import StarRating from '$lib/components/StarRating.svelte';
  import PhotoGallery from '$lib/components/PhotoGallery.svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
  import PinsList from '$lib/components/PinsList.svelte';

  let tripId = $derived(page.params.id);
  let trip: Trip | undefined = $state();
  let countries: CountryInfo[] = $state([]);
  let entries: JournalEntry[] = $state([]);
  let thumbnails: Record<string, string> = $state({});
  let activeTab: 'journal' | 'gallery' | 'map' | 'pins' | 'packing' | 'tips' | 'dodont' = $state('journal');

  let note = $state('');
  let date = $state('');
  let rating: number | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();
  let formError: string | null = $state(null);
  let submitting = $state(false);

  const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB per photo, generous for phone camera JPEGs while keeping localStorage/IndexedDB usage sane

  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'map' as const, label: 'Map' },
    { id: 'pins' as const, label: 'Pins' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" }
  ];

  function formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  async function loadEntries() {
    entries = listJournalEntries(tripId).sort((a, b) => b.date.localeCompare(a.date));
    const nextThumbnails = { ...thumbnails };
    for (const entry of entries) {
      for (const photoId of entry.photoIds) {
        if (nextThumbnails[photoId]) continue;
        const photo = await getPhoto(photoId);
        if (photo) nextThumbnails[photoId] = URL.createObjectURL(photo.thumbnailBlob);
      }
    }
    thumbnails = nextThumbnails;
  }

  onMount(async () => {
    trip = getTrip(tripId);
    countries = await loadWorldCountries();
    await loadEntries();
  });

  async function submitEntry(event: SubmitEvent) {
    event.preventDefault();
    formError = null;
    const files = fileInput?.files ? Array.from(fileInput.files) : [];
    const oversized = files.find((f) => f.size > MAX_PHOTO_BYTES);
    if (oversized) {
      formError = `"${oversized.name}" is too large (max 8MB per photo). Please choose a smaller photo.`;
      return;
    }
    submitting = true;
    try {
      await addJournalEntry(tripId, { date, note, photoFiles: files, rating });
    } catch (err) {
      formError =
        'Could not save this entry with photos — your browser may be blocking local photo storage (common in private browsing). Try again without photos, or in a normal browser window.';
      submitting = false;
      return;
    }
    note = '';
    date = '';
    rating = undefined;
    if (fileInput) fileInput.value = '';
    await loadEntries();
    submitting = false;
  }

  async function handleDeleteTrip() {
    if (!trip) return;
    const confirmed = confirm(
      `Delete "${trip.name}" and all of its journal entries, photos, packing list, tips, and do's & don'ts? This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteTripCascade(tripId);
    goto('/');
  }
</script>

{#if trip}
  <a
    href="/"
    class="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-accent)]"
  >
    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
    All trips
  </a>

  <header class="mt-3 flex flex-wrap items-start justify-between gap-4">
    <div>
      <h1 class="font-display text-3xl font-bold sm:text-4xl">{trip.name}</h1>
      <p class="mt-1.5 font-mono text-sm uppercase tracking-wide text-[var(--color-ink-soft)]">
        {formatDate(trip.startDate)} &ndash; {formatDate(trip.endDate)}
      </p>
    </div>
    <button
      type="button"
      onclick={handleDeleteTrip}
      class="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger)]/30 px-3.5 py-2 text-sm font-medium text-[var(--color-danger)] transition-colors hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)]"
    >
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6h16Z"
        />
      </svg>
      Delete trip
    </button>
  </header>

  <DestinationPreview {trip} {countries} />

  <nav class="mt-6 flex gap-1 border-b border-[var(--color-card-border)]">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        onclick={() => (activeTab = tab.id)}
        class="relative px-4 py-2.5 text-sm font-medium transition-colors {activeTab === tab.id
          ? 'text-[var(--color-ink)]'
          : 'text-[var(--color-ink-soft)] hover:text-[var(--color-ink)]'}"
      >
        {tab.label}
        {#if activeTab === tab.id}
          <span class="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-[var(--color-accent)]"></span>
        {/if}
      </button>
    {/each}
  </nav>

  <div class="mt-6">
    {#if activeTab === 'journal'}
      <section class="space-y-6">
        {#if entries.length === 0}
          <div
            class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-10 text-center"
          >
            <p class="text-[var(--color-ink-soft)]">
              No journal entries yet. Add your first note or photo below.
            </p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each entries as entry (entry.id)}
              <a
                href={`/trips/${tripId}/entry/${entry.id}`}
                class="flex overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                {#if entry.photoIds[0] && thumbnails[entry.photoIds[0]]}
                  <img
                    src={thumbnails[entry.photoIds[0]]}
                    alt=""
                    class="w-28 shrink-0 object-cover sm:w-36"
                  />
                {:else}
                  <div
                    class="grid w-28 shrink-0 place-items-center bg-[var(--color-accent-soft)] text-[var(--color-accent)] sm:w-36"
                  >
                    <svg viewBox="0 0 24 24" class="size-8" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 6h16v12H4zM4 16l4.5-4.5a2 2 0 0 1 2.83 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.83 0L20 14"
                      />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                    </svg>
                  </div>
                {/if}
                <div class="flex min-w-0 flex-1 flex-col justify-between gap-2 p-3.5">
                  <div>
                    <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
                      {formatDate(entry.date)}
                    </p>
                    <p class="mt-1 line-clamp-2 text-sm text-[var(--color-ink)]">{entry.note}</p>
                  </div>
                  <StarRating value={entry.rating} readonly />
                </div>
              </a>
            {/each}
          </div>
        {/if}

        <form
          onsubmit={submitEntry}
          class="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
        >
          <h2 class="font-display text-base font-bold">Add an entry</h2>
          <div class="flex flex-wrap gap-4">
            <label class="block">
              <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Date</span>
              <input
                type="date"
                bind:value={date}
                required
                class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
              />
            </label>
            <label class="block flex-1 basis-full sm:basis-auto">
              <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Photos</span>
              <input
                type="file"
                accept="image/*"
                multiple
                bind:this={fileInput}
                class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink-soft)] file:mr-3 file:rounded-full file:border-0 file:bg-[var(--color-accent-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-accent)]"
              />
            </label>
          </div>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Note</span>
            <textarea
              bind:value={note}
              required
              rows="3"
              placeholder="What happened today?"
              class="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
            ></textarea>
          </label>
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Rating (optional)</span>
            <StarRating bind:value={rating} />
          </label>
          {#if formError}
            <p class="rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]">
              {formError}
            </p>
          {/if}
          <button
            type="submit"
            disabled={submitting}
            class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Saving…' : 'Add entry'}
          </button>
        </form>
      </section>
    {:else if activeTab === 'gallery'}
      <PhotoGallery {tripId} />
    {:else if activeTab === 'map'}
      <WorldMap visitedCodes={new Set(trip.countries)} routeCodes={trip.countries} />
    {:else if activeTab === 'pins'}
      <PinsList {tripId} />
    {:else if activeTab === 'packing'}
      <PackingChecklist context={{ type: 'trip', tripId }} />
    {:else if activeTab === 'tips'}
      <TipsList {tripId} />
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
  </div>
{:else}
  <p class="text-[var(--color-ink-soft)]">Trip not found.</p>
{/if}
