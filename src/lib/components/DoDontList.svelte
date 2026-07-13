<script lang="ts">
  import { onMount } from 'svelte';
  import { listDoDontItems, saveDoDontItem, deleteDoDontItem } from '$lib/storage/checklist';
  import { generateId } from '$lib/utils/id';
  import type { DoDontItem } from '$lib/types';

  let { tripId }: { tripId: string } = $props();

  let items: DoDontItem[] = $state([]);
  let newDoText = $state('');
  let newDontText = $state('');

  function load() {
    items = listDoDontItems(tripId);
  }

  onMount(load);

  function add(type: 'do' | 'dont', text: string) {
    if (!text.trim()) return;
    saveDoDontItem({ id: generateId(), tripId, type, text, checked: false });
    load();
  }

  function toggle(item: DoDontItem) {
    saveDoDontItem({ ...item, checked: !item.checked });
    load();
  }

  function remove(item: DoDontItem) {
    deleteDoDontItem(item.id);
    load();
  }

  let dos = $derived(items.filter((i) => i.type === 'do'));
  let donts = $derived(items.filter((i) => i.type === 'dont'));
</script>

<div class="do-dont-columns">
  <section>
    <h3>Do</h3>
    <ul>
      {#each dos as item (item.id)}
        <li>
          <label><input type="checkbox" checked={item.checked} onchange={() => toggle(item)} />{item.text}</label>
          <button onclick={() => remove(item)}>&times;</button>
        </li>
      {/each}
    </ul>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        add('do', newDoText);
        newDoText = '';
      }}
    >
      <input bind:value={newDoText} placeholder="Add a do" required />
      <button type="submit">Add</button>
    </form>
  </section>

  <section>
    <h3>Don't</h3>
    <ul>
      {#each donts as item (item.id)}
        <li>
          <label><input type="checkbox" checked={item.checked} onchange={() => toggle(item)} />{item.text}</label>
          <button onclick={() => remove(item)}>&times;</button>
        </li>
      {/each}
    </ul>
    <form
      onsubmit={(event) => {
        event.preventDefault();
        add('dont', newDontText);
        newDontText = '';
      }}
    >
      <input bind:value={newDontText} placeholder="Add a don't" required />
      <button type="submit">Add</button>
    </form>
  </section>
</div>

<style>
  .do-dont-columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
  }
  li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 2px 0;
  }
</style>
