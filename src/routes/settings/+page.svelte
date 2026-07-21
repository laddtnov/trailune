<script lang="ts">
  import { onMount } from 'svelte';
  import { THEMES, getStoredTheme, applyTheme } from '$lib/theme';

  const PREVIEW_COLORS: Record<string, { canvas: string; card: string; accent: string; band: string; accentInk: string }> = {
    'travel-journal': {
      canvas: 'oklch(98% 0.003 60)',
      card: 'oklch(97.5% 0.018 66)',
      accent: 'oklch(57% 0.17 35)',
      band: 'oklch(24% 0.032 38)',
      accentInk: 'oklch(98% 0.01 60)'
    },
    'explorer-night': {
      canvas: 'oklch(18% 0.02 260)',
      card: 'oklch(24% 0.025 255)',
      accent: 'oklch(72% 0.15 80)',
      band: 'oklch(12% 0.02 260)',
      accentInk: 'oklch(18% 0.02 260)'
    },
    'golden-sunset': {
      canvas: 'oklch(96% 0.02 50)',
      card: 'oklch(94% 0.05 45)',
      accent: 'oklch(60% 0.2 20)',
      band: 'oklch(30% 0.06 30)',
      accentInk: 'oklch(98% 0.01 50)'
    },
    'polar-morning': {
      canvas: 'oklch(97% 0.008 230)',
      card: 'oklch(95% 0.015 220)',
      accent: 'oklch(55% 0.12 220)',
      band: 'oklch(28% 0.03 235)',
      accentInk: 'oklch(98% 0.008 220)'
    }
  };

  let selectedTheme = $state('travel-journal');

  onMount(() => {
    selectedTheme = getStoredTheme();
  });

  function selectTheme(id: string) {
    selectedTheme = id;
    applyTheme(id);
  }
</script>

<div>
  <h1 class="font-display text-3xl font-bold sm:text-4xl">Settings</h1>
  <p class="mt-1 text-[var(--color-ink-soft)]">Choose the look of your journal.</p>
</div>

<div class="mt-8 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5">
  {#each THEMES as theme (theme.id)}
    <button
      type="button"
      aria-pressed={selectedTheme === theme.id}
      onclick={() => selectTheme(theme.id)}
      class="overflow-hidden rounded-[var(--radius-lg)] border-2 text-left shadow-[var(--shadow-card)] transition-all duration-200 ease-[var(--ease-out-quart)] hover:-translate-y-0.5 {selectedTheme ===
      theme.id
        ? 'border-[var(--color-accent)]'
        : 'border-transparent'}"
    >
      <div style="background: {PREVIEW_COLORS[theme.id].canvas}; padding: 12px;">
        <div style="background: {PREVIEW_COLORS[theme.id].band}; border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700; color: {PREVIEW_COLORS[
          theme.id
        ].accentInk};">
          Trailune
        </div>
        <div
          style="background: {PREVIEW_COLORS[theme.id].card}; border-radius: 8px; padding: 8px 10px; margin-top: 8px;"
        >
          <div
            style="display: inline-block; background: {PREVIEW_COLORS[theme.id]
              .accent}; color: {PREVIEW_COLORS[theme.id].accentInk}; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 600;"
          >
            New trip
          </div>
        </div>
      </div>
      <div class="bg-[var(--color-card)] p-4">
        <p class="font-display text-lg font-bold">{theme.name}</p>
      </div>
    </button>
  {/each}
</div>
