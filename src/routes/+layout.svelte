<script lang="ts">
  import '../app.css';
  import { page } from '$app/state';

  let { children } = $props();

  const navItems = [
    { href: '/', label: 'Trips' },
    { href: '/map', label: 'Map' },
    { href: '/packing-template', label: 'Packing' }
  ];

  let mobileNavOpen = $state(false);

  function isActive(href: string): boolean {
    if (href === '/') return page.url.pathname === '/';
    return page.url.pathname.startsWith(href);
  }
</script>

<header
  class="sticky top-0 z-40 border-b border-black/10 bg-[var(--color-ink-band)] text-[var(--color-accent-ink)]"
>
  <div class="mx-auto flex max-w-5xl items-center justify-between px-5 py-3 sm:px-8">
    <a href="/" class="group flex items-center gap-2.5" onclick={() => (mobileNavOpen = false)}>
      <span
        class="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[var(--color-accent)] font-display text-base font-bold text-[var(--color-accent)] transition-transform duration-200 ease-out group-hover:-rotate-6"
      >
        T
      </span>
      <span class="font-display text-xl font-bold tracking-tight">Trailune</span>
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
  {@render children()}
</main>
