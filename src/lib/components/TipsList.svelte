<script lang="ts">
  import { onMount } from 'svelte';
  import { listTips, addTipEntry, deleteTipEntryWithPhoto } from '$lib/storage/storage';
  import { getPhoto } from '$lib/storage/photos';
  import type { TipEntry, TipCategory } from '$lib/types';

  let { tripId }: { tripId: string } = $props();

  const MAX_PHOTO_BYTES = 8 * 1024 * 1024;

  const categories: Array<{ value: TipCategory; label: string }> = [
    { value: 'currency', label: 'Currency' },
    { value: 'avoid', label: 'Avoid' },
    { value: 'transit', label: 'Getting Around' },
    { value: 'sightseeing', label: 'Sightseeing' }
  ];

  let tips: TipEntry[] = $state([]);
  let thumbnails: Record<string, string> = $state({});
  let category: TipCategory = $state('currency');
  let note = $state('');
  let fileInput: HTMLInputElement | undefined = $state();
  let formError: string | null = $state(null);
  let submitting = $state(false);

  async function load() {
    tips = listTips(tripId);
    const nextThumbnails = { ...thumbnails };
    for (const tip of tips) {
      if (!tip.photoId || nextThumbnails[tip.photoId]) continue;
      const photo = await getPhoto(tip.photoId);
      if (photo) nextThumbnails[tip.photoId] = URL.createObjectURL(photo.thumbnailBlob);
    }
    thumbnails = nextThumbnails;
  }

  onMount(load);

  function tipsFor(value: TipCategory): TipEntry[] {
    return tips.filter((t) => t.category === value);
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    formError = null;
    const file = fileInput?.files?.[0] ?? null;
    if (file && file.size > MAX_PHOTO_BYTES) {
      formError = `"${file.name}" is too large (max 8MB per photo). Please choose a smaller photo.`;
      return;
    }
    submitting = true;
    try {
      await addTipEntry(tripId, { category, note, photoFile: file });
    } catch {
      formError =
        'Could not save this tip with a photo — your browser may be blocking local photo storage (common in private browsing). Try again without a photo, or in a normal browser window.';
      submitting = false;
      return;
    }
    note = '';
    if (fileInput) fileInput.value = '';
    await load();
    submitting = false;
  }

  async function remove(id: string) {
    const tip = tips.find((t) => t.id === id);
    await deleteTipEntryWithPhoto(id);
    if (tip?.photoId && thumbnails[tip.photoId]) {
      URL.revokeObjectURL(thumbnails[tip.photoId]);
      const { [tip.photoId]: _removed, ...rest } = thumbnails;
      thumbnails = rest;
    }
    await load();
  }
</script>

<div class="space-y-6">
  {#each categories as cat (cat.value)}
    <section class="rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
      <h3 class="font-display text-base font-bold">{cat.label}</h3>
      {#if tipsFor(cat.value).length === 0}
        <p class="mt-2 text-sm text-[var(--color-ink-soft)]">Nothing here yet.</p>
      {:else}
        <ul class="mt-3 space-y-2">
          {#each tipsFor(cat.value) as tip (tip.id)}
            <li
              class="group flex items-start gap-3 rounded-[var(--radius-md)] px-1.5 py-1.5 transition-colors hover:bg-[var(--color-canvas-dim)]"
            >
              {#if tip.photoId && thumbnails[tip.photoId]}
                <img
                  src={thumbnails[tip.photoId]}
                  alt=""
                  class="size-12 shrink-0 rounded-[var(--radius-md)] object-cover"
                />
              {/if}
              <p class="min-w-0 flex-1 text-sm text-[var(--color-ink)]">{tip.note}</p>
              <button
                type="button"
                onclick={() => remove(tip.id)}
                aria-label="Remove tip"
                class="grid size-6 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100"
              >
                <svg viewBox="0 0 24 24" class="size-3.5" fill="none" stroke="currentColor" stroke-width="2.25">
                  <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    </section>
  {/each}

  <form
    onsubmit={submit}
    class="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
  >
    <h2 class="font-display text-base font-bold">Add a tip</h2>
    <div class="flex flex-wrap gap-4">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Category</span>
        <select
          bind:value={category}
          class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        >
          {#each categories as cat (cat.value)}
            <option value={cat.value}>{cat.label}</option>
          {/each}
        </select>
      </label>
      <label class="block flex-1 basis-full sm:basis-auto">
        <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Photo (optional)</span>
        <input
          type="file"
          accept="image/*"
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
        placeholder="e.g. Best exchange rate near the station, avoid the currency booths at the airport"
        class="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      ></textarea>
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
      {submitting ? 'Saving…' : 'Add tip'}
    </button>
  </form>
</div>
