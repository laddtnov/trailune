# Trailune


[![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?logo=svelte&logoColor=white)](https://svelte.dev/docs/kit)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)


**Track every journey.**
[🌐 Live Demo](https://trailune.laddtnov.xyz/)

Trailune is a personal travel tracker: log trips with photo journal entries and notes, keep a packing checklist so nothing gets forgotten, track a per-trip Do's & Don'ts list, and see visited countries on a world map.

This is a **v1, local-only build** — everything runs in the browser with no backend. Trip/journal/packing data lives in `localStorage`, and photos are stored in `IndexedDB`. A backend is a planned future addition, not part of this build.

## Features

- **Trips** — create a trip with a name, date range, and the countries you visited.
- **Journal** — add dated entries with a note and photos per trip; edit or delete entries later.
- **Packing checklist** — maintain one reusable packing template (grouped by category: Documents, Electronics, Clothing, Toiletries, Other) that's copied into every new trip automatically, so recurring items never need re-typing. Each trip's checklist can then be customized independently.
- **Do's & Don'ts** — a simple two-column checklist per trip for tips and warnings.
- **World map** — a clickable SVG world map highlighting every country you've visited, derived automatically from your trips (no separate manual toggle).

## Tech stack

- [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5, TypeScript)
- No backend — `localStorage` + `IndexedDB` (via [`idb`](https://github.com/jakearchibald/idb)) for all persistence
- [Vitest](https://vitest.dev/) for the storage layer's test suite

## Developing

Install dependencies and start the dev server:

```sh
npm install
npm run dev
```

Open the printed `localhost` URL in your browser.

## Testing

```sh
npm run test
```

## Building

```sh
npm run build
```

## Deferred to v2

The following are intentionally out of scope for this build:

- Currency exchange tips
- "Getting to city center" local transit guidance
- A user ranking/badge system
- A backend and real database (enabling multi-device sync)

## Project docs

The full design spec and implementation plan live in [`docs/superpowers/`](docs/superpowers/).
