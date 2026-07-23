'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { buildInitialFileFromUrl } from '@/components/file-upload/buildInitialFile';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import styles from './oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// OciUpload — /oci merged screen. Captures the Document Type (OCI/PIO) + Card No.
// and the Front (required) + Back (optional) document uploads on one page, then
// submits poi-oci/upload once and advances via the response uiMetadata.route.
// (Replaces the former two-screen /oci → /oci/upload flow.)

type DocType = 'OCI' | 'PIO' | '';

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const DOC_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'OCI', label: 'OCI' },
  { value: 'PIO', label: 'PIO' },
];

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// Pull the document id out of the upload response across plausible key casings.
const pickDocId = (r: unknown): string => {
  const o = (r ?? {}) as Record<string, unknown>;
  const d = (o.data ?? o) as Record<string, unknown>;
  const v = d.documentId ?? d.documentID ?? d.id ?? d.DocumentId;
  return v != null && v !== '' ? String(v) : '';
};

// Pull a presigned URL out of a documents[] entry across key casings.
const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? '' : String(v);
};

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

// Document-type prefix used for both upload and preview lookup. A PIO card uses
// the "Pio…" document type here (some backends instead expect "Poi…" and reject
// "Pio…" with a 400 — switch this if that happens).
const prefixFor = (type: DocType): 'Oci' | 'Pio' => (type === 'PIO' ? 'Pio' : 'Oci');

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Previews = { front: UploadedFile | null; back: UploadedFile | null };

export default function OciUpload() {
  const router = useRouter();

  // ── Document Type + Card No. (from the former /oci landing screen) ──────────
  const [docType, setDocType] = useState<DocType>('');
  const [cardNo, setCardNo] = useState('');

  // Saved card number + document previews per type, prefilled from the OCI/PIO
  // workflow stages so switching the dropdown restores that type's Card No. and
  // uploaded-document previews.
  const [savedByType, setSavedByType] = useState<Record<string, string>>({});
  const [previewsByType, setPreviewsByType] = useState<Record<string, Previews>>({});

  // ── Uploads (from the former /oci/upload screen) ────────────────────────────
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // The prefill is async; gate the cards (and the global loader) on this so the
  // cards mount already-bound and a user upload can't be clobbered.
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [prefillDone, setPrefillDone] = useState(false);

  // uploadFn is captured by FileUploadCard; read the live document type through a
  // ref so an upload always uses the currently-selected type's prefix.
  const docTypeRef = useRef<DocType>('');
  useEffect(() => {
    docTypeRef.current = docType;
  }, [docType]);

  const frontUploaded = frontFiles.some((f) => f.status === 'success');

  // Proceed gate — a Document Type, a Card No., and the Front upload are all
  // required. The Back stays optional, so it never blocks Proceed.
  const isDisabled = docType === '' || cardNo.trim() === '' || !frontUploaded;

  // Prefill from the saved OCI/PIO stages. The user could have saved either type,
  // so fetch both, bind whichever was updated most recently, and prebuild each
  // type's front/back previews so switching the dropdown swaps them instantly.
  useEffect(() => {
    showSpinner();
    const applicationId = getApplicationId();
    if (!applicationId) {
      setPrefillDone(true);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const [oci, pio] = await Promise.all([
          apiService.getOciPoiWorkflow(applicationId, 'OCI').catch(() => null),
          apiService.getOciPoiWorkflow(applicationId, 'PIO').catch(() => null),
        ]);
        if (!alive) return;

        const numbers: Record<string, string> = {};
        const previews: Record<string, Previews> = {};
        const candidates: { type: 'OCI' | 'PIO'; updatedAt: string }[] = [];

        const ingest = async (res: any, type: 'OCI' | 'PIO') => {
          const d = res?.data as Record<string, unknown> | undefined;
          if (d && (d.cardType != null || d.cardNumber != null)) {
            numbers[type] = d.cardNumber == null ? '' : String(d.cardNumber);
            candidates.push({ type, updatedAt: d.updatedAt == null ? '' : String(d.updatedAt) });
          }
          const docs = Array.isArray(res?.documents)
            ? (res.documents as Record<string, unknown>[])
            : [];
          const p = prefixFor(type);
          const urlFor = (suffix: string): string => {
            const hit = docs.find(
              (doc) => String(doc.documentType ?? '').toLowerCase() === `${p}${suffix}`.toLowerCase(),
            );
            return hit ? pickUrl(hit) : '';
          };
          const [front, back] = await Promise.all([
            buildInitialFileFromUrl(urlFor('Front') ?? '', 'oci-document'),
            buildInitialFileFromUrl(urlFor('Back') ?? '', 'oci-document'),
          ]);
          previews[type] = { front: front ?? null, back: back ?? null };
        };

        await Promise.all([ingest(oci, 'OCI'), ingest(pio, 'PIO')]);
        if (!alive) return;

        setSavedByType(numbers);
        setPreviewsByType(previews);

        // Bind whichever type was saved most recently.
        const pick = candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
        if (pick) {
          setDocType(pick.type);
          setCardNo(numbers[pick.type] ?? '');
          setFrontInitial(previews[pick.type]?.front ?? null);
          setBackInitial(previews[pick.type]?.back ?? null);
        }
      } catch {
        // Non-fatal — the fields/cards just stay empty.
      } finally {
        if (alive) setPrefillDone(true);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillDone) hideSpinner();
    return () => hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDone]);

  // Switching the type restores that type's saved Card No. and document previews.
  const handleDocTypeChange = (value: DocType) => {
    setDocType(value);
    setCardNo(value ? savedByType[value] ?? '' : '');
    setFrontInitial(value ? previewsByType[value]?.front ?? null : null);
    setBackInitial(value ? previewsByType[value]?.back ?? null : null);
  };

  // Real upload — POST each file to documents/upload and store its documentId.
  // Rejecting marks the FileUploadCard as failed (success reflects a real 200).
  // Blocks until a Document Type is chosen (the prefix depends on it).
  const makeUploadFn =
    (suffix: 'Front' | 'Back', storageKey: string) =>
    async (file: File, onProgress: (p: number) => void) => {
      const type = docTypeRef.current;
      if (!type) {
        toast.error('Please select a Document Type first.');
        throw new Error('No document type selected');
      }
      const applicationId = getApplicationId();
      if (!applicationId) {
        toast.error('Your session has expired, please start again.');
        throw new Error('Missing application ID');
      }
      const res = await apiService.uploadDocument(
        applicationId,
        `${prefixFor(type)}${suffix}`,
        file,
        onProgress,
      );
      const id = pickDocId(res);
      if (!id) throw new Error(res?.message || 'Upload failed. Please try again.');
      onProgress(100);
      sessionStorage.setItem(storageKey, id);
    };

  const uploadFront = makeUploadFn('Front', 'frontDocumentId');
  const uploadBack = makeUploadFn('Back', 'backDocumentId');

  const handleBack = () => router.back();

  // Proceed — submit the card details + the actual front/back files
  // (poi-oci/upload), then route per the response uiMetadata. Stays on failure.
  const handleProceed = async () => {
    if (isDisabled || submitting) return;
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }
    const frontFile = frontFiles.find((f) => f.status === 'success')?.file ?? null;
    const backFile = backFiles.find((f) => f.status === 'success')?.file ?? null;
    if (!frontFile) return;

    setSubmitting(true);
    try {
      const res = await apiService.submitOciPoi(applicationId, {
        cardType: docType,
        cardNumber: cardNo.trim(),
        frontFile,
        backFile,
      });
      router.push(routeFromUiMetadata(res) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Document Type + Card No. fields — same JSX on mobile + desktop ───────────
  const docTypeField = (idSuffix: 'mob' | 'desk') => (
    <>
      <label className={styles.fieldLabel} htmlFor={`${idSuffix}-doc-type`}>Document Type *</label>
      <div className={styles.fieldInputWrap}>
        <select
          id={`${idSuffix}-doc-type`}
          className={`${styles.fieldSelect}${docType === '' ? ` ${styles.placeholder}` : ''}`}
          value={docType}
          onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
        >
          <option value="" disabled hidden>Select</option>
          {DOC_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className={styles.fieldSelectCaret} aria-hidden="true">
          <IconCaretDown />
        </span>
      </div>
    </>
  );

  const cardNoField = (idSuffix: 'mob' | 'desk') => (
    <>
      <label className={styles.fieldLabel} htmlFor={`${idSuffix}-card-no`}>Card No. *</label>
      <input
        id={`${idSuffix}-card-no`}
        type="text"
        className={styles.fieldInput}
        placeholder="Enter number"
        value={cardNo}
        onChange={(e) => setCardNo(e.target.value)}
      />
    </>
  );

  // ── Upload sections ─────────────────────────────────────────────────────────
  const frontSection = !prefillDone ? null : (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{docType ? `Upload ${docType} Front` : 'Upload Front'}</p>
      <FileUploadCard
        key={`${docType || 'none'}-${frontInitial?.id ?? 'front-empty'}`}
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

  const backSection = !prefillDone ? null : (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>{docType ? `Upload ${docType} Back (Optional)` : 'Upload Back (Optional)'}</p>
      <FileUploadCard
        key={`${docType || 'none'}-${backInitial?.id ?? 'back-empty'}`}
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

  return (
    <>
      {/* ═══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="OCI or PIO Card">

        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>OCI or PIO Card</h1>
              <p className={styles.mobileSubtitle}>
                Enter your details manually and upload your OCI/PIO (front and back) for verification.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <div className={styles.fieldGroup}>
            {docTypeField('mob')}
          </div>
          <div className={styles.fieldGroup}>
            {cardNoField('mob')}
          </div>
          {frontSection}
          {backSection}
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

      {/* ═══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="OCI or PIO Card">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>OCI or PIO Card</h1>
              <p className={styles.desktopCardSubtitle}>
                Enter your details manually and upload your OCI/PIO (front and back) for verification.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <div className={styles.desktopFieldRow}>
                <div className={styles.desktopFieldGroup}>
                  {docTypeField('desk')}
                </div>
                <div className={styles.desktopFieldGroup}>
                  {cardNoField('desk')}
                </div>
              </div>
              {frontSection}
              {backSection}
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
