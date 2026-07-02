'use client';

import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { toast } from '@/services/toast.service';
import { SignatureCropperModal } from '@/components/upload-signature/SignatureCropperModal';
import { CameraCaptureModal } from '@/components/camera-capture/CameraCaptureModal';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { convertHeicToJpeg } from '@/components/file-upload/fileUpload.utils';
import styles from './upload-document-modal.module.scss';

// UploadDocumentModal — desktop modal / mobile bottom-sheet for picking a
// supporting document (Aadhaar, PAN, Driving license, Passport).
//
// Mirrors the SignatureUploadModal flow: pick file → fake progress → for
// images the modal frame hides and the cropper opens; for PDFs the
// filename row + Proceed appears. Image cropping is delegated to the
// shared SignatureCropperModal.

export interface UploadedDocument {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

export interface UploadDocumentModalProps {
  open: boolean;
  isDesktop: boolean;
  docLabel: string;          // e.g. "PAN Card" — used in the modal title
  onClose: () => void;
  onUploaded: (file: UploadedDocument) => void;
}

const ACCEPTED_INPUT_HINT = 'image/*,application/pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.pdf';
const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'heic', 'heif', 'webp', 'pdf'];
const MAX_BYTES = 4 * 1024 * 1024;
const ACCEPT_LABEL = 'JPG, PNG & PDF';
const MAX_LABEL = '4 MB';

function isAcceptedFile(f: File): boolean {
  if (f.type) {
    if (f.type === 'application/pdf') return true;
    if (f.type.startsWith('image/')) return true;
  }
  const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.includes(ext);
}

function isPdf(f: File): boolean {
  if (f.type === 'application/pdf') return true;
  return f.name.toLowerCase().endsWith('.pdf');
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UploadCloudIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M16.5 10.5h.5a4 4 0 0 1 0 8H6a4.5 4.5 0 0 1-1.1-8.86A6 6 0 0 1 16.4 9.5"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 13v6" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9.5 15.5L12 13l2.5 2.5" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8.5h3l1.5-2h7L17 8.5h3a1 1 0 0 1 1 1V18a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13.5" r="3" stroke="#280071" strokeWidth="1.5" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 5.5L6.7 10.3a1.5 1.5 0 0 0 2.1 2.1l5-5a3 3 0 0 0-4.2-4.2l-5.3 5.3a4.5 4.5 0 0 0 6.4 6.4l4.6-4.6"
        stroke="#280071"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallXIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 4L12 12" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 4L4 12" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

interface PickedFile {
  name: string;
  type: string;
  size: number;
}

export function UploadDocumentModal({
  open,
  isDesktop,
  docLabel,
  onClose,
  onUploaded,
}: UploadDocumentModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  // Touch devices use the native <input capture> camera; laptop/desktop use the
  // in-page getUserMedia camera (with file-upload fallback when none exists).
  const [useNativeCamera, setUseNativeCamera] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: coarse)');
    const update = () => setUseNativeCamera(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const [picked, setPicked] = useState<PickedFile | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [resultObjectUrl, setResultObjectUrl] = useState<string>('');

  const [croppingObjectUrl, setCroppingObjectUrl] = useState<string>('');
  const [croppingName, setCroppingName] = useState<string>('');

  const [progress, setProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  const revokeAndClearResult = () => {
    if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
    setResultBlob(null);
    setResultObjectUrl('');
  };

  const revokeAndClearCropping = () => {
    if (croppingObjectUrl) URL.revokeObjectURL(croppingObjectUrl);
    setCroppingObjectUrl('');
    setCroppingName('');
  };

  useEffect(() => {
    if (!open) {
      setPicked(null);
      setProgress(0);
      setUploading(false);
      revokeAndClearResult();
      revokeAndClearCropping();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    return () => {
      if (resultObjectUrl) URL.revokeObjectURL(resultObjectUrl);
      if (croppingObjectUrl) URL.revokeObjectURL(croppingObjectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Nested cropper/camera modals manage their own trap via the shared stack.
  // Declared before the early return so the hook order stays stable.
  const dialogRef = useFocusTrap<HTMLDivElement>(open && !croppingObjectUrl, onClose);

  if (!open) return null;

  const validate = (f: File) => {
    if (!isAcceptedFile(f)) {
      toast.error('Unsupported file type. Please upload an image or PDF.');
      return false;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`File too large. Max size ${MAX_LABEL}.`);
      return false;
    }
    return true;
  };

  const resetForReupload = () => {
    setPicked(null);
    setProgress(0);
    setUploading(false);
    revokeAndClearResult();
    revokeAndClearCropping();
  };

  const startUpload = (f: File) => {
    if (!validate(f)) return;
    revokeAndClearResult();
    revokeAndClearCropping();

    setPicked({ name: f.name, type: f.type || (isPdf(f) ? 'application/pdf' : ''), size: f.size });
    setUploading(true);
    setProgress(0);

    const pdf = isPdf(f);
    const sourceObjectUrl = URL.createObjectURL(f);

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
        setResultBlob(f);
        setResultObjectUrl(sourceObjectUrl);
      } else {
        setCroppingObjectUrl(sourceObjectUrl);
        setCroppingName(f.name);
      }
    };

    window.setTimeout(step, 80);
  };

  const onFilePicked = async (e: ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    // HEIC/HEIF → PNG so the cropper can render it (no-op for other files).
    try {
      startUpload(await convertHeicToJpeg(f));
    } catch {
      toast.error('Could not read this HEIC image. Please try a JPG or PNG.');
    }
  };

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const reupload = () => {
    resetForReupload();
    fileInputRef.current?.click();
  };

  const proceed = () => {
    if (!picked || !resultBlob || !resultObjectUrl) return;
    const out: UploadedDocument = {
      name: picked.name,
      blob: resultBlob,
      objectUrl: resultObjectUrl,
      type: picked.type || resultBlob.type,
      size: resultBlob.size,
    };
    setResultBlob(null);
    setResultObjectUrl('');
    onUploaded(out);
  };

  const onCropConfirm = (blob: Blob, size: number, name: string) => {
    revokeAndClearResult();
    revokeAndClearCropping();
    const url = URL.createObjectURL(blob);
    setPicked(null);
    setProgress(0);
    setUploading(false);
    onUploaded({
      name,
      blob,
      objectUrl: url,
      type: 'image/png',
      size,
    });
  };

  const onCropCancel = () => {
    resetForReupload();
  };

  const cardClass = isDesktop ? styles.deskCard : styles.mobSheet;
  const showFileRow = !!picked;
  const showUploadFrame = !croppingObjectUrl;

  const emptyTitle = isDesktop ? `Upload ${docLabel}` : `Upload your ${docLabel}`;

  return (
    <>
      {showUploadFrame && (
      <div
        ref={dialogRef}
        className={isDesktop ? styles.overlay : styles.overlayMob}
        role="dialog"
        aria-modal="true"
        aria-label="Upload document"
        tabIndex={-1}
        onClick={onOverlayClick}
      >
        <div className={cardClass} onClick={(e) => e.stopPropagation()}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_INPUT_HINT}
            onChange={onFilePicked}
            onClick={(e) => e.stopPropagation()}
            className={styles.hiddenInput}
            aria-hidden="true"
            tabIndex={-1}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFilePicked}
            onClick={(e) => e.stopPropagation()}
            className={styles.hiddenInput}
            aria-hidden="true"
            tabIndex={-1}
          />
          {!isDesktop && <div className={styles.dashHandle} aria-hidden="true" />}

          {showFileRow ? (
            <div className={styles.headerUploading}>
              <div className={styles.smallUploadIcon}>
                <UploadCloudIcon size={20} />
              </div>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <XIcon />
              </button>
            </div>
          ) : (
            <div className={styles.headerEmpty}>
              <h2 className={styles.modalTitle}>{emptyTitle}</h2>
              <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close">
                <XIcon />
              </button>
            </div>
          )}

          {showFileRow ? (
            <div className={styles.uploadingTitleBlock}>
              <p className={styles.modalTitleAlt}>{emptyTitle}</p>
              <p className={styles.modalSubtitle}>Upload a clear photo or scan of your document</p>
            </div>
          ) : (
            <p className={styles.modalSubtitle}>Upload a clear photo or scan of your document</p>
          )}

          {showFileRow ? (
            <div className={styles.fileRow}>
              <div className={styles.fileRowTop}>
                <div className={styles.fileMeta}>
                  <PaperclipIcon />
                  <span className={styles.fileName} title={picked!.name}>{picked!.name}</span>
                </div>
                <button
                  type="button"
                  className={styles.fileRemoveBtn}
                  onClick={reupload}
                  aria-label="Remove file"
                >
                  <SmallXIcon />
                </button>
              </div>
              <div className={styles.progressTrack}>
                <div className={styles.progressFill} style={{ width: `${progress}%` }} />
              </div>
            </div>
          ) : (
            <div className={styles.tileRow}>
              <button
                type="button"
                className={styles.uploadTileWrap}
                onClick={() => {
                  if (useNativeCamera) {
                    cameraInputRef.current?.click();
                  } else {
                    setCameraOpen(true);
                  }
                }}
                aria-label="Take a photo"
              >
                <span className={styles.uploadTile}>
                  <CameraIcon />
                </span>
                <span className={styles.tileLabel}>Take a photo</span>
              </button>
              <button
                type="button"
                className={styles.uploadTileWrap}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Choose a file"
              >
                <span className={styles.uploadTile}>
                  <UploadCloudIcon />
                </span>
                <span className={styles.tileLabel}>Upload file</span>
              </button>
            </div>
          )}

          <div className={styles.infoBlock}>
            <p className={styles.infoLine}>Files supported: {ACCEPT_LABEL}</p>
            <p className={styles.infoLine}>Maximum size less than {MAX_LABEL}</p>
            {!isDesktop && (
              <p className={styles.infoLine}>
                Please ensure that you don&apos;t upload password protected documents
              </p>
            )}
          </div>

          {showFileRow && (
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.btnOutlineMuted}
                onClick={reupload}
                disabled={uploading}
              >
                Reupload
              </button>
              <button
                type="button"
                className={styles.btnFilledMuted}
                onClick={proceed}
                disabled={uploading || !resultBlob}
              >
                Proceed
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      <SignatureCropperModal
        open={!!croppingObjectUrl}
        isDesktop={isDesktop}
        src={croppingObjectUrl}
        fileName={croppingName}
        onCancel={onCropCancel}
        onConfirm={onCropConfirm}
      />

      {/* Laptop/desktop camera capture (getUserMedia). */}
      <CameraCaptureModal
        open={cameraOpen}
        fileName="document"
        onCapture={(file) => startUpload(file)}
        onClose={() => setCameraOpen(false)}
        onUploadInstead={() => fileInputRef.current?.click()}
      />
    </>
  );
}
