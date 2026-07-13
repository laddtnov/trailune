<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { getJournalEntry, saveJournalEntry, deleteJournalEntryWithPhotos } from '$lib/storage/storage';
  import { getPhoto } from '$lib/storage/photos';
  import type { JournalEntry } from '$lib/types';

  let tripId = $derived(page.params.id);
  let entryId = $derived(page.params.entryId);
  let entry: JournalEntry | undefined = $state();
  let photoUrls: string[] = $state([]);
  let note = $state('');
  let date = $state('');

  onMount(async () => {
    entry = getJournalEntry(entryId);
    if (entry) {
      note = entry.note;
      date = entry.date;
      const urls: string[] = [];
      for (const photoId of entry.photoIds) {
        const photo = await getPhoto(photoId);
        if (photo) urls.push(URL.createObjectURL(photo.blob));
      }
      photoUrls = urls;
    }
  });

  function save(event: SubmitEvent) {
    event.preventDefault();
    if (!entry) return;
    saveJournalEntry({ ...entry, note, date });
    goto(`/trips/${tripId}`);
  }

  async function remove() {
    if (!entry) return;
    await deleteJournalEntryWithPhotos(entry.id);
    goto(`/trips/${tripId}`);
  }
</script>

{#if entry}
  <a href={`/trips/${tripId}`}>&larr; Back to trip</a>
  <div class="photos">
    {#each photoUrls as url}
      <img src={url} alt="" />
    {/each}
  </div>
  <form onsubmit={save}>
    <label>Date <input type="date" bind:value={date} required /></label>
    <label>Note <textarea bind:value={note} required></textarea></label>
    <button type="submit">Save</button>
  </form>
  <button onclick={remove}>Delete entry</button>
{:else}
  <p>Entry not found.</p>
{/if}

<style>
  .photos {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin: 12px 0;
  }
  .photos img {
    width: 160px;
    height: 160px;
    object-fit: cover;
    border-radius: 6px;
  }
</style>
