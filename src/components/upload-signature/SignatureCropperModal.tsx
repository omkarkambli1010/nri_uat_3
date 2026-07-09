'use client';

import { SyntheticEvent, useCallback, useEffect, useRef, useState } from 'react';
import ReactCrop, { type Crop, type PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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

// ── Image rotation (disabled) ────────────────────────────────────────────────
// The rotate-left / rotate-right controls were removed from the cropper because
// the button row was misaligned. The implementation is kept here, commented
// out, so it can be re-enabled in future. To restore, uncomment this block plus
// the matching rotation state/effects, handlers and the `.rotateRow` JSX below,
// swap the cropper's `src` back to `displaySrc`, and restore the `.rotateRow` /
// `.rotateBtn` styles in signature-cropper-modal.module.scss.
//
// function RotateLeftIcon() {
//   return (
//     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M4 4v6h6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//       <path d="M4.5 10a8 8 0 1 1-1.3 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }
//
// function RotateRightIcon() {
//   return (
//     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
//       <path d="M20 4v6h-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//       <path d="M19.5 10a8 8 0 1 0 1.3 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
//     </svg>
//   );
// }
//
// Renders the source image rotated by `deg` (a multiple of 90) onto a canvas and
// returns it as a data URL, so the cropper always works on an already-upright
// image and the crop coordinates + exported blob both include the rotation.
// function rotateImageToDataUrl(src: string, deg: number): Promise<string> {
//   return new Promise((resolve, reject) => {
//     const image = new Image();
//     image.crossOrigin = 'anonymous';
//     image.onload = () => {
//       const w = image.naturalWidth;
//       const h = image.naturalHeight;
//       const swap = Math.abs(deg % 180) === 90;
//       const canvas = document.createElement('canvas');
//       canvas.width = swap ? h : w;
//       canvas.height = swap ? w : h;
//       const ctx = canvas.getContext('2d');
//       if (!ctx) {
//         reject(new Error('No 2D context'));
//         return;
//       }
//       ctx.translate(canvas.width / 2, canvas.height / 2);
//       ctx.rotate((deg * Math.PI) / 180);
//       ctx.drawImage(image, -w / 2, -h / 2);
//       resolve(canvas.toDataURL('image/png'));
//     };
//     image.onerror = () => reject(new Error('Image load failed'));
//     image.src = src;
//   });
// }

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
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onCancel);
  const [crop, setCrop] = useState<Crop | undefined>(undefined);
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  // Rotation applied to the image, in degrees (0/90/180/270). Disabled — kept
  // commented for future re-enabling (see the "Image rotation (disabled)" block
  // above).
  // const [rotation, setRotation] = useState(0);
  // Only non-zero rotations are baked into a data URL and held here. The 0° case
  // is derived straight from `src` during render (see `displaySrc`), so the
  // image never briefly renders an empty src while this effect settles.
  // const [rotatedSrc, setRotatedSrc] = useState('');

  useEffect(() => {
    if (!open) {
      setCrop(undefined);
      setCompletedCrop(undefined);
      setExporting(false);
      // setRotation(0);
      // setRotatedSrc('');
    }
  }, [open]);

  // Bake a non-zero rotation into a data URL so both the crop selection and the
  // exported blob reflect it. Changing the shown src reloads the <img>, which
  // reseeds the crop. Disabled — see the rotation block above.
  // useEffect(() => {
  //   if (!open || rotation % 360 === 0) {
  //     setRotatedSrc('');
  //     return;
  //   }
  //   let cancelled = false;
  //   rotateImageToDataUrl(src, rotation)
  //     .then((url) => { if (!cancelled) setRotatedSrc(url); })
  //     .catch(() => { if (!cancelled) setRotatedSrc(''); });
  //   return () => { cancelled = true; };
  // }, [open, src, rotation]);

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

  // Rotation handlers — disabled (kept for future re-enabling).
  // const rotateLeft = () => setRotation((r) => (r + 270) % 360);
  // const rotateRight = () => setRotation((r) => (r + 90) % 360);

  if (!open) return null;

  // At 0° use the original src directly; otherwise the rotated data URL once
  // it's ready (falling back to the original while it's being generated).
  // Disabled — the cropper renders `src` directly while rotation is off.
  // const displaySrc = rotation % 360 === 0 ? src : rotatedSrc || src;

  const cardClass = isDesktop ? styles.deskCard : styles.mobSheet;
  const overlayClass = isDesktop ? styles.overlay : styles.overlayMob;
  const canConfirm =
    !!completedCrop && completedCrop.width > 0 && completedCrop.height > 0 && !exporting;

  return (
    <div
      ref={dialogRef}
      className={overlayClass}
      role="dialog"
      aria-modal="true"
      aria-label="Crop signature"
      tabIndex={-1}
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

        {/* Rotation controls — disabled (kept for future re-enabling). To
            restore, uncomment this block and swap `src` back to `displaySrc`
            on the <img> below. */}
        {/*
        <div className={styles.rotateRow}>
          <button
            type="button"
            className={styles.rotateBtn}
            onClick={rotateLeft}
            disabled={exporting}
            aria-label="Rotate left"
          >
            <RotateLeftIcon />
          </button>
          <button
            type="button"
            className={styles.rotateBtn}
            onClick={rotateRight}
            disabled={exporting}
            aria-label="Rotate right"
          >
            <RotateRightIcon />
          </button>
        </div>
        */}

        <div className={styles.cropArea}>
          {src && (
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
                alt="Image to crop"
                onLoad={onImageLoad}
                className={styles.cropImage}
                crossOrigin="anonymous"
              />
            </ReactCrop>
          )}
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
            {exporting ? 'Processing' : 'Crop & Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
