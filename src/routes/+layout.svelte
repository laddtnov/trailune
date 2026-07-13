<script lang="ts">
  import '../app.css';

  let { children } = $props();
</script>

<header class="site-header">
  <a class="brand" href="/">
    <span class="brand-name">Trailune</span>
    <span class="brand-tagline">Track every journey.</span>
  </a>
  <nav>
    <a href="/">Trips</a>
    <a href="/map">Map</a>
    <a href="/packing-template">Packing Template</a>
  </nav>
</header>

<main>
  {@render children()}
</main>

<style>
  .site-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 16px 24px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-paper-dark);
  }

  .brand {
    text-decoration: none;
  }

  .brand-name {
    font-family: var(--font-heading);
    font-size: 22px;
    font-weight: bold;
    color: var(--color-ink);
    margin-right: 8px;
  }

  .brand-tagline {
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-ink-soft);
  }

  nav a {
    margin-left: 16px;
    color: var(--color-ink);
    text-decoration: none;
  }

  main {
    padding: 24px;
    max-width: 900px;
    margin: 0 auto;
  }
</style>
