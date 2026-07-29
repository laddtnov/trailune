# Trip Hero Images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Home page `TripCard`s show a real photo as their header background — the first photo from the earliest-dated journal entry that has one — instead of today's gradient, with the gradient still shown as a fallback for trips with no qualifying photo.

**Architecture:** A new pure-ish read function `getTripHeroPhoto(tripId)` added to `src/lib/tripPhotos.ts` (alongside the existing `collectTripPhotos`), then `TripCard.svelte` calls it on mount, converts the returned thumbnail blob to an object URL, and renders it as the header's background image with a dark scrim overlay for legibility — falling back to the existing gradient when there's no hero photo.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest.

## Global Constraints

- No new `Trip` schema field and no cover-photo upload UI — the hero image is derived entirely from existing journal-entry photo data (spec: Non-goals).
- Only journal-entry photos are considered as hero-image candidates — tip photos are excluded (spec: Non-goals, Edge cases).
- No changes to `collectTripPhotos` or `PhotoGallery.svelte` — this is a new, separate read path (spec: Non-goals).
- Scoped to the home page's `TripCard.svelte` only — the trip hub page's (`/trips/[id]`) own header is untouched this cycle (spec: Non-goals).
- Trips with no qualifying journal photo must render the existing gradient exactly as before — no visual regression (spec: Goals, Edge cases).
- The object URL created for the hero photo must be revoked on component destroy to avoid leaking blob URLs (spec: Architecture).

---

### Task 1: `getTripHeroPhoto` helper

**Files:**
- Modify: `src/lib/tripPhotos.ts`
- Test: `src/lib/tripPhotos.test.ts`

**Interfaces:**
- Consumes: existing `listJournalEntries` (from `$lib/storage/storage`), existing `getPhoto` (from `$lib/storage/photos`) — both already imported in `tripPhotos.ts`.
- Produces: `export interface HeroPhoto { photoId: string; thumbnailBlob: Blob; }` and `export async function getTripHeroPhoto(tripId: string): Promise<HeroPhoto | undefined>` — used by Task 2's `TripCard.svelte`.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/tripPhotos.test.ts`, after the existing `makeFile` helper and before the `describe('collectTripPhotos', ...)` block:

```ts
import { getTripHeroPhoto } from './tripPhotos';
```

(Add this to the existing top-of-file import line, so it reads:)

```ts
import { collectTripPhotos, getTripHeroPhoto } from './tripPhotos';
```

Then add a new describe block after the existing `collectTripPhotos` describe block's closing `});`:

```ts
describe('getTripHeroPhoto', () => {
  it('returns undefined when the trip has no journal entries', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });

  it('returns undefined when journal entries exist but none have photos', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No photo', photoFiles: [] });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });

  it('returns the first photo when only one entry has a photo', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Cusco',
      photoFiles: [makeFile('cusco.jpg')]
    });

    const hero = await getTripHeroPhoto(trip.id);

    expect(hero?.photoId).toBe(entry.photoIds[0]);
  });

  it('returns the earliest-dated entry\'s photo, even if it was added to storage after a later-dated entry', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-01', endDate: '2026-07-20', countries: ['PE'] });
    const later = await addJournalEntry(trip.id, {
      date: '2026-07-15',
      note: 'Day 5',
      photoFiles: [makeFile('day5.jpg')]
    });
    const earlier = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Day 1',
      photoFiles: [makeFile('day1.jpg')]
    });

    const hero = await getTripHeroPhoto(trip.id);

    expect(hero?.photoId).toBe(earlier.photoIds[0]);
    expect(hero?.photoId).not.toBe(later.photoIds[0]);
  });

  it('ignores tip photos when the trip has no journal photo', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-15', countries: ['PE'] });
    await addTipEntry(trip.id, {
      category: 'sightseeing',
      note: 'Machu Picchu at sunrise',
      photoFile: makeFile('machu-picchu.jpg')
    });

    expect(await getTripHeroPhoto(trip.id)).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/tripPhotos.test.ts`
Expected: FAIL — `getTripHeroPhoto` is not exported from `./tripPhotos`

- [ ] **Step 3: Implement the helper**

In `src/lib/tripPhotos.ts`, add after the existing `GalleryPhoto` interface (before `TIP_CATEGORY_LABELS`):

```ts
export interface HeroPhoto {
  photoId: string;
  thumbnailBlob: Blob;
}
```

Then add after the existing `collectTripPhotos` function (at the end of the file):

```ts
export async function getTripHeroPhoto(tripId: string): Promise<HeroPhoto | undefined> {
  const entries = listJournalEntries(tripId).sort((a, b) => a.date.localeCompare(b.date));
  for (const entry of entries) {
    if (entry.photoIds.length === 0) continue;
    const photo = await getPhoto(entry.photoIds[0]);
    if (photo) return { photoId: entry.photoIds[0], thumbnailBlob: photo.thumbnailBlob };
  }
  return undefined;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/tripPhotos.test.ts`
Expected: PASS — all tests in the file green, including the five new ones

- [ ] **Step 5: Commit**

```bash
git add src/lib/tripPhotos.ts src/lib/tripPhotos.test.ts
git commit -m "feat: add getTripHeroPhoto for trip hero images"
```

---

### Task 2: Hero image on `TripCard`

**Files:**
- Modify: `src/lib/components/TripCard.svelte`

**Interfaces:**
- Consumes: `getTripHeroPhoto` and `type HeroPhoto` from `$lib/tripPhotos` (Task 1).
- Produces: nothing consumed by later tasks — this is the only remaining task.

- [ ] **Step 1: Import dependencies and add hero-photo state**

In `src/lib/components/TripCard.svelte`, replace:

```svelte
<script lang="ts">
  import type { Trip, TransportMode } from '$lib/types';

  let { trip, stamping = false }: { trip: Trip; stamping?: boolean } = $props();
```

with:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type { Trip, TransportMode } from '$lib/types';
  import { getTripHeroPhoto } from '$lib/tripPhotos';

  let { trip, stamping = false }: { trip: Trip; stamping?: boolean } = $props();

  let heroPhotoUrl: string | undefined = $state(undefined);
  let destroyed = false;

  onMount(async () => {
    const hero = await getTripHeroPhoto(trip.id);
    if (destroyed || !hero) return;
    heroPhotoUrl = URL.createObjectURL(hero.thumbnailBlob);
  });

  onDestroy(() => {
    destroyed = true;
    if (heroPhotoUrl) URL.revokeObjectURL(heroPhotoUrl);
  });
```

- [ ] **Step 2: Render the photo background and scrim**

Replace:

```svelte
  <div
    class="relative flex h-28 items-end overflow-hidden bg-gradient-to-br p-4 {mode.gradient}"
  >
```

with:

```svelte
  <div
    class="relative flex h-28 items-end overflow-hidden bg-gradient-to-br bg-cover bg-center p-4 {mode.gradient}"
    style={heroPhotoUrl ? `background-image: url('${heroPhotoUrl}')` : undefined}
  >
    {#if heroPhotoUrl}
      <div class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent"></div>
    {/if}
```

The inline `style` attribute's `background-image` overrides the Tailwind gradient utility's own `background-image` due to CSS specificity (inline styles beat classes), so no conditional class toggling is needed — when `heroPhotoUrl` is `undefined`, the style attribute is `undefined` (renders no `style` attribute at all) and the existing gradient classes render unchanged. The scrim `<div>` is only added to the DOM when there's a photo, and being earlier in document order than the existing mode-icon `<svg>` and country-count `<span>` (both already `position: absolute`/inline without explicit `z-index`), it paints beneath them without needing any `z-index` change.

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions)

- [ ] **Step 4: Run svelte-check**

Run: `npm run check`
Expected: same error count as the `main` baseline (no new errors)

- [ ] **Step 5: Manually verify in the browser**

Start the dev server, seed a trip and add a journal entry with a photo via the app's UI (or via `localStorage`/IndexedDB seeding), and confirm on the home page:
- A trip with a journal photo shows that photo as its card header background, with the transport-mode icon and country-count badge still clearly legible over the dark scrim.
- A trip with no journal entries, or with journal entries but no photos, still shows the original gradient header exactly as before.
- A trip whose only photo is on a tip (not a journal entry) still shows the gradient, not that photo.
- No console errors related to object URLs when navigating away from and back to the home page.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TripCard.svelte
git commit -m "feat: show first journal photo as trip card hero image"
```
