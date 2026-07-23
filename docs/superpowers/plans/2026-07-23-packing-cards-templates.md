# Packing Cards + Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the packing checklist's checkbox rows with ticket-style cards, and replace the single shared packing template with five named templates (General, Beach Holiday, Business Trip, Camping, Winter) that a new trip can be seeded from.

**Architecture:** A new `templateId` field on `PackingItem` distinguishes which of the 5 templates a template item belongs to (trip-scoped items keep `templateId: null`). `checklist.ts` gains `listTemplateItems`; a new `packingTemplates.ts` module holds the template list, curated starter items, and one-shot seeding logic. `PackingChecklist.svelte` is rewritten to take a discriminated `context` prop (trip vs. template) and render ticket-style cards with a "PACKED" stamp badge. The `/packing-template` page gains a template-tab switcher, and the new-trip dialog gains a template dropdown.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript, Vitest, Tailwind v4.

## Global Constraints

- Exactly 5 fixed templates: General, Beach Holiday, Business Trip, Camping, Winter — no user-created templates (spec: Non-goals).
- Legacy `PackingItem` records with no `templateId` field must be treated as `'general'` at read time (`item.templateId ?? 'general'`) — no migration script (spec: Architecture, Edge cases).
- Only the 4 named templates (not General) get curated starter items, seeded exactly once via a `trailune:packingTemplateSeeded:<id>` localStorage flag that survives the user deleting all items (spec: Edge cases).
- The "PACKED" stamp badge animation matches the existing `stamp-settle` convention in `TripCard.svelte`: same duration/easing (`0.4s var(--ease-out-quart)`), and disabled entirely under `@media (prefers-reduced-motion: reduce)` (spec: Architecture).
- Template choice only applies at trip-creation time — no per-trip template switching afterward (spec: Non-goals).

---

### Task 1: Data layer — `templateId` field, `listTemplateItems`, and `packingTemplates.ts`

**Files:**
- Modify: `src/lib/types.ts`
- Modify: `src/lib/storage/checklist.ts`
- Modify: `src/lib/storage/checklist.test.ts`
- Create: `src/lib/packingTemplates.ts`
- Create: `src/lib/packingTemplates.test.ts`

**Interfaces:**
- Consumes: nothing new — this is the foundational task.
- Produces:
  - `export type PackingTemplateId = 'general' | 'beach' | 'business' | 'camping' | 'winter';`
  - `PackingItem` gains `templateId: PackingTemplateId | null`.
  - `listTemplateItems(templateId: PackingTemplateId): PackingItem[]` in `checklist.ts`.
  - `listPackingItems(tripId: string): PackingItem[]` — narrowed signature (was `tripId: string | null`).
  - `PACKING_TEMPLATES: { id: PackingTemplateId; label: string }[]` and `PACKING_TEMPLATE_SEEDS: Record<Exclude<PackingTemplateId, 'general'>, { category: PackingCategory; label: string }[]>` and `seedTemplateIfEmpty(templateId: PackingTemplateId): void` in `packingTemplates.ts`.

- [ ] **Step 1: Add `PackingTemplateId` and the `templateId` field to `PackingItem`**

In `src/lib/types.ts`, replace:

```ts
export interface PackingItem {
  id: string;
  tripId: string | null;
  category: PackingCategory;
  label: string;
  checked: boolean;
}
```

with:

```ts
export type PackingTemplateId = 'general' | 'beach' | 'business' | 'camping' | 'winter';

export interface PackingItem {
  id: string;
  tripId: string | null;
  templateId: PackingTemplateId | null;
  category: PackingCategory;
  label: string;
  checked: boolean;
}
```

- [ ] **Step 2: Write the failing tests for the storage layer**

Replace the entire `describe('packing items repository', ...)` block in `src/lib/storage/checklist.test.ts` with:

```ts
describe('packing items repository', () => {
  const generalItem: PackingItem = {
    id: 'p1',
    tripId: null,
    templateId: 'general',
    category: 'Documents',
    label: 'Passport',
    checked: false
  };
  const beachItem: PackingItem = {
    id: 'p2',
    tripId: null,
    templateId: 'beach',
    category: 'Clothing',
    label: 'Swimsuit',
    checked: false
  };
  const tripItem: PackingItem = {
    id: 'p3',
    tripId: 't1',
    templateId: null,
    category: 'Electronics',
    label: 'Charger',
    checked: false
  };

  it('separates template items by templateId and trip-scoped items by tripId', () => {
    savePackingItem(generalItem);
    savePackingItem(beachItem);
    savePackingItem(tripItem);
    expect(listTemplateItems('general')).toEqual([generalItem]);
    expect(listTemplateItems('beach')).toEqual([beachItem]);
    expect(listPackingItems('t1')).toEqual([tripItem]);
  });

  it('treats a legacy item with no templateId field as general', () => {
    const legacyItem = {
      id: 'p4',
      tripId: null,
      category: 'Documents',
      label: 'Old passport',
      checked: false
    } as PackingItem;
    savePackingItem(legacyItem);
    expect(listTemplateItems('general')).toEqual([legacyItem]);
    expect(listTemplateItems('beach')).toEqual([]);
  });

  it('updates an item in place', () => {
    savePackingItem(generalItem);
    savePackingItem({ ...generalItem, checked: true });
    expect(listTemplateItems('general')).toEqual([{ ...generalItem, checked: true }]);
  });

  it('deletes a single item', () => {
    savePackingItem(generalItem);
    deletePackingItem('p1');
    expect(listTemplateItems('general')).toEqual([]);
  });

  it('deletes all items for a trip without touching templates', () => {
    savePackingItem(generalItem);
    savePackingItem(tripItem);
    deletePackingItemsForTrip('t1');
    expect(listPackingItems('t1')).toEqual([]);
    expect(listTemplateItems('general')).toEqual([generalItem]);
  });
});
```

Also update the import line at the top of the file from:

```ts
import {
  listPackingItems,
  savePackingItem,
  deletePackingItem,
  deletePackingItemsForTrip,
  listDoDontItems,
  saveDoDontItem,
  deleteDoDontItem,
  deleteDoDontItemsForTrip
} from './checklist';
```

to:

```ts
import {
  listPackingItems,
  listTemplateItems,
  savePackingItem,
  deletePackingItem,
  deletePackingItemsForTrip,
  listDoDontItems,
  saveDoDontItem,
  deleteDoDontItem,
  deleteDoDontItemsForTrip
} from './checklist';
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/checklist.test.ts`
Expected: FAIL — `listTemplateItems` is not exported yet, and `listPackingItems(null)` calls no longer type-check (they've already been replaced above, so the failure is the missing export)

- [ ] **Step 4: Update `checklist.ts`**

In `src/lib/storage/checklist.ts`, replace:

```ts
import type { PackingItem, DoDontItem } from '$lib/types';
```

with:

```ts
import type { PackingItem, DoDontItem, PackingTemplateId } from '$lib/types';
```

Replace:

```ts
export function listPackingItems(tripId: string | null): PackingItem[] {
  return readAll<PackingItem>(PACKING_KEY).filter((i) => i.tripId === tripId);
}
```

with:

```ts
export function listPackingItems(tripId: string): PackingItem[] {
  return readAll<PackingItem>(PACKING_KEY).filter((i) => i.tripId === tripId);
}

export function listTemplateItems(templateId: PackingTemplateId): PackingItem[] {
  return readAll<PackingItem>(PACKING_KEY).filter(
    (i) => i.tripId === null && (i.templateId ?? 'general') === templateId
  );
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/checklist.test.ts`
Expected: PASS (11 tests: 5 packing + 3 do/dont from before, now 5 packing tests replace the old 4)

- [ ] **Step 6: Write the failing tests for `packingTemplates.ts`**

Create `src/lib/packingTemplates.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { seedTemplateIfEmpty, PACKING_TEMPLATE_SEEDS } from './packingTemplates';
import { listTemplateItems, deletePackingItem } from './storage/checklist';

beforeEach(() => {
  localStorage.clear();
});

describe('seedTemplateIfEmpty', () => {
  it('seeds the correct starter items for a named template on first call', () => {
    seedTemplateIfEmpty('beach');
    const items = listTemplateItems('beach');
    expect(items).toHaveLength(PACKING_TEMPLATE_SEEDS.beach.length);
    expect(items.map((i) => i.label)).toContain('Swimsuit');
    expect(items.every((i) => i.tripId === null && i.templateId === 'beach' && !i.checked)).toBe(true);
  });

  it('does not reseed after the items are deleted', () => {
    seedTemplateIfEmpty('winter');
    const items = listTemplateItems('winter');
    for (const item of items) {
      deletePackingItem(item.id);
    }
    seedTemplateIfEmpty('winter');
    expect(listTemplateItems('winter')).toEqual([]);
  });

  it('is a no-op for general', () => {
    seedTemplateIfEmpty('general');
    expect(listTemplateItems('general')).toEqual([]);
  });
});
```

- [ ] **Step 7: Run tests to verify they fail**

Run: `npx vitest run src/lib/packingTemplates.test.ts`
Expected: FAIL with "Cannot find module './packingTemplates'"

- [ ] **Step 8: Create `packingTemplates.ts`**

Create `src/lib/packingTemplates.ts`:

```ts
import type { PackingCategory, PackingTemplateId } from './types';
import { generateId } from './utils/id';
import { listTemplateItems, savePackingItem } from './storage/checklist';

export const PACKING_TEMPLATES: { id: PackingTemplateId; label: string }[] = [
  { id: 'general', label: 'General' },
  { id: 'beach', label: 'Beach Holiday' },
  { id: 'business', label: 'Business Trip' },
  { id: 'camping', label: 'Camping' },
  { id: 'winter', label: 'Winter' }
];

type SeedItem = { category: PackingCategory; label: string };

export const PACKING_TEMPLATE_SEEDS: Record<Exclude<PackingTemplateId, 'general'>, SeedItem[]> = {
  beach: [
    { category: 'Documents', label: 'Travel insurance' },
    { category: 'Electronics', label: 'Waterproof phone case' },
    { category: 'Clothing', label: 'Swimsuit' },
    { category: 'Clothing', label: 'Flip-flops' },
    { category: 'Clothing', label: 'Sun hat' },
    { category: 'Toiletries', label: 'Sunscreen' },
    { category: 'Toiletries', label: 'Aloe vera gel' },
    { category: 'Other', label: 'Beach towel' },
    { category: 'Other', label: 'Sunglasses' }
  ],
  business: [
    { category: 'Documents', label: 'Business cards' },
    { category: 'Electronics', label: 'Laptop' },
    { category: 'Electronics', label: 'Laptop charger' },
    { category: 'Electronics', label: 'Phone charger' },
    { category: 'Clothing', label: 'Blazer' },
    { category: 'Clothing', label: 'Dress shoes' },
    { category: 'Toiletries', label: 'Travel toiletry kit' },
    { category: 'Other', label: 'Notebook and pen' }
  ],
  camping: [
    { category: 'Documents', label: 'ID card' },
    { category: 'Electronics', label: 'Headlamp' },
    { category: 'Electronics', label: 'Power bank' },
    { category: 'Clothing', label: 'Hiking boots' },
    { category: 'Clothing', label: 'Rain jacket' },
    { category: 'Toiletries', label: 'Biodegradable soap' },
    { category: 'Other', label: 'Sleeping bag' },
    { category: 'Other', label: 'Tent' },
    { category: 'Other', label: 'Multi-tool' }
  ],
  winter: [
    { category: 'Documents', label: 'Passport' },
    { category: 'Electronics', label: 'Phone charger' },
    { category: 'Clothing', label: 'Thermal layers' },
    { category: 'Clothing', label: 'Winter coat' },
    { category: 'Clothing', label: 'Gloves' },
    { category: 'Clothing', label: 'Wool socks' },
    { category: 'Toiletries', label: 'Lip balm' },
    { category: 'Toiletries', label: 'Moisturizer' },
    { category: 'Other', label: 'Hand warmers' }
  ]
};

const SEEDED_KEY_PREFIX = 'trailune:packingTemplateSeeded:';

export function seedTemplateIfEmpty(templateId: PackingTemplateId): void {
  if (templateId === 'general') return;
  const seededKey = `${SEEDED_KEY_PREFIX}${templateId}`;
  if (localStorage.getItem(seededKey) === 'true') return;
  if (listTemplateItems(templateId).length === 0) {
    for (const seed of PACKING_TEMPLATE_SEEDS[templateId]) {
      savePackingItem({
        id: generateId(),
        tripId: null,
        templateId,
        category: seed.category,
        label: seed.label,
        checked: false
      });
    }
  }
  localStorage.setItem(seededKey, 'true');
}
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx vitest run src/lib/packingTemplates.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 10: Run the full test suite**

Run: `npx vitest run`
Expected: some pre-existing failures in `checklist.test.ts`'s callers elsewhere (`storage.test.ts`, `PackingChecklist.svelte` usages) are out of scope for this task and get fixed in Tasks 2–3 — confirm the failures are limited to those, with no failures in `src/lib/storage/checklist.test.ts` or `src/lib/packingTemplates.test.ts`

- [ ] **Step 11: Commit**

```bash
git add src/lib/types.ts src/lib/storage/checklist.ts src/lib/storage/checklist.test.ts src/lib/packingTemplates.ts src/lib/packingTemplates.test.ts
git commit -m "feat: add packing template data layer (templateId, listTemplateItems, seeding)"
```

---

### Task 2: `createTrip` copies from the chosen template

**Files:**
- Modify: `src/lib/storage/storage.ts`
- Modify: `src/lib/storage/storage.test.ts`

**Interfaces:**
- Consumes: `listTemplateItems` from `./checklist` (Task 1); `PackingTemplateId` from `$lib/types` (Task 1).
- Produces: `createTrip` accepts an optional `packingTemplateId?: PackingTemplateId` input field, defaulting to `'general'`.

- [ ] **Step 1: Write the failing tests**

In `src/lib/storage/storage.test.ts`, replace:

```ts
import { savePackingItem, listPackingItems, saveDoDontItem, listDoDontItems } from './checklist';
```

with:

```ts
import { savePackingItem, listPackingItems, listTemplateItems, saveDoDontItem, listDoDontItems } from './checklist';
```

Replace the `describe('createTrip', ...)` block's first two tests:

```ts
describe('createTrip', () => {
  it('copies template packing items into new trip-scoped items', () => {
    savePackingItem({ id: generateId(), tripId: null, category: 'Documents', label: 'Passport', checked: false });
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const tripItems = listPackingItems(trip.id);
    expect(tripItems).toHaveLength(1);
    expect(tripItems[0].label).toBe('Passport');
    expect(tripItems[0].tripId).toBe(trip.id);
    expect(tripItems[0].checked).toBe(false);
  });

  it('never mutates the shared template', () => {
    savePackingItem({ id: generateId(), tripId: null, category: 'Documents', label: 'Passport', checked: false });
    createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    expect(listPackingItems(null)).toHaveLength(1);
  });
```

with:

```ts
describe('createTrip', () => {
  it('defaults to copying the general template into new trip-scoped items', () => {
    savePackingItem({
      id: generateId(),
      tripId: null,
      templateId: 'general',
      category: 'Documents',
      label: 'Passport',
      checked: false
    });
    const trip = createTrip({ name: 'Japan', startDate: '2026-03-03', endDate: '2026-03-15', countries: ['JP'] });
    const tripItems = listPackingItems(trip.id);
    expect(tripItems).toHaveLength(1);
    expect(tripItems[0].label).toBe('Passport');
    expect(tripItems[0].tripId).toBe(trip.id);
    expect(tripItems[0].templateId).toBeNull();
    expect(tripItems[0].checked).toBe(false);
  });

  it('copies the explicitly chosen template instead of general', () => {
    savePackingItem({
      id: generateId(),
      tripId: null,
      templateId: 'general',
      category: 'Documents',
      label: 'Passport',
      checked: false
    });
    savePackingItem({
      id: generateId(),
      tripId: null,
      templateId: 'beach',
      category: 'Clothing',
      label: 'Swimsuit',
      checked: false
    });
    const trip = createTrip({
      name: 'Bali',
      startDate: '2026-07-10',
      endDate: '2026-07-20',
      countries: ['ID'],
      packingTemplateId: 'beach'
    });
    const tripItems = listPackingItems(trip.id);
    expect(tripItems).toHaveLength(1);
    expect(tripItems[0].label).toBe('Swimsuit');
  });

  it('never mutates the source template', () => {
    savePackingItem({
      id: generateId(),
      tripId: null,
      templateId: 'general',
      category: 'Documents',
      label: 'Passport',
      checked: false
    });
    createTrip({ name: 'Peru', startDate: '2026-07-10', endDate: '2026-07-20', countries: ['PE'] });
    expect(listTemplateItems('general')).toHaveLength(1);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/storage/storage.test.ts`
Expected: FAIL — `createTrip` still copies from `listPackingItems(null)`, which no longer type-checks/exists

- [ ] **Step 3: Update `createTrip`**

In `src/lib/storage/storage.ts`, replace:

```ts
import type { Trip, JournalEntry, TransportMode, TipEntry, TipCategory } from '$lib/types';
```

with:

```ts
import type { Trip, JournalEntry, TransportMode, TipEntry, TipCategory, PackingTemplateId } from '$lib/types';
```

Replace:

```ts
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

with:

```ts
export function createTrip(input: {
  name: string;
  startDate: string;
  endDate: string;
  countries: string[];
  transportMode?: TransportMode;
  packingTemplateId?: PackingTemplateId;
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

  const templateItems = checklist.listTemplateItems(input.packingTemplateId ?? 'general');
  for (const item of templateItems) {
    checklist.savePackingItem({ ...item, id: generateId(), tripId: trip.id, templateId: null, checked: false });
  }

  return trip;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/storage/storage.test.ts`
Expected: PASS (all tests in this file, including the 3 rewritten `createTrip` tests)

- [ ] **Step 5: Run the full test suite**

Run: `npx vitest run`
Expected: remaining failures should now be limited to `PackingChecklist.svelte`'s own callers (fixed in Task 3) — confirm no failures in `storage.ts`/`storage.test.ts`, `checklist.ts`/`checklist.test.ts`, or `packingTemplates.ts`/`packingTemplates.test.ts`

- [ ] **Step 6: Commit**

```bash
git add src/lib/storage/storage.ts src/lib/storage/storage.test.ts
git commit -m "feat: createTrip copies from the chosen packing template"
```

---

### Task 3: `PackingChecklist.svelte` rewrite — context prop, ticket cards, PACKED stamp

**Files:**
- Modify: `src/lib/components/PackingChecklist.svelte`
- Modify: `src/routes/trips/[id]/+page.svelte`
- Modify: `src/routes/packing-template/+page.svelte`

**Interfaces:**
- Consumes: `listPackingItems`, `listTemplateItems`, `savePackingItem`, `deletePackingItem` from `$lib/storage/checklist` (Task 1); `PackingItem`, `PackingCategory`, `PackingTemplateId` from `$lib/types`.
- Produces: `PackingChecklist.svelte` with prop `context: { type: 'trip'; tripId: string } | { type: 'template'; templateId: PackingTemplateId }` — consumed by both call sites in this task and by Task 4's new template-tabs page.

- [ ] **Step 1: Rewrite `PackingChecklist.svelte`**

Replace the entire contents of `src/lib/components/PackingChecklist.svelte` with:

```svelte
<script lang="ts">
  import { onMount } from 'svelte';
  import { listPackingItems, listTemplateItems, savePackingItem, deletePackingItem } from '$lib/storage/checklist';
  import { generateId } from '$lib/utils/id';
  import type { PackingItem, PackingCategory, PackingTemplateId } from '$lib/types';

  let {
    context
  }: { context: { type: 'trip'; tripId: string } | { type: 'template'; templateId: PackingTemplateId } } =
    $props();

  const categories: PackingCategory[] = ['Documents', 'Electronics', 'Clothing', 'Toiletries', 'Other'];

  const categoryIcons: Record<PackingCategory, string> = {
    Documents: 'M7 3h7l5 5v13H7zM14 3v5h5M9 12h6M9 16h6',
    Electronics: 'M5 7h14v10H5zM9 21h6M12 17v4',
    Clothing: 'M8 3 4 7l3 3 1-1v10h8V9l1 1 3-3-4-4-2 2h-4Z',
    Toiletries:
      'M9 3h6l1 3v2a3 3 0 0 0 1 2.2A5 5 0 0 1 19 14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a5 5 0 0 1 2-4.8A3 3 0 0 0 8 8V6Z',
    Other: 'M20 7 12 3 4 7l8 4 8-4Zm0 0v10l-8 4m8-14L12 11m0 0v10m0-10L4 7m0 0v10l8 4'
  };

  let items: PackingItem[] = $state([]);
  let newLabel = $state('');
  let newCategory: PackingCategory = $state('Documents');

  function load() {
    items = context.type === 'trip' ? listPackingItems(context.tripId) : listTemplateItems(context.templateId);
  }

  onMount(load);

  function toggle(item: PackingItem) {
    savePackingItem({ ...item, checked: !item.checked });
    load();
  }

  function addItem(event: SubmitEvent) {
    event.preventDefault();
    if (!newLabel.trim()) return;
    const base = { id: generateId(), category: newCategory, label: newLabel, checked: false };
    const item: PackingItem =
      context.type === 'trip'
        ? { ...base, tripId: context.tripId, templateId: null }
        : { ...base, tripId: null, templateId: context.templateId };
    savePackingItem(item);
    newLabel = '';
    load();
  }

  function remove(item: PackingItem) {
    deletePackingItem(item.id);
    load();
  }

  const packedCount = $derived(items.filter((i) => i.checked).length);
</script>

<div class="mb-5 flex items-center justify-between">
  <p class="text-sm text-[var(--color-ink-soft)]">
    {#if items.length === 0}
      Nothing on the list yet.
    {:else}
      <span class="font-semibold text-[var(--color-ink)]">{packedCount}</span> / {items.length} packed
    {/if}
  </p>
  {#if items.length > 0}
    <div class="h-1.5 w-32 overflow-hidden rounded-full bg-[var(--color-canvas-dim)]">
      <div
        class="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300 ease-[var(--ease-out-quart)]"
        style="width: {items.length > 0 ? (packedCount / items.length) * 100 : 0}%"
      ></div>
    </div>
  {/if}
</div>

<div class="space-y-5">
  {#each categories as category}
    {@const categoryItems = items.filter((i) => i.category === category)}
    <section class="rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
      <h3 class="flex items-center gap-2 font-display text-base font-bold">
        <svg viewBox="0 0 24 24" class="size-4 text-[var(--color-accent)]" fill="none" stroke="currentColor" stroke-width="1.75">
          <path stroke-linecap="round" stroke-linejoin="round" d={categoryIcons[category]} />
        </svg>
        {category}
      </h3>
      {#if categoryItems.length === 0}
        <p class="mt-2 text-sm text-[var(--color-ink-soft)]">No items yet.</p>
      {:else}
        <ul class="mt-3 space-y-2">
          {#each categoryItems as item (item.id)}
            <li
              class="group flex items-center gap-3 rounded-[var(--radius-lg)] border px-3.5 py-2.5 transition-colors {item.checked
                ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent-soft)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-canvas)] hover:border-[var(--color-accent)]/40'}"
            >
              <button
                type="button"
                onclick={() => toggle(item)}
                class="flex flex-1 items-center gap-3 rounded-[var(--radius-md)] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
              >
                <svg
                  viewBox="0 0 24 24"
                  class="size-5 shrink-0 text-[var(--color-accent)]"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.75"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d={categoryIcons[item.category]} />
                </svg>
                <span
                  class="flex-1 text-sm transition-colors {item.checked
                    ? 'text-[var(--color-ink-soft)] line-through'
                    : 'text-[var(--color-ink)]'}"
                >
                  {item.label}
                </span>
              </button>
              {#if item.checked}
                <span
                  class="stamp shrink-0 rounded border-2 border-[var(--color-accent)] px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--color-accent)]"
                >
                  Packed
                </span>
              {/if}
              <button
                type="button"
                onclick={() => remove(item)}
                aria-label={`Remove ${item.label}`}
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
</div>

<form
  onsubmit={addItem}
  class="mt-5 flex flex-wrap gap-2 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-3"
>
  <select
    bind:value={newCategory}
    class="rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
  >
    {#each categories as category}
      <option value={category}>{category}</option>
    {/each}
  </select>
  <input
    bind:value={newLabel}
    placeholder="Add an item&hellip;"
    required
    class="min-w-[10rem] flex-1 rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
  />
  <button
    type="submit"
    class="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)]"
  >
    Add
  </button>
</form>

<style>
  .stamp {
    transform: rotate(-8deg);
    animation: stamp-settle 0.4s var(--ease-out-quart);
  }

  @keyframes stamp-settle {
    0% {
      transform: scale(1.4) rotate(-18deg);
      opacity: 0;
    }
    60% {
      transform: scale(0.92) rotate(-4deg);
      opacity: 1;
    }
    100% {
      transform: scale(1) rotate(-8deg);
      opacity: 1;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .stamp {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 2: Update the trip hub's Packing tab call site**

In `src/routes/trips/[id]/+page.svelte`, replace:

```svelte
      <PackingChecklist tripId={tripId} />
```

with:

```svelte
      <PackingChecklist context={{ type: 'trip', tripId }} />
```

- [ ] **Step 3: Update the packing-template page call site (tabs come in Task 4 — hardcode General for now)**

In `src/routes/packing-template/+page.svelte`, replace:

```svelte
<div class="mt-8">
  <PackingChecklist tripId={null} />
</div>
```

with:

```svelte
<div class="mt-8">
  <PackingChecklist context={{ type: 'template', templateId: 'general' }} />
</div>
```

- [ ] **Step 4: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task has no new automated tests of its own; `PackingChecklist.svelte` is verified manually per this project's established convention)

- [ ] **Step 5: Manually verify in the browser**

Start the dev server, open the `/packing-template` page (still showing only General at this point) and a trip's Packing tab, and confirm:
- Items render as ticket-style rows with the category icon on the left.
- Checking an item shows the rotated "PACKED" stamp badge with a settle-in animation; unchecking removes it.
- The stamp has no animation when the OS "reduce motion" setting is enabled (e.g. via browser dev tools' emulated media feature).
- Adding and deleting items still works exactly as before on both the trip Packing tab and the template page.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/PackingChecklist.svelte src/routes/trips/\[id\]/+page.svelte src/routes/packing-template/+page.svelte
git commit -m "feat: render packing items as ticket-style cards with a PACKED stamp"
```

---

### Task 4: Template tabs on `/packing-template` + template dropdown on trip creation

**Files:**
- Modify: `src/routes/packing-template/+page.svelte`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `PACKING_TEMPLATES`, `seedTemplateIfEmpty` from `$lib/packingTemplates` (Task 1); `createTrip` accepting `packingTemplateId` from `$lib/storage/storage` (Task 2); `PackingChecklist` with the `context` prop (Task 3).
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Add template tabs to the packing-template page**

Replace the entire contents of `src/routes/packing-template/+page.svelte` with:

```svelte
<script lang="ts">
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
  import { PACKING_TEMPLATES, seedTemplateIfEmpty } from '$lib/packingTemplates';
  import type { PackingTemplateId } from '$lib/types';

  let selectedTemplate: PackingTemplateId = $state('general');

  function selectTemplate(id: PackingTemplateId) {
    selectedTemplate = id;
    seedTemplateIfEmpty(id);
  }
</script>

<h1 class="font-display text-3xl font-bold sm:text-4xl">Packing templates</h1>
<p class="mt-1 max-w-xl text-[var(--color-ink-soft)]">
  Items here are copied into a new trip's packing list when you pick this template while creating it.
</p>

<div class="mt-6 flex flex-wrap gap-1.5">
  {#each PACKING_TEMPLATES as template (template.id)}
    <button
      type="button"
      aria-pressed={selectedTemplate === template.id}
      onclick={() => selectTemplate(template.id)}
      class="rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors duration-150 ease-out {selectedTemplate ===
      template.id
        ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
        : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink-soft)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-ink)]'}"
    >
      {template.label}
    </button>
  {/each}
</div>

<div class="mt-8">
  {#key selectedTemplate}
    <PackingChecklist context={{ type: 'template', templateId: selectedTemplate }} />
  {/key}
</div>
```

- [ ] **Step 2: Add the template dropdown to the new-trip dialog**

In `src/routes/+page.svelte`, replace:

```ts
  let transportMode: TransportMode = $state('flight');
```

with:

```ts
  let transportMode: TransportMode = $state('flight');
  let packingTemplateId: PackingTemplateId = $state('general');
```

Replace:

```ts
import type { Trip, TransportMode } from '$lib/types';
```

with:

```ts
import type { Trip, TransportMode, PackingTemplateId } from '$lib/types';
import { PACKING_TEMPLATES } from '$lib/packingTemplates';
```

Replace:

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

with:

```ts
  function resetForm() {
    name = '';
    startDate = '';
    endDate = '';
    selectedCountries = new Set();
    countryFilter = '';
    transportMode = 'flight';
    packingTemplateId = 'general';
  }
```

Replace:

```ts
    const newTrip = createTrip({
      name,
      startDate,
      endDate,
      countries: Array.from(selectedCountries),
      transportMode
    });
```

with:

```ts
    const newTrip = createTrip({
      name,
      startDate,
      endDate,
      countries: Array.from(selectedCountries),
      transportMode,
      packingTemplateId
    });
```

In the dialog's markup, replace:

```svelte
      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">
          Countries visited
          {#if selectedCountries.size > 0}
            <span class="text-[var(--color-accent)]">({selectedCountries.size} selected)</span>
          {/if}
        </legend>
        <input
          bind:value={countryFilter}
          type="text"
          placeholder="Search countries&hellip;"
          class="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
        <div
          class="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] p-3"
        >
          {#each filteredCountries as country (country.code)}
            {@const selected = selectedCountries.has(country.code)}
            <button
              type="button"
              aria-pressed={selected}
              onclick={() => toggleCountry(country.code)}
              class="rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out {selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
              {country.name}
            </button>
          {:else}
            <p class="px-1 py-2 text-sm text-[var(--color-ink-soft)]">No countries match "{countryFilter}".</p>
          {/each}
        </div>
      </fieldset>
    </div>
```

with:

```svelte
      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">
          Countries visited
          {#if selectedCountries.size > 0}
            <span class="text-[var(--color-accent)]">({selectedCountries.size} selected)</span>
          {/if}
        </legend>
        <input
          bind:value={countryFilter}
          type="text"
          placeholder="Search countries&hellip;"
          class="mb-2 w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        />
        <div
          class="flex max-h-48 flex-wrap gap-2 overflow-y-auto rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] p-3"
        >
          {#each filteredCountries as country (country.code)}
            {@const selected = selectedCountries.has(country.code)}
            <button
              type="button"
              aria-pressed={selected}
              onclick={() => toggleCountry(country.code)}
              class="rounded-full border px-3 py-1.5 text-sm font-medium transition-all duration-150 ease-out {selected
                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]'
                : 'border-[var(--color-card-border)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-accent-soft)]'}"
            >
              {country.name}
            </button>
          {:else}
            <p class="px-1 py-2 text-sm text-[var(--color-ink-soft)]">No countries match "{countryFilter}".</p>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend class="mb-1.5 text-sm font-medium text-[var(--color-ink-soft)]">Packing template</legend>
        <select
          bind:value={packingTemplateId}
          class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        >
          {#each PACKING_TEMPLATES as template (template.id)}
            <option value={template.id}>{template.label}</option>
          {/each}
        </select>
      </fieldset>
    </div>
```

- [ ] **Step 3: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task has no new automated tests; matches this project's established convention of manual browser verification for page-level UI)

- [ ] **Step 4: Manually verify in the browser**

Start the dev server and confirm:
- `/packing-template` shows 5 tabs (General, Beach Holiday, Business Trip, Camping, Winter); clicking a named tab for the first time seeds its curated starter items (e.g. Beach Holiday shows Sunscreen, Swimsuit, etc.); deleting all items from a named template and switching away and back does NOT reseed them.
- Opening the "new trip" dialog shows a "Packing template" dropdown defaulting to General; creating a trip with "Beach Holiday" selected results in that trip's Packing tab showing the Beach Holiday items (fresh ids, unchecked), not General's.
- The trip hub's Packing tab and the General template still behave exactly as they did before this whole feature (add/toggle/delete all work).

- [ ] **Step 5: Commit**

```bash
git add src/routes/packing-template/+page.svelte src/routes/+page.svelte
git commit -m "feat: add template tabs and a packing-template picker on trip creation"
```
