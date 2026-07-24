# Country Panel Quick Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The map page's click-to-open country panel gets, per trip, three quick-link icons (Journal, Gallery, Packing) that jump straight into that trip's matching tab.

**Architecture:** The trip hub page learns to read an optional `?tab=` query param at load time and opens directly to that tab. The map page's existing per-trip list then adds three icon links pointing at `/trips/{id}?tab=...` for each of the three tabs.

**Tech Stack:** SvelteKit 2, Svelte 5 runes, TypeScript.

## Global Constraints

- A missing or invalid `?tab=` value falls back to the current default (`journal`) — identical to today's behavior with no query param at all (spec: Architecture, Edge cases).
- Only the click-to-open panel gains quick-links — the hover popover (`CountryPopover.svelte`) is untouched (spec: Non-goals).
- The Packing quick-link points at that specific trip's own packing list, not the shared template pages (spec: Non-goals).
- No new data model, no new pure-logic module (spec: Non-goals).

---

### Task 1: Trip hub reads `?tab=` on load

**Files:**
- Modify: `src/routes/trips/[id]/+page.svelte`

**Interfaces:**
- Consumes: nothing new — uses `page.url.searchParams`, already available via the existing `import { page } from '$app/state'`.
- Produces: the trip hub now opens directly to a valid `?tab=` value — consumed by Task 2's links (`/trips/{id}?tab=journal|gallery|packing`).

- [ ] **Step 1: Read the query param in `onMount`**

In `src/routes/trips/[id]/+page.svelte`, replace:

```ts
  onMount(async () => {
    trip = getTrip(tripId);
    countries = await loadWorldCountries();
    await loadEntries();
  });
```

with:

```ts
  const validTabs = ['journal', 'gallery', 'map', 'pins', 'packing', 'tips', 'dodont'] as const;

  onMount(async () => {
    trip = getTrip(tripId);
    countries = await loadWorldCountries();
    const requestedTab = page.url.searchParams.get('tab');
    if (requestedTab && (validTabs as readonly string[]).includes(requestedTab)) {
      activeTab = requestedTab as (typeof validTabs)[number];
    }
    await loadEntries();
  });
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; the trip hub page is manually verified per this project's established convention)

- [ ] **Step 3: Manually verify in the browser**

Start the dev server and confirm:
- Navigating to an existing trip's URL with `?tab=gallery` appended (e.g. `/trips/<id>?tab=gallery`) opens directly on the Gallery tab.
- Navigating with `?tab=packing` opens directly on Packing.
- Navigating with no query param, or an invalid one like `?tab=nonsense`, opens on Journal exactly as before.
- Clicking between tabs after load still works exactly as before (no URL sync on manual tab clicks).

- [ ] **Step 4: Commit**

```bash
git add src/routes/trips/\[id\]/+page.svelte
git commit -m "feat: trip hub opens directly to a tab via ?tab= query param"
```

---

### Task 2: Map panel quick-links

**Files:**
- Modify: `src/routes/map/+page.svelte`

**Interfaces:**
- Consumes: the trip hub's `?tab=` handling from Task 1 (already merged) — no code-level import, just the URL convention `/trips/{id}?tab=journal|gallery|packing`.
- Produces: nothing consumed by later tasks — this is the final task.

- [ ] **Step 1: Add the quick-link icons to each trip row**

In `src/routes/map/+page.svelte`, replace:

```svelte
          <ul class="mt-2 space-y-1">
            {#each tripsForSelected as trip (trip.id)}
              <li>
                <a
                  href={`/trips/${trip.id}`}
                  class="text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
                >
                  {trip.name}
                </a>
              </li>
            {/each}
          </ul>
```

with:

```svelte
          <ul class="mt-2 space-y-2">
            {#each tripsForSelected as trip (trip.id)}
              <li class="flex flex-wrap items-center justify-between gap-2">
                <a
                  href={`/trips/${trip.id}`}
                  class="text-sm font-medium text-[var(--color-accent)] underline decoration-[var(--color-accent)]/30 underline-offset-2 hover:decoration-[var(--color-accent)]"
                >
                  {trip.name}
                </a>
                <div class="flex items-center gap-1">
                  <a
                    href={`/trips/${trip.id}?tab=journal`}
                    aria-label={`Open ${trip.name}'s journal`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 6c-1.8-1.2-4.5-1.5-7-1v13c2.5-.5 5.2-.2 7 1 1.8-1.2 4.5-1.5 7-1V5c-2.5-.5-5.2-.2-7 1Z"
                      />
                    </svg>
                  </a>
                  <a
                    href={`/trips/${trip.id}?tab=gallery`}
                    aria-label={`Open ${trip.name}'s gallery`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M4 6h16v12H4zM4 16l4.5-4.5a2 2 0 0 1 2.83 0L16 16m-2-2 1.5-1.5a2 2 0 0 1 2.83 0L20 14"
                      />
                      <circle cx="8.5" cy="9.5" r="1.5" />
                    </svg>
                  </a>
                  <a
                    href={`/trips/${trip.id}?tab=packing`}
                    aria-label={`Open ${trip.name}'s packing list`}
                    class="grid size-7 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent)]"
                  >
                    <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="1.75">
                      <rect x="4" y="8" width="16" height="12" rx="2" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
                    </svg>
                  </a>
                </div>
              </li>
            {/each}
          </ul>
```

- [ ] **Step 2: Run the full test suite**

Run: `npx vitest run`
Expected: PASS (no regressions — this task adds no new automated tests; the map page is manually verified per this project's established convention)

- [ ] **Step 3: Manually verify in the browser**

Start the dev server, click a visited country on `/map`, and confirm:
- Each trip row shows its name plus three small icon links (Journal, Gallery, Packing).
- Clicking each icon navigates to that trip's hub and opens directly on the matching tab.
- A country visited by 2+ trips shows independent icon rows per trip — clicking one trip's Gallery icon doesn't affect the other trip's row.
- An unvisited country's panel is unchanged (still shows "Add a trip here to fill it in." with no icons).

- [ ] **Step 4: Commit**

```bash
git add src/routes/map/+page.svelte
git commit -m "feat: add per-trip quick-links to the map's country panel"
```
