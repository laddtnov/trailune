<script lang="ts">
  let {
    width = '100%',
    height = '1rem',
    radius = 'var(--radius-md)'
  }: { width?: string; height?: string; radius?: string } = $props();
</script>

<div class="skeleton" style={`width: ${width}; height: ${height}; border-radius: ${radius};`}></div>

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      var(--color-card) 25%,
      var(--color-card-border) 50%,
      var(--color-card) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-sweep 1.4s ease-in-out infinite;
  }

  @keyframes skeleton-sweep {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton {
      animation: none;
      background: var(--color-card-border);
    }
  }
</style>
