'use client';

import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import styles from './signature-cropper-modal.module.scss';

// SignatureCropperModal — opens on top of SignatureUploadModal once the
// picked image has loaded. Free aspect ratio, PNG Blob output, Cancel (X)
// returns the upload modal to its empty state.

export interface SignatureCropperModalProps {
  open: boolean;
  isDesktop: boolean;
  src: string;
  fileName: string;
  /** Modal heading — defaults to the signature wording. */
  title?: string;
  /** Modal sub-heading — defaults to the signature wording. */
  subtitle?: string;
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

function swapToPng(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return `${name}.png`;
  return `${name.slice(0, dot)}.png`;
}

export function SignatureCropperModal({
  open,
  isDesktop,
  src,
  fileName,
  title = 'Crop your signature',
  subtitle = 'Adjust the box around your signature.',
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
    canvas.toBlob((blob) => {
      if (!blob) {
        setExporting(false);
        return;
      }
      onConfirm(blob, blob.size, swapToPng(fileName));
    }, 'image/png');
  }, [completedCrop, fileName, onConfirm]);

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
