# Packing Cards + Templates — Design Spec

Date: 2026-07-23

## Overview

This is the first slice of `docs/ROADMAP.md` §4 "Trip Experience Polish" (destination preview and animated flight route come later, as separate cycles). It bundles two related changes that the roadmap groups together: (1) a visual redesign of packing items from a checkbox list into ticket-style cards, and (2) replacing the single shared packing template with five named templates (General, Beach Holiday, Business Trip, Camping, Winter) that a new trip can be seeded from.

## Goals

- Packing items (both trip-scoped and template) render as ticket-style cards instead of checkbox rows: category icon on the left, label, and a rotated "PACKED" stamp badge that appears (with a settle animation matching the existing trip-card passport-stamp motif) when an item is checked off.
- Five named packing templates replace today's single shared template: General (today's existing template, renamed, contents untouched), Beach Holiday, Business Trip, Camping, Winter.
- The four new named templates ship pre-populated with curated starter items — real value immediately, matching the roadmap's framing of templates as "starting points."
- The `/packing-template` page gains a row of 5 tabs (one per template) above the same card UI, so managing any template is one click away.
- The new-trip creation form gains a template dropdown (defaulting to General); the chosen template's items are copied into the new trip at creation time — the same automatic-copy behavior that exists today, now with a choice.

## Non-goals

- No user-created custom templates in this cycle — exactly 5 fixed templates (General + 4 named).
- No per-trip template switching after creation — the template choice only applies at trip-creation time; a trip's packing list is edited directly afterward like today.
- No changes to Do's & Don'ts or any other checklist-style UI — this cycle is packing-items only.
- No draft/unsaved-state handling when switching template tabs — same as today's behavior, every add/toggle/delete is saved immediately.

## Architecture

- **`src/lib/types.ts`** (modify) — add:
  ```ts
  export type PackingTemplateId = 'general' | 'beach' | 'business' | 'camping' | 'winter';
  ```
  and add a field to the existing `PackingItem` interface:
  ```ts
  export interface PackingItem {
    id: string;
    tripId: string | null;
    templateId: PackingTemplateId | null;
    category: PackingCategory;
    label: string;
    checked: boolean;
  }
  ```
  For a trip-scoped item, `tripId` is the trip's id and `templateId` is `null`. For a template item, `tripId` is `null` and `templateId` identifies which template it belongs to.

- **`src/lib/storage/checklist.ts`** (modify) — `listPackingItems(tripId: string): PackingItem[]` narrows its signature to trip-scoped items only (no more `null` argument — `null` is no longer a valid "give me the template" call, since there are now 5 templates). Add:
  ```ts
  export function listTemplateItems(templateId: PackingTemplateId): PackingItem[] {
    return readAll<PackingItem>(PACKING_KEY).filter(
      (i) => i.tripId === null && (i.templateId ?? 'general') === templateId
    );
  }
  ```
  The `?? 'general'` default handles every pre-existing localStorage record, which predates the `templateId` field entirely (so it's `undefined` at runtime despite the TS type) — those records become General template items automatically, no migration script needed. `savePackingItem` and `deletePackingItem` are unchanged; both already operate generically by `id`.

- **`src/lib/packingTemplates.ts`** (new) —
  ```ts
  import type { PackingCategory, PackingTemplateId } from './types';

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
  ```
  Plus a `seedTemplateIfEmpty(templateId: PackingTemplateId): void` function that, for any non-`'general'` template, checks a `trailune:packingTemplateSeeded:<id>` localStorage flag; if unset AND `listTemplateItems(templateId)` is currently empty, it saves each of that template's seed items via `savePackingItem` (with fresh generated ids, `tripId: null`, `templateId`, `checked: false`) and sets the flag. The flag — not just an empty-check — is what prevents re-seeding after a user deliberately deletes every item from a template.

- **`src/lib/storage/storage.ts`** (modify) — `createTrip` gains a parameter:
  ```ts
  export function createTrip(input: {
    name: string;
    startDate: string;
    endDate: string;
    countries: string[];
    transportMode?: TransportMode;
    packingTemplateId?: PackingTemplateId;
  }): Trip {
    // ...unchanged trip creation...
    const templateItems = checklist.listTemplateItems(input.packingTemplateId ?? 'general');
    for (const item of templateItems) {
      checklist.savePackingItem({ ...item, id: generateId(), tripId: trip.id, templateId: null, checked: false });
    }
    return trip;
  }
  ```

- **`src/lib/components/PackingChecklist.svelte`** (rewrite) — props become a discriminated union:
  ```ts
  let {
    context
  }: { context: { type: 'trip'; tripId: string } | { type: 'template'; templateId: PackingTemplateId } } =
    $props();
  ```
  `load()` calls `listPackingItems(context.tripId)` or `listTemplateItems(context.templateId)` depending on `context.type`; `addItem` constructs the new `PackingItem` with `tripId`/`templateId` set from `context` (mirroring the branch above). Category grouping, the add-form, and delete stay structurally the same as today. The **card markup** changes to ticket-style rows: a flex row per item with the existing category SVG icon on the left, the label, and — only when `item.checked` — a small rotated "PACKED" badge in the corner using `--color-accent`, animated in with a settle keyframe styled after the existing `stamp-settle` animation in `TripCard.svelte` (scale 1.15→1, rotate -6deg→0, opacity 0.6→1, ~0.4s, respecting `prefers-reduced-motion` the same way `TripCard.svelte` already does).

- **`src/routes/packing-template/+page.svelte`** (modify) — adds `let selectedTemplate: PackingTemplateId = $state('general');` and a row of 5 tab buttons built from `PACKING_TEMPLATES`; selecting a non-`'general'` tab calls `seedTemplateIfEmpty(selectedTemplate)` before rendering; renders `<PackingChecklist context={{ type: 'template', templateId: selectedTemplate }} />` keyed on `selectedTemplate` so it reloads per tab.

- **`src/routes/+page.svelte`** (modify) — the new-trip dialog gains `let packingTemplateId: PackingTemplateId = $state('general');` and a `<select>` populated from `PACKING_TEMPLATES`, passed through as `createTrip({ ..., packingTemplateId })`; reset in `resetForm()` back to `'general'`.

- **Trip hub's Packing tab** (in `src/routes/trips/[id]/+page.svelte`, modify) — updates its `<PackingChecklist>` usage to the new discriminated prop: `<PackingChecklist context={{ type: 'trip', tripId }} />`.

## Data flow & interaction notes

- `templateId` and `tripId` are mutually exclusive dimensions on the same `PackingItem` — a record is either "this trip's item" (`tripId` set, `templateId` null) or "this template's item" (`tripId` null, `templateId` set). No record is ever both.
- Seeding is lazy and one-shot per template, triggered from the `/packing-template` page's tab-switch handler — not on app startup — so templates the user never opens are never seeded, keeping localStorage lean.
- `createTrip`'s copy-in behavior is otherwise identical to today: items are duplicated with fresh ids, `checked: false`, and reassigned to the new trip.

## Edge cases

- **Legacy items with no `templateId` field**: `listTemplateItems`'s `?? 'general'` default means every item a user already has in their shared template becomes part of the General template automatically — no explicit migration step, and General is not seeded (so nothing is overwritten).
- **Re-seeding after deletion**: the `trailune:packingTemplateSeeded:<id>` flag, once set, is permanent — deleting every item from Beach Holiday and reopening that tab shows an empty list, not a reseed.
- **`general` is never seeded**: `PACKING_TEMPLATE_SEEDS` has no `general` key by construction (`Exclude<PackingTemplateId, 'general'>`), so `seedTemplateIfEmpty('general')` is a guaranteed no-op.
- **Existing trips**: unaffected — their `PackingItem`s already carry `tripId` set to a real trip id; `deleteTripCascade`'s existing `deletePackingItemsForTrip(tripId)` call needs no changes since it already filters by `tripId`.

## Testing

- **`checklist.ts`**: unit tests for `listPackingItems` (trip-scoped only) and `listTemplateItems` (returns only the matching template's items; a legacy item with no `templateId` field counts as `'general'`; items for other templates/trips are excluded).
- **`packingTemplates.ts`**: unit tests for `seedTemplateIfEmpty` — seeds the correct starter items on first call for a named template, does not reseed after the items are deleted and the function is called again, and is a no-op for `'general'`.
- **`storage.ts`**: `createTrip` test with an explicit `packingTemplateId` (e.g. `'beach'`) confirming the right template's items are copied in with fresh ids and `checked: false`, plus the default-to-`'general'` case when `packingTemplateId` is omitted.
- **UI** (`PackingChecklist.svelte`, the template-tabs page, the create-trip dropdown): manual browser verification (this project's established convention for CRUD/visual UI) — ticket cards render and toggle with the stamp animation and respect reduced motion, template tabs switch and seed exactly once, the create-trip dropdown copies the chosen template's items into a newly created trip, and the trip hub's Packing tab still works unchanged for trip-scoped items.
