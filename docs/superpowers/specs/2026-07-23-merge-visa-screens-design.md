# Merge `/visa` and `/visa/upload` into a single `/visa` screen

**Date:** 2026-07-23
**Status:** Approved (pending spec review)

## Problem

The Visa flow is split across two screens:

- **`/visa`** (`VisaEntry.tsx`) — captures one field, *Select Visa Expiry*, with a
  "3+ months of validity remaining" gate, then routes to `/visa/upload`, stashing
  the picked date in `sessionStorage` (`visaExpiryDate`) and historically in a
  `?expiry` query param.
- **`/visa/upload`** (`VisaUpload.tsx`) — two required document uploads (Front +
  Back), one optional (Additional → `VisaTranslation`), reads the expiry back
  from `sessionStorage`/`?expiry`, and its **Proceed** button POSTs everything to
  `/visa` and advances via the response `uiMetadata.route`.

Splitting the flow forces an extra navigation and a cross-screen `sessionStorage`
hand-off for a single date. We want one screen at `/visa` that captures expiry
and the uploads together and submits once.

## Goal

A single `/visa` screen that captures the visa expiry and the Front/Back/Additional
uploads, then submits `POST /visa` in one action — no intermediate navigation, no
cross-screen state hand-off.

## Design

### Files

- **Repurpose** `src/components/visa/VisaEntry.tsx` into the merged Visa screen
  (keeps the filename; `src/app/visa/page.tsx` continues to render it).
- **Delete** `src/app/visa/upload/page.tsx`.
- **Delete** `src/components/visa/VisaUpload.tsx`.
- **Unchanged:** `src/components/visa/visa.module.scss` (both screens already
  import it; every class the merged layout needs — `.expiryField`, `.section`,
  `.desktopScrollArea`, etc. — already exists), `apiService`, `DateField`,
  `FileUploadCard`.

### Layout (mobile + desktop)

Both breakpoints keep today's card structure. Top to bottom:

1. Header — title **"Visa Details"**, subtitle **"Upload your Visa (front & back)
   for verification."**
2. **Select Visa Expiry \*** field — `DateField` with the existing `minVisaExpiry()`
   (today + 3 months) `minDate` gate and the inline `tooSoon` warning row.
3. **Upload Visa Front** card — required (`VisaFront`).
4. **Upload Visa Back** card — required (`VisaBack`).
5. **Upload Additional Document** card — optional (`VisaTranslation`).
6. **Proceed** button.

On desktop, the expiry field and all three cards live **inside** the existing
`.desktopScrollArea` (expiry first, then cards), scrolling together; the Proceed
button stays pinned in `.desktopProceedWrapper` below.

### State & behavior

The merged component combines the two components' existing logic:

- **From VisaEntry:** `expiryDate` state, `isoToDate`/`dateToIso`, `isExpired`,
  `minVisaExpiry`, the `tooSoon` check, and the inline expiry warning row.
- **From VisaUpload:** Front/Back/Additional file state, the `makeUploadFn`
  upload handlers, the workflow-prefill effect (`getVisaWorkflow` → document ids,
  document previews via `buildInitialFileFromUrl`, and `expiryDate`), the
  `translationDocumentId` sync effect, `buildVisaPayload`, and `handleProceed`
  (`submitVisa` → route via `uiMetadata`).

**Proceed gate:** enabled only when

- `expiryDate` is present **and** not `tooSoon` (valid expiry, 3+ months out), **and**
- Front is uploaded (`frontUploaded`) **and** Back is uploaded (`backUploaded`).

Additional stays optional and never blocks Proceed. `submitting` disables the
button while the POST is in flight (label toggles "Proceed" → "Saving").

**Submit:** one `POST /visa` via `apiService.submitVisa(applicationId,
buildVisaPayload())`. `buildVisaPayload` is unchanged — `expiryDate` now comes
from this component's own state instead of a cross-screen hand-off. On success,
`router.push('/'+uiMetadata.route)`; on missing route, the existing toast; on
error, stay put (apiService surfaces the message).

### Cleanup / removals

- Remove the `sessionStorage` `visaExpiryDate` hand-off — expiry lives in one
  component now, so nothing writes or reads it across screens.
- Remove the `?expiry` query-param seeding path and the `useSearchParams` import
  in the merged component (it only existed to carry expiry from entry → upload).
- Keep the workflow-prefill of `expiryDate` (revisiting the screen still shows the
  previously saved expiry from the `VISA` stage).

## Out of scope

- No changes to `visa.module.scss`, the API service, `DateField`, or
  `FileUploadCard`.
- No change to the `POST /visa` payload shape or the workflow-prefill API.
- No redirect stub for `/visa/upload` — the route is deleted outright (agreed:
  any bookmarked `/visa/upload` link will 404).

## Testing / verification

- `/visa` renders expiry field + three upload cards on both mobile and desktop.
- Proceed is disabled until a valid (3+ months) expiry is picked **and** Front +
  Back are uploaded; Additional does not affect it.
- A too-soon / expired typed date shows the inline warning and keeps Proceed
  disabled.
- Revisiting `/visa` prefills the saved expiry and previously uploaded document
  previews from the `VISA` workflow stage.
- Proceed issues one `POST /visa` and routes via `uiMetadata.route`.
- Project build/lint passes; `/visa/upload` no longer resolves.
