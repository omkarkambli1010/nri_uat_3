"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import styles from "./camera-capture.module.scss";

interface CameraCaptureModalProps {
  open: boolean;
  /** Receives the captured photo as a File (image/jpeg). */
  onCapture: (file: File) => void;
  /** Close the modal (cancel, or after a successful capture). */
  onClose: () => void;
  /**
   * Fallback to plain file upload — invoked when the user has no usable camera
   * (or denies permission) and chooses "Upload a file instead". Triggered from a
   * real click so the caller can safely open a file dialog.
   */
  onUploadInstead?: () => void;
  /** Base name for the produced file (extension added automatically). */
  fileName?: string;
}

// Desktop/laptop camera capture via getUserMedia. Mobile keeps the native
// <input capture> flow (better UX), so this modal targets pointer-fine devices
// where the `capture` attribute is ignored by browsers.
export function CameraCaptureModal({
  open,
  onCapture,
  onClose,
  onUploadInstead,
  fileName = "photo",
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(open, onClose);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setReady(false);
    setUnavailable(false);

    const stop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setUnavailable(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        // No camera, permission denied, or unsupported → offer file upload.
        setUnavailable(true);
      }
    };

    start();

    return () => {
      cancelled = true;
      stop();
    };
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCapture(
            new File([blob], `${fileName}-${Date.now()}.jpg`, {
              type: "image/jpeg",
            }),
          );
        }
        onClose();
      },
      "image/jpeg",
      0.92,
    );
  };

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label="Take a photo"
      tabIndex={-1}
    >
      <div className={styles.panel}>
        {unavailable ? (
          <div className={styles.message}>
            <p className={styles.messageTitle}>No camera available</p>
            <p className={styles.messageText}>
              We couldn&apos;t access a camera on this device. You can upload a
              file instead.
            </p>
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              {onUploadInstead && (
                <button
                  type="button"
                  className={styles.captureBtn}
                  onClick={() => {
                    onClose();
                    onUploadInstead();
                  }}
                >
                  Upload a file
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className={styles.videoWrap}>
              <video
                ref={videoRef}
                className={styles.video}
                playsInline
                muted
              />
              {!ready && <p className={styles.status}>Starting camera…</p>}
            </div>
            <div className={styles.controls}>
              <button
                type="button"
                className={styles.cancelBtn}
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.captureBtn}
                onClick={capture}
                disabled={!ready}
              >
                Capture
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CameraCaptureModal;
