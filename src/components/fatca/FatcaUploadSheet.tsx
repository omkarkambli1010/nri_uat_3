'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/services/toast.service';
import { SignatureCropperModal } from '@/components/upload-signature/SignatureCropperModal';
import { fatcaStore } from './fatcaStore';
import styles from './fatca.module.scss';

// FatcaUploadSheet — bottom-sheet for picking the TIN document.
// Real file/camera pick → validation → progress → crop step (images only; PDFs
// skip it) → persist to fatcaStore and advance. Mirrors OciUploadSheet.
//
// Props:
//   onClose   — called when user taps dim area or X
//   onProceed — called once the document is stored (after crop / PDF upload)

type SheetState = 'choose' | 'uploading';

interface FatcaUploadSheetProps {
  onClose?: () => void;
  onProceed?: () => void;
}

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

// ─── Inline SVG icons ────────────────────────────────────────────────────────

function CloseIcon({ size = 24, color = '#2b2b2b' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6L6 18M6 6l12 12" stroke={color} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="26" height="24" viewBox="0 0 26 24" fill="none" aria-hidden="true">
      <path d="M2 7.5A2.5 2.5 0 0 1 4.5 5H7l1.4-2h9.2L19 5h2.5A2.5 2.5 0 0 1 24 7.5v10A2.5 2.5 0 0 1 21.5 20h-17A2.5 2.5 0 0 1 2 17.5v-10Z" stroke="#280071" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="13" cy="12.5" r="4" stroke="#280071" strokeWidth="1.5" />
    </svg>
  );
}

function UploadCloudIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M16.5 10.5h.5a4 4 0 0 1 0 8H6a4.5 4.5 0 0 1-1.1-8.86A6 6 0 0 1 16.4 9.5" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v6M12 13l-2.5 2.5M12 13l2.5 2.5" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 1.5h5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1Z" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 1.5V6h4" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

export default function FatcaUploadSheet({ onClose, onProceed }: FatcaUploadSheetProps) {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  // Cropper layout switch — desktop renders a centred dialog, mobile a
  // bottom-sheet. Resolved client-side via matchMedia.
  const [isDesktop, setIsDesktop] = useState(false);

  const [sheetState, setSheetState] = useState<SheetState>('choose');
  const [displayName, setDisplayName] = useState('');
  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Cropper state — when set the cropper opens and the sheet frame hides.
  const [croppingObjectUrl, setCroppingObjectUrl] = useState('');
  const [croppingName, setCroppingName] = useState('');

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

  // Track viewport so the crop step matches the sheet's 768px dialog breakpoint.
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
    setSheetState('choose');
  };

  const handleClose = () => {
    if (onClose) onClose();
    else router.back();
  };

  const advance = () => {
    if (onProceed) onProceed();
    else router.push('/fatca/document');
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

    const pdf = isPdf(f);
    setDisplayName(f.name);
    setSheetState('uploading');
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
        // PDFs skip the cropper — persist and advance straight to the preview.
        fatcaStore.set({ name: f.name, blob: f, type: 'application/pdf' });
        advance();
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
    fatcaStore.set({ name, blob, type: 'image/png' });
    advance();
  };

  const onCropCancel = () => {
    resetToChoose();
  };

  const showUploadFrame = !croppingObjectUrl;

  return (
    <>
      {showUploadFrame && (
        <div
          className={styles.sheetOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Upload TIN Document"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
        >
          <div className={styles.sheetCard}>
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

            {/* Drag handle */}
            <div className={styles.sheetHandleRow}>
              <div className={styles.sheetHandle} />
            </div>

            {sheetState === 'choose' ? (
              <>
                {/* Title + close */}
                <div className={styles.sheetTitleRow}>
                  <p className={styles.sheetTitle}>Upload TIN Document</p>
                  <button type="button" className={styles.sheetCloseBtn} onClick={handleClose} aria-label="Close">
                    <CloseIcon />
                  </button>
                </div>

                {/* Camera + Upload icon boxes — open the real camera / file pickers */}
                <div className={styles.sheetIconRow}>
                  <button
                    type="button"
                    className={styles.sheetIconBox}
                    onClick={() => cameraInputRef.current?.click()}
                    aria-label="Take photo with camera"
                  >
                    <CameraIcon />
                  </button>
                  <button
                    type="button"
                    className={styles.sheetIconBox}
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Upload from files"
                  >
                    <UploadCloudIcon />
                  </button>
                </div>

                {/* Disclaimer */}
                <div className={styles.sheetDisclaimerBlock}>
                  <p className={styles.sheetDisclaimerLine}>Files supported: JPG, PNG &amp; PDF</p>
                  <p className={styles.sheetDisclaimerLine}>Maximum size less than {MAX_LABEL}</p>
                  <p className={styles.sheetDisclaimerLine}>
                    Please ensure that you don&apos;t upload password protected documents
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Centered title (uploading state) */}
                <p className={styles.sheetTitleCenter}>Upload TIN Document</p>

                {/* File chip + progress bar — auto-advances when finish() routes */}
                <div className={styles.sheetProgressBlock}>
                  <div className={styles.fileChip}>
                    <FileIcon />
                    <span className={styles.fileChipName}>{displayName}</span>
                  </div>
                  <div className={styles.progressTrack}>
                    <div
                      className={styles.progressFill}
                      style={{ width: `${progress}%`, transition: 'width 0.3s ease' }}
                    />
                  </div>
                </div>

                {/* Reupload only — the sheet auto-advances after crop confirm
                    (images) or upload completion (PDFs). */}
                <div className={styles.sheetButtonRow}>
                  <button
                    type="button"
                    className={styles.reuploadBtn}
                    onClick={resetToChoose}
                    disabled={uploading}
                  >
                    Reupload
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Crop step — reuses the signature flow's cropper. */}
      <SignatureCropperModal
        open={!!croppingObjectUrl}
        isDesktop={isDesktop}
        src={croppingObjectUrl}
        fileName={croppingName}
        title="Crop your TIN document"
        subtitle="Adjust the box around your document."
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />
    </>
  );
}
