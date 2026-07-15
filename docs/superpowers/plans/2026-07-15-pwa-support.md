# PWA Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Trailune installable and fully offline-capable, including a cold start of the installed app icon with zero connectivity.

**Architecture:** Switch from `@sveltejs/adapter-auto` to `@sveltejs/adapter-static` with SPA-fallback for the two dynamic routes (trip hub, journal entry), so the whole site becomes precacheable static output. Then add `@vite-pwa/sveltekit` to generate the web app manifest and a Workbox service worker that precaches everything. Icons are rasterized from the existing `static/favicon.svg` via a one-off `sharp` script.

**Tech Stack:** SvelteKit (`@sveltejs/adapter-static`), `@vite-pwa/sveltekit` (Workbox-based service worker + manifest), `sharp` (icon generation, dev-only).

## Global Constraints

- No custom "Install app" button — installation relies entirely on the browser's native affordance, per `docs/superpowers/specs/2026-07-15-pwa-support-design.md`.
- No offline-specific UX (no "you're offline" banner, no fallback page) — the app already works without a network by design.
- No push notifications, background sync, or any service-worker capability beyond offline asset caching.
- `static/favicon.svg` stays unchanged; new PNGs are generated alongside it, not replacing it.
- No new Vitest coverage — this is build/config tooling with no application logic to unit test; verification is manual (`npm run build && npm run preview`, then a real browser).

---

### Task 1: Switch to `@sveltejs/adapter-static` with SPA fallback for dynamic routes

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `src/routes/+layout.ts`
- Create: `src/routes/trips/[id]/+page.ts`
- Create: `src/routes/trips/[id]/entry/[entryId]/+page.ts`

**Interfaces:**
- Produces: a static build (`.svelte-kit/output/client` + prerendered HTML + a `200.html` SPA-fallback file) that Task 3's service worker can precache in full.

- [ ] **Step 1: Swap the adapter dependency**

Edit `package.json`. In `"devDependencies"`, remove this line:

```json
"@sveltejs/adapter-auto": "^7.0.1",
```

and add this line in its place (keep alphabetical position among the `@sveltejs/*` entries):

```json
"@sveltejs/adapter-static": "^3.0.10",
```

- [ ] **Step 2: Install the new dependency**

Run: `npm install`
Expected: succeeds, `package-lock.json` updates, `@sveltejs/adapter-auto` is removed and `@sveltejs/adapter-static` is installed.

- [ ] **Step 3: Update `vite.config.ts` to use the static adapter with a fallback**

Edit `vite.config.ts`, replacing the import and the `adapter:` line:

```ts
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({
				fallback: '200.html'
			})
		})
	],
	test: {
		environment: 'jsdom',
		setupFiles: ['./vitest-setup.ts']
	}
});
```

(This removes the old `@sveltejs/adapter-auto` comment block along with the import it was attached to — the rest of the file, including `compilerOptions` and the `test` block, is unchanged.)

- [ ] **Step 4: Prerender by default**

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 5: Opt the two dynamic routes out of prerendering**

Create `src/routes/trips/[id]/+page.ts`:

```ts
export const prerender = false;
```

Create `src/routes/trips/[id]/entry/[entryId]/+page.ts`:

```ts
export const prerender = false;
```

(These two routes have runtime-generated UUID params with no fixed set of values to prerender — they're served through the `200.html` SPA fallback at runtime instead, and the existing client-side `onMount` lookup in each page already handles loading the right trip/entry from storage, exactly as it does today.)

- [ ] **Step 6: Verify the build produces the expected static output**

Run: `npm run build`
Expected: succeeds with no errors.

Run: `ls .svelte-kit/output/client/_app && ls .svelte-kit/output/prerendered/pages`
Expected: the first command lists built JS/CSS chunks; the second lists `.html` files including `index.html`, `map.html`, `packing-template.html`, and a top-level `200.html` (the SPA fallback) — but **not** any files under `trips/`, since those routes are excluded from prerendering.

- [ ] **Step 7: Run the full test suite**

Run: `npm run test`
Expected: all PASS (this change doesn't touch application logic, only build/adapter config).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/routes/+layout.ts "src/routes/trips/[id]/+page.ts" "src/routes/trips/[id]/entry/[entryId]/+page.ts"
git commit -m "feat: switch to adapter-static with SPA fallback for dynamic trip routes"
```

---

### Task 2: Generate PWA install icons from the existing favicon

**Files:**
- Create: `scripts/generate-icons.mjs`
- Modify: `package.json`
- Create (generated, then committed): `static/icon-192.png`
- Create (generated, then committed): `static/icon-512.png`

**Interfaces:**
- Produces: `static/icon-192.png` (192×192) and `static/icon-512.png` (512×512), consumed by Task 3's manifest configuration.

- [ ] **Step 1: Add `sharp` as a dev dependency**

Edit `package.json`, adding this line to `"devDependencies"` (alphabetical position, after `"svelte-check"` and before `"tailwindcss"` — or wherever alphabetically correct given the current list):

```json
"sharp": "^0.34.5",
```

Also add a script to `"scripts"`:

```json
"generate:icons": "node scripts/generate-icons.mjs",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: succeeds, `sharp` is installed.

- [ ] **Step 3: Write the icon-generation script**

Create `scripts/generate-icons.mjs`:

```js
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = join(__dirname, '..', 'static', 'favicon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  const outPath = join(__dirname, '..', 'static', `icon-${size}.png`);
  await sharp(svgBuffer, { density: 384 }).resize(size, size).png().toFile(outPath);
  console.log(`Generated ${outPath}`);
}
```

- [ ] **Step 4: Run the script**

Run: `npm run generate:icons`
Expected output:
```
Generated .../static/icon-192.png
Generated .../static/icon-512.png
```

- [ ] **Step 5: Verify the generated files**

Run: `file static/icon-192.png static/icon-512.png`
Expected: both report as PNG images with the correct dimensions (`192 x 192` and `512 x 512` respectively).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json scripts/generate-icons.mjs static/icon-192.png static/icon-512.png
git commit -m "feat: generate PWA install icons from favicon.svg"
```

---

### Task 3: Add `@vite-pwa/sveltekit`, configure the manifest, and wire the manifest link

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `static/icon-192.png`, `static/icon-512.png` (Task 2); the static/prerendered build output (Task 1).
- Produces: an installable web app manifest and a service worker that precaches the full static build.

- [ ] **Step 1: Add the PWA plugin dependencies**

Edit `package.json`, adding these two lines to `"devDependencies"` (alphabetical position):

```json
"@vite-pwa/sveltekit": "^1.1.0",
"vite-plugin-pwa": "^1.3.0",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: succeeds.

- [ ] **Step 3: Add the plugin to `vite.config.ts`**

Edit `vite.config.ts`. Add this import at the top, alongside the existing imports:

```ts
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
```

Add `SvelteKitPWA({...})` to the `plugins` array, after `sveltekit({...})`:

```ts
export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			adapter: adapter({
				fallback: '200.html'
			})
		}),
		SvelteKitPWA({
			registerType: 'autoUpdate',
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
```

- [ ] **Step 4: Inject the manifest link tag in the root layout**

Edit `src/routes/+layout.svelte`. Add to the `<script>` block, alongside the existing imports:

```ts
  import { pwaInfo } from 'virtual:pwa-info';

  let webManifestLink = $derived(pwaInfo ? pwaInfo.webManifest.linkTag : '');
```

Add this block right after the closing `</script>` tag and before the existing `<header ...>` element:

```svelte
<svelte:head>
  {@html webManifestLink}
</svelte:head>
```

- [ ] **Step 5: Build and inspect the service worker output**

Run: `npm run build`
Expected: succeeds. Run `ls .svelte-kit/output/client | grep -E 'sw\.js|manifest'` — expected to show a generated service worker file (e.g. `sw.js`) and a web manifest file (e.g. `manifest.webmanifest`) among the client output.

- [ ] **Step 6: Run the full test suite**

Run: `npm run test`
Expected: all PASS.

- [ ] **Step 7: Manual verification via preview server**

Run: `npm run preview`

In a browser, open the printed `localhost` preview URL and confirm:
- Devtools → Application → Manifest shows "Trailune" with the two icons and the configured theme/background colors.
- Devtools → Application → Service Workers shows an activated worker.
- The browser's install affordance (address-bar icon on Chrome/Edge desktop) is available; install the app.
- With the app open, enable devtools' "Offline" network throttling, then reload — the app still loads.
- While still offline, navigate to `/map`, `/packing-template`, and an existing trip's `/trips/[id]` page (create one first if none exist) — all load without a network error, including a hard reload on the `/trips/[id]` URL.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vite.config.ts src/routes/+layout.svelte
git commit -m "feat: add PWA manifest and service worker via @vite-pwa/sveltekit"
```
