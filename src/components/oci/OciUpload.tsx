'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { buildInitialFileFromUrl } from '@/components/file-upload/buildInitialFile';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from './oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';
import dynamicBackService from "@/services/back-navigation.service";
import { useSpinner } from "../spinner/Spinner";
import secureSessionService from '@/services/secure-session.service';


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
  typeof window !== 'undefined' ? secureSessionService.getItem('ApplicationId') ?? '' : '';

const pickDocId = (r: unknown): string => {
  const o = (r ?? {}) as Record<string, unknown>;
  const d = (o.data ?? o) as Record<string, unknown>;
  const v = d.documentId ?? d.documentID ?? d.id ?? d.DocumentId;
  return v != null && v !== '' ? String(v) : '';
};

const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? '' : String(v);
};

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

const prefixFor = (type: DocType): 'Oci' | 'Pio' => (type === 'PIO' ? 'Pio' : 'Oci');

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Previews = { front: UploadedFile | null; back: UploadedFile | null };

export default function OciUpload() {
  const router = useRouter();

  const [docType, setDocType] = useState<DocType>('');
  const [cardNo, setCardNo] = useState('');

  const [savedByType, setSavedByType] = useState<Record<string, string>>({});
  const [previewsByType, setPreviewsByType] = useState<Record<string, Previews>>({});
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [prefillDone, setPrefillDone] = useState(false);
  const docTypeRef = useRef<DocType>('');
  useEffect(() => {
    docTypeRef.current = docType;
  }, [docType]);

  const frontUploaded = frontFiles.some((f) => f.status === 'success');

  const isDisabled = docType === '' || cardNo.trim() === '' || !frontUploaded;

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

  const handleDocTypeChange = (value: DocType) => {
    setDocType(value);
    setCardNo(value ? savedByType[value] ?? '' : '');
    setFrontInitial(value ? previewsByType[value]?.front ?? null : null);
    setBackInitial(value ? previewsByType[value]?.back ?? null : null);
  };

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
        secureSessionService.setItem(storageKey, id);
      };

  const uploadFront = makeUploadFn('Front', 'frontDocumentId');
  const uploadBack = makeUploadFn('Back', 'backDocumentId');

  // const handleBack = () => router.back();

  const handleBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    await dynamicBackService("POI_OCI", applicationId, {
      push: router.push,
      showSpinner,
      hideSpinner,
    });

  };

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

  const docTypeField = (idSuffix: 'mob' | 'desk') => (
    <>
      <span className={styles.fieldLabel} id={`${idSuffix}-doc-type-label`}>Document Type *</span>
      <div
        className={styles.radioGroup}
        role="radiogroup"
        aria-labelledby={`${idSuffix}-doc-type-label`}
      >
        {DOC_OPTIONS.map((o) => (
          <label
            key={o.value}
            className={`${styles.radioOption}${docType === o.value ? ` ${styles.radioOptionActive}` : ''}`}
            htmlFor={`${idSuffix}-doc-type-${o.value}`}
          >
            <input
              id={`${idSuffix}-doc-type-${o.value}`}
              type="radio"
              name={`${idSuffix}-doc-type`}
              className={styles.radioInput}
              value={o.value}
              checked={docType === o.value}
              onChange={() => handleDocTypeChange(o.value)}
            />
            <span className={styles.radioLabelText}>{o.label}</span>
          </label>
        ))}
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
