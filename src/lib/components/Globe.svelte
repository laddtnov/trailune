<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import type * as THREENS from 'three';
  import type { TrackballControls as TrackballControlsType } from 'three/examples/jsm/controls/TrackballControls.js';
  import { loadGlobeCountries, getFeatureCode } from '$lib/globeCountries';

  let { visitedCodes }: { visitedCodes: Set<string> } = $props();

  let container: HTMLDivElement | undefined = $state();
  let animationFrameId: number | undefined;
  let renderer: THREENS.WebGLRenderer | undefined;
  let controls: TrackballControlsType | undefined;
  let scene: THREENS.Scene | undefined;
  let globe: { pauseAnimation?: () => unknown } | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let destroyed = false;
  let error = $state(false);

  /**
   * Resolves any valid CSS color string (including oklch()/lab()/etc, which
   * three-globe's underlying tinycolor2/d3-color parsing cannot handle) to an
   * sRGB hex string, via a 1x1 canvas round-trip. Falls back on failure.
   */
  function resolveCssColorToHex(cssColor: string, fallback: string): string {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) return fallback;
      ctx.fillStyle = fallback;
      ctx.fillStyle = cssColor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`;
    } catch {
      return fallback;
    }
  }

  onMount(async () => {
    if (!container) return;

    try {
      // three-globe (via three-conic-polygon-geometry) touches `window` at module
      // load time, which breaks SSR/prerendering. Load it lazily, client-side only.
      const [THREE, { TrackballControls }, { default: ThreeGlobe }] = await Promise.all([
        import('three'),
        import('three/examples/jsm/controls/TrackballControls.js'),
        import('three-globe')
      ]);

      if (destroyed) return;

      const rawAccent = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-accent')
        .trim();
      const visitedColor = resolveCssColorToHex(rawAccent, '#e08e45');
      const neutralColor = '#2a2a2a';

      const features = await loadGlobeCountries();

      if (destroyed) return;

      const globeInstance = new ThreeGlobe()
        .polygonsData(features)
        .polygonCapColor((feature) => (visitedCodes.has(getFeatureCode(feature as any)) ? visitedColor : neutralColor))
        .polygonSideColor(() => 'rgba(0, 0, 0, 0.15)')
        .polygonStrokeColor(() => '#111111')
        .polygonAltitude(0.006);
      globe = globeInstance;

      const width = container.clientWidth;
      const height = container.clientHeight;

      const sceneInstance = new THREE.Scene();
      scene = sceneInstance;
      sceneInstance.add(globeInstance);
      sceneInstance.add(new THREE.AmbientLight(0xcccccc, Math.PI));
      sceneInstance.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

      const camera = new THREE.PerspectiveCamera(50, width / height);
      camera.position.z = 350;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
      container.appendChild(renderer.domElement);

      controls = new TrackballControls(camera, renderer.domElement);
      controls.minDistance = 120;
      controls.rotateSpeed = 4;
      controls.zoomSpeed = 0.8;
      controls.noPan = true;

      resizeObserver = new ResizeObserver(() => {
        if (!container || !renderer || !controls) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        controls.handleResize();
      });
      resizeObserver.observe(container);

      function animate() {
        controls!.update();
        renderer!.render(sceneInstance, camera);
        animationFrameId = requestAnimationFrame(animate);
      }
      animate();
    } catch {
      if (!destroyed) error = true;
    }
  });

  onDestroy(() => {
    destroyed = true;
    if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
    resizeObserver?.disconnect();
    controls?.dispose();
    // Stop three-globe's own internal rAF loop (it keeps calling
    // requestAnimationFrame on its own, independent of our loop above) and
    // release its heavy geometry/materials before tearing down the renderer.
    globe?.pauseAnimation?.();
    if (scene) {
      scene.traverse((object) => {
        const mesh = object as unknown as {
          geometry?: { dispose?: () => void };
          material?: { dispose?: () => void } | { dispose?: () => void }[];
        };
        mesh.geometry?.dispose?.();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((m) => m.dispose?.());
        } else {
          mesh.material?.dispose?.();
        }
      });
    }
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  });
</script>

{#if error}
  <div
    class="flex h-[70vh] w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-4 text-center text-sm text-[var(--color-danger)]"
  >
    Couldn't load the globe. Check your connection and try again.
  </div>
{:else}
  <div bind:this={container} class="h-[70vh] w-full"></div>
{/if}
