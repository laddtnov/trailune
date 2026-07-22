# Diary-Style Journal Reframe Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional 1-5 star rating to journal entries and replace the trip hub's thin journal list row with a postcard-split card (photo left, date/note/stars right), closing out the first slice of `docs/ROADMAP.md` §3.

**Architecture:** A new `rating?: number` field on `JournalEntry`, threaded through the existing `addJournalEntry`/`saveJournalEntry` storage functions with no new storage APIs. A single new presentational component, `StarRating.svelte`, supports both an interactive (click-to-set) mode used in the two forms and a read-only mode used in the list card — both modes render nothing when the rating is unset.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes (`$state`, `$props`, `$bindable`), TypeScript, Vitest.

## Global Constraints

- `rating` is optional (`number | undefined`) on `JournalEntry` — no migration, existing entries simply lack it.
- Rating range is 1-5 stars only — no mood-emoji picker.
- An unset rating renders as no star row at all, never as 5 empty/outline stars — this applies everywhere the rating is displayed.
- Clicking the currently-set star again clears the rating back to unset (the only way to unset — no separate "clear" control).
- Photo-less entries in the new postcard layout reuse the existing image-placeholder icon and tinted background from today's journal row — no new icon asset.
- No changes to photo storage, journal entry deletion, or any other existing journal behavior beyond the rating field and the card layout.
- No new storage functions — `addJournalEntry` and `saveJournalEntry` gain the `rating` field as an addition to their existing signatures/behavior.

---

### Task 1: `rating` field on `JournalEntry` and storage plumbing

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage/storage.ts:72-98`
- Test: `src/lib/storage/storage.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks — this is the foundational data-layer task.
- Produces: `JournalEntry.rating?: number` (consumed by Task 2's UI code) and `addJournalEntry(tripId, { date, note, photoFiles, rating? })` (consumed by Task 2's add-entry form).

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/storage/storage.test.ts`, inside the existing `describe('addJournalEntry', ...)` block (after its existing two tests):

```ts
  it('persists an optional rating', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, {
      date: '2026-07-11',
      note: 'Rated day',
      photoFiles: [],
      rating: 4
    });
    expect(entry.rating).toBe(4);
  });

  it('leaves rating undefined when not provided', async () => {
    const trip = createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    const entry = await addJournalEntry(trip.id, { date: '2026-07-11', note: 'No rating', photoFiles: [] });
    expect(entry.rating).toBeUndefined();
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- storage.test.ts`
Expected: FAIL — `rating` does not exist on the type passed to `addJournalEntry`'s `input`, and/or `entry.rating` is `undefined` vs the test comparing to `4` because the field isn't threaded through yet (TypeScript compile error is also an acceptable failure mode here since `rating` isn't a known property yet).

- [ ] **Step 3: Add `rating` to `JournalEntry`**

In `src/lib/types.ts`, change:

```ts
export interface JournalEntry {
  id: string;
  tripId: string;
  date: string;
  note: string;
  photoIds: string[];
}
```

to:

```ts
export interface JournalEntry {
  id: string;
  tripId: string;
  date: string;
  note: string;
  photoIds: string[];
  rating?: number;
}
```

- [ ] **Step 4: Thread `rating` through `addJournalEntry`**

In `src/lib/storage/storage.ts`, change:

```ts
export async function addJournalEntry(
  tripId: string,
  input: { date: string; note: string; photoFiles: File[] }
): Promise<JournalEntry> {
```

to:

```ts
export async function addJournalEntry(
  tripId: string,
  input: { date: string; note: string; photoFiles: File[]; rating?: number }
): Promise<JournalEntry> {
```

and change:

```ts
  const entry: JournalEntry = {
    id: generateId(),
    tripId,
    date: input.date,
    note: input.note,
    photoIds
  };
  trips.saveJournalEntry(entry);
  return entry;
}
```

to:

```ts
  const entry: JournalEntry = {
    id: generateId(),
    tripId,
    date: input.date,
    note: input.note,
    photoIds,
    rating: input.rating
  };
  trips.saveJournalEntry(entry);
  return entry;
}
```

`trips.saveJournalEntry` (used both here and by the entry-edit page) already accepts and persists a full `JournalEntry` object, so it needs no changes — it will start persisting whatever `rating` value is on the object it's given.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- storage.test.ts`
Expected: PASS (all tests in the file, including the two new ones)

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass — no other test references `JournalEntry`'s field list exhaustively.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/storage/storage.ts src/lib/storage/storage.test.ts
git commit -m "feat: add optional rating field to journal entries"
```

---

### Task 2: `StarRating.svelte` component and UI wiring

**Files:**
- Create: `src/lib/components/StarRating.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`
- Modify: `src/routes/trips/[id]/entry/[entryId]/+page.svelte`

**Interfaces:**
- Consumes: `JournalEntry.rating?: number` and `addJournalEntry`'s `rating?: number` input field, both produced by Task 1.
- Produces: `StarRating` component with props `{ value?: number; readonly?: boolean }` (bindable `value`) — a self-contained unit, nothing later depends on its internals.

- [ ] **Step 1: Create `StarRating.svelte`**

Create `src/lib/components/StarRating.svelte`:

```svelte
<script lang="ts">
  let {
    value = $bindable<number | undefined>(undefined),
    readonly = false
  }: { value?: number; readonly?: boolean } = $props();

  function setRating(star: number) {
    if (readonly) return;
    value = value === star ? undefined : star;
  }
</script>

{#if value !== undefined || !readonly}
  <div
    class="star-rating"
    role={readonly ? undefined : 'radiogroup'}
    aria-label={readonly ? undefined : 'Rating'}
  >
    {#each [1, 2, 3, 4, 5] as star (star)}
      {#if readonly}
        <span class="star" class:filled={value !== undefined && star <= value}>★</span>
      {:else}
        <button
          type="button"
          class="star-button"
          class:filled={value !== undefined && star <= value}
          onclick={() => setRating(star)}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={value === star}
        >★</button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .star-rating {
    display: inline-flex;
    gap: 2px;
  }

  .star {
    font-size: 0.95rem;
    line-height: 1;
    color: var(--color-card-border);
  }

  .star.filled {
    color: var(--color-accent);
  }

  .star-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--color-card-border);
    transition:
      color 0.15s ease,
      transform 0.15s ease;
  }

  .star-button:hover {
    transform: scale(1.15);
  }

  .star-button.filled {
    color: var(--color-accent);
  }
</style>
```

Note: `value !== undefined || !readonly` is the "render nothing when unset AND read-only" rule from the spec — an interactive picker always renders (so there's something to click), but a read-only display with no rating renders nothing at all.

Note: clicking the already-selected star sets `value` back to `undefined` (the `value === star ? undefined : star` line) — this is the spec's "clear a rating" interaction; there is no separate clear control.

- [ ] **Step 2: Wire into the trip hub's Journal tab — list card and add-entry form**

In `src/routes/trips/[id]/+page.svelte`, add the import alongside the existing component imports:

```ts
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import DoDontList from '$lib/components/DoDontList.svelte';
  import TipsList from '$lib/components/TipsList.svelte';
  import StarRating from '$lib/components/StarRating.svelte';
```

Add a `rating` state variable alongside the existing form state:

```ts
  let note = $state('');
  let date = $state('');
  let rating: number | undefined = $state();
  let fileInput: HTMLInputElement | undefined = $state();
```

In `submitEntry`, pass `rating` through and reset it after a successful save:

```ts
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
```

Replace the entry list card markup:

```svelte
          <div class="space-y-3">
            {#each entries as entry (entry.id)}
              <a
                href={`/trips/${tripId}/entry/${entry.id}`}
                class="flex gap-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)]"
              >
                {#if entry.photoIds[0] && thumbnails[entry.photoIds[0]]}
                  <img
                    src={thumbnails[entry.photoIds[0]]}
                    alt=""
                    class="size-16 shrink-0 rounded-[var(--radius-md)] object-cover"
                  />
                {:else}
                  <div
                    class="grid size-16 shrink-0 place-items-center rounded-[var(--radius-md)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-6" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 6h16v12H4zM4 16l4.5-4.5a2 2 0 0 1 2.83 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.83 0L20 14"
                      />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                    </svg>
                  </div>
                {/if}
                <div class="min-w-0 py-0.5">
                  <p class="font-mono text-xs uppercase tracking-wide text-[var(--color-ink-soft)]">
                    {formatDate(entry.date)}
                  </p>
                  <p class="mt-1 line-clamp-2 text-sm text-[var(--color-ink)]">{entry.note}</p>
                </div>
              </a>
            {/each}
          </div>
```

with:

```svelte
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
```

Add the rating picker to the "Add an entry" form, right after the Note label/textarea block and before the `{#if formError}` block:

```svelte
          <label class="block">
            <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Rating (optional)</span>
            <StarRating bind:value={rating} />
          </label>
          {#if formError}
```

- [ ] **Step 3: Wire into the entry detail/edit page**

In `src/routes/trips/[id]/entry/[entryId]/+page.svelte`, add the import:

```ts
  import { getJournalEntry, saveJournalEntry, deleteJournalEntryWithPhotos } from '$lib/storage/storage';
  import { getPhoto } from '$lib/storage/photos';
  import type { JournalEntry } from '$lib/types';
  import StarRating from '$lib/components/StarRating.svelte';
```

Add a `rating` state variable and populate it in `onMount`:

```ts
  let note = $state('');
  let date = $state('');
  let rating: number | undefined = $state();
  let saving = $state(false);
  let deleting = $state(false);

  onMount(async () => {
    entry = getJournalEntry(entryId);
    if (entry) {
      note = entry.note;
      date = entry.date;
      rating = entry.rating;
      const urls: string[] = [];
      for (const photoId of entry.photoIds) {
        const photo = await getPhoto(photoId);
        if (photo) urls.push(URL.createObjectURL(photo.blob));
      }
      photoUrls = urls;
    }
  });
```

Pass `rating` through on save:

```ts
  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!entry) return;
    saving = true;
    saveJournalEntry({ ...entry, note, date, rating });
    goto(`/trips/${tripId}`);
  }
```

Add the rating picker to the edit form, right after the Note label/textarea and before the delete/save button row:

```svelte
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Rating (optional)</span>
      <StarRating bind:value={rating} />
    </label>
    <div class="flex items-center justify-between">
```

- [ ] **Step 4: Run the full test suite**

Run: `npm run test`
Expected: all existing tests still pass — this task adds no new test file, matching this project's convention for presentational components with no independent logic (e.g. `Skeleton.svelte`).

- [ ] **Step 5: Manually verify in the browser**

Run: `npm run dev` (or the project's existing dev-server launch convention).

1. Open a trip hub, go to the Journal tab. Add a new entry with a 4-star rating and a photo. Confirm it appears in the postcard-split list card with the photo on the left and 4 filled / 1 outline star on the right.
2. Add another entry with no rating and no photo. Confirm it shows the existing placeholder icon on the left and no star row at all on the right.
3. Click into the rated entry. Confirm the edit page shows the rating pre-filled at 4 stars, and the photo displays as before.
4. On that edit page, click the 4th star again (the currently-set value) and save. Confirm the entry now shows no star row, both on the edit page and back on the list.
5. On an unrated entry's edit page, set a rating and save. Confirm it now appears correctly in the list.
6. Resize the browser to a narrow (mobile) width. Confirm the postcard card doesn't overflow or break — photo panel shrinks per the `w-28 sm:w-36` breakpoint, text wraps normally.
7. Switch through all four themes on `/settings` and revisit the trip hub. Confirm filled stars (`var(--color-accent)`) and outline stars (`var(--color-card-border)`) read clearly against the card background in every theme.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/StarRating.svelte src/routes/trips/\[id\]/+page.svelte "src/routes/trips/[id]/entry/[entryId]/+page.svelte"
git commit -m "feat: add star rating UI and postcard-split journal layout"
```

---

## Self-Review Notes

- **Spec coverage:** optional `rating` field (Task 1), interactive star picker on both forms (Task 2 Steps 2-3), read-only star display in the list card (Task 2 Step 2), unset-renders-nothing rule and clear-by-reclicking interaction (Task 2 Step 1's `StarRating` logic), postcard-split layout with existing placeholder-icon reuse (Task 2 Step 2), and the full manual test matrix from the spec's Testing section (Task 2 Step 5) are all covered. No spec requirement is left unmapped.
- **Placeholder scan:** no TBD/TODO; every step contains complete, final code.
- **Type consistency:** `JournalEntry.rating?: number` (Task 1) matches the type used in `addJournalEntry`'s input (Task 1), `StarRating`'s `value?: number` prop (Task 2), and every call site (`entry.rating`, `bind:value={rating}`) across both forms (Task 2) — all consistent.
