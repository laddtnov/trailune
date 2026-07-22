<script lang="ts">
  import { onMount } from 'svelte';
  import { collectTripPhotos, type GalleryPhoto } from '$lib/tripPhotos';

  let { tripId }: { tripId: string } = $props();

  let photos: GalleryPhoto[] = $state([]);
  let thumbnailUrls: Record<string, string> = $state({});
  let fullUrls: Record<string, string> = $state({});
  let lightboxIndex: number | null = $state(null);

  onMount(async () => {
    photos = await collectTripPhotos(tripId);
    const nextThumbnails: Record<string, string> = {};
    const nextFull: Record<string, string> = {};
    for (const photo of photos) {
      nextThumbnails[photo.photoId] = URL.createObjectURL(photo.thumbnailBlob);
      nextFull[photo.photoId] = URL.createObjectURL(photo.blob);
    }
    thumbnailUrls = nextThumbnails;
    fullUrls = nextFull;
  });

  function openLightbox(index: number) {
    lightboxIndex = index;
  }

  function closeLightbox() {
    lightboxIndex = null;
  }

  function navigate(direction: 1 | -1) {
    if (lightboxIndex === null) return;
    lightboxIndex = (lightboxIndex + direction + photos.length) % photos.length;
  }
</script>

{#if photos.length === 0}
  <div
    class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-10 text-center"
  >
    <p class="text-[var(--color-ink-soft)]">
      No photos yet. Photos added to journal entries or tips will show up here.
    </p>
  </div>
{:else}
  <div class="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-3">
    {#each photos as photo, i (photo.photoId)}
      <button
        type="button"
        onclick={() => openLightbox(i)}
        class="aspect-square overflow-hidden rounded-[var(--radius-md)] transition-transform duration-150 ease-out hover:scale-[1.03]"
      >
        <img src={thumbnailUrls[photo.photoId]} alt="" class="size-full object-cover" />
      </button>
    {/each}
  </div>
{/if}

{#if lightboxIndex !== null}
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm" role="dialog" aria-modal="true">
    <button
      type="button"
      onclick={closeLightbox}
      aria-label="Close"
      class="absolute right-6 top-6 grid size-9 place-items-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
    >
      &times;
    </button>
    <button
      type="button"
      onclick={() => navigate(-1)}
      aria-label="Previous photo"
      class="absolute left-6 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-xl text-white transition-colors hover:bg-white/30"
    >
      &lsaquo;
    </button>
    <img
      src={fullUrls[photos[lightboxIndex].photoId]}
      alt=""
      class="max-h-[80vh] max-w-[85vw] rounded-[var(--radius-lg)] object-contain shadow-2xl"
    />
    <button
      type="button"
      onclick={() => navigate(1)}
      aria-label="Next photo"
      class="absolute right-6 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 text-xl text-white transition-colors hover:bg-white/30"
    >
      &rsaquo;
    </button>
    <p class="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-white/85">
      {photos[lightboxIndex].caption}
    </p>
  </div>
{/if}
