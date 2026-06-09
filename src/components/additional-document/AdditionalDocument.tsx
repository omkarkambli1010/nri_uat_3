'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { SignatureCropperModal } from '@/components/upload-signature/SignatureCropperModal';
import { additionalDocumentStore } from './additionalDocumentStore';
import styles from './additional-document.module.scss';

// AdditionalDocument — TRUE MODAL OVERLAY (not a page)
// Figma: desktop dialog 0:48996 (inside 0:48751)
//        mobile sheet   0:49036
//
// Upload-only flow (no preview in-modal):
//   choose    → real file/camera pickers + Skip
//   uploading → progress
//   error     → invalid file type or oversized — Try Again
//
// On successful upload + crop (or PDF complete) the file is persisted to
// `additionalDocumentStore` and `onProceed` is fired so the host can route to
// the dedicated preview page (/additional-document/preview).
//
// Props:
//   onClose   — close the modal (backdrop click, X button)
//   onProceed — upload completed → host routes to the preview page
//   onSkip    — user chose to skip this optional document

type DocState = 'choose' | 'uploading' | 'error';

const ACCEPTED_INPUT_HINT = 'image/*,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf';
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'pdf'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_LABEL = '5 MB';
const DESKTOP_MQ = '(min-width: 768px)';

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

// ── Icons ─────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M6 6L18 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function IconCamera() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"
        stroke="#280071" strokeWidth="1.5" strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3" stroke="#280071" strokeWidth="1.5" />
    </svg>
  );
}

function IconUploadCloud() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16.5 10.5h.5a4 4 0 0 1 0 8H6a4.5 4.5 0 0 1-1.1-8.86A6 6 0 0 1 16.4 9.5"
        stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M12 13v6" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 15.5L12 13l2.5 2.5" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13.333 7.333 7.667 13a3 3 0 0 1-4.241-4.243l5.83-5.83a2 2 0 0 1 2.83 2.83L6.4 11.643a1 1 0 0 1-1.414-1.414l5.057-5.057"
        stroke="#280071" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChipClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 4L4 12M4 4L12 12" stroke="#2b2b2b" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function IconError() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="#d32f2f" strokeWidth="1.4" />
      <path d="M8 4.5v4M8 10.5v1" stroke="#d32f2f" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface AdditionalDocumentProps {
  onClose: () => void;
  onProceed: () => void;
  onSkip?: () => void; // defaults to onProceed if not provided
  // Optional real upload. When provided, the finalized file (cropped image or
  // PDF) is sent through this before `onProceed` fires; a rejection surfaces the
  // error state instead of proceeding. When omitted the modal stays mock-only.
  uploadFn?: (file: File) => Promise<void>;
}

export default function AdditionalDocument({ onClose, onProceed, onSkip, uploadFn }: AdditionalDocumentProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [docState, setDocState] = useState<DocState>('choose');
  const [displayName, setDisplayName] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [isDesktop, setIsDesktop] = useState(false);

  // Transient cropper state. While `croppingObjectUrl` is set the upload card
  // hides and the cropper modal is the only thing visible to the user.
  const [croppingObjectUrl, setCroppingObjectUrl] = useState('');
  const [croppingName, setCroppingName] = useState('');

  const handleSkip = onSkip ?? onProceed;

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

  // Track viewport so the crop step renders as a desktop dialog above 768px.
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const revokeCropping = () => {
    if (croppingObjectUrl) URL.revokeObjectURL(croppingObjectUrl);
    setCroppingObjectUrl('');
    setCroppingName('');
  };

  const resetToChoose = () => {
    revokeCropping();
    setDisplayName('');
    setProgress(0);
    setUploading(false);
    setErrorMsg('');
    setDocState('choose');
  };

  // Finalize the picked/cropped file: persist to the store, run the optional
  // real upload, then hand off to the host. A failed upload surfaces the error
  // state instead of proceeding.
  const finalizeAndProceed = async (file: File, name: string, type: string) => {
    additionalDocumentStore.set({ name, blob: file, type });
    if (!uploadFn) {
      onProceed();
      return;
    }
    setDocState('uploading');
    setUploading(true);
    setProgress(100);
    setDisplayName(name);
    try {
      await uploadFn(file);
    } catch (e) {
      setUploading(false);
      setErrorMsg((e as Error)?.message || 'Upload failed. Please try again.');
      setDocState('error');
      return;
    }
    setUploading(false);
    onProceed();
  };

  const startUpload = (f: File) => {
    if (!isAcceptedFile(f)) {
      setDisplayName(f.name);
      setErrorMsg('Unsupported file type. Please upload an image or PDF.');
      setDocState('error');
      return;
    }
    if (f.size > MAX_BYTES) {
      setDisplayName(f.name);
      setErrorMsg(`File too large. Max size ${MAX_LABEL}.`);
      setDocState('error');
      return;
    }

    revokeCropping();
    setErrorMsg('');

    const pdf = isPdf(f);
    setDisplayName(f.name);
    setDocState('uploading');
    setUploading(true);
    setProgress(0);

    // Randomised progress curve — visual continuity with the other upload flows.
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
        // PDFs skip the cropper — persist, run the optional real upload, hand off.
        void finalizeAndProceed(f, f.name, 'application/pdf');
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
    const file = new File([blob], name, { type: 'image/png' });
    // Persist + run the optional real upload, then hand off to the host.
    void finalizeAndProceed(file, name, 'image/png');
  };

  const onCropCancel = () => {
    resetToChoose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const showUploadFrame = !croppingObjectUrl;

  return (
    <>
      {showUploadFrame && (
        <div
          className={styles.overlay}
          role="dialog"
          aria-modal="true"
          aria-label="Upload Additional Document"
          onClick={handleBackdropClick}
        >
          <div className={styles.sheet}>

            {/* Hidden inputs — the icon boxes below trigger these. */}
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

            {/* ── Drag handle — mobile only ─────────────────────────────────── */}
            <div className={styles.handleRow}>
              <div className={styles.handleImg} aria-hidden="true" />
            </div>

            {/* ── Title + close ─────────────────────────────────────────────── */}
            <div className={styles.titleRow}>
              <p className={styles.title}>Upload Additional Document</p>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                aria-label="Close"
              >
                <IconClose />
              </button>
            </div>

            {/* ── Subtitle with (Optional) ────────────────────────────────────── */}
            <p className={styles.subtitle}>
              Requiring English translated copy for non‑English documents
              <span className={styles.subtitleOptional}> (Optional)</span>
            </p>

            {/* ── Choose state ─────────────────────────────────────────────────── */}
            {docState === 'choose' && (
              <>
                {/* Mobile: two 80×80 boxes — camera + upload (Figma: 0:49068) */}
                <div className={styles.iconRowMobile}>
                  <button
                    type="button"
                    className={styles.iconBox}
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Take photo with camera"
                  >
                    <IconCamera />
                  </button>
                  <button
                    type="button"
                    className={styles.iconBox}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload from files"
                  >
                    <IconUploadCloud />
                  </button>
                </div>

                {/* Desktop: single 80×80 upload box (Figma: 0:49012) */}
                <div className={styles.iconBoxDesktopWrap}>
                  <button
                    type="button"
                    className={styles.iconBox}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload from files"
                  >
                    <IconUploadCloud />
                  </button>
                </div>
              </>
            )}

            {/* ── Uploading state ──────────────────────────────────────────────── */}
            {docState === 'uploading' && (
              <>
                <div className={styles.uploadingIconRow}>
                  <div className={styles.uploadingIconBox}>
                    <IconUploadCloud />
                  </div>
                </div>

                <div>
                  <div className={styles.fileChip}>
                    <IconFile />
                    <span className={styles.fileChipName}>{displayName}</span>
                    <button
                      type="button"
                      className={styles.fileChipRemove}
                      onClick={resetToChoose}
                      aria-label="Cancel upload"
                    >
                      <IconChipClose />
                    </button>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>
              </>
            )}

            {/* ── Error state ──────────────────────────────────────────────────── */}
            {docState === 'error' && (
              <>
                <div className={`${styles.fileChip} ${styles.fileChipError}`}>
                  <IconError />
                  <span className={styles.fileChipName}>{displayName}</span>
                  <button
                    type="button"
                    className={styles.fileChipRemove}
                    onClick={resetToChoose}
                    aria-label="Remove file"
                  >
                    <IconChipClose />
                  </button>
                </div>
                <p className={styles.errorMsg}>
                  {errorMsg || 'Upload failed. File may be too large or in an unsupported format.'}
                </p>
              </>
            )}

            {/* ── Disclaimers — always visible ──────────────────────────────────── */}
            <div className={styles.disclaimerBlock}>
              <p className={styles.disclaimerLine}>Files supported: JPG, PNG &amp; PDF</p>
              <p className={styles.disclaimerLine}>Maximum size less than {MAX_LABEL}</p>
              <p className={styles.disclaimerLine}>
                Please ensure that you don&apos;t upload password protected documents
              </p>
            </div>

            {/* ── Buttons ───────────────────────────────────────────────────────── */}
            <div className={styles.buttonBlock}>
              {/* Choose state: full-width Skip button */}
              {docState === 'choose' && (
                <button type="button" className={styles.primaryBtn} onClick={handleSkip}>
                  Skip
                </button>
              )}

              {/* Uploading: Reupload (cancels) — the cropper or PDF finish
                  fires onProceed and routes the host to the preview page. */}
              {docState === 'uploading' && (
                <div className={styles.buttonRow}>
                  <button
                    type="button"
                    className={styles.reuploadRowBtn}
                    onClick={resetToChoose}
                    disabled={uploading}
                  >
                    Reupload
                  </button>
                </div>
              )}

              {/* Error: Try Again full-width */}
              {docState === 'error' && (
                <button type="button" className={styles.outlineBtn} onClick={resetToChoose}>
                  Try Again
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Crop step — reuses the signature flow's cropper for images only. */}
      <SignatureCropperModal
        open={!!croppingObjectUrl}
        isDesktop={isDesktop}
        src={croppingObjectUrl}
        fileName={croppingName}
        title="Crop your document"
        subtitle="Adjust the box around your document."
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
