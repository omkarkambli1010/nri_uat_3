# Foreign Address — Document Expiry Date minimum — Design

Date: 2026-07-13

## Goal

On the Foreign Address screen, the "Document Expiry Date" field must only accept
dates that are at least three months away.

Concretely, the disabled/enabled split is:

- **Disabled:** every date before today (past dates), **and** every date from
  today up to three months from today.
- **Enabled:** every date from three months from today onwards.

The effective rule is a single lower bound: `minDate = today + 3 months`. There
is no upper bound.

## Rationale

The field is shown only for OVD documents — passport, PIO, OCI (`showExpiry` is
driven by `isOvd(docType)`). A document that expires within the next three
months is not acceptable proof, so it is rejected; a passport expiring years from
now is fine.

## Current state

`ForeignAddress.tsx` renders the expiry `DateField` twice — once in the mobile
layout (around line 705) and once in the desktop layout (around line 934) —
and neither passes `minDate` or `maxDate`, so every date is currently
selectable.

`DateField` already accepts `minDate` / `maxDate` and forwards them to
PrimeReact's `Calendar`, stabilising the object reference via `useStableDay` so a
freshly-minted `Date` on each render does not reformat the input and wipe
half-typed text. No change to `DateField` is required.

## Design

### The boundary date

A helper computes the start of the day three months from today.

Adding three months naively is wrong at month ends: 30 November + 3 months gives
30 February, which JavaScript silently rolls forward to 2 March. The helper
clamps the day to the last valid day of the target month instead (so 30 November
→ 28 February, or 29 February in a leap year). This keeps the boundary from
landing a day or two later than intended.

The value is computed once per render pass with `useMemo` in `ForeignAddress`
and passed to **both** `DateField` instances, so the two layouts cannot drift
apart.

### Picker

Both `DateField` instances gain `minDate={minExpiryDate}`. PrimeReact greys out
and blocks every earlier day in the calendar panel. No `maxDate` is set.

### Typed entry

The calendar panel blocks disabled days, but manual typing bypasses it —
`DateField` hands the parent any syntactically valid `Date`. So `validate()` in
`ForeignAddress` gains a bounds check alongside the existing empty check:

- If `showExpiry` and no date is chosen → the existing
  `'Please Select Expiry date'` error (unchanged).
- If `showExpiry` and the chosen date is before `minExpiryDate` → a new error on
  the same `expiryDate` key, worded so the user knows the boundary, e.g.
  *"Document must be valid for at least 3 more months (on or after 13/10/2026)"*.

Both layouts already render `errFor('expiryDate')` (mobile at line 721, desktop
at line 951), so no markup is added — the message lands in the existing error
slot and Proceed stays blocked.

### Prefilled and reused data

An expiry loaded from the API (`ForeignAddress.tsx:299`) or bound from a reused
document group (`:451`) may already fall inside the disallowed window. It is
still displayed, and it fails validation on Proceed with the message above. That
is intended: the document genuinely does not satisfy the rule, and the user is
told why rather than being silently blocked.

## Testing

The project has no test framework installed. Verification is manual, in the
browser, on the Foreign Address screen with an OVD document type selected
(passport / PIO / OCI):

1. Open the date picker — today and every day up to three months out are greyed
   out; the first selectable day is exactly three months from today.
2. Past dates are not selectable.
3. Dates beyond three months are selectable, with no upper limit.
4. Type a date one month out and press Proceed — the inline error appears and
   Proceed is blocked.
5. Type a date one year out — accepted, form proceeds.
6. Check the boundary at a month end (e.g. system date 30 November) — the first
   selectable day is 28/29 February, not 2 March.
7. Confirm the mobile and desktop layouts behave identically.

## Out of scope

- Any change to `DateField` itself.
- Expiry date fields on other screens (passport upload, OCI, etc.).
- Any upper bound on the expiry date.
