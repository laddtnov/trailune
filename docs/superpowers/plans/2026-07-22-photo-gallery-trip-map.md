# Photo Gallery + Trip Map Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add two new tabs to the trip hub — **Gallery** (aggregating photos from journal entries and tips into a grid with a lightbox viewer) and **Map** (a non-interactive highlight of just that trip's countries) — closing out the third slice of `docs/ROADMAP.md` §3.

**Architecture:** A pure aggregation module (`tripPhotos.ts`) collects photo references (with captions) from existing journal entries and tips, entirely reusing existing storage functions. A new `PhotoGallery.svelte` component resolves those references into displayable object URLs and owns the lightbox UI. The Map tab reuses the existing `WorldMap.svelte` component with no new logic.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, TypeScript, Vitest (with the project's existing `fake-indexeddb` test setup for photo storage).

## Global Constraints

- New tab order: Journal, Gallery, Map, Packing, Tips, Do's & Don'ts.
- No per-trip Timeline tab in this cycle — out of scope, left for a future slice.
- Map tab has no click/hover/zoom interactivity — `WorldMap` is used with no `oncountryclick`/`oncountryhover` handlers.
- No new photo upload flow — Gallery is read-only, surfacing already-uploaded photos.
- No changes to `JournalEntry`, `TipEntry`, `Photo`, or any other existing type in `src/lib/types.ts`.
- No new storage functions — reuse `listJournalEntries`, `listTips`, and `getPhoto` exactly as they exist today.
- A tip or entry photo that fails to resolve via `getPhoto` (e.g. a deleted photo) is silently omitted from the gallery, not shown as an error.
- Lightbox prev/next navigation wraps around at the ends of the list (no disabled button state).

---

### Task 1: `tripPhotos.ts` aggregation module

**Files:**
- Create: `src/lib/tripPhotos.ts`
- Test: `src/lib/tripPhotos.test.ts`

**Interfaces:**
- Consumes: `listJournalEntries(tripId: string): JournalEntry[]` and `listTips(tripId: string): TipEntry[]` (both from `$lib/storage/storage`, existing), `getPhoto(id: string): Promise<Photo | undefined>` (from `$lib/storage/photos`, existing).
- Produces: `GalleryPhoto = { photoId: string; thumbnailBlob: Blob; blob: Blob; caption: string }` and `collectTripPhotos(tripId: string): Promise<GalleryPhoto[]>` — both consumed by Task 2's `PhotoGallery.svelte`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/tripPhotos.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { collectTripPhotos } from './tripPhotos';
import { createTrip, addJournalEntry, addTipEntry } from './storage/storage';

beforeEach(() => {
  localStorage.clear();
});

function makeFile(name: string): File {
  return new File([new Blob(['fake'], { type: 'image/jpeg' })], name, { type: 'image/jpeg' });
}

describe('collectTripPhotos', () => {
  it('returns an empty array when the trip has no photos', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No photo', photoFiles: [] });

    expect(await collectTripPhotos(trip.id)).toEqual([]);
  });

  it('aggregates photos from journal entries with a Journal caption', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Cusco',
      photoFiles: [makeFile('cusco.jpg')]
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos).toHaveLength(1);
    expect(photos[0].photoId).toBe(entry.photoIds[0]);
    expect(photos[0].caption).toBe('Journal · Jul 11');
  });

  it('aggregates photos from tips with a Tip caption using the category label', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const tip = await addTipEntry(trip.id, {
      category: 'sightseeing',
      note: 'Machu Picchu at sunrise',
      photoFile: makeFile('machu-picchu.jpg')
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos).toHaveLength(1);
    expect(photos[0].photoId).toBe(tip.photoId);
    expect(photos[0].caption).toBe('Tip · Sightseeing');
  });

  it('orders journal photos before tip photos, most recent journal entry first', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const earlier = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Day 1',
      photoFiles: [makeFile('day1.jpg')]
    });
    const later = await addJournalEntry(trip.id, {
      date: '2026-07-15',
      note: 'Day 5',
      photoFiles: [makeFile('day5.jpg')]
    });
    const tip = await addTipEntry(trip.id, {
      category: 'currency',
      note: 'Use soles',
      photoFile: makeFile('currency.jpg')
    });

    const photos = await collectTripPhotos(trip.id);

    expect(photos.map((p) => p.photoId)).toEqual([later.photoIds[0], earlier.photoIds[0], tip.photoId]);
  });

  it('skips a tip with no photo attached', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addTipEntry(trip.id, { category: 'avoid', note: 'No photo tip', photoFile: null });

    expect(await collectTripPhotos(trip.id)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- tripPhotos.test.ts`
Expected: FAIL — `src/lib/tripPhotos.ts` does not exist yet.

- [ ] **Step 3: Write the implementation**

Create `src/lib/tripPhotos.ts`:

```ts
import { listJournalEntries, listTips } from '$lib/storage/storage';
import { getPhoto } from '$lib/storage/photos';
import type { TipCategory } from '$lib/types';

export interface GalleryPhoto {
  photoId: string;
  thumbnailBlob: Blob;
  blob: Blob;
  caption: string;
}

const TIP_CATEGORY_LABELS: Record<TipCategory, string> = {
  currency: 'Currency',
  avoid: 'Avoid',
  transit: 'Getting Around',
  sightseeing: 'Sightseeing'
};

function formatEntryDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export async function collectTripPhotos(tripId: string): Promise<GalleryPhoto[]> {
  const photos: GalleryPhoto[] = [];

  const entries = listJournalEntries(tripId).sort((a, b) => b.date.localeCompare(a.date));
  for (const entry of entries) {
    for (const photoId of entry.photoIds) {
      const photo = await getPhoto(photoId);
      if (!photo) continue;
      photos.push({
        photoId,
        thumbnailBlob: photo.thumbnailBlob,
        blob: photo.blob,
        caption: `Journal · ${formatEntryDate(entry.date)}`
      });
    }
  }

  const tips = listTips(tripId);
  for (const tip of tips) {
    if (!tip.photoId) continue;
    const photo = await getPhoto(tip.photoId);
    if (!photo) continue;
    photos.push({
      photoId: tip.photoId,
      thumbnailBlob: photo.thumbnailBlob,
      blob: photo.blob,
      caption: `Tip · ${TIP_CATEGORY_LABELS[tip.category]}`
    });
  }

  return photos;
}
```

`collectTripPhotos` deliberately returns raw `Blob`s (not object URLs) — `URL.createObjectURL` is a browser API with no meaningful behavior to unit test, and every other page in this codebase that displays a photo already does that conversion itself at the component level (see `src/routes/trips/[id]/+page.svelte`'s `loadEntries` and the entry detail page's `onMount`). Task 2's `PhotoGallery.svelte` follows the same convention.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- tripPhotos.test.ts`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/lib/tripPhotos.ts src/lib/tripPhotos.test.ts
git commit -m "feat: add trip photo aggregation module"
```

---

### Task 2: `PhotoGallery.svelte` and trip hub wiring

**Files:**
- Create: `src/lib/components/PhotoGallery.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: `collectTripPhotos` and `GalleryPhoto` from Task 1's `src/lib/tripPhotos.ts`; `WorldMap.svelte` (existing, takes `visitedCodes: Set<string>`).
- Produces: `PhotoGallery.svelte` with a single required prop `{ tripId: string }` — a self-contained unit, nothing later depends on its internals.

- [ ] **Step 1: Create `PhotoGallery.svelte`**

Create `src/lib/components/PhotoGallery.svelte`:

```svelte
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
```

Note: `navigate`'s `(direction + photos.length) % photos.length` wraps around at both ends — going "previous" from index 0 lands on the last photo, going "next" from the last photo lands on index 0, matching the spec's wraparound requirement.

- [ ] **Step 2: Wire the new tabs into the trip hub**

In `src/routes/trips/[id]/+page.svelte`, add the imports alongside the existing component imports:

```ts
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import DoDontList from '$lib/components/DoDontList.svelte';
  import TipsList from '$lib/components/TipsList.svelte';
  import StarRating from '$lib/components/StarRating.svelte';
  import PhotoGallery from '$lib/components/PhotoGallery.svelte';
  import WorldMap from '$lib/components/WorldMap.svelte';
```

Change the `activeTab` type declaration:

```ts
  let activeTab: 'journal' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

to:

```ts
  let activeTab: 'journal' | 'gallery' | 'map' | 'packing' | 'tips' | 'dodont' = $state('journal');
```

Change the `tabs` array:

```ts
  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" }
  ];
```

to:

```ts
  const tabs = [
    { id: 'journal' as const, label: 'Journal' },
    { id: 'gallery' as const, label: 'Gallery' },
    { id: 'map' as const, label: 'Map' },
    { id: 'packing' as const, label: 'Packing' },
    { id: 'tips' as const, label: 'Tips' },
    { id: 'dodont' as const, label: "Do's & Don'ts" }
  ];
```

Change the tab-content branch chain at the end of the template:

```svelte
    {:else if activeTab === 'packing'}
      <PackingChecklist tripId={tripId} />
    {:else if activeTab === 'tips'}
      <TipsList {tripId} />
    {:else}
      <DoDontList {tripId} />
    {/if}
```

to:

```svelte
    {:else if activeTab === 'gallery'}
      <PhotoGallery {tripId} />
    {:else if activeTab === 'map'}
      <WorldMap visitedCodes={new Set(trip.countries)} />
    {:else if activeTab === 'packing'}
      <PackingChecklist tripId={tripId} />
    {:else if activeTab === 'tips'}
      <TipsList {tripId} />
    {:else if activeTab === 'dodont'}
      <DoDontList {tripId} />
    {/if}
```

(The final branch changes from a bare `{:else}` to an explicit `{:else if activeTab === 'dodont'}` — now that there are more possible tab values, an explicit check is clearer than relying on "everything else falls through to Do's & Don'ts".)

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass — this task adds no new test file (no unit tests for Svelte components in this codebase; `PhotoGallery.svelte`'s only real logic, `collectTripPhotos`, is already tested in Task 1).

- [ ] **Step 4: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open a trip that has photos on both journal entries and tips. Confirm the trip hub's tab order is Journal, Gallery, Map, Packing, Tips, Do's & Don'ts.
2. Open the Gallery tab. Confirm all photos from both journal entries and tips appear in the grid.
3. Click a photo. Confirm the lightbox opens showing that photo full-size with its caption ("Journal · [date]" or "Tip · [category]").
4. Click next/previous repeatedly, including past the first and last photo, to confirm wraparound works. Click close (or click outside — whichever the implementation supports) to confirm the lightbox closes.
5. Open a trip with no photos at all. Confirm the Gallery tab shows the "No photos yet" empty state.
6. Open the Map tab. Confirm only that trip's countries are highlighted (not the full set of countries visited across all trips), and confirm there's no click/hover popover behavior (clicking a country does nothing).
7. Switch through all four theme presets on `/settings` and revisit both new tabs. Confirm the gallery grid, lightbox, and map colors all read correctly in each theme.

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/PhotoGallery.svelte "src/routes/trips/[id]/+page.svelte"
git commit -m "feat: add photo gallery and trip map tabs"
```

---

## Self-Review Notes

- **Spec coverage:** the Gallery tab's photo aggregation from both sources with source-identifying captions (Task 1), the lightbox with prev/next wraparound navigation (Task 2 Step 1), the Map tab's non-interactive country highlight reusing `WorldMap` (Task 2 Step 2), the new tab order (Task 2 Step 2), the empty state (Task 2 Step 1), the skip-missing-photo edge case (Task 1's `if (!photo) continue`), and the full manual test matrix from the spec's Testing section (Task 2 Step 4) are all covered. The per-trip Timeline tab is correctly absent, matching the spec's explicit non-goal.
- **Placeholder scan:** no TBD/TODO; every step contains complete, final code.
- **Type consistency:** `GalleryPhoto` (Task 1) is consumed identically in Task 2's `PhotoGallery.svelte` (`photos: GalleryPhoto[]`, `photo.photoId`, `photo.thumbnailBlob`, `photo.blob`, `photo.caption`); `collectTripPhotos(tripId: string): Promise<GalleryPhoto[]>`'s signature matches its only call site in `onMount`.
- **Resolved ambiguity:** the spec's architecture section described `GalleryPhoto` more abstractly (a single `url` field). This plan splits that into `thumbnailBlob`/`blob` raw `Blob`s returned by the pure module, with `URL.createObjectURL` conversion happening in the Svelte component — this preserves every behavior the spec describes (captions, ordering, skip-missing-photo) while keeping `tripPhotos.ts` fully unit-testable without a browser environment's object-URL APIs, and matches this codebase's existing convention (every other page already does this same blob-to-URL conversion at the component level, never in a shared lib function).
