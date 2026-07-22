<script lang="ts">
  import { onMount } from 'svelte';
  import { listPins, savePin, deletePin } from '$lib/storage/storage';
  import { generateId } from '$lib/utils/id';
  import type { PinEntry } from '$lib/types';

  let { tripId }: { tripId: string } = $props();

  let pins: PinEntry[] = $state([]);
  let label = $state('');
  let note = $state('');

  function load() {
    pins = listPins(tripId);
  }

  onMount(load);

  function add(event: SubmitEvent) {
    event.preventDefault();
    if (!label.trim()) return;
    savePin({
      id: generateId(),
      tripId,
      label: label.trim(),
      note: note.trim() ? note.trim() : null,
      createdAt: new Date().toISOString()
    });
    label = '';
    note = '';
    load();
  }

  function remove(pin: PinEntry) {
    deletePin(pin.id);
    load();
  }
</script>

<section class="space-y-6">
  {#if pins.length === 0}
    <div
      class="rounded-[var(--radius-lg)] border border-dashed border-[var(--color-card-border)] bg-[var(--color-card)]/60 px-6 py-10 text-center"
    >
      <p class="text-[var(--color-ink-soft)]">No pins yet. Add a place worth remembering below.</p>
    </div>
  {:else}
    <ul class="space-y-3">
      {#each pins as pin (pin.id)}
        <li
          class="group flex items-start justify-between gap-3 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 shadow-[var(--shadow-card)]"
        >
          <div class="min-w-0">
            <p class="font-display text-base font-bold text-[var(--color-ink)]">{pin.label}</p>
            {#if pin.note}
              <p class="mt-1 text-sm text-[var(--color-ink-soft)]">{pin.note}</p>
            {/if}
          </div>
          <button
            type="button"
            onclick={() => remove(pin)}
            aria-label={`Remove ${pin.label}`}
            class="grid size-7 shrink-0 place-items-center rounded-full text-[var(--color-ink-soft)] opacity-0 transition-opacity hover:bg-[var(--color-danger-soft)] hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100"
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
    onsubmit={add}
    class="space-y-4 rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-5"
  >
    <h2 class="font-display text-base font-bold">Pin a place</h2>
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Place name</span>
      <input
        bind:value={label}
        required
        placeholder="e.g. Cliffs of Moher"
        class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      />
    </label>
    <label class="block">
      <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Note (optional)</span>
      <input
        bind:value={note}
        placeholder="What made it memorable?"
        class="w-full rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
      />
    </label>
    <button
      type="submit"
      class="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-ink)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:bg-[var(--color-accent-hover)]"
    >
      Add pin
    </button>
  </form>
</section>
