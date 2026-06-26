export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UploadedFile {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  previewUrl?: string;
  errorMessage?: string;
  isValidationError?: boolean;
  isPasswordProtected?: boolean;
  passwordError?: string;
  isUnlocking?: boolean;
}

export interface FileUploadConfig {
  accept: string[];
  acceptLabel?: string;
  maxSizeMB: number;
  multiple?: boolean;
  disabled?: boolean;
  /**
   * Pre-populate the upload with already-uploaded files (e.g. a previously
   * saved document fetched from the server). They render in the dropzone
   * preview exactly like a freshly uploaded/cropped file and can be replaced.
   */
  initialFiles?: UploadedFile[];
  /**
   * When true, picked image files are routed through the image cropper
   * before entering the upload flow — the same UX as the Upload Signature
   * screen. PDFs and other non-image files skip the cropper.
   */
  cropImages?: boolean;
  uploadFn?: (file: File, onProgress: (p: number) => void) => Promise<void>;
  onFilesChange?: (files: UploadedFile[]) => void;
  errorMessages?: {
    size?: string;
    type?: string;
  };
}
