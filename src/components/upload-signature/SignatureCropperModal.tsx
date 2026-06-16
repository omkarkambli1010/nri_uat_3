'use client';

import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './signature-cropper-modal.module.scss';

export interface SignatureCropperModalProps {
  open: boolean;
  isDesktop: boolean;
  src: string;
  fileName: string;
  /** Modal heading — defaults to the signature wording. */
  title?: string;
  /** Modal sub-heading — defaults to the signature wording. */
  subtitle?: string;
  /**
   * MIME type for the exported blob. Defaults to 'image/png'. The output
   * filename's extension is updated to match this type.
   */
  outputType?: string;
  /** Quality (0–1) for lossy formats like image/jpeg or image/webp. */
  outputQuality?: number;
  onCancel: () => void;
  onConfirm: (croppedBlob: Blob, croppedSize: number, croppedName: string) => void;
}

function XIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6L18 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// Maps an output MIME type to its file extension. Falls back to 'png' for
// unrecognised types.
function extensionForType(type: string): string {
  switch (type) {
    case 'image/jpeg':
    case 'image/jpg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/png':
    default:
      return 'png';
  }
}

// Swaps (or appends) the filename's extension to match the given output type.
function swapExtension(name: string, type: string): string {
  const ext = extensionForType(type);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}.${ext}`;
  return `${name.slice(0, dot)}.${ext}`;
}

export function SignatureCropperModal({
  open,
  isDesktop,
  src,
  fileName,
  title = 'Crop your signature',
  subtitle = 'Adjust the box around your signature.',
  outputType = 'image/png',
  outputQuality = 0.92,
  onCancel,
  onConfirm,
}: SignatureCropperModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!open) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setExporting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const onImageLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop({ unit: '%', x: 10, y: 10, width: 80, height: 80 });
    // Seed completedCrop with pixel values so the Confirm button is enabled
    // immediately after the image renders.
    setCompletedCrop({
      unit: 'px',
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.1),
      width: Math.round(width * 0.8),
      height: Math.round(height * 0.8),
    });
  };

  const confirmCrop = useCallback(() => {
    const img = imgRef.current;
    const c = completedCrop;
    if (!img || !c || c.width <= 0 || c.height <= 0) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(c.width * scaleX));
    canvas.height = Math.max(1, Math.floor(c.height * scaleY));
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // JPEG (and other formats without an alpha channel) would otherwise
    // render transparent areas as black. Flatten onto white first.
    if (outputType === 'image/jpeg' || outputType === 'image/jpg') {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(
      img,
      c.x * scaleX,
      c.y * scaleY,
      c.width * scaleX,
      c.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    setExporting(true);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setExporting(false);
          return;
        }
        onConfirm(blob, blob.size, swapExtension(fileName, outputType));
      },
      outputType,
      outputQuality,
    );
  }, [completedCrop, fileName, onConfirm, outputType, outputQuality]);

  if (!open) return null;

  const cardClass = isDesktop ? styles.deskCard : styles.mobSheet;
  const overlayClass = isDesktop ? styles.overlay : styles.overlayMob;
  const canConfirm =
    !!completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && !exporting;

  return (
    <div
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-label="Crop signature"
      onClick={(e) => e.stopPropagation()}
    >
      <div className={cardClass} onClick={(e) => e.stopPropagation()}>
        {!isDesktop && <div className={styles.dashHandle} aria-hidden="true" />}

        <div className={styles.header}>
          <div>
            <p className={styles.title}>{title}</p>
            <p className={styles.subtitle}>{subtitle}</p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onCancel}
            aria-label="Cancel cropping"
          >
            <XIcon />
          </button>
        </div>

        <div className={styles.cropArea}>
          <ReactCrop
            crop={crop}
            onChange={(_, percentCrop) => setCrop(percentCrop)}
            onComplete={(c) => setCompletedCrop(c)}
            keepSelection
            minWidth={20}
            minHeight={20}
          >
            <img
              ref={imgRef}
              src={src}
              alt="Signature to crop"
              onLoad={onImageLoad}
              className={styles.cropImage}
              crossOrigin="anonymous"
            />
          </ReactCrop>
        </div>

        <div className={styles.actionRow}>
          <button type="button" className={styles.btnOutlineMuted} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnFilled}
            onClick={confirmCrop}
            disabled={!canConfirm}
          >
            {exporting ? 'Processing…' : 'Crop & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
