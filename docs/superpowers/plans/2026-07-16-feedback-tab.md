# Feedback Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a footer "Feedback" link that opens a modal, which emails the submitted message via Resend to the app owner.

**Architecture:** A standalone Vercel serverless function (`api/feedback.ts`, a plain Vercel Function using the Web-standard `Request`/`Response` API — the "Other Frameworks" convention, not a Next.js-style `app/api/.../route.ts`) calls the Resend API server-side. It lives entirely outside SvelteKit's routing, so the app's `adapter-static` build stays unaffected. A new `FeedbackDialog.svelte` component (a `<dialog>`, matching the existing New Trip dialog pattern) posts to it, and a new footer in the root layout opens the dialog.

**Tech Stack:** SvelteKit (Svelte 5 runes), Vercel Functions (Web Handler convention), `resend` npm package, Tailwind CSS v4.

## Global Constraints

- No name/email field on the feedback form — message only, no reply-to capability, per the spec.
- No toast/notification system — success/error state shown inline inside the dialog itself.
- No rate limiting, CAPTCHA, or spam protection — explicitly out of scope for this pass.
- The serverless function must be a plain `api/*.ts` Vercel Function, not a SvelteKit `+server.ts` route — the SvelteKit app is fully static (`adapter-static`) and has no server runtime for its own routes.
- `RESEND_API_KEY` is read from an environment variable, never committed to the repo.
- Sends from `feedback@trailune.laddtnov.xyz` to `novytskiyvladislav@proton.me`, per `docs/superpowers/specs/2026-07-16-feedback-tab-design.md`.

---

### Task 1: Resend-backed serverless function

**Files:**
- Modify: `package.json`
- Modify: `.env.example`
- Create: `api/feedback.ts`

**Interfaces:**
- Produces: a Vercel Function reachable at `POST /api/feedback`, accepting `{ message: string }` as a JSON body, returning `200 { ok: true }` on success or `400`/`500 { error: string }` on failure — consumed by Task 2's `FeedbackDialog.svelte`.

- [ ] **Step 1: Add the `resend` dependency**

Edit `package.json`, adding this line to `"dependencies"` (alongside the existing `"idb"` entry):

```json
"resend": "^6.17.2",
```

- [ ] **Step 2: Install**

Run: `npm install`
Expected: succeeds, `resend` appears in `package-lock.json`.

- [ ] **Step 3: Document the required environment variable**

Edit `.env.example`, appending this block at the end of the file:

```
# --- Resend (feedback form) -------
RESEND_API_KEY=your_resend_api_key_here
```

- [ ] **Step 4: Write the serverless function**

Create `api/feedback.ts`:

```ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request: Request): Promise<Response> {
  let body: { message?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    return jsonResponse({ error: 'Message is required' }, 400);
  }

  const { error } = await resend.emails.send({
    from: 'Trailune Feedback <feedback@trailune.laddtnov.xyz>',
    to: ['novytskiyvladislav@proton.me'],
    subject: 'New Trailune feedback',
    html: `<p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
  });

  if (error) {
    return jsonResponse({ error: 'Failed to send feedback' }, 500);
  }

  return jsonResponse({ ok: true }, 200);
}
```

- [ ] **Step 5: Verify the project still builds and tests pass**

Run: `npm run test && npm run build`
Expected: both succeed — `api/feedback.ts` is outside SvelteKit's build entirely, so this only confirms nothing else broke.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json .env.example api/feedback.ts
git commit -m "feat: add Resend-backed feedback serverless function"
```

---

### Task 2: `FeedbackDialog.svelte` component

**Files:**
- Create: `src/lib/components/FeedbackDialog.svelte`

**Interfaces:**
- Consumes: `POST /api/feedback` (Task 1).
- Produces: a Svelte component exposing an `open()` method (callable via `bind:this`) — consumed by Task 3.

- [ ] **Step 1: Create the component**

Create `src/lib/components/FeedbackDialog.svelte`:

```svelte
<script lang="ts">
  let dialogEl: HTMLDialogElement | undefined = $state();
  let message = $state('');
  let submitting = $state(false);
  let status: 'idle' | 'success' | 'error' = $state('idle');

  export function open() {
    message = '';
    status = 'idle';
    dialogEl?.showModal();
  }

  function onDialogClick(event: MouseEvent) {
    if (event.target === dialogEl) dialogEl?.close();
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    status = 'idle';
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      if (!res.ok) throw new Error('Request failed');
      status = 'success';
      setTimeout(() => dialogEl?.close(), 1200);
    } catch {
      status = 'error';
    } finally {
      submitting = false;
    }
  }
</script>

<dialog
  bind:this={dialogEl}
  onclick={onDialogClick}
  class="w-full max-w-md rounded-[var(--radius-lg)] border border-[var(--color-card-border)] bg-[var(--color-card)] p-0 text-[var(--color-ink)] shadow-[var(--shadow-pop)] backdrop:bg-[var(--color-ink)]/40 backdrop:backdrop-blur-sm open:animate-[pop-in_0.2s_var(--ease-out-quart)]"
>
  <form onsubmit={submit} class="flex flex-col">
    <header
      class="flex items-center justify-between border-b border-[var(--color-card-border)] px-6 py-4"
    >
      <h2 class="font-display text-xl font-bold">Send feedback</h2>
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        aria-label="Close"
        class="grid size-8 place-items-center rounded-full text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)] hover:text-[var(--color-ink)]"
      >
        <svg viewBox="0 0 24 24" class="size-4" fill="none" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </header>

    <div class="space-y-4 px-6 py-5">
      <label class="block">
        <span class="mb-1.5 block text-sm font-medium text-[var(--color-ink-soft)]">Your message</span>
        <textarea
          bind:value={message}
          required
          rows="5"
          placeholder="What's on your mind?"
          class="w-full resize-y rounded-[var(--radius-md)] border border-[var(--color-card-border)] bg-[var(--color-canvas)] px-3.5 py-2.5 text-[var(--color-ink)] outline-none transition-shadow placeholder:text-[var(--color-ink-soft)]/60 focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-soft)]"
        ></textarea>
      </label>

      {#if status === 'success'}
        <p
          class="rounded-[var(--radius-md)] bg-[var(--color-success-soft)] px-3.5 py-2.5 text-sm text-[var(--color-ink)]"
        >
          Thanks — your feedback was sent!
        </p>
      {:else if status === 'error'}
        <p
          class="rounded-[var(--radius-md)] bg-[var(--color-danger-soft)] px-3.5 py-2.5 text-sm text-[var(--color-danger)]"
        >
          Couldn't send that — please try again in a moment.
        </p>
      {/if}
    </div>

    <footer class="flex justify-end gap-3 border-t border-[var(--color-card-border)] px-6 py-4">
      <button
        type="button"
        onclick={() => dialogEl?.close()}
        class="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-ink-soft)] transition-colors hover:bg-[var(--color-canvas-dim)]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        class="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Sending…' : 'Send'}
      </button>
    </footer>
  </form>
</dialog>

<style>
  @keyframes pop-in {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(8px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    dialog[open] {
      animation: none;
    }
  }
</style>
```

- [ ] **Step 2: Verify the project builds**

Run: `npm run build`
Expected: succeeds — this component isn't wired into any route yet (Task 3 does that), so it should compile standalone with no errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all PASS (no new tests — this is a UI component verified manually per the project's convention; Task 3 covers manual verification once it's wired in).

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/FeedbackDialog.svelte
git commit -m "feat: add FeedbackDialog component"
```

---

### Task 3: Footer and layout wiring

**Files:**
- Modify: `src/routes/+layout.svelte`

**Interfaces:**
- Consumes: `FeedbackDialog` component (Task 2).
- Produces: none — this is the root layout; no other task depends on its internals.

- [ ] **Step 1: Import the component and add state**

In `src/routes/+layout.svelte`, add to the imports:

```ts
  import FeedbackDialog from '$lib/components/FeedbackDialog.svelte';
```

Add a new state declaration alongside `mobileNavOpen`:

```ts
  let feedbackDialog: FeedbackDialog | undefined = $state();
```

- [ ] **Step 2: Add the footer and mount the dialog**

Find this block in the markup:

```svelte
<main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
  {@render children()}
</main>

{#await import('$lib/PwaRegister.svelte') then { default: PwaRegister }}
  <PwaRegister />
{/await}
```

Replace it with:

```svelte
<main class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
  {@render children()}
</main>

<footer class="border-t border-black/10 bg-[var(--color-ink-band)] py-6 text-center text-sm text-[var(--color-accent-ink)]/70">
  <button
    type="button"
    onclick={() => feedbackDialog?.open()}
    class="underline decoration-[var(--color-accent-ink)]/40 underline-offset-4 transition-colors hover:text-[var(--color-accent-ink)]"
  >
    Feedback
  </button>
</footer>

<FeedbackDialog bind:this={feedbackDialog} />

{#await import('$lib/PwaRegister.svelte') then { default: PwaRegister }}
  <PwaRegister />
{/await}
```

- [ ] **Step 3: Verify manually via the dev server**

Run: `npm run dev`

In the browser: confirm the footer with the "Feedback" link/button appears at the bottom of every page, clicking it opens the dialog, typing a message and clicking "Send" shows "Sending…" then either a success or error message (the request will fail in local dev since `/api/feedback` isn't served by `vite dev` — this is expected; full verification of a successful send happens against a real Vercel deployment where the serverless function actually runs), and confirm the empty-textarea case is blocked by the browser's native `required` validation before submit.

- [ ] **Step 4: Run the full test suite and build**

Run: `npm run test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/routes/+layout.svelte
git commit -m "feat: add feedback footer link to root layout"
```
