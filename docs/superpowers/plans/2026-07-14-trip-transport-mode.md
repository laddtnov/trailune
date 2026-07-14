# Trip Transport Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `transportMode` field to trips, use it to drive filter tabs on the trips list and a mode-matched animated icon on each trip card's header.

**Architecture:** A new `TransportMode` union type flows from a form picker (New Trip dialog) → `createTrip()` → localStorage → `TripCard` (icon/gradient) and the trips list page (tab filter). Legacy trips missing the field default to `'flight'` at read time in the repository layer, so no data migration/rewrite is needed.

**Tech Stack:** SvelteKit (Svelte 5 runes), TypeScript, Tailwind CSS v4, Vitest.

## Global Constraints

- No backend/API calls — all client-side, per `docs/superpowers/specs/2026-07-14-trip-transport-mode-design.md`.
- No migration write to existing localStorage — legacy trips read as `'flight'` only in memory, never rewritten until the user edits that trip.
- Card hover animation must be gated behind `@media (prefers-reduced-motion: reduce)`, matching the existing pattern in `src/routes/+layout.svelte`.
- UI changes (tabs, card icon, form buttons) are verified manually via the dev server — this project has no component-level test suite; only the storage layer has Vitest coverage.

---

### Task 1: Add `TransportMode` type and `transportMode` field to `Trip`

**Files:**
- Modify: `src/lib/types.ts`

**Interfaces:**
- Produces: `export type TransportMode = 'flight' | 'train' | 'road' | 'boat' | 'other';` and `Trip.transportMode: TransportMode` — consumed by Tasks 2–5.

- [ ] **Step 1: Add the type and field**

Edit `src/lib/types.ts`, replacing the `Trip` interface:

```ts
export type TransportMode = 'flight' | 'train' | 'road' | 'boat' | 'other';

export interface Trip {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode: TransportMode;
  createdAt: string;
}
```

- [ ] **Step 2: Verify the project still type-checks**

Run: `npm run build`
Expected: build fails with TypeScript errors in `src/lib/storage/storage.ts` and any test fixtures missing `transportMode` — this is expected; those are fixed in Task 2.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TransportMode type and field to Trip"
```

---

### Task 2: Default legacy trips to `'flight'` and accept mode in `createTrip`

**Files:**
- Modify: `src/lib/storage/local.ts`
- Modify: `src/lib/storage/storage.ts`
- Modify: `src/lib/storage/local.test.ts`
- Modify: `src/lib/storage/storage.test.ts`

**Interfaces:**
- Consumes: `TransportMode` from Task 1.
- Produces: `listTrips()` / `getTrip()` always return a `transportMode` (defaulted to `'flight'` if absent in storage). `createTrip(input)` accepts an optional `transportMode` on `input`, defaulting to `'flight'`.

- [ ] **Step 1: Write the failing tests**

Edit `src/lib/storage/local.test.ts` — update the `trip` fixture to include the new required field, and add a legacy-data test:

```ts
const trip: Trip = {
  id: 't1',
  name: 'Japan',
  startDate: '2026-03-03',
  endDate: '2026-03-15',
  countries: ['JP'],
  transportMode: 'flight',
  createdAt: '2026-01-01T00:00:00.000Z'
};
```

Add this test inside `describe('trips repository', ...)`, after the existing `'saves and retrieves a trip'` test:

```ts
  it('defaults transportMode to flight for legacy trips missing the field', () => {
    const legacyTrip = {
      id: 't2',
      name: 'Peru',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
      countries: ['PE'],
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    localStorage.setItem('trailune:trips', JSON.stringify([legacyTrip]));

    expect(listTrips()[0].transportMode).toBe('flight');
    expect(getTrip('t2')?.transportMode).toBe('flight');
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test -- local.test.ts`
Expected: FAIL — `transportMode` is `undefined`, not `'flight'`.

- [ ] **Step 3: Implement the default in `local.ts`**

Edit `src/lib/storage/local.ts`, replacing `listTrips`:

```ts
export function listTrips(): Trip[] {
  return readAll<Trip>(TRIPS_KEY).map((trip) => ({ transportMode: 'flight', ...trip }));
}
```

(`getTrip` already calls `listTrips()`, so it inherits the default automatically — no change needed there.)

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test -- local.test.ts`
Expected: PASS

- [ ] **Step 5: Write the failing test for `createTrip`**

Edit `src/lib/storage/storage.test.ts`, adding this test inside `describe('createTrip', ...)`:

```ts
  it('defaults transportMode to flight when not provided', () => {
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    expect(trip.transportMode).toBe('flight');
  });

  it('honors an explicit transportMode', () => {
    const trip = createTrip({
      name: 'Alps hike',
      startDate: '2026-08-05',
      endDate: '2026-08-12',
      countries: ['AT'],
      transportMode: 'other'
    });
    expect(trip.transportMode).toBe('other');
  });
```

- [ ] **Step 6: Run the tests to verify they fail**

Run: `npm run test -- storage.test.ts`
Expected: FAIL — TypeScript error, `transportMode` not an accepted property on the `createTrip` input.

- [ ] **Step 7: Implement in `storage.ts`**

Edit `src/lib/storage/storage.ts`:

```ts
import { generateId } from '$lib/utils/id';
import { createThumbnail } from '$lib/utils/image';
import type { Trip, JournalEntry, TransportMode } from '$lib/types';
import * as trips from './local';
import * as checklist from './checklist';
import * as photoStore from './photos';

export * from './local';
export * from './checklist';
export { getPhoto, deletePhoto } from './photos';

export function createTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode?: TransportMode;
}): Trip {
  const trip: Trip = {
    id: generateId(),
    name: input.name,
    startDate: input.startDate,
    endDate: input.endDate,
    countries: input.countries,
    transportMode: input.transportMode ?? 'flight',
    createdAt: new Date().toISOString()
  };
  trips.saveTrip(trip);

  const templateItems = checklist.listPackingItems(null);
  for (const item of templateItems) {
    checklist.savePackingItem({ ...item, id: generateId(), tripId: trip.id, checked: false });
  }

  return trip;
}
```

(Only the imports and `createTrip` signature/body change — every other export in this file is unchanged.)

- [ ] **Step 8: Run the full test suite and the build**

Run: `npm run test && npm run build`
Expected: all tests PASS, build succeeds with no TypeScript errors.

- [ ] **Step 9: Commit**

```bash
git add src/lib/storage/local.ts src/lib/storage/storage.ts src/lib/storage/local.test.ts src/lib/storage/storage.test.ts
git commit -m "feat: default legacy trips to flight mode and accept transportMode in createTrip"
```

---

### Task 3: Mode-matched icon and hover animation on `TripCard`

**Files:**
- Modify: `src/lib/components/TripCard.svelte`

**Interfaces:**
- Consumes: `Trip.transportMode` (Task 1), `TransportMode` type.
- Produces: no new exports — this is a leaf UI component consumed by `src/routes/+page.svelte` (unchanged usage: `<TripCard {trip} />`).

- [ ] **Step 1: Replace the hash-based cover with a mode-keyed gradient/icon map**

Edit `src/lib/components/TripCard.svelte`, replacing the `<script>` block:

```svelte
<script lang="ts">
  import type { Trip, TransportMode } from '$lib/types';

  let { trip }: { trip: Trip } = $props();

  function formatDate(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  function formatYear(iso: string): string {
    const d = new Date(`${iso}T00:00:00`);
    return Number.isNaN(d.getTime()) ? '' : String(d.getFullYear());
  }

  const modeConfig: Record<TransportMode, { gradient: string; icon: 'plane' | 'train' | 'car' | 'boat' | 'bike' }> = {
    flight: { gradient: 'from-[oklch(62%_0.15_35)] to-[oklch(70%_0.13_60)]', icon: 'plane' },
    train: { gradient: 'from-[oklch(55%_0.1_195)] to-[oklch(64%_0.09_170)]', icon: 'train' },
    road: { gradient: 'from-[oklch(58%_0.13_20)] to-[oklch(64%_0.14_45)]', icon: 'car' },
    boat: { gradient: 'from-[oklch(52%_0.1_230)] to-[oklch(62%_0.09_210)]', icon: 'boat' },
    other: { gradient: 'from-[oklch(50%_0.11_145)] to-[oklch(60%_0.1_130)]', icon: 'bike' }
  };

  const mode = $derived(modeConfig[trip.transportMode]);
</script>
```

- [ ] **Step 2: Replace the banner markup**

Replace the existing `<div class="relative flex h-28 ...">...</div>` block (the one containing the single hardcoded plane `<svg>`) with:

```svelte
  <div
    class="relative flex h-28 items-end overflow-hidden bg-gradient-to-br p-4 {mode.gradient}"
  >
    {#if mode.icon === 'plane'}
      <svg
        class="mode-icon plane pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M21.7 3.3a1 1 0 0 0-1-.24L3.35 8.94a1 1 0 0 0-.06 1.88l7.15 2.74 2.74 7.15a1 1 0 0 0 1.88-.06l5.88-17.35a1 1 0 0 0-.24-1Z"
        />
      </svg>
    {:else if mode.icon === 'train'}
      <svg
        class="mode-icon train pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <rect x="5" y="3" width="14" height="14" rx="4" />
        <path d="M5 12h14M8 17l-2 3M16 17l2 3" />
        <circle cx="9" cy="15" r="0.8" fill="currentColor" />
        <circle cx="15" cy="15" r="0.8" fill="currentColor" />
      </svg>
    {:else if mode.icon === 'car'}
      <svg
        class="mode-icon car pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <path d="M4 16l1.5-5A2 2 0 0 1 7.4 9.5h9.2A2 2 0 0 1 18.5 11l1.5 5" />
        <rect x="3" y="16" width="18" height="4" rx="1.5" />
        <circle cx="7.5" cy="20" r="1.3" fill="currentColor" />
        <circle cx="16.5" cy="20" r="1.3" fill="currentColor" />
      </svg>
    {:else if mode.icon === 'boat'}
      <svg
        class="mode-icon boat pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <path d="M4 14h16l-2 5H6l-2-5Z" />
        <path d="M8 14V6l7 4-3 1.6M12 3v3" />
      </svg>
    {:else}
      <svg
        class="mode-icon bike pointer-events-none absolute right-1 top-2 size-11 text-white/85"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
      >
        <circle cx="6" cy="17" r="3" />
        <circle cx="18" cy="17" r="3" />
        <path d="M6 17l4-8h4l4 8M10 9h4M10 9L8 5h3" />
      </svg>
    {/if}
    <span
      class="rounded-full border border-white/40 bg-black/10 px-3 py-1 font-mono text-xs font-medium tracking-wide text-white backdrop-blur-sm"
    >
      {trip.countries.length}
      {trip.countries.length === 1 ? 'country' : 'countries'}
    </span>
  </div>
```

- [ ] **Step 3: Add the hover-drift animation**

Add to the bottom of the existing `<style>` block in `TripCard.svelte`:

```css
  .mode-icon {
    transition: transform 0.6s cubic-bezier(0.25, 1, 0.5, 1);
  }

  :global(.group:hover) .mode-icon.plane {
    transform: translate(-140%, 30%) rotate(-8deg);
  }

  :global(.group:hover) .mode-icon.train,
  :global(.group:hover) .mode-icon.car,
  :global(.group:hover) .mode-icon.bike {
    transform: translateX(-160%);
  }

  :global(.group:hover) .mode-icon.boat {
    transform: translate(-150%, 4px);
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .mode-icon {
      transform: none;
    }
  }
```

- [ ] **Step 4: Verify manually via the dev server**

Run: `npm run dev`

In the browser, open `/` and confirm:
- Each existing trip card shows a banner gradient + icon matching a `transportMode` you set on it in Task 2's tests (temporarily add `transportMode: 'other'` etc. to a trip in `localStorage` via devtools if no real data exists, then reload).
- Hovering a card's banner slides/rotates the icon off to the left as expected for each of the 5 modes.
- With OS-level "reduce motion" enabled, hovering does not move the icon.

- [ ] **Step 5: Run the full test suite and build to confirm nothing broke**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/TripCard.svelte
git commit -m "feat: mode-matched icon and hover animation on trip card header"
```

---

### Task 4: Transport mode picker in the New Trip form

**Files:**
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `TransportMode` (Task 1), `createTrip` now accepting `transportMode` (Task 2).
- Produces: none — this is the page component; no other task depends on its internals.

- [ ] **Step 1: Add state and reset/submit wiring**

In `src/routes/+page.svelte`, update the `<script>` block:

- Add to the imports: change `import type { Trip } from '$lib/types';` to `import type { Trip, TransportMode } from '$lib/types';`
- Add a new state declaration near the other form state (after `let countryFilter = $state('');`):

```ts
  let transportMode: TransportMode = $state('flight');

  const transportModes: Array<{ value: TransportMode; label: string }> = [
    { value: 'flight', label: 'Flight' },
    { value: 'train', label: 'Train' },
    { value: 'road', label: 'Road' },
    { value: 'boat', label: 'Boat' },
    { value: 'other', label: 'Other' }
  ];
```

- Update `resetForm()`:

```ts
  function resetForm() {
    name = '';
    startDate = '';
    endDate = '';
    selectedCountries = new Set();
    countryFilter = '';
    transportMode = 'flight';
  }
```

- Update `submit()`'s `createTrip` call:

```ts
    createTrip({ name, startDate, endDate, countries: Array.from(selectedCountries), transportMode });
```

- [ ] **Step 2: Add the icon-button row to the form markup**

In the dialog's form body, insert this block right after the Start/End date `<div class="flex gap-4">...</div>` and before the `<fieldset>` for countries:

```svelte
      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">How are you getting there?</legend>
        <div class="flex flex-wrap gap-2">
          {#each transportModes as option (option.value)}
            <button
              type="button"
              aria-pressed={transportMode === option.value}
              onclick={() => (transportMode = option.value)}
              class="rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ease-out {transportMode ===
              option.value
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
              {option.label}
            </button>
          {/each}
        </div>
      </fieldset>
```

- [ ] **Step 3: Verify manually via the dev server**

Run: `npm run dev`

In the browser: open the New Trip dialog, confirm Flight is pre-selected, click each of the 5 buttons and confirm exactly one is highlighted at a time, submit a trip with a non-default mode selected (e.g. Boat), and confirm the created card (Task 3's work) shows the matching gradient/icon.

- [ ] **Step 4: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add transport mode picker to New Trip form"
```

---

### Task 5: Filter tabs on the trips list page

**Files:**
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `Trip.transportMode` (Task 1), the `trips` state array already loaded via `listTrips()` in `onMount`.
- Produces: none.

- [ ] **Step 1: Add tab state and derived filtering**

In `src/routes/+page.svelte`'s `<script>` block, add near the other derived values (after `const filteredCountries = $derived(...)`):

```ts
  let activeTab: 'all' | TransportMode = $state('all');

  const tabs: Array<{ value: 'all' | TransportMode; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'flight', label: 'Flight' },
    { value: 'train', label: 'Train' },
    { value: 'road', label: 'Road' },
    { value: 'boat', label: 'Boat' },
    { value: 'other', label: 'Other' }
  ];

  const filteredTrips = $derived(
    activeTab === 'all' ? trips : trips.filter((t) => t.transportMode === activeTab)
  );
```

- [ ] **Step 2: Render the tab bar**

In the markup, right after the closing `</div>` of the header row (`<h1>Your trips</h1>` / "New trip" button block) and before the `{#if trips.length === 0}` block, insert:

```svelte
{#if trips.length > 0}
  <div class="mt-6 flex flex-wrap gap-1.5">
    {#each tabs as tab (tab.value)}
      <button
        type="button"
        onclick={() => (activeTab = tab.value)}
        class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {activeTab ===
        tab.value
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
          : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
      >
        {tab.label}
      </button>
    {/each}
  </div>
{/if}
```

- [ ] **Step 3: Filter the grid and add an empty-filter state**

Replace the existing `{#if trips.length === 0}...{:else}...{/if}` block with:

```svelte
{#if trips.length === 0}
  <div
    class="mt-10 flex flex-col items-center rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center"
  >
    <div
      class="grid size-20 place-items-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
    >
      <svg viewBox="0 0 24 24" class="size-10" fill="none" stroke="currentColor" stroke-width="1.75">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21Z"
        />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
    </div>
    <h2 class="mt-6 font-display text-2xl font-bold">No trips yet</h2>
    <p class="mt-2 max-w-sm text-[var(--color-ink-soft)]">
      Log where you're going, what you packed, and what you saw. Your map starts filling in the
      moment you add your first trip.
    </p>
    <button
      type="button"
      onclick={openForm}
      class="mt-6 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 hover:bg-[var(--color-accent-hover)]"
    >
      Start your first trip
    </button>
  </div>
{:else if filteredTrips.length === 0}
  <div
    class="mt-10 rounded-[var(--radius-xl)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-16 text-center text-[var(--color-ink-soft)]"
  >
    No trips match this filter yet.
  </div>
{:else}
  <div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
    {#each filteredTrips as trip (trip.id)}
      <TripCard {trip} />
    {/each}
  </div>
{/if}
```

(Note: this is the same "no trips yet" block that already exists — only the `{:else}` branch changes to add the `filteredTrips.length === 0` case and to iterate `filteredTrips` instead of `trips`.)

- [ ] **Step 4: Verify manually via the dev server**

Run: `npm run dev`

In the browser: with multiple trips of different modes (create a few via the Task 4 form), confirm each tab filters the grid correctly, "All" shows everything, and selecting a tab with zero matching trips shows the "No trips match this filter yet" message instead of the full onboarding empty state.

- [ ] **Step 5: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: add transport mode filter tabs to trips list"
```
