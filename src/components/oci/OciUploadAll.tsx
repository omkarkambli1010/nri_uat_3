'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from './oci.module.scss';

// OciUploadAll — all-in-one OCI/PIO upload screen (passport-upload style).
// Reached from /oci (the Document Type + Card No. landing page). Two sections:
//   • Upload OCI Front — inline file-upload dropzone (FileUploadCard).
//   • Upload OCI Back  — inline file-upload dropzone (FileUploadCard).
// Both are required before the user can advance to the Additional Document step.

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Pull the document id out of the upload response across plausible key casings.
const pickDocId = (r: unknown): string => {
  const o = (r ?? {}) as Record<string, unknown>;
  const d = (o.data ?? o) as Record<string, unknown>;
  const v = d.documentId ?? d.documentID ?? d.id ?? d.DocumentId;
  return v != null && v !== '' ? String(v) : '';
};

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// Post-submit route comes back in the response uiMetadata, a JSON string like
// "{\"route\": \"foreignAddress\"}".
const routeFromUiMetadata = (res: unknown): string | null => {
  const meta = (res ?? {}) as Record<string, unknown>;
  try {
    const ui = typeof meta.uiMetadata === 'string' ? JSON.parse(meta.uiMetadata) : meta.uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

export default function OciUploadAll() {
  const router = useRouter();

  const [frontFiles,      setFrontFiles]      = useState<UploadedFile[]>([]);
  const [backFiles,       setBackFiles]       = useState<UploadedFile[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFile[]>([]);
  const [submitting,      setSubmitting]      = useState(false);

  const frontUploaded = frontFiles.some((f) => f.status === 'success');
  const backUploaded  = backFiles.some((f) => f.status === 'success');

  // Additional document is optional — Proceed only needs front + back.
  const isDisabled = !frontUploaded || !backUploaded;

  // Real upload — POST each file to documents/upload and store its documentId.
  // Rejecting marks the FileUploadCard as failed (success reflects a real 200).
  const makeUploadFn =
    (docType: 'OciFront' | 'OciBack' | 'OciTranslation', storageKey: string) =>
    async (file: File, onProgress: (p: number) => void) => {
      const applicationId = getApplicationId();
      if (!applicationId) {
        toast.error('Your session has expired, please start again.');
        throw new Error('Missing application ID');
      }
      const res = await apiService.uploadDocument(applicationId, docType, file, onProgress);
      const id = pickDocId(res);
      if (!id) throw new Error(res?.message || 'Upload failed. Please try again.');
      onProgress(100);
      sessionStorage.setItem(storageKey, id);
    };

  const uploadFront       = makeUploadFn('OciFront',       'frontDocumentId');
  const uploadBack        = makeUploadFn('OciBack',        'backDocumentId');
  const uploadTranslation = makeUploadFn('OciTranslation', 'translationDocumentId');

  const handleBack = () => router.push('/oci');

  // Proceed — submit the card details + the actual front/back/translation files
  // (poi-oci/upload), then route per the response uiMetadata. Stays on failure.
  const handleProceed = async () => {
    if (isDisabled || submitting) return;
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }
    const frontFile = frontFiles.find((f) => f.status === 'success')?.file ?? null;
    const backFile  = backFiles.find((f) => f.status === 'success')?.file ?? null;
    const translationFile = additionalFiles.find((f) => f.status === 'success')?.file ?? null;
    if (!frontFile || !backFile) return;

    setSubmitting(true);
    try {
      const res = await apiService.submitOciPoi(applicationId, {
        cardType: sessionStorage.getItem('oci_cardType') ?? '',
        cardNumber: sessionStorage.getItem('oci_cardNumber') ?? '',
        frontFile,
        backFile,
        translationFile,
      });
      router.push(routeFromUiMetadata(res) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Front section ──────────────────────────────────────────────────────────
  const frontSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload OCI Front</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadFront}
        onFilesChange={setFrontFiles}
      />
    </div>
  );

  // ── Back section ───────────────────────────────────────────────────────────
  const backSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload OCI Back</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadBack}
        onFilesChange={setBackFiles}
      />
    </div>
  );

  // ── Additional document — optional, inline (mirrors the Visa layout) ─────────
  const additionalSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Additional Document</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadTranslation}
        onFilesChange={setAdditionalFiles}
      />
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE LAYOUT ════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload OCI/PIO">

        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload OCI/PIO</h1>
              <p className={styles.mobileSubtitle}>
                Upload your OCI/PIO card (front &amp; back) for verification.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {frontSection}
          {backSection}
          {additionalSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled || submitting ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isDisabled || submitting}
            aria-disabled={isDisabled || submitting}
          >
            {submitting ? 'Saving…' : 'Proceed'}
          </button>
        </div>

      </div>

      {/* ═══ DESKTOP LAYOUT ═══════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload OCI/PIO">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload OCI/PIO</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload your OCI/PIO card (front &amp; back) for verification.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {frontSection}
              {backSection}
              {additionalSection}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled || submitting ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isDisabled || submitting}
                aria-disabled={isDisabled || submitting}
              >
                {submitting ? 'Saving…' : 'Proceed'}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
