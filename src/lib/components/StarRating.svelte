<script lang="ts">
  let {
    value = $bindable<number | undefined>(undefined),
    readonly = false
  }: { value?: number; readonly?: boolean } = $props();

  function setRating(star: number) {
    if (readonly) return;
    value = value === star ? undefined : star;
  }
</script>

{#if value !== undefined || !readonly}
  <div
    class="star-rating"
    role={readonly ? undefined : 'radiogroup'}
    aria-label={readonly ? undefined : 'Rating'}
  >
    {#each [1, 2, 3, 4, 5] as star (star)}
      {#if readonly}
        <span class="star" class:filled={value !== undefined && star <= value}>★</span>
      {:else}
        <button
          type="button"
          class="star-button"
          class:filled={value !== undefined && star <= value}
          onclick={() => setRating(star)}
          aria-label={`Rate ${star} star${star === 1 ? '' : 's'}`}
          aria-pressed={value === star}
        >★</button>
      {/if}
    {/each}
  </div>
{/if}

<style>
  .star-rating {
    display: inline-flex;
    gap: 2px;
  }

  .star {
    font-size: 0.95rem;
    line-height: 1;
    color: var(--color-card-border);
  }

  .star.filled {
    color: var(--color-accent);
  }

  .star-button {
    background: none;
    border: none;
    padding: 2px;
    cursor: pointer;
    font-size: 1.25rem;
    line-height: 1;
    color: var(--color-card-border);
    transition:
      color 0.15s ease,
      transform 0.15s ease;
  }

  .star-button:hover {
    transform: scale(1.15);
  }

  .star-button.filled {
    color: var(--color-accent);
  }
</style>
