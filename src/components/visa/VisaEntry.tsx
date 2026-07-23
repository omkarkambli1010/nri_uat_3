'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { buildInitialFileFromUrl } from '@/components/file-upload/buildInitialFile';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from './visa.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// VisaEntry — /visa merged screen. Captures the visa expiry and the Front/Back
// (required) + Additional (optional) document uploads on one page, then submits
// POST /visa once and advances via the response uiMetadata.route. (Replaces the
// former two-screen /visa → /visa/upload flow.)

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// Pull the document id out of the upload response across plausible key casings.
const pickDocId = (r: unknown): string => {
  const o = (r ?? {}) as Record<string, unknown>;
  const d = (o.data ?? o) as Record<string, unknown>;
  const v = d.documentId ?? d.documentID ?? d.id ?? d.DocumentId;
  return v != null && v !== '' ? String(v) : '';
};

// Pick a document's presigned URL out of a documents[] entry across key casings.
const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? '' : String(v);
};

const isoToDate = (s: string): Date | null => (s ? new Date(s) : null);
const dateToIso = (d: Date | null | undefined): string => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

function isExpired(iso: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

// Earliest acceptable visa expiry — today + 3 months (BRD: a visa must have
// more than 3 months of validity remaining).
function minVisaExpiry(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 3);
  return d;
}

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExclamationCircle() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="#ff2e00" strokeWidth="1.5" />
      <path d="M12 8v4" stroke="#ff2e00" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16" r="0.5" fill="#ff2e00" stroke="#ff2e00" strokeWidth="1" />
    </svg>
  );
}

export default function VisaEntry() {
  const router = useRouter();

  // ── Expiry (from the former /visa entry screen) ────────────────────────────
  const [expiryDate, setExpiryDate] = useState('');

  // ── Uploads (from the former /visa/upload screen) ──────────────────────────
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFile[]>([]);

  // Previously-uploaded visa documents seeded into the upload cards so they
  // render in the dropzone preview. Keyed so each card remounts once the async
  // fetch resolves.
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);
  const [additionalInitial, setAdditionalInitial] = useState<UploadedFile | null>(null);

  // Document ids returned by each successful upload (200) — sent in POST /visa.
  const [frontDocumentId, setFrontDocumentId] = useState('');
  const [backDocumentId, setBackDocumentId] = useState('');
  const [translationDocumentId, setTranslationDocumentId] = useState('');

  // True while the final POST /visa is in flight.
  const [submitting, setSubmitting] = useState(false);

  const frontUploaded = frontFiles.some(f => f.status === 'success');
  const backUploaded = backFiles.some(f => f.status === 'success');

  // Prefill from the saved VISA stage (POST …/get/workflow/stagewisedate
  // { stagename: "VISA" }) so a revisit shows the previously entered expiry, the
  // captured document ids, and the uploaded document previews.
  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) return;

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getVisaWorkflow(applicationId);
        if (!alive) return;
        const d = res?.data as Record<string, unknown> | undefined;
        if (!d) return;

        const str = (v: unknown): string => (v == null ? '' : String(v));

        if (str(d.expiryDate)) setExpiryDate(str(d.expiryDate));

        // Captured document ids — also persisted so buildVisaPayload() picks
        // them up even before state settles.
        const front = str(d.frontDocumentId);
        const back = str(d.backDocumentId);
        const translation = str(d.translationDocumentId);
        if (front) { setFrontDocumentId(front); sessionStorage.setItem('frontDocumentId', front); }
        if (back) { setBackDocumentId(back); sessionStorage.setItem('backDocumentId', back); }
        if (translation) {
          setTranslationDocumentId(translation);
          sessionStorage.setItem('translationDocumentId', translation);
        }

        // Saved document previews from documents[] (keyed by documentType).
        const docs = Array.isArray(res?.documents)
          ? (res.documents as Record<string, unknown>[])
          : [];
        const urlFor = (type: string): string => {
          const hit = docs.find((doc) => str(doc.documentType).toLowerCase() === type.toLowerCase());
          return hit ? pickUrl(hit) : '';
        };
        const frontUrl = urlFor('VisaFront');
        const backUrl = urlFor('VisaBack');
        const translationUrl = urlFor('VisaTranslation');

        const [frontFile, backFile, translationFile] = await Promise.all([
          buildInitialFileFromUrl(frontUrl ?? '', 'visa-document'),
          buildInitialFileFromUrl(backUrl ?? '', 'visa-document'),
          buildInitialFileFromUrl(translationUrl ?? '', 'visa-document'),
        ]);
        if (!alive) return;
        if (frontFile) setFrontInitial(frontFile);
        if (backFile) setBackInitial(backFile);
        if (translationFile) setAdditionalInitial(translationFile);
      } catch {
        // Non-fatal — the fields/cards just stay empty.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Real upload — POST the cropped file to documents/upload and capture the
  // returned documentId (also persisted to sessionStorage). Rejecting marks the
  // FileUploadCard as failed so the success state only reflects a real 200.
  const makeUploadFn =
    (
      docType: 'VisaFront' | 'VisaBack',
      setId: (id: string) => void,
      storageKey: 'frontDocumentId' | 'backDocumentId',
    ) =>
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
        setId(id);
        sessionStorage.setItem(storageKey, id);
      };

  const uploadFront = makeUploadFn('VisaFront', setFrontDocumentId, 'frontDocumentId');
  const uploadBack = makeUploadFn('VisaBack', setBackDocumentId, 'backDocumentId');

  // Additional document → VisaTranslation.
  const uploadTranslation = async (file: File) => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      throw new Error('Missing application ID');
    }
    const res = await apiService.uploadDocument(applicationId, 'VisaTranslation', file);
    const id = pickDocId(res);
    if (!id) throw new Error(res?.message || 'Upload failed. Please try again.');
    setTranslationDocumentId(id);
    sessionStorage.setItem('translationDocumentId', id);
  };

  // Keep translationDocumentId in step with the additional-document card — if the
  // file is removed (no successful upload remains), drop the stale id so it isn't
  // sent in the POST.
  useEffect(() => {
    if (!additionalFiles.some((f) => f.status === 'success')) {
      setTranslationDocumentId('');
      if (typeof window !== 'undefined') sessionStorage.removeItem('translationDocumentId');
    }
  }, [additionalFiles]);

  // ── Expiry validation ──────────────────────────────────────────────────────
  const expired = isExpired(expiryDate);
  // BRD: a visa must have more than 3 months of validity remaining. The picker
  // disables every date before today + 3 months via minDate, so it can't
  // normally be selected; `tooSoon` is a backstop for a manually typed date (and
  // drives the inline warning). `expired` picks the copy.
  const tooSoon = !!expiryDate && new Date(expiryDate) < minVisaExpiry();
  const expiryValid = !!expiryDate && !tooSoon;

  // Proceed gate — a valid expiry (3+ months out) AND both Front and Back
  // uploaded. The additional document stays optional, so it never blocks Proceed.
  const isDisabled = !expiryValid || !frontUploaded || !backUploaded;

  const handleBack = () => router.back();

  // Visa payload for POST /visa. Document ids fall back to sessionStorage if
  // state isn't set yet. Missing ids are sent as null (NOT empty string) — the
  // API rejects "" for the GUID fields, which fails body binding; null is
  // accepted. The visa detail fields are not captured on this screen.
  const buildVisaPayload = () => {
    const front = frontDocumentId || sessionStorage.getItem('frontDocumentId') || '';
    const back = backDocumentId || sessionStorage.getItem('backDocumentId') || '';
    const translation =
      translationDocumentId || sessionStorage.getItem('translationDocumentId') || '';

    return {
      visaNumber: null,
      visaType: null,
      issuingCountry: null,
      issueDate: null,
      expiryDate: expiryDate || null,
      frontDocumentId: front || null,
      backDocumentId: back || null,
      translationDocumentId: translation || null,
    };
  };

  // Bottom CTA — POST the picked expiry + uploaded document ids in one request
  // and advance per the response uiMetadata. Stays put on failure.
  const handleProceed = async () => {
    if (submitting || isDisabled) return;
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiService.submitVisa(applicationId, buildVisaPayload());
      let route = "";
      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;
        route = uiMetadata?.route || "";
      } catch {
        route = "";
      }

      if (route) {
        router.push(`/${route}`);
        return;
      } else {
        toast.error("Next Route Not provided", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Expiry field block — same JSX on mobile + desktop ──────────────────────
  const fieldBlock = (idSuffix: 'mob' | 'desk') => (
    <div className={styles.expiryField}>
      <label htmlFor={`${idSuffix}-visa-expiry`} className={styles.expiryLabel}>
        Select Visa Expiry *
      </label>
      <div className={styles.expiryInputWrap}>
        <DateField
          inputId={`${idSuffix}-visa-expiry`}
          value={isoToDate(expiryDate)}
          onChange={(d) => setExpiryDate(dateToIso(d))}
          dateFormat="dd/mm/yy"
          placeholder="DD/MM/YYYY"
          showIcon
          iconPos="right"
          touchUI
          minDate={minVisaExpiry()}
          panelClassName="p-prime-cal-sm"
          className={`p-prime-cal${tooSoon ? ' p-prime-cal-expired' : ''}`}
        />
        {tooSoon && (
          <div className={styles.expiryErrorRow} role="alert">
            <span className={styles.expiryErrorIcon}>
              <IconExclamationCircle />
            </span>
            <p className={styles.expiryErrorText}>
              {expired
                ? 'Visa has already expired'
                : 'Visa must have more than 3 months of validity remaining'}
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // ── Upload sections ─────────────────────────────────────────────────────────
  const frontSection = (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>Upload Visa Front</p>
      </div>
      <FileUploadCard
        key={frontInitial?.id ?? 'front-empty'}
        initialFiles={frontInitial ? [frontInitial] : undefined}
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

  const backSection = (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>Upload Visa Back</p>
      </div>
      <FileUploadCard
        key={backInitial?.id ?? 'back-empty'}
        initialFiles={backInitial ? [backInitial] : undefined}
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

  // Optional third upload — VisaTranslation. Captures translationDocumentId,
  // included in the Proceed POST only when present.
  const additionalSection = (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>Upload Additional Document</p>
      </div>
      <FileUploadCard
        key={additionalInitial?.id ?? 'additional-empty'}
        initialFiles={additionalInitial ? [additionalInitial] : undefined}
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
      <div className={styles.mobilePage} aria-label="Visa Details">

        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Visa Details</h1>
              <p className={styles.mobileSubtitle}>
                Upload your Visa (front &amp; back) for verification.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {fieldBlock('mob')}
          {frontSection}
          {backSection}
          {additionalSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled || submitting ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isDisabled || submitting}
            aria-disabled={isDisabled || submitting}
          >
            {submitting ? 'Saving' : 'Proceed'}
          </LoadingButton>
        </div>

      </div>

      {/* ═══ DESKTOP LAYOUT ═══════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Visa Details">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Visa Details</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload your Visa (front &amp; back) for verification.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {fieldBlock('desk')}
              {frontSection}
              {backSection}
              {additionalSection}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled || submitting ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isDisabled || submitting}
                aria-disabled={isDisabled || submitting}
              >
                {submitting ? 'Saving' : 'Proceed'}
              </LoadingButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
