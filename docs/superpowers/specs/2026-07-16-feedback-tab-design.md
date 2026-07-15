# Feedback Tab — Design Spec

Date: 2026-07-16

## Overview

A "Feedback" link in a new site footer opens a modal with a single message field, which sends the feedback via email (through Resend) to the app owner. This is the first piece of Trailune infrastructure that isn't purely client-side — sending email requires a secret API key, which can never live in browser-shipped code — so it's implemented as one standalone Vercel serverless function, kept entirely separate from the SvelteKit app itself (which stays fully static, per the PWA work).

## Goals

- A footer, added to the root layout, with a "Feedback" link.
- Clicking it opens a native `<dialog>` modal (matching the existing New Trip dialog pattern): a required message textarea, a submit button, and inline success/error feedback after submitting.
- A standalone Vercel serverless function at `api/feedback.ts` receives the POST, validates the message is non-empty, and sends an email via the Resend API from `feedback@trailune.laddtnov.xyz` to `novytskiyvladislav@proton.me`.
- The Resend API key is read from a `RESEND_API_KEY` environment variable (set in Vercel's project settings), never committed to the repo.

## Non-goals

- No name/email field on the form — message only, per explicit decision. No reply-to capability.
- No toast/notification system — success/error state is shown inline inside the modal itself, since no such system exists elsewhere in the app yet.
- No rate limiting, CAPTCHA, or spam protection — out of scope for a v1 personal-project feedback form; can be added later if abuse becomes a real problem.
- No SvelteKit `+server.ts` route — the serverless function is a plain Vercel Function living outside SvelteKit's routing, so the static/prerendered/offline nature of the rest of the app (established by the PWA work) is completely unaffected.

## Architecture

**Why a standalone Vercel Function, not a SvelteKit endpoint:** Trailune's SvelteKit app now builds via `@sveltejs/adapter-static` with an SPA fallback (from the PWA work) — there is no server runtime for SvelteKit routes at all in this deployment. A `+server.ts` API route is not an option under `adapter-static`. Vercel deployments can serve a static site *and* independent serverless functions from an `api/` directory side-by-side in the same project, with no interaction between the two — this is the standard way to bolt a small dynamic capability onto an otherwise-static Vercel site, and it's what this spec uses.

**Request flow:**
1. User submits the modal form.
2. Client does `fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) })`.
3. `api/feedback.ts` (a Vercel Node.js serverless function) parses the body, rejects empty/missing `message` with a 400, otherwise calls the `resend` npm package's `emails.send(...)` with the from/to addresses above and the message as the email body.
4. Responds `200` on success, `500` with an error message on failure (e.g. Resend API error), `400` on invalid input.
5. The modal shows "Sending…" while the request is in flight, then either closes with a brief success message or shows an inline error asking the user to try again.

## UI

**Footer** (`src/routes/+layout.svelte`): a new `<footer>` element placed after the closing `</main>` tag (and before the `{#await import('$lib/PwaRegister.svelte')}` block), styled as a slim bar using the existing `--color-ink-band`/`--color-accent-ink` tokens for visual consistency with the header, containing a single "Feedback" button.

**Modal** (new component `src/lib/components/FeedbackDialog.svelte`, following the same self-contained-with-own-`<dialog>`-ref pattern as the New Trip form in `src/routes/+page.svelte`): a `<dialog>` with a header ("Send feedback"), a required `<textarea>` bound to a `message` state variable, a submit button showing "Sending…" while `submitting` is true, and a status area showing either a success message (then closing the dialog after a short delay) or an error message with the same "browser might be blocking this" tone as other error states in the app, adapted for a network-request failure rather than storage.

## Testing

- No new Vitest coverage for the serverless function itself — it has no complex logic to unit test beyond input validation, and this project's existing convention (established for the PWA work) is that build/infra-level additions are verified manually, not via the app's Vitest suite (which only covers the client-side storage layer).
- Manual verification: submit the form against a real deployed preview (Vercel preview deployments get their own environment variables), confirm the email actually arrives at the target inbox, and confirm empty-message submission is rejected client-side (required textarea) and would also be rejected server-side if bypassed.
