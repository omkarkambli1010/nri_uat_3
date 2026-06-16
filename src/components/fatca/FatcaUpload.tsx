'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import styles from '@/components/oci/oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// FatcaUpload — /fatca/upload
// Single "FATCA TIN Image Upload" section. The file uploads immediately on
// selection via documents/upload?documentType=FatcaTinProof; Proceed advances
// once it has uploaded successfully.

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// FATCA country dropdown name → ISO-2 code (sent as residency.countryCode).
const COUNTRY_ISO2: Record<string, string> = {
  'India': 'IN', 'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA',
  'Australia': 'AU', 'Singapore': 'SG', 'UAE': 'AE', 'Germany': 'DE',
  'France': 'FR', 'Japan': 'JP',
};

const generateIdempotencyKey = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// uiMetadata JSON string → next route (e.g. '{"route":"addNominee"}' → '/addNominee').
const routeFromUiMetadata = (uiMetadata: unknown): string | null => {
  try {
    const ui = typeof uiMetadata === 'string' ? JSON.parse(uiMetadata) : uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

type TinEntry = { tinIssuingCountry: string; tinNumber: string };

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FatcaUpload() {
  const router = useRouter();

  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [documentId, setDocumentId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Uploads the TIN proof to documents/upload?documentType=FatcaTinProof.
  const uploadFn = async (file: File, onProgress: (p: number) => void): Promise<void> => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      throw new Error('Missing application ID');
    }

    onProgress(10);

    const res = await apiService.uploadNriDocument({
      applicationId,
      documentType: DOCUMENT_TYPES.FATCA_TIN_PROOF,
      file,
    });

    if (!res?.status || !res?.documentId) {
      throw new Error('TIN document upload failed.');
    }

    setDocumentId(res.documentId);
    onProgress(100);
  };

  const handleFilesChange = (next: UploadedFile[]) => {
    setFiles(next);
    if (!next.some((f) => f.status === 'success')) setDocumentId('');
  };

  const uploaded = files.some((f) => f.status === 'success') && !!documentId;

  const handleBack = () => router.push('/fatca');

  // Submit the FATCA details (residencies + US-person + country of birth) using
  // the uploaded TIN proof, then route per the response's uiMetadata.
  const handleProceed = async () => {
    if (!uploaded || submitting) return;

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    let tins: TinEntry[] = [];
    let meta: { countryOfBirth?: string; citizenship?: string } = {};
    try { tins = JSON.parse(sessionStorage.getItem('fatca_tins') ?? '[]'); } catch { tins = []; }
    try { meta = JSON.parse(sessionStorage.getItem('fatca_meta') ?? '{}'); } catch { meta = {}; }

    if (tins.length === 0) {
      toast.error('FATCA details are missing. Please re-enter them.');
      router.push('/fatca');
      return;
    }

    const residencies = tins.map((t) => ({
      countryCode: COUNTRY_ISO2[t.tinIssuingCountry] ?? t.tinIssuingCountry,
      tin: t.tinNumber,
      tinProofDocumentId: documentId,
    }));

    setSubmitting(true);
    try {
      const res = await apiService.submitFatca(applicationId, {
        residencies,
        // US person when the Citizenship selection is United States
        // (e.g. India/Indian → false).
        usCitizen: (meta.citizenship ?? '') === 'United States',
        countryOfBirth: (meta.countryOfBirth ?? '').toUpperCase(),
        // idempotencyKey: generateIdempotencyKey(),
        idempotencyKey: '',
      });
      router.push(routeFromUiMetadata(res?.uiMetadata) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  const uploadSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>FATCA TIN Image Upload</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadFn}
        onFilesChange={handleFilesChange}
      />
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload FATCA TIN Document">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload TIN Document</h1>
              <p className={styles.mobileSubtitle}>
                Upload an image of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {uploadSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${!uploaded || submitting ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={!uploaded || submitting}
            aria-disabled={!uploaded || submitting}
          >
            {submitting ? 'Submitting…' : 'Proceed'}
          </LoadingButton>
        </div>
      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload FATCA TIN Document">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload TIN Document</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload an image of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {uploadSection}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${!uploaded || submitting ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={!uploaded || submitting}
                aria-disabled={!uploaded || submitting}
              >
                {submitting ? 'Submitting…' : 'Proceed'}
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
