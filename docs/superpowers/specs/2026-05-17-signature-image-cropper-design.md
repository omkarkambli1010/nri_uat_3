# Signature Image Cropper + Blob-only Storage — Design

## Context

`SignatureUploadModal` lets the user pick an image or PDF as their signature.
Today, after `FileReader.readAsDataURL` finishes, the modal jumps straight
to a filename row with a Proceed button that hands the base64 data URL to
the parent verify view, which then writes it to `secureSessionService`.

We are changing two things together:

1. **Cropper step (images only)** — after the image loads, open a cropper
   modal so the user can trim the signature out of a larger photo before
   the verify view sees it.
2. **Blob everywhere** — drop base64 from the entire signature flow. Use
   `Blob` + `URL.createObjectURL` in component state. Drop the
   secureSessionService signature persistence path entirely.

## Scope

In:

- New `SignatureCropperModal` using `react-image-crop@^11`.
- Refactor `signatureStore` / `SignatureUploadModal` / `UploadSignature` /
  `UploadSignatureInfo` to use Blobs instead of base64.
- Drop `secureSessionService` reads/writes for `signatureBase64`, `signatureName`,
  `signatureType`, `signatureSource`. (No other page consumes them.)
- Pad-drawn signature also becomes a Blob via `canvas.toBlob('image/png')`.

Out:

- HEIC → PNG conversion (deferred — picking a HEIC will show a broken image
  in the cropper, same as today).
- PDF cropping. PDFs route around the cropper.
- Signature persistence across page refresh / back-nav. Trade-off
  acknowledged by the user.

## User flow

### Image (JPG/PNG/WebP) — with cropper

1. User opens `SignatureUploadModal` and picks an image file.
2. Fake progress bar animates briefly (decorative, like today).
3. **(new)** When progress completes for an image, the cropper modal opens
   on top of the upload modal. Source is `URL.createObjectURL(file)`.
4. User drags a crop rect (free aspect) and clicks **Crop & Continue**.
5. Crop is drawn to an off-screen `<canvas>` and exported via
   `canvas.toBlob('image/png')`. The Blob (and its objectURL) becomes the
   modal's new `blob` / `objectUrl`. Filename's extension swaps to `.png`.
6. Cropper closes; upload modal shows filename row + Proceed.
7. Proceed hands `{ name, blob, objectUrl, type, size }` to the parent and
   the verify view renders `<img src={objectUrl}>`.

### PDF — cropper skipped

After progress completes for a PDF, the modal goes straight to the
filename + Proceed row (no cropper). Blob shape still applies.

### Cancel from cropper

Cropper has an **X** button. Clicking it clears `file`, `blob`,
`objectUrl`, `progress`, `croppingObjectUrl`, returning the upload modal to
the empty tiles state. The cropper's source objectURL is revoked.

## Architecture

```
SignatureUploadModal
├── on file pick:
│     - create objectUrl for file
│     - run fake progress
├── on progress done (image): open SignatureCropperModal with file's objectUrl
├── on progress done (pdf):   set blob = file; skip cropper
└── <SignatureCropperModal
       open={!!croppingObjectUrl}
       src={croppingObjectUrl}
       fileName={file.name}
       isDesktop={isDesktop}
       onCancel={reset}
       onConfirm={(blob, size, name) => set as final}
   />
```

### New files

- `src/components/upload-signature/SignatureCropperModal.tsx`
- `src/components/upload-signature/signature-cropper-modal.module.scss`

### Library

`react-image-crop@^11.0.7` (already in `package.json`). Imports:

```ts
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
```

### Cropper modal API

```ts
interface SignatureCropperModalProps {
  open: boolean;
  isDesktop: boolean;
  src: string;        // objectURL of the loaded image
  fileName: string;   // original file name, used to derive cropped name
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob, croppedSize: number, croppedName: string) => void;
}
```

### Crop → PNG Blob export

```ts
const img = imgRef.current!;
const scaleX = img.naturalWidth  / img.width;
const scaleY = img.naturalHeight / img.height;
const canvas = document.createElement('canvas');
canvas.width  = Math.floor(pixelCrop.width  * scaleX);
canvas.height = Math.floor(pixelCrop.height * scaleY);
const ctx = canvas.getContext('2d')!;
ctx.drawImage(
  img,
  pixelCrop.x * scaleX, pixelCrop.y * scaleY,
  pixelCrop.width * scaleX, pixelCrop.height * scaleY,
  0, 0, canvas.width, canvas.height,
);
canvas.toBlob(blob => {
  if (!blob) return;
  onConfirm(blob, blob.size, swapExt(fileName, '.png'));
}, 'image/png');
```

### Pad-drawn signature → Blob

In `UploadSignature.proceed()`, replace `pad.toDataURL('image/png')` with a
Promise-wrapped `canvas.toBlob`:

```ts
const blob: Blob = await new Promise((resolve, reject) => {
  canvasRef.current!.toBlob(b => b ? resolve(b) : reject(new Error('no blob')), 'image/png');
});
```

### Shared types

```ts
// signatureStore.ts
export interface PendingSignature {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;     // 'image/png' | 'application/pdf' | ...
  size: number;
}
```

### Object URL hygiene

- Every `URL.createObjectURL` paired with `URL.revokeObjectURL` on:
  - cancel/reset
  - replacement (e.g. user cancels then re-picks)
  - component unmount
- `signatureStore.take()` transfers ownership; consumer revokes when done.

## Edge cases

- **Zero-size crop:** disable the Confirm button until pixelCrop has
  positive width/height.
- **Image fails to load** (corrupt file, HEIC): cropper renders nothing;
  user hits Cancel.
- **Filename without extension:** result is `<name>.png`.
- **Page refresh / back-nav from `/support-document`:** signature is lost
  (no persistence). Accepted trade-off.

## Testing

Manual:

1. Pick a JPG → drag crop → Crop & Continue → verify view shows cropped
   PNG. Inspect `<img>` src — should be a `blob:` URL.
2. Pick a JPG → Cancel in cropper → upload modal back to empty tiles.
3. Pick a PDF → no cropper; filename row + Proceed appears immediately.
4. Draw signature on pad → Proceed → support-document opens (no error).
5. Mobile + desktop layouts of cropper look correct.
6. Pick an image, crop, Proceed, then refresh → signature is correctly
   lost (expected for this iteration).
