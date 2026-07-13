<script lang="ts">
  import { onMount } from 'svelte';
  import { listPackingItems, savePackingItem, deletePackingItem } from '$lib/storage/checklist';
  import { generateId } from '$lib/utils/id';
  import type { PackingItem, PackingCategory } from '$lib/types';

  let { tripId }: { tripId: string | null } = $props();

  const categories: PackingCategory[] = ['Documents', 'Electronics', 'Clothing', 'Toiletries', 'Other'];

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
</script>

{#each categories as category}
  {@const categoryItems = items.filter((i) => i.category === category)}
  <section class="category">
    <h3>{category}</h3>
    {#if categoryItems.length === 0}
      <p class="empty">No items yet.</p>
    {/if}
    <ul>
      {#each categoryItems as item (item.id)}
        <li>
          <label>
            <input type="checkbox" checked={item.checked} onchange={() => toggle(item)} />
            {item.label}
          </label>
          <button onclick={() => remove(item)}>&times;</button>
        </li>
      {/each}
    </ul>
  </section>
{/each}

<form onsubmit={addItem}>
  <select bind:value={newCategory}>
    {#each categories as category}
      <option value={category}>{category}</option>
    {/each}
  </select>
  <input bind:value={newLabel} placeholder="Add item" required />
  <button type="submit">Add</button>
</form>

<style>
  .category {
    margin-bottom: 16px;
  }
  .empty {
    color: var(--color-ink-soft);
    font-size: 13px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
  }
</style>
