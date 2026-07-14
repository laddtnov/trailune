<script lang="ts">
  import { onMount } from 'svelte';
  import { listPackingItems, savePackingItem, deletePackingItem } from '$lib/storage/checklist';
  import { generateId } from '$lib/utils/id';
  import type { PackingItem, PackingCategory } from '$lib/types';

  let { tripId }: { tripId: string | null } = $props();

  const categories: PackingCategory[] = ['Documents', 'Electronics', 'Clothing', 'Toiletries', 'Other'];

  const categoryIcons: Record<PackingCategory, string> = {
    Documents: 'M7 3h7l5 5v13H7zM14 3v5h5M9 12h6M9 16h6',
    Electronics: 'M5 7h14v10H5zM9 21h6M12 17v4',
    Clothing: 'M8 3 4 7l3 3 1-1v10h8V9l1 1 3-3-4-4-2 2h-4Z',
    Toiletries: 'M9 3h6l1 3v2a3 3 0 0 0 1 2.2A5 5 0 0 1 19 14v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a5 5 0 0 1 2-4.8A3 3 0 0 0 8 8V6Z',
    Other: 'M20 7 12 3 4 7l8 4 8-4Zm0 0v10l-8 4m8-14L12 11m0 0v10m0-10L4 7m0 0v10l8 4'
  };

  let items: PackingItem[] = $state([]);
  let newLabel = $state('');
  let newCategory: PackingCategory = $state('Documents');

  function load() {
    items = listPackingItems(tripId);
  }

  onMount(load);

  function toggle(item: PackingItem) {
    savePackingItem({ ...item, checked: !item.checked });
    load();
  }

  function addItem(event: SubmitEvent) {
    event.preventDefault();
    if (!newLabel.trim()) return;
    savePackingItem({ id: generateId(), tripId, category: newCategory, label: newLabel, checked: false });
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
        <ul class="mt-3 space-y-1.5">
          {#each categoryItems as item (item.id)}
            <li class="group flex items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-1 transition-colors hover:bg-[var(--color-canvas-dim)]">
              <label
                class="flex flex-1 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[var(--color-accent)]"
              >
                <input type="checkbox" class="sr-only" checked={item.checked} onchange={() => toggle(item)} />
                <span
                  class="grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors {item.checked
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]'
                    : 'border-[var(--color-card-border)]'}"
                >
                  {#if item.checked}
                    <svg viewBox="0 0 24 24" class="size-3 text-[var(--color-accent-ink)]" fill="none" stroke="currentColor" stroke-width="3">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  {/if}
                </span>
                <span
                  class="text-sm transition-colors {item.checked
                    ? 'text-[var(--color-ink-soft)] line-through'
                    : 'text-[var(--color-ink)]'}"
                >
                  {item.label}
                </span>
              </label>
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

<form onsubmit={addItem} class="mt-5 flex flex-wrap gap-2 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-3">
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
