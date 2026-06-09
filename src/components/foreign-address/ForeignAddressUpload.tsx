'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from '@/components/oci/oci.module.scss';

// ForeignAddressUpload — /foreignAddress/upload
// Uploads front + back proof files together with the address details captured
// on /foreignAddress in a single multipart POST to /address/foreign.
//
// KEY FIX: FileUploadCard here has NO uploadFn — files are selected locally
// and held in state. The actual API call fires only on Proceed, sending both
// files + all address fields in one multipart request (matching the curl).

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

const routeFromUiMetadata = (res: unknown): string | null => {
  const meta = (res ?? {}) as Record<string, unknown>;
  try {
    const ui = typeof meta.uiMetadata === 'string'
      ? JSON.parse(meta.uiMetadata)
      : meta.uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ForeignAddressUpload() {
  const router = useRouter();

  const [proofType, setProofType] = useState('Document');

  // Track file lists from each card — we extract the File object on Proceed.
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFile[]>([]);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem('fa_documentType');
    if (saved) setProofType(saved);
  }, []);

  // A file is "ready" when it exists in the list with any non-error status.
  // FileUploadCard without uploadFn adds files with status 'idle' or 'success'
  // depending on the component version — we check file presence instead.
  const getFrontFile = (): File | null =>
    frontFiles.find((f) => f.file instanceof File)?.file ?? null;

  const getBackFile = (): File | null =>
    backFiles.find((f) => f.file instanceof File)?.file ?? null;

  const frontReady = getFrontFile() !== null;
  const backReady = getBackFile() !== null;

  // Proceed is enabled once both mandatory files are selected.
  const isDisabled = !frontReady || !backReady || submitting;

  const handleBack = () => router.push('/foreignAddress');

  // Single multipart POST — address details (from sessionStorage) + both files.
  // Field names match the curl exactly (PascalCase, handled by apiService).
  const handleProceed = async () => {
    if (isDisabled) return;

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    // Read address details saved by /foreignAddress on Proceed.
    let address: Record<string, string> = {};
    try {
      address = JSON.parse(sessionStorage.getItem('fa_address') ?? '{}');
    } catch {
      address = {};
    }

    // Guard: if essential fields are missing the API will 500 — show a clear message.
    if (!address.proofType || !address.line1 || !address.city) {
      toast.error('Address details are missing. Please re-enter them.');
      router.push('/foreignAddress');
      return;
    }

    const frontFile = getFrontFile()!;
    const backFile = getBackFile()!;

    setSubmitting(true);
    try {
      const res = await apiService.submitForeignAddress(applicationId, {
        // Address fields — camelCase keys; apiService maps to PascalCase for FormData
        line1: address.line1 ?? '',
        line2: address.line2 ?? '',
        line3: address.line3 ?? '',
        city: address.city ?? '',
        stateProvince: address.stateProvince ?? '',
        postalCode: address.postalCode ?? '',
        country: address.country ?? '',
        proofType: address.proofType ?? '',
        proofNumber: address.proofNumber ?? '',
        expiryDate: address.expiryDate ?? '',
        // Files — sent as binary parts
        frontFile,
        backFile,
      });

      // Navigate per uiMetadata route from the response, fall back to /esign.
      router.push(routeFromUiMetadata(res) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Upload sections ─────────────────────────────────────────────────────────

  // No uploadFn on any card — files are collected locally and submitted
  // together on Proceed in a single multipart request.
  const frontSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload {proofType} Front</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setFrontFiles}
      />
    </div>
  );

  const backSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload {proofType} Back</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setBackFiles}
      />
    </div>
  );

  const additionalSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Additional Document <span style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>(Optional)</span></p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setAdditionalFiles}
      />
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload Foreign Address">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload Foreign Address</h1>
              <p className={styles.mobileSubtitle}>
                Upload your document (front &amp; back) for foreign address verification.
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
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            {submitting ? 'Submitting…' : 'Proceed'}
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload Foreign Address">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload Foreign Address</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload your document (front &amp; back) for foreign address verification.
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
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                {submitting ? 'Submitting…' : 'Proceed'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
