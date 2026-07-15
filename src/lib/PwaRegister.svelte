<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';

  useRegisterSW({
    onRegisterError(error) {
      console.error('Service worker registration failed', error);
    }
  });
</script>
