"use client";

import {
  ChangeEvent,
  DragEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FileUploadConfig } from "./fileUpload.types";
import { useFileUpload } from "./useFileUpload";
import { FileUploadDropzone } from "./FileUploadDropzone";
import { FileUploadItem } from "./FileUploadItem";
import {
  deriveAcceptLabel,
  isImageFile,
} from "./fileUpload.utils";
import { SignatureCropperModal } from "../upload-signature/SignatureCropperModal";
import styles from "./file-upload.module.scss";

const DESKTOP_MQ = "(min-width: 992px)";

interface FileUploadProps {
  title?: string;
  config: FileUploadConfig;
  className?: string;
}

export function FileUpload({ title, config, className }: FileUploadProps) {
  const { files, addFiles, removeFile, retryFile, unlockFile } =
    useFileUpload(config);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // ── Image cropper (opt-in via config.cropImages) ──────────────────────────
  // Picked images are routed through the same cropper used by the Upload
  // Signature screen before they enter the upload flow. PDFs / non-images
  // bypass it. Multiple images are cropped one after another via a queue.
  const [isDesktop, setIsDesktop] = useState(false);
  const [cropState, setCropState] = useState<{
    src: string;
    name: string;
    // Original MIME type of the picked file (post HEIC→PNG normalisation).
    // Passed through to SignatureCropperModal as `outputType` so e.g. a
    // .jpg upload is cropped and re-exported as .jpg instead of .png.
    originalType: string;
  } | null>(null);
  const cropQueueRef = useRef<File[]>([]);

  useEffect(() => {
    if (!config.cropImages || typeof window === "undefined") return;
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [config.cropImages]);

  // Revoke the cropper's object URL when it is replaced or on unmount.
  useEffect(() => {
    if (!cropState) return;
    return () => URL.revokeObjectURL(cropState.src);
  }, [cropState]);

  // Clear the drag-over state whenever any drag operation ends anywhere on the
  // page. HTML5 `dragleave` is unreliable: when a file is dragged across this
  // dropzone but dropped on a *different* one, this instance receives a
  // `dragenter` (counter → 1, isDragOver → true) without a matching `dragleave`
  // or `drop`, leaving isDragOver stuck `true`. While stuck, the dropzone hides
  // its file preview — so a sibling's drag would hide this dropzone's uploaded
  // image. The global `drop`/`dragend` both bubble to window and reset us.
  useEffect(() => {
    const reset = () => {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    };
    window.addEventListener("drop", reset);
    window.addEventListener("dragend", reset);
    return () => {
      window.removeEventListener("drop", reset);
      window.removeEventListener("dragend", reset);
    };
  }, []);

  // In single-file mode the dropzone transforms into the file preview
  const activeFile = !config.multiple ? files[0] : undefined;

  // Pull the next queued image into the cropper, or close it when the queue
  // is empty.
  const startNextCrop = () => {
    const next = cropQueueRef.current.shift();
    if (!next) {
      setCropState(null);
      return;
    }
    setCropState({
      src: URL.createObjectURL(next),
      name: next.name,
      originalType: next.type,
    });
  };

  // Single entry point for every picked / dropped file. With cropping enabled
  // images open the cropper first; everything else goes straight to upload.
  const intake = async (incoming: File[]) => {
    if (!incoming.length) return;
    if (!config.cropImages) {
      addFiles(incoming);
      return;
    }
    const toProcess = config.multiple ? incoming : incoming.slice(0, 1);
    const normalized = await Promise.all(
      toProcess.map(async (f) => {
        if (/heic|heif/i.test(f.type)) {
          // Convert HEIC → PNG so canvas can render it
          const heic2any = (await import("heic2any")).default;
          const converted = (await heic2any({
            blob: f,
            toType: "image/png",
          })) as Blob;
          return new File(
            [converted],
            f.name.replace(/\.(heic|heif)$/i, ".png"),
            { type: "image/png" },
          );
        }
        return f;
      }),
    );
    const images = normalized.filter(isImageFile);
    const others = normalized.filter((f) => !isImageFile(f));
    if (others.length) addFiles(others);
    if (images.length) {
      cropQueueRef.current.push(...images);
      if (!cropState) startNextCrop();
    }
  };

  const handleCropConfirm = (blob: Blob, _size: number, name: string) => {
    addFiles([new File([blob], name, { type: blob.type })]);
    startNextCrop();
  };

  const handleCropCancel = () => {
    startNextCrop();
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      intake(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleCameraChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      intake(Array.from(e.target.files));
      e.target.value = "";
    }
  };

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (!config.disabled) setIsDragOver(true);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragOver(false);
    if (!config.disabled && e.dataTransfer?.files?.length) {
      intake(Array.from(e.dataTransfer.files));
    }
  };

  const handleClick = () => {
    if (!config.disabled) inputRef.current?.click();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleClick();
    }
  };

  const acceptLabel = config.acceptLabel ?? deriveAcceptLabel(config.accept);

  return (
    <div
      className={[styles.uploadSection, className].filter(Boolean).join(" ")}
    >
      {title && <p className={styles.uploadTitle}>{title}</p>}

      {/* Hidden file inputs */}
      {/* No `accept` attribute: the OS picker shows "All Files" instead of
          "Custom Files". File-type validation still runs in JS via config.accept. */}
      <input
        ref={inputRef}
        type="file"
        className={styles.hiddenInput}
        multiple={!!config.multiple}
        onChange={handleInputChange}
        aria-hidden="true"
        tabIndex={-1}
        suppressHydrationWarning
      />
      <input
        ref={cameraInputRef}
        type="file"
        className={styles.hiddenInput}
        accept="image/*"
        capture="environment"
        onChange={handleCameraChange}
        aria-hidden="true"
        tabIndex={-1}
        suppressHydrationWarning
      />

      <FileUploadDropzone
        config={config}
        activeFile={activeFile}
        hasFiles={files.length > 0}
        isDragOver={isDragOver}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onCameraClick={() => {
          if (!config.disabled) cameraInputRef.current?.click();
        }}
      />

      {/* Metadata row — mirrors Figma "Files supported / Maximum size" */}
      <div className={styles.metaRow}>
        <span className={styles.metaText}>Files supported: {acceptLabel}</span>
        <span className={styles.metaText}>
          Maximum size less than {config.maxSizeMB} MB
        </span>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div
          className={styles.fileList}
          role="list"
          aria-label="Uploaded files"
        >
          {files.map((f) => (
            <FileUploadItem
              key={f.id}
              file={f}
              onRemove={removeFile}
              onRetry={retryFile}
              onUnlock={unlockFile}
            />
          ))}
        </div>
      )}

      {/* Image cropper — opens on top when an image is picked */}
      {config.cropImages && (
        <SignatureCropperModal
          open={!!cropState}
          isDesktop={isDesktop}
          src={cropState?.src ?? ""}
          fileName={cropState?.name ?? ""}
          title="Crop your image"
          subtitle="Adjust the box around the area you want to upload."
          outputType={cropState?.originalType || "image/png"}
          onCancel={handleCropCancel}
          onConfirm={handleCropConfirm}
        />
      )}
    </div>
  );
}
