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
  let saving = $state(false);
  let deleting = $state(false);

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

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!entry) return;
    saving = true;
    saveJournalEntry({ ...entry, note, date });
    goto(`/trips/${tripId}`);
  }

  async function remove() {
    if (!entry) return;
    if (!confirm('Delete this journal entry and its photos? This cannot be undone.')) return;
    deleting = true;
    await deleteJournalEntryWithPhotos(entry.id);
    goto(`/trips/${tripId}`);
  }
</script>

{#if entry}
  <a
    href={`/trips/${tripId}`}
    class="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-accent)]"
  >
    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 18l-6-6 6-6" />
    </svg>
    Back to trip
  </a>

  {#if photoUrls.length > 0}
    <div class="mt-4 grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
      {#each photoUrls as url}
        <img
          src={url}
          alt=""
          class="aspect-square w-full rounded-[var(--radius-lg)] object-cover shadow-[var(--shadow-card)]"
        />
      {/each}
    </div>
  {/if}

  <form
    onsubmit={save}
    class="mt-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
  >
    <label class="block max-w-xs">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Date</span>
      <input
        type="date"
        bind:value={date}
        required
        class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      />
    </label>
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Note</span>
      <textarea
        bind:value={note}
        required
        rows="5"
        class="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      ></textarea>
    </label>
    <div class="flex items-center justify-between">
      <button
        type="button"
        onclick={remove}
        disabled={deleting}
        class="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-danger)]/30 px-3.5 py-2 text-sm font-medium text-[var(--color-danger)] transition-colors hover:border-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? 'Deleting…' : 'Delete entry'}
      </button>
      <button
        type="submit"
        disabled={saving}
        class="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  </form>
{:else}
  <p class="text-[var(--color-ink-soft)]">Entry not found.</p>
{/if}
