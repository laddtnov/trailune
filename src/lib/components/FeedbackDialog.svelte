<script lang="ts">
  let dialogEl: HTMLDialogElement | undefined = $state();
  let message = $state('');
  let submitting = $state(false);
  let status: 'idle' | 'success' | 'error' = $state('idle');

  export function open() {
    message = '';
    status = 'idle';
    dialogEl?.showModal();
  }

  function onDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    status = 'idle';
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Request failed');
      status = 'success';
      setTimeout(() => dialogEl?.close(), 1200);
    } catch {
      status = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={onDialogClick}
  class="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-pop)] backdrop:bg-[var(--color-ink)]/40 backdrop:backdrop-blur-sm open:animate-[pop-in_0.2s_var(--ease-out-quart)]"
>
  <form onsubmit={submit} class="flex flex-col">
    <header
      class="flex items-center justify-between border-b border-[var(--color-card-border)] px-6 py-4"
    >
      <h2 class="font-display text-xl font-bold">Send feedback</h2>
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        aria-label="Close"
        class="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)] hover:text-[var(--color-ink)]"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <div class="space-y-4 px-6 py-5">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Your message</span>
        <textarea
          bind:value={message}
          required
          rows="5"
          placeholder="What's on your mind?"
          class="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        ></textarea>
      </label>

      {#if status === 'success'}
        <p
          class="rounded-[var(--radius-md)] bg-[var(--color-success-soft)] px-3.5 py-2.5 text-sm text-[var(--color-ink)]"
        >
          Thanks — your feedback was sent!
        </p>
      {:else if status === 'error'}
        <p
          class="rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]"
        >
          Couldn't send that — please try again in a moment.
        </p>
      {/if}
    </div>

    <footer class="flex justify-end gap-3 border-t border-[var(--color-card-border)] px-6 py-4">
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        class="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting || status === 'success'}
        class="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send'}
      </button>
    </footer>
  </form>
</dialog>

<style>
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open] {
      animation: none;
    }
  }
</style>
