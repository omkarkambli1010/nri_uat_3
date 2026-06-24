'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import styles from '@/components/oci/oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// FatcaUpload — /fatca/upload
// One upload section per TIN entry captured on /fatca. Each section has three
// image slots (all documentType=FatcaTinProof); each slot uploads immediately
// on selection and holds its own documentId. Proceed advances once every slot
// of every section has uploaded successfully.

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

// Number of image slots per TIN section.
const SLOTS = 3;

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// FATCA country dropdown name → ISO-2 code (sent as residency.countryCode).
const COUNTRY_ISO2: Record<string, string> = {
  'India': 'IN', 'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA',
  'Australia': 'AU', 'Singapore': 'SG', 'UAE': 'AE', 'Germany': 'DE',
  'France': 'FR', 'Japan': 'JP',
};

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

type TinEntry = { taxResidence: string; tinIssuingCountry: string; tinNumber: string };

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

  const [tins, setTins] = useState<TinEntry[]>([]);
  // docIds[entryIndex][slotIndex] — the uploaded documentId for each image slot.
  const [docIds, setDocIds] = useState<string[][]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load the TIN entries captured on /fatca after mount (avoids SSR/sessionStorage
  // hydration mismatch). Redirect back if none were persisted.
  useEffect(() => {
    let loaded: TinEntry[] = [];
    try { loaded = JSON.parse(sessionStorage.getItem('fatca_tins') ?? '[]'); } catch { loaded = []; }
    if (!Array.isArray(loaded) || loaded.length === 0) {
      toast.error('FATCA details are missing. Please re-enter them.');
      router.push('/fatca');
      return;
    }
    setTins(loaded);
    setDocIds(loaded.map(() => Array<string>(SLOTS).fill('')));
  }, [router]);

  const setSlotDoc = (entry: number, slot: number, id: string) =>
    setDocIds((prev) =>
      prev.map((row, i) => (i === entry ? row.map((d, j) => (j === slot ? id : d)) : row)));

  // Builds the upload handler for a given entry/slot. The file uploads to
  // documents/upload?documentType=FatcaTinProof; its documentId is stored.
  const makeUploadFn =
    (entry: number, slot: number) =>
    async (file: File, onProgress: (p: number) => void): Promise<void> => {
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

      setSlotDoc(entry, slot, res.documentId);
      onProgress(100);
    };

  // Clears a slot's documentId when its file is removed / not successfully uploaded.
  const makeFilesChange = (entry: number, slot: number) => (next: UploadedFile[]) => {
    if (!next.some((f) => f.status === 'success')) setSlotDoc(entry, slot, '');
  };

  // Only Image 1 (the first slot) of each TIN section is mandatory; Images 2 & 3
  // are optional. Proceed enables once every section has its first image uploaded.
  const allUploaded =
    tins.length > 0 &&
    docIds.length === tins.length &&
    docIds.every((row) => Boolean(row[0]));

  const handleBack = () => router.push('/fatca');

  // Submit the FATCA details — one residency per TIN entry, each carrying its
  // three uploaded image documentIds — then route per the response's uiMetadata.
  const handleProceed = async () => {
    if (!allUploaded || submitting) return;

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    let meta: { countryOfBirth?: string; citizenship?: string } = {};
    try { meta = JSON.parse(sessionStorage.getItem('fatca_meta') ?? '{}'); } catch { meta = {}; }

    const residencies = tins.map((t, i) => ({
      countryCode: COUNTRY_ISO2[t.taxResidence] ?? t.taxResidence,
      tin: t.tinNumber,
      tinProofDocumentId:  docIds[i][0],
      tinProofDocumentId2: docIds[i][1],
      tinProofDocumentId3: docIds[i][2],
      countryofTaxResidence: t.taxResidence,
      tinIssuingCountry: t.tinIssuingCountry,
    }));

    setSubmitting(true);
    try {
      const res = await apiService.submitFatca(applicationId, {
        residencies,
        // US person when the Citizenship selection is United States.
        usCitizen: (meta.citizenship ?? '') === 'United States',
        countryOfBirth: (meta.countryOfBirth ?? '').toUpperCase(),
        idempotencyKey: '',
        citizenship: meta.citizenship ?? '',
      });
      router.push(routeFromUiMetadata(res?.uiMetadata) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  const uploadSections = (
    <>
      {tins.map((t, entry) => (
        <div key={entry} className={styles.section}>
          <p className={styles.sectionTitle}>TIN {entry + 1} — TIN Document Images</p>
          <p className={styles.sectionSubtitle}>
            {t.taxResidence} · Issued by {t.tinIssuingCountry}
          </p>
          {Array.from({ length: SLOTS }, (_, slot) => (
            <FileUploadCard
              key={slot}
              title={slot === 0 ? "Image 1" : `Image ${slot + 1} (Optional)`}
              acceptedTypes={ACCEPTED_TYPES}
              maxSize={MAX_SIZE}
              acceptedLabel={ACCEPTED_LABEL}
              sizeErrorMessage={SIZE_ERR}
              typeErrorMessage={TYPE_ERR}
              cropImages
              uploadFn={makeUploadFn(entry, slot)}
              onFilesChange={makeFilesChange(entry, slot)}
            />
          ))}
        </div>
      ))}
    </>
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
                Upload images of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {uploadSections}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${!allUploaded || submitting ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={!allUploaded || submitting}
            aria-disabled={!allUploaded || submitting}
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
                Upload images of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {uploadSections}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${!allUploaded || submitting ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={!allUploaded || submitting}
                aria-disabled={!allUploaded || submitting}
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
