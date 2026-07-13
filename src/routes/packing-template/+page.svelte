<script lang="ts">
  import PackingChecklist from '$lib/components/PackingChecklist.svelte';
</script>

<h1>Packing Template</h1>
<p>Items here are copied into every new trip's packing list automatically.</p>
<PackingChecklist tripId={null} />
