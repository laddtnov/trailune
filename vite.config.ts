import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				// Give the three/three-globe dependency graph (lazily imported only by
				// Globe.svelte, ~2.1MB raw) its own chunk, separate from the rest of
				// the app, so it doesn't drag unrelated routes' code along with it.
				manualChunks(id) {
					if (
						id.includes('node_modules/three-globe') ||
						id.includes('node_modules/three-conic-polygon-geometry') ||
						/node_modules\/three\//.test(id)
					) {
						return 'vendor-globe';
					}
				}
			}
		}
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			paths: {
				// Force root-absolute asset paths everywhere. Without this, SvelteKit's
				// default relative paths break the SPA-fallback shell (200.html) when it's
				// reused for nested dynamic routes like /trips/[id] — the browser resolves
				// "./_app/..." against the route's URL depth instead of the site root.
				relative: false
			},

			adapter: adapter({
				fallback: '200.html'
			})
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			kit: {
				adapterFallback: '200.html',
				spa: true
			},
			// vite-plugin-pwa >=0.20.2 hard-fails the build if maximumFileSizeToCacheInBytes
			// (below) ends up excluding anything, unless this is set. We *intend* to exclude
			// the vendor-globe chunk, so opt back into the pre-0.20.2 "warn, don't throw"
			// behavior.
			showMaximumFileSizeToCacheInBytesWarning: true,
			workbox: {
				navigateFallback: '200.html',
				// Precache the bundled country GeoJSON so /globe works offline, same as
				// /map already does with its own data. Passing an array here only ADDS to
				// @vite-pwa/sveltekit's own default globPatterns
				// (['client/**/*.{js,css,ico,png,svg,webp,webmanifest}',
				// 'prerendered/**/*.{html,json}'], via its internal buildGlobPatterns()
				// helper) rather than replacing them, so the prerendered/client patterns
				// needed for correct route precaching stay intact.
				// NOTE: must NOT start with the literal prefix "client/" - the plugin's
				// buildGlobPatterns() helper only appends its required
				// 'client/**/*.{js,css,ico,png,svg,webp,webmanifest}' default when none of
				// our patterns already starts with "client/"; a pattern of
				// 'client/**/*.geojson' would silently suppress that default and drop
				// almost everything else from the manifest (caught this empirically: it
				// took precache down to 13 entries).
				globPatterns: ['**/*.geojson'],
				// SvelteKit's client build always names chunks by content hash only
				// (rollupOptions.output.chunkFileNames is hardcoded to `[hash].js` inside
				// @sveltejs/kit/src/exports/vite/index.js) - the manualChunks name above
				// groups the three/three-globe graph into one chunk but that name never
				// surfaces in the output filename, so a globIgnores name/path pattern can't
				// target it. Every other precached file in this app - the geojson included,
				// at ~488KB - is well under 600KB; the vendor-globe chunk alone is ~1.9MB
				// raw (~2.1MB before minification, 342KB gzipped). Cap the precached file
				// size between those two instead, so the globe chunk stays on-demand rather
				// than force-precached for every visitor who never opens /globe, without
				// dropping anything else.
				//
				// Deliberately NOT using `manifestTransforms` for this: @vite-pwa/sveltekit
				// only installs its own required prerendered/client URL-rewriting transform
				// when `manifestTransforms` is left unset (see configureSvelteKitOptions in
				// node_modules/@vite-pwa/sveltekit/dist/index.mjs). Setting it ourselves
				// silently disables that rewrite and breaks every route's precache URL -
				// confirmed by trying it first and seeing raw "client/_app/..." and
				// "prerendered/pages/*.html" paths leak into the manifest instead of clean
				// route names.
				maximumFileSizeToCacheInBytes: 600_000
			},
			manifest: {
				name: 'Trailune',
				short_name: 'Trailune',
				description: 'Track every journey.',
				display: 'standalone',
				theme_color: '#2c1a14',
				background_color: '#faf8f6',
				icons: [
					{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
					{ src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
				]
			}
		})
	],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts']
	}
});
