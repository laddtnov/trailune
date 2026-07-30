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

  onMount(async () => {
    if (!container) return;

    // three-globe (via three-conic-polygon-geometry) touches `window` at module
    // load time, which breaks SSR/prerendering. Load it lazily, client-side only.
    const [THREE, { TrackballControls }, { default: ThreeGlobe }] = await Promise.all([
      import('three'),
      import('three/examples/jsm/controls/TrackballControls.js'),
      import('three-globe')
    ]);

    const visitedColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-accent')
      .trim() || '#e08e45';
    const neutralColor = '#2a2a2a';

    const features = await loadGlobeCountries();

    const globe = new ThreeGlobe()
      .polygonsData(features)
      .polygonCapColor((feature) => (visitedCodes.has(getFeatureCode(feature as any)) ? visitedColor : neutralColor))
      .polygonSideColor(() => 'rgba(0, 0, 0, 0.15)')
      .polygonStrokeColor(() => '#111111')
      .polygonAltitude(0.006);

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.add(globe);
    scene.add(new THREE.AmbientLight(0xcccccc, Math.PI));
    scene.add(new THREE.DirectionalLight(0xffffff, 0.6 * Math.PI));

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

    function animate() {
      controls!.update();
      renderer!.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    }
    animate();
  });

  onDestroy(() => {
    if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId);
    controls?.dispose();
    renderer?.dispose();
  });
</script>

<div bind:this={container} class="h-[70vh] w-full"></div>
