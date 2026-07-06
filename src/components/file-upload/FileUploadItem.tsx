'use client';

import { KeyboardEvent, useState } from 'react';
import type { UploadedFile } from './fileUpload.types';
import { formatFileSize, isImageFile, isPdfFile } from './fileUpload.utils';
import styles from './file-upload.module.scss';

interface Props {
  file: UploadedFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onUnlock: (id: string, password: string) => void;
}

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#16a34a" />
      <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ErrorCircleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#dc2626" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SpinnerIcon({ small }: { small?: boolean }) {
  const size = small ? 14 : 18;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={styles.spinnerIcon}
      aria-label="Loading"
    >
      <circle cx="12" cy="12" r="10" stroke="#e8e0ff" strokeWidth="3" />
      <path d="M12 2a10 10 0 0110 10" stroke="#280071" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function RemoveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 12a9 9 0 0115.36-6.36L21 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 12h4M21 3v4h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PdfItemIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="28" height="36" rx="4" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5" />
      <path d="M26 4v10h10" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round" />
      <text x="10" y="34" fontSize="10" fontWeight="700" fill="#ef4444" fontFamily="sans-serif">PDF</text>
    </svg>
  );
}

function DocItemIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="6" y="4" width="28" height="36" rx="4" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5" />
      <path d="M26 4v10h10" stroke="#6366f1" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M13 22h16M13 28h10" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function FileUploadItem({ file, onRemove, onRetry, onUnlock }: Props) {
  const [passwordValue, setPasswordValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const isSuccess = file.status === 'success';
  const isError = file.status === 'error';
  const isUploading = file.status === 'uploading';
  const isPasswordProtected = !!file.isPasswordProtected;
  const canRetry = isError && !file.isValidationError && !isPasswordProtected;
  const showNormalError = isError && file.errorMessage && !isPasswordProtected;

  const handleUnlock = () => {
    if (!passwordValue.trim() || file.isUnlocking) return;
    onUnlock(file.id, passwordValue);
  };

  const handlePasswordKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleUnlock();
  };

  const itemClass = [
    styles.fileItem,
    isSuccess ? styles.fileItemSuccess : '',
    isError ? styles.fileItemError : '',
    isPasswordProtected ? styles.fileItemPasswordTop : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div role="listitem">
      <div className={itemClass}>
        {/* Thumbnail or icon */}
        {file.previewUrl && isImageFile(file.file) ? (
          <img src={file.previewUrl} alt="" className={styles.fileThumbnail} aria-hidden="true" />
        ) : (
          <div className={styles.fileIconBox}>
            {isPdfFile(file.file) ? <PdfItemIcon /> : <DocItemIcon />}
          </div>
        )}

        {/* File info */}
        <div className={styles.fileInfo}>
          <div className={styles.fileNameRow}>
            <span className={styles.fileName} title={file.file.name}>
              {file.file.name}
            </span>
            {/* Seeded previews of already-saved documents are byte-less File
                placeholders (size 0) — the S3 bytes are never re-fetched. Skip the
                size label rather than show a misleading "0 B". */}
            {file.file.size > 0 && (
              <span className={styles.fileSize}>{formatFileSize(file.file.size)}</span>
            )}
          </div>

          {isUploading && (
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={file.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Uploading ${file.file.name}: ${file.progress}%`}
            >
              <div className={styles.progressFill} style={{ width: `${file.progress}%` }} />
            </div>
          )}

          {isPasswordProtected && !file.isUnlocking && (
            <p className={styles.passwordBadge}>
              <LockIcon /> Password protected
            </p>
          )}

          {file.isUnlocking && (
            <p className={styles.fileSuccessText}>Unlocking PDF…</p>
          )}

          {showNormalError && (
            <p className={styles.fileError} role="alert">{file.errorMessage}</p>
          )}

          {isSuccess && <p className={styles.fileSuccessText}>Uploaded successfully</p>}
        </div>

        {/* Status indicator + actions */}
        <div className={styles.fileActions}>
          {isUploading && <SpinnerIcon />}
          {file.isUnlocking && <SpinnerIcon />}
          {isSuccess && <SuccessIcon />}
          {isError && !canRetry && !isPasswordProtected && <ErrorCircleIcon />}

          {canRetry && (
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.retryBtn}`}
              onClick={() => onRetry(file.id)}
              aria-label={`Retry uploading ${file.file.name}`}
              title="Retry"
            >
              <RetryIcon />
            </button>
          )}

          <button
            type="button"
            className={`${styles.actionBtn} ${styles.removeBtn}`}
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.file.name}`}
            title="Remove"
          >
            <RemoveIcon />
          </button>
        </div>
      </div>

      {/* Password unlock panel */}
      {isPasswordProtected && (
        <div className={styles.passwordPanel}>
          <div className={styles.passwordInputRow}>
            <div className={styles.passwordInputWrapper}>
              <LockIcon />
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordValue}
                onChange={e => setPasswordValue(e.target.value)}
                onKeyDown={handlePasswordKeyDown}
                className={styles.passwordInput}
                placeholder="Enter PDF password"
                disabled={!!file.isUnlocking}
                aria-label="PDF password"
              />
              <button
                type="button"
                className={styles.passwordToggleBtn}
                onClick={() => setShowPassword(p => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            <button
              type="button"
              className={styles.unlockBtn}
              onClick={handleUnlock}
              disabled={!passwordValue.trim() || !!file.isUnlocking}
            >
              {file.isUnlocking ? (
                <><SpinnerIcon small /> Unlocking…</>
              ) : (
                'Unlock'
              )}
            </button>
          </div>

          {file.passwordError && (
            <p className={styles.passwordError} role="alert">
              {file.passwordError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
