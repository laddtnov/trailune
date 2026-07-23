<script lang="ts">
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
</script>

<h1 class="font-display text-3xl font-bold sm:text-4xl">Packing template</h1>
<p class="mt-1 max-w-xl text-[var(--color-ink-soft)]">
  Items here are copied into every new trip's packing list automatically, so recurring things like
  your passport or charger never need re-typing.
</p>

<div class="mt-8">
  <PackingChecklist context={{ type: 'template', templateId: 'general' }} />
</div>
