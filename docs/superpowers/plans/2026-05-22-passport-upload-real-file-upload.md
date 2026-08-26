# Passport Upload — Real File Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the passport flow's simulated upload with a real file/camera upload (type + size validation, progress, image crop) and surface the uploaded file on the preview and edit screens.

**Architecture:** Mirror the existing signature upload. Extract the signature cropper into a shared `ImageCropperModal`. Add a `passportStore` module that transfers the picked `Blob` between the upload sheet and the preview/edit screens. Rewrite `PassportUploadSheet` with real `<input type="file">` elements; the store owns every objectURL's lifecycle.

**Tech Stack:** Next.js 15 (App Router), React 18, TypeScript, SCSS modules, `react-image-crop` (already a dependency via the signature flow).

**Spec:** `docs/superpowers/specs/2026-05-22-passport-upload-real-file-upload-design.md`

**Verification:** No test framework in this repo (decided with the user). Each task is verified with a typecheck, `npm run lint`, and a manual click-through. Commit after each task.

> **Typecheck note:** the repo has ~61 pre-existing `tsc` errors in unrelated files (`yono-*`, `upload-process`, `penny-drop`, `api.service`, …). A bare `npx tsc --noEmit` is therefore never "clean". For every task the typecheck gate is: `npx tsc --noEmit 2>&1 | grep -E "passport-upload|image-cropper|upload-signature"` returns **nothing** — i.e. this work adds no errors in the files it touches. Wherever a step below says "`npx tsc --noEmit` → no errors", apply that grep.

**Branch:** Work continues on the current branch `feature/dummy-flow`.

---

## Task 0: Commit pending work

The working tree already holds two unrelated, uncommitted changes — the passport
illustration bug fix and this spec/plan. Commit them first so the feature lands
in clean, separate commits.

**Files:**
- Modify: (already changed) `src/components/passport-upload/PassportUpload.tsx`, `src/components/passport-upload/passport-upload.module.scss`
- Create: (already added) `public/assets/images/diy/upload-docs-illustration.png`
- Create: (already added) `docs/superpowers/specs/2026-05-22-passport-upload-real-file-upload-design.md`, `docs/superpowers/plans/2026-05-22-passport-upload-real-file-upload.md`

- [ ] **Step 1: Review what is staged-pending**

Run: `git status --short`
Expected: the four/five paths above appear as modified/untracked.

- [ ] **Step 2: Commit the illustration bug fix**

```bash
git add src/components/passport-upload/PassportUpload.tsx src/components/passport-upload/passport-upload.module.scss public/assets/images/diy/upload-docs-illustration.png
git commit -m "fix: replace expired Figma URLs in passport upload illustration

The landing illustration was composited from 5 temporary Figma MCP
asset URLs (7-day expiry). Flatten to a single local PNG.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 3: Commit the spec and plan**

```bash
git add docs/superpowers/specs/2026-05-22-passport-upload-real-file-upload-design.md docs/superpowers/plans/2026-05-22-passport-upload-real-file-upload.md
git commit -m "docs: add passport upload real-file-upload spec and plan

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 1: Extract the shared `ImageCropperModal`

`SignatureCropperModal` is already generic (it takes `title`/`subtitle` props).
Move it to a shared folder so the passport flow can use it without depending on
the signature folder. Only `SignatureUploadModal` imports it today — confirm
before moving.

**Files:**
- Create: `src/components/image-cropper/ImageCropperModal.tsx` (from `SignatureCropperModal.tsx`)
- Create: `src/components/image-cropper/image-cropper-modal.module.scss` (from `signature-cropper-modal.module.scss`)
- Modify: `src/components/upload-signature/SignatureUploadModal.tsx`
- Delete: `src/components/upload-signature/SignatureCropperModal.tsx`
- Delete: `src/components/upload-signature/signature-cropper-modal.module.scss`

- [ ] **Step 1: Confirm the cropper has a single importer**

Run: `git grep -n "SignatureCropperModal"`
Expected: matches only in `SignatureCropperModal.tsx` (its own definition) and `SignatureUploadModal.tsx`. If anything else imports it, stop and update this task.

- [ ] **Step 2: Copy the two files to the new folder**

```bash
mkdir -p src/components/image-cropper
cp src/components/upload-signature/SignatureCropperModal.tsx src/components/image-cropper/ImageCropperModal.tsx
cp src/components/upload-signature/signature-cropper-modal.module.scss src/components/image-cropper/image-cropper-modal.module.scss
```

- [ ] **Step 3: Rename the component inside `ImageCropperModal.tsx`**

Apply these exact replacements in `src/components/image-cropper/ImageCropperModal.tsx`:

| Find | Replace with |
|------|--------------|
| `import styles from './signature-cropper-modal.module.scss';` | `import styles from './image-cropper-modal.module.scss';` |
| `export interface SignatureCropperModalProps {` | `export interface ImageCropperModalProps {` |
| `export function SignatureCropperModal({` | `export function ImageCropperModal({` |
| `}: SignatureCropperModalProps) {` | `}: ImageCropperModalProps) {` |
| `  title = 'Crop your signature',` | `  title = 'Crop image',` |
| `  subtitle = 'Adjust the box around your signature.',` | `  subtitle = 'Adjust the crop area.',` |
| `      aria-label="Crop signature"` | `      aria-label="Crop image"` |
| `              alt="Signature to crop"` | `              alt="Image to crop"` |

Also replace the top comment block:

```tsx
// SignatureCropperModal — opens on top of SignatureUploadModal once the
// picked image has loaded. Free aspect ratio, PNG Blob output, Cancel (X)
// returns the upload modal to its empty state.
```

with:

```tsx
// ImageCropperModal — generic crop modal opened on top of an upload modal once
// the picked image has loaded. Free aspect ratio, PNG Blob output. Cancel (X)
// hands control back to the caller. `title`/`subtitle` are caller-supplied.
```

- [ ] **Step 4: Point `SignatureUploadModal` at the new component**

In `src/components/upload-signature/SignatureUploadModal.tsx`, replace:

```tsx
import { SignatureCropperModal } from './SignatureCropperModal';
```

with:

```tsx
import { ImageCropperModal } from '@/components/image-cropper/ImageCropperModal';
```

Then replace the JSX usage near the bottom of the file:

```tsx
      <SignatureCropperModal
        open={!!croppingObjectUrl}
        isDesktop={isDesktop}
        src={croppingObjectUrl}
        fileName={croppingName}
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
```

with (passes the signature wording explicitly, since the defaults are now generic):

```tsx
      <ImageCropperModal
        open={!!croppingObjectUrl}
        isDesktop={isDesktop}
        src={croppingObjectUrl}
        fileName={croppingName}
        title="Crop your signature"
        subtitle="Adjust the box around your signature."
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
```

- [ ] **Step 5: Delete the old files**

```bash
git rm src/components/upload-signature/SignatureCropperModal.tsx src/components/upload-signature/signature-cropper-modal.module.scss
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no new errors in `image-cropper/` or `upload-signature/`.

- [ ] **Step 7: Manual check — signature flow still crops**

Run `npm run dev`, go to `/uploadSignature`, click **Upload Signature**, pick an
image. Expected: the crop modal opens, **Crop & Continue** produces the cropped
preview. (PDF still skips the cropper.)

- [ ] **Step 8: Commit**

```bash
git add src/components/image-cropper src/components/upload-signature/SignatureUploadModal.tsx
git commit -m "refactor: extract shared ImageCropperModal from signature flow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: Create `passportStore`

A module-level transfer slot, modelled on `signatureStore`, but with two slots
(front + back). The store owns every objectURL: `set` revokes the URL it
replaces and creates a fresh one; `clear` revokes on the way out.

**Files:**
- Create: `src/components/passport-upload/passportStore.ts`

- [ ] **Step 1: Write the store**

Create `src/components/passport-upload/passportStore.ts`:

```ts
// Module-level transfer slots for the passport pages picked in the upload
// sheet and consumed by the preview / edit screens. Survives client-side
// navigation (same JS bundle); never persisted — a hard reload clears it.
//
// The store owns each file's objectURL lifecycle: `set` revokes the URL it
// replaces and creates a fresh one; `clear` revokes on the way out.
// Consumers only ever read `objectUrl`.

export interface PassportFile {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

export type PassportSide = 'front' | 'back';

const slots: Record<PassportSide, PassportFile | null> = {
  front: null,
  back: null,
};

export const passportStore = {
  // Stores `blob` for `side`, creating a fresh objectURL. Any file already in
  // that slot has its objectURL revoked first. Returns the stored PassportFile.
  set(side: PassportSide, input: { name: string; blob: Blob; type: string }): PassportFile {
    const prev = slots[side];
    if (prev) URL.revokeObjectURL(prev.objectUrl);
    const file: PassportFile = {
      name: input.name,
      blob: input.blob,
      objectUrl: URL.createObjectURL(input.blob),
      type: input.type || input.blob.type,
      size: input.blob.size,
    };
    slots[side] = file;
    return file;
  },

  // Non-clearing read — preview / edit screens call this, so the slot keeps
  // its value and back-navigation within the session still shows the file.
  get(side: PassportSide): PassportFile | null {
    return slots[side];
  },

  // Revokes and clears one side, or both when `side` is omitted.
  clear(side?: PassportSide): void {
    const sides: PassportSide[] = side ? [side] : ['front', 'back'];
    for (const s of sides) {
      const f = slots[s];
      if (f) URL.revokeObjectURL(f.objectUrl);
      slots[s] = null;
    }
  },
};
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/passport-upload/passportStore.ts
git commit -m "feat: add passportStore transfer slot for front/back uploads

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: Rewrite `PassportUploadSheet` with a real upload

Keep the bottom-sheet visuals; replace the `setTimeout` simulation with real
file + camera inputs, validation, progress, and a crop step for images. The
sheet writes the finished file to `passportStore` itself, so both the inline-modal
and standalone-page usages keep working. The 4 expired Figma icon URLs are
replaced with inline SVGs.

**Files:**
- Modify (full rewrite): `src/components/passport-upload/PassportUploadSheet.tsx`

> The expired Figma icon URLs and the dash-image were already swapped for inline
> SVGs and a `.sheetHandle` CSS pill in a prior commit. This task supersedes that
> file with the full real-upload rewrite (which keeps inline icons and reuses the
> existing `.sheetHandle` class) — no SCSS change is needed here.

- [ ] **Step 1: Confirm the drag-handle class exists**

The drag handle is a CSS pill, not an image. `passport-upload.module.scss`
already has a `.sheetHandle` rule. Confirm it before relying on it:

Run: `git grep -n "\.sheetHandle " -- src/components/passport-upload/passport-upload.module.scss`
Expected: one match — the `.sheetHandle` rule. No SCSS edit is made in this task.

- [ ] **Step 2: Rewrite `PassportUploadSheet.tsx`**

Replace the entire contents of `src/components/passport-upload/PassportUploadSheet.tsx` with:

```tsx
'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/services/toast.service';
import { ImageCropperModal } from '@/components/image-cropper/ImageCropperModal';
import { passportStore, type PassportSide } from './passportStore';
import styles from './passport-upload.module.scss';

// PassportUploadSheet — bottom-sheet for picking a passport page (front/back).
// Real file/camera pick → validation → progress → crop step (images only;
// PDFs skip it) → Proceed. The chosen file is written to passportStore under
// its side and read back by PassportFront / PassportBack.
//
// Figma: Onboarding-Mob-Passport-Upload (0:38143) — choose state
//        Onboarding-Mob-Passport-Upload-Front (0:37918) — uploading state
//
// Usage A — inline modal: <PassportUploadSheet side="front" onClose onProceed />
// Usage B — standalone page: <PassportUploadSheet side="front" />  (router fallback)

type SheetState = 'choose' | 'uploading';

interface PassportUploadSheetProps {
  side: PassportSide;
  onClose?: () => void;   // override the default router.back()
  onProceed?: () => void; // override the default route navigation
}

const ACCEPTED_INPUT_HINT = 'image/*,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf';
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'pdf'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LABEL = '5 MB';

function isAcceptedFile(f: File): boolean {
  if (f.type) {
    if (f.type === 'application/pdf') return true;
    if (f.type.startsWith('image/')) return true;
  }
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.includes(ext);
}

function isPdf(f: File): boolean {
  return f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.333 1.333H4a1.333 1.333 0 0 0-1.333 1.334v10.666A1.333 1.333 0 0 0 4 14.667h8a1.333 1.333 0 0 0 1.333-1.334V5.333L9.333 1.333Z"
        stroke="#280071" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M9.333 1.333v4h4" stroke="#280071" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"
        stroke="#280071" strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3" stroke="#280071" strokeWidth="1.5" />
    </svg>
  );
}

function IconUpload() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 10.5h.5a4 4 0 0 1 0 8H6a4.5 4.5 0 0 1-1.1-8.86A6 6 0 0 1 16.4 9.5"
        stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M12 13v6" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 15.5L12 13l2.5 2.5" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function PassportUploadSheet({ side, onClose, onProceed }: PassportUploadSheetProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [sheetState, setSheetState] = useState<SheetState>('choose');
  const [displayName, setDisplayName] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Final file — post-crop for images, the original for PDFs. resultBlob
  // non-null ⇒ Proceed is enabled.
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultType, setResultType] = useState('');

  // Cropper state — when set, the cropper opens and the sheet frame hides.
  const [croppingObjectUrl, setCroppingObjectUrl] = useState('');
  const [croppingName, setCroppingName] = useState('');

  const title = side === 'front' ? 'Upload Passport Front' : 'Upload Passport Back';

  // Mirror the live cropping URL into a ref so the unmount cleanup revokes the
  // latest value (an empty-deps effect would capture only the initial '').
  const croppingUrlRef = useRef('');
  useEffect(() => {
    croppingUrlRef.current = croppingObjectUrl;
  }, [croppingObjectUrl]);
  useEffect(() => {
    return () => {
      if (croppingUrlRef.current) URL.revokeObjectURL(croppingUrlRef.current);
    };
  }, []);

  // Lock background scroll while the sheet is mounted.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const revokeCropping = () => {
    if (croppingObjectUrl) URL.revokeObjectURL(croppingObjectUrl);
    setCroppingObjectUrl('');
    setCroppingName('');
  };

  const resetToChoose = () => {
    revokeCropping();
    setResultBlob(null);
    setResultType('');
    setDisplayName('');
    setProgress(0);
    setUploading(false);
    setSheetState('choose');
  };

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const startUpload = (f: File) => {
    if (!isAcceptedFile(f)) {
      toast.error('Unsupported file type. Please upload an image or PDF.');
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`File too large. Max size ${MAX_LABEL}.`);
      return;
    }

    revokeCropping();
    setResultBlob(null);
    setResultType('');

    const pdf = isPdf(f);
    setDisplayName(f.name);
    setSheetState('uploading');
    setUploading(true);
    setProgress(0);

    // Randomised progress curve — kept for visual continuity with the rest of
    // the app's upload flows.
    let pct = 0;
    const step = () => {
      pct = Math.min(pct + (Math.random() * 18 + 8), 94);
      setProgress(Math.round(pct));
      if (pct < 94) {
        window.setTimeout(step, 150 + Math.random() * 120);
      } else {
        window.setTimeout(finish, 350);
      }
    };
    const finish = () => {
      setProgress(100);
      setUploading(false);
      if (pdf) {
        // PDFs skip the cropper — the picked file is the final blob.
        setResultBlob(f);
        setResultType('application/pdf');
      } else {
        // Open the cropper with a transient objectURL for the source image.
        setCroppingObjectUrl(URL.createObjectURL(f));
        setCroppingName(f.name);
      }
    };
    window.setTimeout(step, 80);
  };

  const onFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) startUpload(f);
  };

  const onCropConfirm = (blob: Blob, _size: number, name: string) => {
    revokeCropping();
    setResultBlob(blob);
    setResultType('image/png');
    setDisplayName(name);
  };

  const onCropCancel = () => {
    resetToChoose();
  };

  const proceed = () => {
    if (!resultBlob) return;
    passportStore.set(side, { name: displayName, blob: resultBlob, type: resultType });
    if (onProceed) onProceed();
    else router.push(side === 'front' ? '/passportUpload/front' : '/passportUpload/back');
  };

  const showUploadFrame = !croppingObjectUrl;
  const canProceed = !uploading && !!resultBlob;

  return (
    <>
      {showUploadFrame && (
        <div
          className={styles.sheetPage}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className={styles.sheetCard}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_INPUT_HINT}
              onChange={onFilePicked}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFilePicked}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />

            <div className={styles.sheetHandleRow}>
              <div className={styles.sheetHandle} aria-hidden="true" />
            </div>

            <div className={styles.sheetTitleRow}>
              <p className={styles.sheetTitle}>{title}</p>
              <button
                type="button"
                className={styles.sheetCloseBtn}
                onClick={handleClose}
                aria-label="Close"
              >
                <IconClose />
              </button>
            </div>

            {sheetState === 'choose' ? (
              <>
                <div className={styles.sheetIconRow}>
                  <button
                    type="button"
                    className={styles.sheetIconBox}
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Take photo with camera"
                  >
                    <IconCamera />
                  </button>
                  <button
                    type="button"
                    className={styles.sheetIconBox}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload from files"
                  >
                    <IconUpload />
                  </button>
                </div>
                <div className={styles.sheetDisclaimerBlock}>
                  <p className={styles.sheetDisclaimer}>Files supported: JPG, PNG &amp; PDF</p>
                  <p className={styles.sheetDisclaimer}>Maximum size less than {MAX_LABEL}</p>
                  <p className={styles.sheetDisclaimer}>
                    Please ensure that you don&apos;t upload password protected documents
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className={styles.sheetProgressBlock}>
                  <div className={styles.fileChip}>
                    <IconFile />
                    <span className={styles.fileChipName}>{displayName}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>
                <div className={styles.sheetButtonRow}>
                  <button
                    type="button"
                    className={styles.reuploadBtn}
                    onClick={resetToChoose}
                    disabled={uploading}
                  >
                    Reupload
                  </button>
                  <button
                    type="button"
                    className={`${styles.sheetProceedBtn}${!canProceed ? ` ${styles.sheetProceedBtnDisabled}` : ''}`}
                    onClick={proceed}
                    disabled={!canProceed}
                    aria-disabled={!canProceed}
                  >
                    Proceed
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <ImageCropperModal
        open={!!croppingObjectUrl}
        isDesktop={false}
        src={croppingObjectUrl}
        fileName={croppingName}
        title="Crop your passport"
        subtitle="Adjust the box around your passport."
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors. (`_size` is an unused arg — allowed by the repo's
`argsIgnorePattern`, the same pattern `ImageCropperModal` uses for `onChange`.)

- [ ] **Step 4: Manual check — the sheet really uploads**

Run `npm run dev`, go to `/passportUpload/details`, select a passport type,
press **Upload Passport Front**.
- Pick an **image** → progress runs → the crop modal opens → **Crop & Continue** →
  the sheet shows the filename + 100% + an enabled **Proceed**.
- Press **Reupload** → back to the camera/upload choice.
- Pick a **PDF** → progress runs → no crop → **Proceed** enabled.
- Pick a **> 5 MB** file or a `.txt` → a toast error appears, sheet stays on the
  choice state.

(The Front screen will not show the new image until Task 4 — that is expected.)

- [ ] **Step 5: Commit**

```bash
git add src/components/passport-upload/PassportUploadSheet.tsx src/components/passport-upload/passport-upload.module.scss
git commit -m "feat: real file/camera upload + crop in PassportUploadSheet

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: Wire `PassportFront` to the store

`PassportFront` reads the uploaded front page from `passportStore`, shows the
real image (or a placeholder for PDFs), and re-opens the sheet for re-upload.

**Files:**
- Modify: `src/components/passport-upload/PassportFront.tsx`
- Modify (add one class; check one class): `src/components/passport-upload/passport-upload.module.scss`

- [ ] **Step 1: Add the PDF placeholder class and confirm `.previewImg`**

Add this rule to `src/components/passport-upload/passport-upload.module.scss`:

```scss
// Shown in .previewZone when the uploaded file is a PDF (no inline preview).
.pdfPreviewNote {
  margin: 0;
  padding: 24px 16px;
  font-size: 13px;
  color: #666666;
  text-align: center;
}
```

Locate the existing `.previewImg` rule in the same file and make sure its body
includes `max-width: 100%;`, `height: auto;`, and `display: block;` — add any
that are missing (a real uploaded photo has arbitrary dimensions and must not be
stretched to the old fixed 100×137).

- [ ] **Step 2: Update imports in `PassportFront.tsx`**

Replace:

```tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
import PassportUploadSheet from './PassportUploadSheet';
```

with:

```tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
import PassportUploadSheet from './PassportUploadSheet';
import { passportStore, type PassportFile, type PassportSide } from './passportStore';
```

- [ ] **Step 3: Remove the hard-coded preview image**

Delete these three lines:

```tsx
// ─── Passport front preview image ───────────────────────────────────────────
// TODO: Replace with actual uploaded image in production
const PASSPORT_FRONT_IMG = 'https://www.figma.com/api/mcp/asset/56f5665e-2106-488d-837d-13e011f620e8';
```

- [ ] **Step 4: Replace the component head (state, effect, handlers)**

Replace:

```tsx
export default function PassportFront() {
  const router = useRouter();
  const [showUploadSheet, setShowUploadSheet] = useState(false);

  const handleBack = () => router.back();
  const handleReupload = () => { /* TODO: trigger file picker */ };
  // Show the back-upload sheet inline over this screen
  const handleNext = () => setShowUploadSheet(true);
  const handleEdit = () => router.push('/passportUpload/front-edit');

  return (
```

with:

```tsx
export default function PassportFront() {
  const router = useRouter();
  const [file, setFile] = useState<PassportFile | null>(null);
  const [uploadSheet, setUploadSheet] = useState<PassportSide | null>(null);

  // Load the uploaded front page from the store. A hard reload empties the
  // store, so there is nothing to preview — return to passport details.
  useEffect(() => {
    const f = passportStore.get('front');
    if (!f) {
      router.replace('/passportUpload/details');
      return;
    }
    setFile(f);
  }, [router]);

  const handleBack = () => router.back();
  const handleReupload = () => setUploadSheet('front');
  const handleNext = () => setUploadSheet('back');
  const handleEdit = () => router.push('/passportUpload/front-edit');

  // The 'front' sheet re-uploads in place: refresh the preview and close.
  // The 'back' sheet advances to the back screen.
  const handleSheetProceed = () => {
    if (uploadSheet === 'front') {
      setFile(passportStore.get('front'));
      setUploadSheet(null);
    } else {
      router.push('/passportUpload/back');
    }
  };

  if (!file) return null;

  const previewContent =
    file.type === 'application/pdf' ? (
      <p className={styles.pdfPreviewNote}>PDF uploaded — preview not available</p>
    ) : (
      <img src={file.objectUrl} alt="Passport front page" className={styles.previewImg} />
    );

  return (
```

- [ ] **Step 5: Use the real file in the mobile layout**

Replace:

```tsx
          {/* File chip */}
          <FileChip filename="Passport.jpeg" onRemove={handleReupload} />

          {/* Passport image preview zone */}
          <div className={styles.previewZone}>
            <img
              src={PASSPORT_FRONT_IMG}
              alt="Passport front page"
              className={styles.previewImg}
              width={100}
              height={137}
            />
          </div>
```

with:

```tsx
          {/* File chip */}
          <FileChip filename={file.name} onRemove={handleReupload} />

          {/* Passport image preview zone */}
          <div className={styles.previewZone}>{previewContent}</div>
```

- [ ] **Step 6: Use the real file in the desktop layout**

Replace:

```tsx
              {/* File chip */}
              <FileChip filename="Passport.jpeg" onRemove={handleReupload} />

              {/* Side-by-side: preview + extracted data */}
              <div className={styles.desktopUploadRow}>
                <div className={styles.previewZone}>
                  <img
                    src={PASSPORT_FRONT_IMG}
                    alt="Passport front page"
                    className={styles.previewImg}
                    width={100}
                    height={137}
                  />
                </div>
                <ExtractedDataCard onEdit={handleEdit} />
              </div>
```

with:

```tsx
              {/* File chip */}
              <FileChip filename={file.name} onRemove={handleReupload} />

              {/* Side-by-side: preview + extracted data */}
              <div className={styles.desktopUploadRow}>
                <div className={styles.previewZone}>{previewContent}</div>
                <ExtractedDataCard onEdit={handleEdit} />
              </div>
```

- [ ] **Step 7: Replace the inline sheet at the end of the component**

Replace:

```tsx
      {/* ── Upload back sheet modal — renders inline over this screen ────── */}
      {showUploadSheet && (
        <PassportUploadSheet
          side="back"
          onClose={() => setShowUploadSheet(false)}
          onProceed={() => router.push('/passportUpload/back')}
        />
      )}
```

with:

```tsx
      {/* ── Upload sheet — 'front' re-uploads in place, 'back' advances ──── */}
      {uploadSheet && (
        <PassportUploadSheet
          side={uploadSheet}
          onClose={() => setUploadSheet(null)}
          onProceed={handleSheetProceed}
        />
      )}
```

- [ ] **Step 8: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 9: Manual check — Front screen shows the upload**

Run `npm run dev`, walk `/passportUpload/details` → select type → **Upload
Passport Front** → pick an image → crop → **Proceed**.
- Expected: `/passportUpload/front` shows the cropped image and the real filename.
- **Re-upload** → sheet opens (front) → pick a new file → after Proceed the
  preview updates in place.
- Repeat with a PDF → the preview zone shows "PDF uploaded — preview not available".
- Hard-refresh `/passportUpload/front` → redirected to `/passportUpload/details`.

- [ ] **Step 10: Commit**

```bash
git add src/components/passport-upload/PassportFront.tsx src/components/passport-upload/passport-upload.module.scss
git commit -m "feat: show the real uploaded file on the passport front screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: Wire `PassportBack` to the store

Same as Task 4 for the back page. `PassportBack` has no `react` or
`PassportUploadSheet` import yet — add them.

**Files:**
- Modify: `src/components/passport-upload/PassportBack.tsx`

- [ ] **Step 1: Update imports**

Replace:

```tsx
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
```

with:

```tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
import PassportUploadSheet from './PassportUploadSheet';
import { passportStore, type PassportFile } from './passportStore';
```

- [ ] **Step 2: Remove the hard-coded preview image**

Delete these three lines:

```tsx
// ─── Passport back preview image ─────────────────────────────────────────────
// TODO: Replace with actual uploaded image in production
const PASSPORT_BACK_IMG = 'https://www.figma.com/api/mcp/asset/0093318a-7772-4a17-b639-81cc440b0933';
```

- [ ] **Step 3: Replace the component head (state, effect, handlers)**

Replace:

```tsx
export default function PassportBack() {
  const router = useRouter();

  const handleBack = () => router.back();
  const handleReupload = () => { /* TODO: trigger file picker */ };
  // TODO: Navigate to the correct next step (e.g. personalDetailsForm or planprocess)
  const handleProceed = () => router.push('/personalDetailsForm/1');
  const handleEdit = () => router.push('/passportUpload/back-edit');

  return (
```

with:

```tsx
export default function PassportBack() {
  const router = useRouter();
  const [file, setFile] = useState<PassportFile | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  // Load the uploaded back page from the store. A hard reload empties the
  // store, so there is nothing to preview — return to passport details.
  useEffect(() => {
    const f = passportStore.get('back');
    if (!f) {
      router.replace('/passportUpload/details');
      return;
    }
    setFile(f);
  }, [router]);

  const handleBack = () => router.back();
  const handleReupload = () => setShowSheet(true);
  // TODO: confirm the correct next step (e.g. personalDetailsForm or planprocess)
  const handleProceed = () => router.push('/personalDetailsForm/1');
  const handleEdit = () => router.push('/passportUpload/back-edit');

  if (!file) return null;

  const previewContent =
    file.type === 'application/pdf' ? (
      <p className={styles.pdfPreviewNote}>PDF uploaded — preview not available</p>
    ) : (
      <img src={file.objectUrl} alt="Passport back page" className={styles.previewImg} />
    );

  return (
```

- [ ] **Step 4: Use the real file in the mobile layout**

Replace:

```tsx
          {/* File chip */}
          <FileChip filename="Passportback.jpg" onRemove={handleReupload} />

          {/* Passport image preview zone */}
          <div className={styles.previewZone}>
            <img
              src={PASSPORT_BACK_IMG}
              alt="Passport back page"
              className={styles.previewImg}
              width={99}
              height={137}
            />
          </div>
```

with:

```tsx
          {/* File chip */}
          <FileChip filename={file.name} onRemove={handleReupload} />

          {/* Passport image preview zone */}
          <div className={styles.previewZone}>{previewContent}</div>
```

- [ ] **Step 5: Use the real file in the desktop layout**

Replace:

```tsx
              {/* File chip */}
              <FileChip filename="Passportback.jpg" onRemove={handleReupload} />

              {/* Side-by-side: preview + extracted data */}
              <div className={styles.desktopUploadRow}>
                <div className={styles.previewZone}>
                  <img
                    src={PASSPORT_BACK_IMG}
                    alt="Passport back page"
                    className={styles.previewImg}
                    width={99}
                    height={137}
                  />
                </div>
                <ExtractedDataCard onEdit={handleEdit} />
              </div>
```

with:

```tsx
              {/* File chip */}
              <FileChip filename={file.name} onRemove={handleReupload} />

              {/* Side-by-side: preview + extracted data */}
              <div className={styles.desktopUploadRow}>
                <div className={styles.previewZone}>{previewContent}</div>
                <ExtractedDataCard onEdit={handleEdit} />
              </div>
```

- [ ] **Step 6: Render the re-upload sheet before the closing fragment**

Find the final `</>` of the component's returned JSX and insert this block just
before it (after the desktop layout's closing `</div>`):

```tsx
      {/* ── Re-upload sheet — refreshes the preview in place ──────────────── */}
      {showSheet && (
        <PassportUploadSheet
          side="back"
          onClose={() => setShowSheet(false)}
          onProceed={() => {
            setFile(passportStore.get('back'));
            setShowSheet(false);
          }}
        />
      )}
```

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual check — full front→back flow**

Run `npm run dev`, walk the whole flow: details → front upload → crop → front
screen → **Upload Passport Back** → back upload → crop → `/passportUpload/back`
shows the real back image. Re-upload on the back screen updates it in place.
Hard-refresh `/passportUpload/back` → redirected to `/passportUpload/details`.

- [ ] **Step 9: Commit**

```bash
git add src/components/passport-upload/PassportBack.tsx
git commit -m "feat: show the real uploaded file on the passport back screen

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Wire the edit screens to the store

`PassportFrontEdit` and `PassportBackEdit` show a thumbnail of the uploaded
page. Replace the hard-coded image with the stored file. The editable fields
stay stubbed (no OCR backend — see the spec).

**Files:**
- Modify: `src/components/passport-upload/PassportFrontEdit.tsx`
- Modify: `src/components/passport-upload/PassportBackEdit.tsx`

- [ ] **Step 1: `PassportFrontEdit` — update imports**

Replace:

```tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
```

with:

```tsx
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
import { passportStore, type PassportFile } from './passportStore';
```

- [ ] **Step 2: `PassportFrontEdit` — remove the hard-coded image**

Delete these two lines:

```tsx
// ─── Passport front image (from Figma) ──────────────────────────────────────
const PASSPORT_FRONT_IMG = 'https://www.figma.com/api/mcp/asset/ce16443f-9026-4259-8592-68760de290f3';
```

- [ ] **Step 3: `PassportFrontEdit` — load the stored file**

Replace:

```tsx
export default function PassportFrontEdit() {
  const router = useRouter();
  const [fields, setFields] = useState(INITIAL_FIELDS);

  const handleBack = () => router.back();
```

with:

```tsx
export default function PassportFrontEdit() {
  const router = useRouter();
  const [fields, setFields] = useState(INITIAL_FIELDS);
  const [file, setFile] = useState<PassportFile | null>(null);

  // Load the uploaded front page; redirect to details if the store is empty
  // (e.g. after a hard reload).
  useEffect(() => {
    const f = passportStore.get('front');
    if (!f) {
      router.replace('/passportUpload/details');
      return;
    }
    setFile(f);
  }, [router]);

  const handleBack = () => router.back();
```

- [ ] **Step 4: `PassportFrontEdit` — guard render and build the thumbnail**

Find the line `  return (` that opens the component's JSX and insert directly
above it:

```tsx
  if (!file) return null;

  const thumb =
    file.type === 'application/pdf' ? (
      <p className={styles.pdfPreviewNote}>PDF uploaded — preview not available</p>
    ) : (
      <img src={file.objectUrl} alt="Passport front page" className={styles.editPreviewImg} />
    );

```

- [ ] **Step 5: `PassportFrontEdit` — use the thumbnail in both layouts**

Replace the mobile thumbnail:

```tsx
          {/* Passport front thumbnail */}
          <div className={styles.editImgWrapper}>
            <img
              src={PASSPORT_FRONT_IMG}
              alt="Passport front page"
              className={styles.editPreviewImg}
              width={100}
              height={137}
            />
          </div>
```

with:

```tsx
          {/* Passport front thumbnail */}
          <div className={styles.editImgWrapper}>{thumb}</div>
```

Replace the desktop thumbnail:

```tsx
                <div className={styles.desktopEditImgWrapper}>
                  <img
                    src={PASSPORT_FRONT_IMG}
                    alt="Passport front page"
                    className={styles.desktopEditPreviewImg}
                    width={100}
                    height={137}
                  />
                </div>
```

with:

```tsx
                <div className={styles.desktopEditImgWrapper}>{thumb}</div>
```

> Note: the desktop thumbnail now uses `.editPreviewImg` (via `thumb`) rather
> than `.desktopEditPreviewImg`. That is fine — the wrapper constrains size and
> `.editPreviewImg` should carry `max-width:100%;height:auto;`. If the desktop
> thumbnail looks wrong, add `max-width:100%;height:auto;display:block;` to
> `.editPreviewImg` in `passport-upload.module.scss`.

- [ ] **Step 6: `PassportBackEdit` — apply the same six changes**

Repeat Steps 1–5 for `src/components/passport-upload/PassportBackEdit.tsx` with
these substitutions:
- The image const to delete is:
  ```tsx
  // ─── Passport back image (from Figma) ───────────────────────────────────────
  const PASSPORT_BACK_IMG = 'https://www.figma.com/api/mcp/asset/267018a4-55a1-4b67-8188-35b4660c09ff';
  ```
- The component is `PassportBackEdit`.
- Load `passportStore.get('back')` instead of `'front'`.
- The `alt` text is `"Passport back page"`.
- The mobile thumbnail block to replace:
  ```tsx
          {/* Passport back thumbnail */}
          <div className={styles.editImgWrapper}>
            <img
              src={PASSPORT_BACK_IMG}
              alt="Passport back page"
              className={styles.editPreviewImg}
              width={99}
              height={137}
            />
          </div>
  ```
  becomes `<div className={styles.editImgWrapper}>{thumb}</div>`.
- The desktop thumbnail block to replace:
  ```tsx
                <div className={styles.desktopEditImgWrapper}>
                  <img
                    src={PASSPORT_BACK_IMG}
                    alt="Passport back page"
                    className={styles.desktopEditPreviewImg}
                    width={99}
                    height={137}
                  />
                </div>
  ```
  becomes `<div className={styles.desktopEditImgWrapper}>{thumb}</div>`.

- [ ] **Step 7: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 8: Manual check — edit screens show the upload**

Run `npm run dev`, walk to the front screen, press the **edit** (pencil) button →
`/passportUpload/front-edit` shows the uploaded front thumbnail. Same for the
back edit screen. Hard-refresh either edit screen → redirected to
`/passportUpload/details`.

- [ ] **Step 9: Commit**

```bash
git add src/components/passport-upload/PassportFrontEdit.tsx src/components/passport-upload/PassportBackEdit.tsx
git commit -m "feat: show the real uploaded file on the passport edit screens

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Clear the store on flow entry

When the user lands on `/passportUpload` they are starting the passport flow
fresh — drop any file left over from a previous run.

**Files:**
- Modify: `src/components/passport-upload/PassportUpload.tsx`

- [ ] **Step 1: Update imports**

Replace:

```tsx
'use client';

import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
```

with:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './passport-upload.module.scss';
import { passportStore } from './passportStore';
```

- [ ] **Step 2: Clear the store on mount**

Replace:

```tsx
export default function PassportUpload() {
  const router = useRouter();

  const handleBack = () => {
```

with:

```tsx
export default function PassportUpload() {
  const router = useRouter();

  // Entering the passport flow afresh — drop any file from a previous run.
  useEffect(() => {
    passportStore.clear();
  }, []);

  const handleBack = () => {
```

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/passport-upload/PassportUpload.tsx
git commit -m "feat: reset passportStore when entering the passport flow

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Final verification

No code changes — a whole-feature pass.

- [ ] **Step 1: Typecheck and lint**

Run: `npx tsc --noEmit 2>&1 | grep -E "passport-upload|image-cropper|upload-signature"`
Expected: **nothing** (the repo's ~61 pre-existing errors all live in other files).
Run: `npm run lint`
Expected: no new errors in `passport-upload/`, `image-cropper/`, or `upload-signature/`.

- [ ] **Step 2: No expired Figma URLs remain in the passport components**

Run: `git grep -n "figma.com/api/mcp/asset" -- src/components/passport-upload`
Expected: **no matches**.

- [ ] **Step 3: Full manual walk-through**

Run `npm run dev` and verify the complete flow on a mobile viewport:
1. `/passportUpload` → **Start Uploading** → `/passportUpload/details`.
2. Select a passport type → **Upload Passport Front** → sheet opens.
3. **Take a photo** and **Upload file** both open a real picker; the camera box
   offers the camera on a mobile device.
4. Pick an image → progress → crop modal → **Crop & Continue** → **Proceed** →
   `/passportUpload/front` shows the cropped image + filename.
5. **edit** → front-edit shows the thumbnail; **Re-upload** replaces the image.
6. **Upload Passport Back** → repeat → `/passportUpload/back` shows the back image.
7. A `> 5 MB` file and an unsupported type both raise a toast.
8. A PDF skips the crop step and shows the "preview not available" placeholder
   on the Front/Back/Edit screens.
9. Hard-refresh any of front / back / front-edit / back-edit → redirected to
   `/passportUpload/details`.
10. Go to `/uploadSignature` and confirm the signature upload + crop still work.

- [ ] **Step 4: Confirm the working tree is clean**

Run: `git status --short`
Expected: empty — every task has been committed.

---

## Self-review notes

- **Spec coverage:** §4.1 → Task 1; §4.2 → Task 2 + Task 7; §4.3 → Task 3; §4.4 →
  Tasks 4–5; §4.5 → Task 6; §4.6 → Task 3 (inline SVG icons retire the expired
  URLs); §5 validation → Task 3; §9 testing → adapted to typecheck/lint/manual
  per the user's decision.
- **Type consistency:** `PassportFile` / `PassportSide` are defined in Task 2 and
  imported unchanged in Tasks 3–7. `passportStore.set` takes
  `{ name, blob, type }` everywhere it is called (Task 3). `ImageCropperModal`'s
  `onConfirm(blob, size, name)` matches `onCropConfirm(blob, _size, name)` (Task 3)
  and the signature caller (Task 1).
- **Out of scope (unchanged):** OCR / extracted fields stay stubbed; no
  `secureSessionService` persistence; the sheet's bottom-sheet layout is preserved on
  all widths (`ImageCropperModal` is given `isDesktop={false}`).
