import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
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
			workbox: {
				navigateFallback: '200.html'
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
