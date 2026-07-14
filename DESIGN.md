# Design

## Theme

Warm, vibrant travel-app identity (Airbnb + Polarsteps direction), built on Tailwind CSS v4 via `@theme` in `src/app.css`. All colors are OKLCH.

**Canvas is deliberately chroma-flat** (`oklch(98% 0.003 60)`) — near-white, not the generic AI-cream near-white-warm-tint pattern. Warmth lives in the cream **card** surface (`--color-card`, `oklch(97.5% 0.018 66)`) and the dark **ink-band** (`--color-ink-band`, `oklch(24% 0.032 38)`), never in the page background itself.

| Token | Value | Use |
|---|---|---|
| `--color-canvas` | `oklch(98% 0.003 60)` | Page background |
| `--color-canvas-dim` | `oklch(95.5% 0.004 60)` | Subtle recessed surfaces (progress track, hover bg) |
| `--color-ink` | `oklch(21% 0.025 40)` | Primary text |
| `--color-ink-soft` | `oklch(42% 0.03 42)` | Secondary text |
| `--color-ink-band` | `oklch(24% 0.032 38)` | Dark surfaces: nav, map stage |
| `--color-card` | `oklch(97.5% 0.018 66)` | Bounded "postcard" surfaces (cards, panels, dialogs) |
| `--color-card-border` | `oklch(87% 0.035 55)` | Card borders |
| `--color-accent` | `oklch(57% 0.17 35)` | The one bold accent — terracotta. Primary actions, current selection, visited state |
| `--color-accent-soft` | `oklch(93% 0.045 40)` | Tinted backgrounds for badges/icons on accent theme |
| `--color-teal` | `oklch(53% 0.09 195)` | Secondary accent — map hover, "Do" list |
| `--color-danger` | `oklch(48% 0.19 25)` | Destructive actions only, never overloaded onto `--color-accent` |
| `--color-success` | `oklch(58% 0.13 150)` | Reserved, not yet used |

Full token list (radius, shadow, motion easings) lives in `src/app.css`.

## Typography

- **Display**: `ui-serif, Georgia, 'Times New Roman', serif` — headings only, journal/passport character.
- **Sans**: system-ui stack — body, labels, buttons, form controls.
- **Mono**: system mono stack — dates, stamp-style labels, uppercase-tracked metadata.

## Motifs

- **Postcard cards**: rounded (`--radius-lg`/`--radius-xl`), cream surface, warm-tinted shadow (`--shadow-card`), lift + shadow-grow on hover.
- **Trip cover bands**: gradient header on `TripCard`, hashed per-trip from the trip id (3 palette variants) so a trip list doesn't look monotonous even with no real photos yet.
- **The map is the centerpiece**: `/map` renders the world map on a dark ink-band "stage," with visited countries glowing via `--color-accent` + a soft drop-shadow — never just a plain inline SVG on the page background.
- **Stamp brand mark**: circular outlined badge with a bold serif letter, used in the nav.

## Components

- **Dialogs** use the native `<dialog>` element (`showModal()`/`close()`), not a hand-rolled overlay — gives focus trapping and Escape-to-close for free. Click-outside-to-close checks `event.target === dialogEl`.
- **Custom checkboxes**: a visually-hidden native `<input type="checkbox">` inside a `<label>`, paired with a styled `<span>` circle driven directly by Svelte state (not CSS `:checked`/`peer` tricks) — used identically in `PackingChecklist` and `DoDontList` for a consistent form-control vocabulary.
- **Chip/tag selectors**: `aria-pressed` toggle buttons (country picker) instead of a checkbox list — better for scanning many options.
- Every interactive element has hover, focus-visible (2px accent outline), active, and disabled states. Reduced motion is respected globally (`src/app.css` `@media (prefers-reduced-motion: reduce)` block) plus per-component overrides where needed (map hover scale, dialog pop-in).

## Known follow-ups

- `page.params` typing gap in `svelte-check` (`string | undefined` vs `string`) predates this design pass — not fixed here, out of scope.
- `--color-success` token defined but unused; no success/confirmation UI exists yet.
