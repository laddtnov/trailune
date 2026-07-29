<script lang="ts">
  import { onMount } from 'svelte';
  import { getNote, saveNote } from '$lib/storage/storage';

  let { tripId }: { tripId: string } = $props();

  let text = $state('');
  let saveState: 'idle' | 'saving' | 'saved' = $state('idle');
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    text = getNote(tripId)?.text ?? '';
  });

  function scheduleSave() {
    saveState = 'saving';
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      saveNote(tripId, text);
      saveState = 'saved';
    }, 500);
  }

  function saveNow() {
    if (timeoutId) clearTimeout(timeoutId);
    saveNote(tripId, text);
    saveState = 'saved';
  }
</script>

<section class="space-y-2">
  <textarea
    bind:value={text}
    oninput={scheduleSave}
    onblur={saveNow}
    rows="12"
    placeholder="Packing reminders, confirmation numbers, loose thoughts — anything that doesn't fit the journal."
    class="w-full resize-y rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-4 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
  ></textarea>
  {#if saveState === 'saving'}
    <p class="text-xs text-[var(--color-ink-soft)]">Saving…</p>
  {:else if saveState === 'saved'}
    <p class="text-xs text-[var(--color-ink-soft)]">Saved</p>
  {/if}
</section>
