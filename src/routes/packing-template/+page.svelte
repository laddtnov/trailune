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
