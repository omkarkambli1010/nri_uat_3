# Caps Lock Hint — Design

Date: 2026-07-13

## Goal

While a user is typing in a text field, show a "Caps Lock is on" indicator beside
that field whenever the Caps Lock key is engaged, so they notice before they
submit a value in the wrong case.

## Context

The codebase has no shared `Input` component. There are ~181 raw `<input>`
elements spread across 31 feature components, each styled by its own SCSS
module, with inconsistent (sometimes absent) wrapper elements around the input.
Only one field in the app is `type="password"` (`PennyDrop.tsx`).

That rules out any solution that depends on a common wrapper or on editing every
call site.

## Approach

A single global component, `CapsLockHint`, mounted once in `AppShell`. It
observes focus and Caps Lock state at the document level and renders one
floating badge anchored to whichever eligible field currently has focus. No
feature component is modified, and fields added in future are covered
automatically.

Approaches rejected:

- **Per-input hook + badge component.** Would require touching 31 files and 181
  inputs, is easy to miss fields in, and puts an opt-in burden on every new
  field.
- **Global class toggle + CSS `::after`.** Needs a consistent wrapper element to
  hang the pseudo-element on. The wrappers here are inconsistent, and `<input>`
  itself cannot host `::after`.

## Behaviour

### Visibility

The badge is visible when **both** hold:

1. Caps Lock is known to be on, and
2. focus is inside an eligible field (see below).

It appears on focus — not on first keystroke — so the warning arrives before the
user types a wrong value. It hides on blur, and hides the moment Caps Lock is
switched off.

### Caps Lock state

State is read from `event.getModifierState("CapsLock")` on document-level
`keydown`, `keyup`, and `mousedown` listeners. Every path into a field is
preceded by one of these (a click or a Tab), so the state is known by the time a
field is focused.

Before any such event has fired, the state is **unknown** and the badge stays
hidden. This is also why touch-only mobile users — who have no physical Caps Lock
key and generate no key events — never see the badge. That is the intended
outcome, not a gap.

### Eligible fields

Show for:

- `<textarea>`
- `<input>` with `type` of `text`, `email`, `password`, `search`, or `url`
  (an `<input>` with no `type` attribute defaults to `text` and is eligible)

Do **not** show for:

- disabled or readonly fields
- digit-only fields: `type="number"`, `type="tel"`, or any field whose
  `inputMode` is `numeric`, `decimal`, or `tel` — this excludes the OTP boxes and
  the PAN / account-number style fields, where Caps Lock has no effect
- any other input type (date, file, checkbox, radio, etc.)

## Components

### `src/components/caps-lock-hint/CapsLockHint.tsx`

Client component. Owns:

- `capsOn: boolean | null` — `null` until the first key/mouse event.
- `target: HTMLElement | null` — the focused eligible field, set on `focusin`,
  cleared on `focusout`.
- `rect` — the badge's computed position.

Renders `null` unless `capsOn === true && target !== null`. Otherwise renders,
via `createPortal` into `document.body`, a `position: fixed` badge.

### `src/components/caps-lock-hint/caps-lock-hint.module.scss`

A compact amber pill: a ⇪ glyph plus the text "Caps Lock is on". `z-index` above
page content, below the spinner and modals.

### `src/components/app-shell/AppShell.tsx`

One added line: `<CapsLockHint />`, rendered alongside `<Spinner />`.

## Positioning

Computed from `target.getBoundingClientRect()`:

- **Right edge** of the badge aligns with the right edge of the input.
- **Bottom edge** of the badge sits a few pixels above the input's top edge.
- If there is not enough room above (e.g. the input sits under the sticky
  header), it flips to just below the input's bottom edge instead.
- If the input has scrolled out of the viewport, the badge hides.

Position is recomputed on `scroll` (capture phase, passive — Lenis emits native
scroll events, so smooth scrolling is covered) and on `resize`.

## Accessibility

The badge is a `role="status"` with `aria-live="polite"`, so it is announced once
when it appears rather than being a purely visual cue. It is not focusable and
does not trap or steal focus.

## Error handling

There is no failure mode to handle: no network, no persistence, no user input
consumed. `getModifierState` is supported in all target browsers; if a browser
never reports Caps Lock, the state stays `null` and the badge simply never shows,
leaving existing behaviour untouched.

## Testing

The project has no test framework installed (`npm test` points at jest, but jest
is not a dependency and there are no test files). Verification is manual, in the
browser:

1. Focus a name field (e.g. Father/Spouse Name) with Caps Lock **on** — badge
   appears above-right of the field.
2. Turn Caps Lock **off** while focused — badge disappears immediately.
3. Tab between two text fields with Caps Lock on — badge follows the focused
   field.
4. Focus an OTP box with Caps Lock on — no badge.
5. Scroll the page while the badge is visible — it stays anchored to its field.
6. Focus a field near the top of the page — badge flips below rather than being
   hidden under the header.

## Out of scope

- Any change to the 31 feature components or their SCSS modules.
- Any change to existing validation or the `.toUpperCase()` normalisation that
  several name fields already apply.
- A shared `Input` component (worth doing, but a separate piece of work).
