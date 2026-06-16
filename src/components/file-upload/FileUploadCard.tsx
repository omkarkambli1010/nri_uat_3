'use client';

import type { FileUploadConfig } from './fileUpload.types';
import { FileUpload } from './FileUpload';

export interface FileUploadCardProps {
  /** Optional — rendered above the dropzone. Omit when the caller provides its own header. */
  title?: string;
  /** MIME types e.g. ['application/pdf', 'image/jpeg', 'image/png', 'image/heic'] */
  acceptedTypes: string[];
  /** Maximum allowed file size in bytes e.g. 5 * 1024 * 1024 */
  maxSize: number;
  /** Override the derived "Files supported" label */
  acceptedLabel?: string;
  /** Override the size-exceeded error message */
  sizeErrorMessage?: string;
  /** Override the wrong-type error message */
  typeErrorMessage?: string;
  multiple?: boolean;
  disabled?: boolean;
  /** Route picked image files through the image cropper before upload. */
  cropImages?: boolean;
  /** Plug in your real upload API here. Receives the file and a progress callback. */
  uploadFn?: FileUploadConfig['uploadFn'];
  onFilesChange?: FileUploadConfig['onFilesChange'];
  className?: string;
}

export function FileUploadCard({
  title,
  acceptedTypes,
  maxSize,
  acceptedLabel,
  sizeErrorMessage,
  typeErrorMessage,
  multiple = false,
  disabled,
  cropImages,
  uploadFn,
  onFilesChange,
  className,
}: FileUploadCardProps) {
  const config: FileUploadConfig = {
    accept: acceptedTypes,
    acceptLabel: acceptedLabel,
    maxSizeMB: maxSize / (1024 * 1024),
    multiple,
    disabled,
    cropImages,
    uploadFn,
    onFilesChange,
    errorMessages: {
      size: sizeErrorMessage,
      type: typeErrorMessage,
    },
  };

  return <FileUpload title={title} config={config} className={className} />;
}
