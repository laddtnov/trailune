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

{#snippet column(
  label: string,
  list: DoDontItem[],
  accent: string,
  accentSoft: string,
  value: string,
  onInput: (v: string) => void,
  onSubmit: () => void,
  placeholder: string
)}
  <section class="rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4">
    <h3 class="font-display text-base font-bold" style="color: {accent}">{label}</h3>
    {#if list.length === 0}
      <p class="mt-2 text-sm text-[var(--color-ink-soft)]">Nothing here yet.</p>
    {:else}
      <ul class="mt-3 space-y-1.5">
        {#each list as item (item.id)}
          <li class="group flex items-center gap-2 rounded-[var(--radius-md)] px-1.5 py-1 transition-colors hover:bg-[var(--color-canvas-dim)]">
            <label
              class="flex flex-1 cursor-pointer items-center gap-3 rounded-[var(--radius-md)] has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2"
              style="outline-color: {accent}"
            >
              <input type="checkbox" class="sr-only" checked={item.checked} onchange={() => toggle(item)} />
              <span
                class="grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors"
                style={item.checked
                  ? `border-color: ${accent}; background-color: ${accent};`
                  : 'border-color: var(--color-card-border);'}
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
                {item.text}
              </span>
            </label>
            <button
              type="button"
              onclick={() => remove(item)}
              aria-label={`Remove ${item.text}`}
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

    <form
      onsubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      class="mt-3 flex gap-2"
    >
      <input
        {value}
        oninput={(e) => onInput((e.target as HTMLInputElement).value)}
        {placeholder}
        required
        class="min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-ink-soft)]/60 focus:border-current focus:ring-2"
        style="--tw-ring-color: {accentSoft}; color-scheme: light;"
      />
      <button
        type="submit"
        class="shrink-0 rounded-[var(--radius-md)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-opacity hover:opacity-90"
        style="background-color: {accent}"
      >
        Add
      </button>
    </form>
  </section>
{/snippet}

<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
  {@render column(
    'Do',
    dos,
    'var(--color-teal)',
    'var(--color-teal-soft)',
    newDoText,
    (v) => (newDoText = v),
    () => {
      add('do', newDoText);
      newDoText = '';
    },
    'Add a do…'
  )}
  {@render column(
    "Don't",
    donts,
    'var(--color-danger)',
    'var(--color-danger-soft)',
    newDontText,
    (v) => (newDontText = v),
    () => {
      add('dont', newDontText);
      newDontText = '';
    },
    "Add a don't…"
  )}
</div>
