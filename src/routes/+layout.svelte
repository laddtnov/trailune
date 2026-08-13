<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';
  import { pwaInfo } from 'virtual:pwa-info';
  import { fade } from 'svelte/transition';
  import { cubicOut } from 'svelte/easing';
  import { onMount } from 'svelte';
  import AmbientBackground from '$lib/components/AmbientBackground.svelte';
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';

  let { children } = $props();

  let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');

  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/dream-map', label: 'Dream Map' },
    { href: '/timeline', label: 'Timeline' },
    { href: '/calendar', label: 'Calendar' },
    { href: '/globe', label: 'Globe' },
    { href: '/packing-template', label: 'Packing' },
    { href: '/stats', label: 'Stats' },
    { href: '/settings', label: 'Settings' }
  ];

  let mobileNavOpen = $state(false);
  let feedbackDialog: FeedbackDialog | undefined = $state();
  const brandLetters = 'Trailune'.split('');

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }

  onMount(() => {
    try {
      // One-time purge of the removed Notes feature's saved data (removed 2026-07-31).
      localStorage.removeItem('trailune:notes');
    } catch {
      // storage unavailable (blocked cookies, strict tracking protection, etc.) — safe to skip
    }
  });
</script>

<svelte:head>
  {@html webManifestLink}
</svelte:head>

<AmbientBackground />

<header
  class="sticky top-0 z-40 border-b border-black/10 bg-[var(--color-ink-band)] text-[var(--color-accent-ink)]"
>
  <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
    <a
      href="/"
      class="group flex items-center gap-2.5"
      style="perspective: 240px"
      onclick={() => (mobileNavOpen = false)}
    >
      <span
        class="globe-badge relative grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--color-accent)] font-display text-base font-bold text-[var(--color-accent)]"
      >
        T
        <span class="globe-meridian pointer-events-none absolute inset-0 rounded-full border border-[var(--color-accent)]/50"
        ></span>
      </span>
      <span class="brand-name font-display text-xl font-bold tracking-tight">
        {#each brandLetters as letter, i (i)}
          <span class="brand-letter inline-block" style="animation-delay: {i * 0.05}s">{letter}</span>
        {/each}
      </span>
    </a>

    <nav class="hidden items-center gap-1 sm:flex">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          class="relative rounded-full px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out {isActive(
            item.href
          )
            ? 'bg-white/10 text-[var(--color-accent-ink)]'
            : 'text-[var(--color-accent-ink)]/70 hover:bg-white/5 hover:text-[var(--color-accent-ink)]'}"
        >
          {item.label}
          {#if isActive(item.href)}
            <span
              class="absolute inset-x-4 -bottom-[calc(0.75rem+1px)] h-0.5 rounded-full bg-[var(--color-accent)]"
            ></span>
          {/if}
        </a>
      {/each}
    </nav>

    <button
      type="button"
      class="grid size-10 place-items-center rounded-full transition-colors duration-150 hover:bg-white/10 sm:hidden"
      aria-expanded={mobileNavOpen}
      aria-label="Toggle navigation menu"
      onclick={() => (mobileNavOpen = !mobileNavOpen)}
    >
      <svg viewBox="0 0 24 24" class="size-5" fill="none" stroke="currentColor" stroke-width="2">
        {#if mobileNavOpen}
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        {:else}
          <path stroke-linecap="round" d="M4 7h16M4 12h16M4 17h16" />
        {/if}
      </svg>
    </button>
  </div>

  {#if mobileNavOpen}
    <nav class="flex flex-col gap-1 border-t border-white/10 px-5 pb-4 pt-2 sm:hidden">
      {#each navItems as item (item.href)}
        <a
          href={item.href}
          onclick={() => (mobileNavOpen = false)}
          class="rounded-lg px-3 py-2.5 text-sm font-medium {isActive(item.href)
            ? 'bg-white/10 text-[var(--color-accent-ink)]'
            : 'text-[var(--color-accent-ink)]/70'}"
        >
          {item.label}
        </a>
      {/each}
    </nav>
  {/if}
</header>

<main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
  {#key page.url.pathname}
    <div in:fade={{ duration: 200, easing: cubicOut }} out:fade={{ duration: 150, easing: cubicOut }}>
      {@render children()}
    </div>
  {/key}
</main>

<footer class="border-t border-[var(--color-card-border)] bg-[var(--color-ink-band)] py-6 text-center text-sm text-[var(--color-accent-ink)]/70">
  <div class="flex items-center justify-center gap-4">
    <button
      type="button"
      onclick={() => feedbackDialog?.open()}
      class="underline decoration-[var(--color-accent-ink)]/40 underline-offset-4 transition-colors hover:text-[var(--color-accent-ink)]"
    >
      Feedback
    </button>

    <span aria-hidden="true" class="text-[var(--color-accent-ink)]/30">&middot;</span>

    <a
      href="https://ko-fi.com/laddtnov"
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex items-center gap-1.5 text-[var(--color-accent-ink)]/70 underline decoration-[var(--color-accent-ink)]/40 underline-offset-4 transition-colors hover:text-[var(--color-accent-ink)]"
    >
      <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 8h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 10h1.5a2.5 2.5 0 0 1 0 5H17" />
        <path stroke-linecap="round" d="M8 3v2M12 3v2" />
      </svg>
      Support
    </a>
  </div>
</footer>

<FeedbackDialog bind:this={feedbackDialog} />

{#await import('$lib/PwaRegister.svelte') then { default: PwaRegister }}
  <PwaRegister />
{/await}

<style>
  .globe-badge {
    transform-style: preserve-3d;
    backface-visibility: hidden;
  }

  .globe-meridian {
    transform: scaleX(0.35);
  }

  :global(.group:hover) .globe-badge {
    animation: globe-spin 1.4s linear infinite;
  }

  @keyframes globe-spin {
    from {
      transform: rotateY(0deg);
    }
    to {
      transform: rotateY(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .globe-badge {
      animation: none;
    }
  }

  .brand-letter {
    animation-name: none;
  }

  :global(.group:hover) .brand-letter {
    animation-name: letter-hop;
    animation-duration: 0.5s;
    animation-timing-function: ease-out;
    animation-fill-mode: both;
  }

  @keyframes letter-hop {
    0% {
      transform: translateY(0);
    }
    35% {
      transform: translateY(-5px);
    }
    60% {
      transform: translateY(0);
    }
    100% {
      transform: translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.group:hover) .brand-letter {
      animation-name: none;
    }
  }
</style>
