# Passport Upload — Real File Upload

**Date:** 2026-05-22
**Status:** Design — awaiting review
**Figma:** NRE-RI / Onboarding / Step 10 — Passport Proof, Document Upload (section `0:122673`)

## 1. Goal

Replace the **fake** upload in the passport flow with a real one, modelled on the
existing signature upload. Today `PassportUploadSheet` has camera/upload icon
boxes that open no file picker — they call `setTimeout(2s)` and then enable
"Proceed". The Front/Back screens then display a hard-coded Figma image, not
anything the user chose.

After this work the passport upload will:

- Open a real file picker (gallery) and a real camera capture.
- Validate file type and size, with toast errors.
- Show the existing progress animation, now driven by a real file.
- For images, open a crop step (reusing the signature cropper); PDFs skip it.
- Hand the chosen file through to the Front/Back preview and edit screens, which
  display the **real uploaded image** instead of the hard-coded one.

## 2. Decisions

| # | Decision | Outcome |
|---|----------|---------|
| 1 | Crop step for images? | **Yes** — picking an image opens a crop modal; PDFs skip it. Full parity with the signature flow. |
| 2 | Does the real file reach the Front/Back/Edit screens? | **Yes** — handed through a module store (like `signatureStore`); the hard-coded preview is replaced. |
| 3 | How to share the cropper? | **Extract** `SignatureCropperModal` into a generic, shared `ImageCropperModal`; signature and passport both use it. |

## 3. Current state

Passport flow under `src/components/passport-upload/` (routes `/passportUpload/*`,
all `page.jsx`):

| Component | Role | Problem |
|-----------|------|---------|
| `PassportUpload` | Landing — "Upload the below documents" | Illustration expired-URL bug — **already fixed separately** |
| `PassportDetails` | Select passport type → opens upload sheet (front) | OK |
| `PassportUploadSheet` | Bottom-sheet: choose → uploading | **Fake** — no file input, `setTimeout` simulation; 4 expired Figma icon URLs |
| `PassportFront` / `PassportBack` | Preview uploaded page + extracted data | Hard-coded expired `PASSPORT_*_IMG`; `handleReupload` is a no-op |
| `PassportFrontEdit` / `PassportBackEdit` | Editable extracted fields | Hard-coded expired image |

Signature flow (the reference pattern) under `src/components/upload-signature/`:

- `SignatureUploadModal` — real `<input type="file">` + camera capture, type/size
  validation, progress animation, then opens the cropper for images.
- `SignatureCropperModal` — `react-image-crop`, free aspect, PNG Blob output.
  Already generic: accepts `title` / `subtitle` props.
- `signatureStore` — module-level transfer slot holding `{name, blob, objectUrl, type, size}`.

## 4. Architecture

### 4.1 New: shared `ImageCropperModal`

Move `src/components/upload-signature/SignatureCropperModal.tsx` (+ its
`.module.scss`) to a new folder `src/components/image-cropper/`:

- `image-cropper/ImageCropperModal.tsx` — component renamed `SignatureCropperModal` → `ImageCropperModal`.
- `image-cropper/image-cropper-modal.module.scss` — renamed from `signature-cropper-modal.module.scss`.

The component is already generic. Two adjustments:

- Default `title` / `subtitle` become neutral (`"Crop image"` / `"Adjust the crop area."`)
  instead of signature wording.
- `SignatureUploadModal` updates its import to the new path and **explicitly**
  passes the signature wording (`title="Crop your signature"`,
  `subtitle="Adjust the box around your signature."`).

Only `SignatureUploadModal.tsx` imports the cropper — confirm with grep before
moving. No other consumer.

> The "manual bank details image cropper" is a separate component and is **out of
> scope** — not consolidated here.

### 4.2 New: `passportStore`

`src/components/passport-upload/passportStore.ts` — module-level transfer slot,
modelled on `signatureStore` but with **two slots** (front + back):

```ts
export interface PassportFile {
  name: string; blob: Blob; objectUrl: string; type: string; size: number;
}
type Side = 'front' | 'back';

export const passportStore = {
  set(side: Side, file: PassportFile): void;  // revokes the replaced slot's objectUrl
  get(side: Side): PassportFile | null;        // non-clearing read
  clear(side?: Side): void;                    // revokes objectUrl(s); clears one or both
};
```

- The store **owns objectURL lifecycle**: `set` revokes the URL it replaces;
  `clear` revokes. Consumers (preview/edit screens) only read `objectUrl` — they
  never revoke it.
- Reads are **non-clearing** (`get`), so back-navigation within the session still
  shows the image. The module singleton survives client-side navigation; it is
  empty only after a hard page reload.
- `PassportUpload` (landing) calls `passportStore.clear()` on mount, so each fresh
  entry into the flow starts clean.

### 4.3 Changed: `PassportUploadSheet`

Keep the existing bottom-sheet **visuals** (drag handle, title + close, two icon
boxes for the `choose` state, filename chip + progress bar + Reupload/Proceed for
the `uploading` state). Replace the internals:

- Add two hidden inputs: `<input type="file">` (gallery, `accept` images + pdf) and
  `<input type="file" capture="environment">` (camera). The camera icon box
  triggers the camera input; the upload icon box triggers the file input. The 4
  expired Figma icon assets (`ASSET_CAMERA`, `ASSET_UPLOAD`, `ASSET_DASH`,
  `ASSET_CLOSE`) are replaced with inline SVGs — same approach as `SignatureUploadModal`.
- On pick: validate (see §5). Invalid → `toast` error, stay in `choose`.
- Valid → `uploading` state; run the existing progress animation; the filename
  chip shows the real filename.
- On progress complete:
  - **image** → open `ImageCropperModal` over the sheet (`title="Crop your passport"`,
    `subtitle="Adjust the box around your passport."`). While the cropper is open
    the sheet frame is hidden, mirroring `SignatureUploadModal`.
  - **PDF** → skip the cropper; the picked file is final.
- After crop confirm (or PDF): the `uploading` row shows the filename + 100%
  progress, and **Proceed** is enabled.
- **Reupload** → reset to `choose`, drop the current pick.
- **Proceed** → `passportStore.set(side, file)`, then `onProceed?.()` or the
  default navigation. Because the sheet writes to the store itself, both usages
  keep working: inline modal (from `PassportDetails` / `PassportFront`) and
  standalone page (`/passportUpload/upload-front`, `/upload-back`).
- Cropper cancel → returns to the sheet's `choose` state.

The `side: 'front' | 'back'` prop is unchanged.

### 4.4 Changed: `PassportFront` / `PassportBack`

- On mount, read `passportStore.get('front')` / `get('back')`.
  - Found → render the real image in `.previewZone` (`<img src={file.objectUrl}>`).
    If the file is a PDF, render a "PDF — preview not available" placeholder
    (same idea as the signature verify view).
  - Not found (hard reload) → redirect to `/passportUpload/details`.
- `FileChip` shows the real filename.
- `handleReupload` (currently a no-op / route) → re-open `PassportUploadSheet` for
  that side.
- `PassportFront` "Upload Passport Back" → opens `PassportUploadSheet(side="back")`
  inline (unchanged). `PassportBack` "Proceed" → `/personalDetailsForm/1` (unchanged).
- The **extracted-data card stays stubbed** — see §6.

### 4.5 Changed: `PassportFrontEdit` / `PassportBackEdit`

- Read the real image from `passportStore` for the thumbnail; redirect to
  `/passportUpload/details` if absent.
- Editable fields stay stubbed (see §6).

### 4.6 Changed: `SignatureUploadModal`

Import path + component name for the cropper updated; passes signature `title` /
`subtitle` explicitly. No behavioural change.

## 5. Validation

Mirrors `SignatureUploadModal`'s inline helpers (kept inline in the passport sheet
for consistency; a shared util is possible future cleanup):

- **Accepted types:** any `image/*` plus `application/pdf` — extensions
  `jpg, jpeg, png, heic, heif, webp, pdf`. (Figma sheet text: "JPG, PNG & PDF".)
- **Max size:** **5 MB** — matches the passport sheet's own disclaimer
  ("Maximum size less than 5 MB"). (Signature uses 4 MB; passport keeps 5.)
- Failure → `toast.error(...)` from `@/services/toast.service`; the sheet stays in
  `choose`.

## 6. Assumptions & out of scope

- **OCR / extracted passport fields stay stubbed.** Only the *image* becomes real.
  The Front/Back/Edit screens keep their hard-coded `EXTRACTED_DATA` /
  `INITIAL_FIELDS` — there is no OCR backend.
- **No `secureSessionService` base64 persistence.** The signature flow caches one ~4 MB
  file as base64; two ~5 MB passport files would risk the storage quota. The
  module store covers in-session navigation instead. Hard reload of a preview
  screen redirects back to `/passportUpload/details`.
- **`PassportUploadSheet` visual layout is preserved.** This work changes upload
  mechanics only. The sheet currently renders one bottom-sheet layout for all
  widths; a dedicated desktop-modal treatment (per the Figma web variant) is a
  separate follow-up if wanted.
- **Manual bank-details cropper** is not consolidated into `ImageCropperModal`.
- The landing-page illustration expired-URL bug was **already fixed separately**
  (single local asset). This rework removes the *remaining* expired Figma URLs as
  a side effect: the sheet's 4 icons become inline SVGs, and the Front/Back/Edit
  preview images become the real uploaded image.

## 7. Data flow

```
/passportUpload (landing)        passportStore.clear()
   → /passportUpload/details
        select type → PassportUploadSheet(side="front")  [inline modal]
            pick file → validate → progress
                image → ImageCropperModal → cropped Blob
                pdf   → original Blob
            Proceed → passportStore.set("front", file) → /passportUpload/front
   → /passportUpload/front        passportStore.get("front") → preview
        Reupload → PassportUploadSheet(side="front")
        Edit     → /passportUpload/front-edit   (passportStore.get("front"))
        Upload Passport Back → PassportUploadSheet(side="back")  [inline modal]
            … same pick/validate/crop …
            Proceed → passportStore.set("back", file) → /passportUpload/back
   → /passportUpload/back         passportStore.get("back") → preview
        Edit    → /passportUpload/back-edit     (passportStore.get("back"))
        Proceed → /personalDetailsForm/1
```

## 8. File-by-file summary

**New**
- `src/components/image-cropper/ImageCropperModal.tsx` — moved/renamed from `SignatureCropperModal`.
- `src/components/image-cropper/image-cropper-modal.module.scss` — moved/renamed.
- `src/components/passport-upload/passportStore.ts` — front/back transfer slots.

**Changed**
- `PassportUploadSheet.tsx` — real upload internals; inline SVG icons; opens `ImageCropperModal`.
- `PassportFront.tsx` / `PassportBack.tsx` — consume `passportStore`; real preview; working re-upload; PDF placeholder.
- `PassportFrontEdit.tsx` / `PassportBackEdit.tsx` — consume `passportStore` for the thumbnail.
- `PassportUpload.tsx` — `passportStore.clear()` on mount.
- `passport-upload.module.scss` — minor additions if needed (filename-chip remove control, PDF placeholder); reuse existing classes where possible.
- `upload-signature/SignatureUploadModal.tsx` — cropper import path + explicit `title`/`subtitle`.

**Deleted**
- `upload-signature/SignatureCropperModal.tsx` + `signature-cropper-modal.module.scss` (superseded by the move).

## 9. Testing

- **`passportStore`** — unit tests (`jest`): `set`/`get`/`clear` per side, objectURL
  revoked on replace and on clear, `get` is non-clearing.
- **Validation helpers** — unit tests: accepted/rejected types, size boundary at 5 MB.
- **Flow** — manual verification: pick image → crop → preview shows the cropped
  image; pick PDF → no crop, placeholder on the preview; oversize/wrong-type →
  toast; re-upload replaces the image; hard reload of a preview screen redirects
  to `/passportUpload/details`.
- Confirm no regression in the signature flow after the cropper move (its crop
  step still works).

## 10. Definition of done

- Passport upload opens a real gallery picker and camera capture.
- Oversize / unsupported files are rejected with a toast.
- Images go through the crop step; PDFs skip it.
- The Front, Back, and both Edit screens display the actually-uploaded file.
- Re-upload replaces the stored file and preview.
- The signature flow is unaffected by the cropper extraction.
- No remaining `figma.com/api/mcp/asset/...` URLs in the passport components.
- `npm run lint` and `npm test` pass.
