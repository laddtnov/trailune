<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getTrip, listJournalEntries, addJournalEntry, deleteTripCascade } from '$lib/storage/storage';
  import { getPhoto } from '$lib/storage/photos';
  import type { Trip, JournalEntry } from '$lib/types';
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import DoDontList from '$lib/components/DoDontList.svelte';

  let tripId = $derived(page.params.id);
  let trip: Trip | undefined = $state();
  let entries: JournalEntry[] = $state([]);
  let thumbnails: Record<string, string> = $state({});
  let activeTab: 'journal' | 'packing' | 'dodont' = $state('journal');

  let note = $state('');
  let date = $state('');
  let fileInput: HTMLInputElement | undefined = $state();
  let formError: string | null = $state(null);

  const MAX_PHOTO_BYTES = 8 * 1024 * 1024; // 8MB per photo, generous for phone camera JPEGs while keeping localStorage/IndexedDB usage sane

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
    try {
      await addJournalEntry(tripId, { date, note, photoFiles: files });
    } catch (err) {
      formError =
        'Could not save this entry with photos — your browser may be blocking local photo storage (common in private browsing). Try again without photos, or in a normal browser window.';
      return;
    }
    note = '';
    date = '';
    if (fileInput) fileInput.value = '';
    await loadEntries();
  }

  async function handleDeleteTrip() {
    if (!trip) return;
    const confirmed = confirm(
      `Delete "${trip.name}" and all of its journal entries, photos, packing list, and do's & don'ts? This cannot be undone.`
    );
    if (!confirmed) return;
    await deleteTripCascade(tripId);
    goto('/');
  }
</script>

{#if trip}
  <a href="/">&larr; All trips</a>
  <header class="trip-header">
    <div>
      <h1>{trip.name}</h1>
      <p>{trip.startDate} &ndash; {trip.endDate}</p>
    </div>
    <button class="delete-trip" onclick={handleDeleteTrip}>Delete Trip</button>
  </header>

  <nav class="tabs">
    <button class:active={activeTab === 'journal'} onclick={() => (activeTab = 'journal')}>Journal</button>
    <button class:active={activeTab === 'packing'} onclick={() => (activeTab = 'packing')}>Packing</button>
    <button class:active={activeTab === 'dodont'} onclick={() => (activeTab = 'dodont')}>Do's & Don'ts</button>
  </nav>

  {#if activeTab === 'journal'}
    <section>
      {#if entries.length === 0}
        <p>No journal entries yet.</p>
      {/if}
      {#each entries as entry (entry.id)}
        <a class="entry-card" href={`/trips/${tripId}/entry/${entry.id}`}>
          {#if entry.photoIds[0] && thumbnails[entry.photoIds[0]]}
            <img src={thumbnails[entry.photoIds[0]]} alt="" />
          {/if}
          <div>
            <p class="entry-date">{entry.date}</p>
            <p>{entry.note.slice(0, 120)}</p>
          </div>
        </a>
      {/each}

      <form onsubmit={submitEntry}>
        <label>Date <input type="date" bind:value={date} required /></label>
        <label>Note <textarea bind:value={note} required></textarea></label>
        <label>Photos <input type="file" accept="image/*" multiple bind:this={fileInput} /></label>
        {#if formError}
          <p class="form-error">{formError}</p>
        {/if}
        <button type="submit">Add entry</button>
      </form>
    </section>
  {:else if activeTab === 'packing'}
    <PackingChecklist tripId={tripId} />
  {:else}
    <DoDontList {tripId} />
  {/if}
{:else}
  <p>Trip not found.</p>
{/if}

<style>
  .trip-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .delete-trip {
    flex-shrink: 0;
    background: none;
    border: 1px solid var(--color-accent-terracotta);
    color: var(--color-accent-terracotta);
    border-radius: 6px;
    padding: 6px 12px;
    font-family: var(--font-body);
    cursor: pointer;
    transition: background-color 0.15s ease, color 0.15s ease;
  }
  .delete-trip:hover {
    background: var(--color-accent-terracotta);
    color: var(--color-paper);
  }
  .tabs {
    display: flex;
    gap: 8px;
    margin: 16px 0;
    border-bottom: 1px solid var(--color-border);
  }
  .tabs button {
    background: none;
    border: none;
    padding: 8px 12px;
    font-family: var(--font-body);
  }
  .tabs button.active {
    border-bottom: 2px solid var(--color-accent-terracotta);
    font-weight: bold;
  }
  .entry-card {
    display: flex;
    gap: 12px;
    text-decoration: none;
    color: var(--color-ink);
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border);
  }
  .entry-card img {
    width: 64px;
    height: 64px;
    object-fit: cover;
    border-radius: 6px;
  }
  .form-error {
    color: var(--color-accent-terracotta);
    font-size: 13px;
  }
</style>
