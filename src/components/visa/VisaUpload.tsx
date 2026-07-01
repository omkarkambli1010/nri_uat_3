'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { buildInitialFileFromUrl } from '@/components/file-upload/buildInitialFile';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import { useCountries } from '@/components/country-select/useCountries';
import styles from './visa.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// VisaUpload — all-in-one Visa screen. Two FileUploadCards (Front + Back) on
// top, then ONE consolidated "extracted details" card (Figma 0:117650) holding
// all 8 visa-detail fields with a single Edit/Save pencil, single Proceed at the
// bottom. The details pencil stays locked until BOTH uploads return 200; mock
// OCR fills the fields on each upload success (front → first 4, back → last 4).

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

// ── Validation ──────────────────────────────────────────────────────────────
const DOC_NUMBER_RE = /^[A-Z0-9]{5,15}$/;

interface VisaDetails {
  documentType: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  country: string;
}

type FieldErrors = Partial<Record<keyof VisaDetails, string>>;

function validateDetails(d: VisaDetails): FieldErrors {
  const errs: FieldErrors = {};

  if (!d.documentType.trim()) errs.documentType = 'Document type is required';

  if (!d.documentNumber.trim()) errs.documentNumber = 'Document number is required';
  else if (!DOC_NUMBER_RE.test(d.documentNumber.trim())) {
    errs.documentNumber = '5–15 letters or digits (A–Z, 0–9)';
  }

  if (!d.issueDate) errs.issueDate = 'Issue date is required';
  else if (Number.isNaN(new Date(d.issueDate).getTime())) errs.issueDate = 'Enter a valid date';

  if (!d.expiryDate) errs.expiryDate = 'Expiry date is required';
  else if (Number.isNaN(new Date(d.expiryDate).getTime())) errs.expiryDate = 'Enter a valid date';
  else if (new Date(d.expiryDate) < minVisaExpiry()) {
    // BRD: a visa must have more than 3 months of validity remaining.
    errs.expiryDate = 'Please enter a valid Visa expiry Date. Expired dates are not allowed';
  }
  else if (d.issueDate && new Date(d.expiryDate) <= new Date(d.issueDate)) {
    errs.expiryDate = 'Expiry date must be after the issue date';
  }

  // Country is chosen from a dropdown, so non-empty is enough.
  if (!d.country.trim()) errs.country = 'Country is required';

  return errs;
}

// ── Date helpers — Calendar wants Date, the form keeps ISO strings ─────────
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
// more than 3 months of validity remaining). Anything before this is rejected.
function minVisaExpiry(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setMonth(d.getMonth() + 3);
  return d;
}

// ── Icons ───────────────────────────────────────────────────────────────────
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

function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M15 5l3 3" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Format ISO (YYYY-MM-DD) → DD/MM/YYYY for read-only display; falls back to raw.
const formatDateForDisplay = (iso: string): string => {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

// Read-only "Label: value" row used when a section is not in edit mode.
function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <p className={styles.extractedInlineRow}>
      {label}: <span className={styles.extractedInlineValue}>{value || '—'}</span>
    </p>
  );
}

// ── Field row — mobile stacks label/input, desktop renders side-by-side ────
function FieldRow({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.fieldRowLabel}>{label}</label>
      <div className={styles.inputCol}>
        {children}
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
      </div>
    </div>
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

// Pick a document's presigned URL out of a documents[] entry across key casings.
const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? '' : String(v);
};

export default function VisaUpload() {
  const router = useRouter();
  // /visa entry stores the picked expiry in sessionStorage before routing here;
  // older links may still carry it as ?expiry=<iso>. Loaded once on mount below.
  const searchParams = useSearchParams();

  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [additionalFiles, setAdditionalFiles] = useState<UploadedFile[]>([]);

  // Previously-uploaded visa documents (from the saved VISA stage) seeded into
  // the Front/Back/Additional upload cards so they render in the dropzone
  // preview. Keyed so each card remounts once the async fetch resolves.
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);
  const [additionalInitial, setAdditionalInitial] = useState<UploadedFile | null>(null);

  // Document ids returned by each successful upload (200) — sent in the final
  // POST /visa. Mirrored into sessionStorage per requirement.
  const [frontDocumentId, setFrontDocumentId] = useState('');
  const [backDocumentId, setBackDocumentId] = useState('');
  const [translationDocumentId, setTranslationDocumentId] = useState('');

  // Fields start blank ("—" in read-only mode); the user fills them via the
  // pencil once both uploads succeed. expiryDate is seeded from the entry pick.
  const [documentType, setDocumentType] = useState('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [country, setCountry] = useState('');

  // ISO code backing the Country dropdown (the *name* above is what we display +
  // submit as issuingCountry; the code is the select's value).
  const [countryCode, setCountryCode] = useState('');

  // Country list sourced from the Country Master API (status = 'Y').
  const { selectable: countryOptions } = useCountries();

  // Country change → record the selected name + code.
  const handleCountryChange = (iso: string) => {
    setCountryCode(iso);
    setCountry(countryOptions.find((c) => c.iso2 === iso)?.name ?? '');
    onFieldChange('country');
  };

  const [errors, setErrors] = useState<FieldErrors>({});

  // The details card starts read-only ("locked"); the pencil flips the fields to
  // editable. The pencil itself stays disabled until both uploads succeed.
  const [editMode, setEditMode] = useState(false);

  // True while the final POST /visa is in flight.
  const [submitting, setSubmitting] = useState(false);

  const expired = isExpired(expiryDate);

  // Earliest selectable expiry — BRD: past dates and the next 3 months are
  // invalid, so the picker floor is today + 3 months (or the issue date if it
  // somehow falls later). Matches the validateDetails() rule.
  const expiryMinDate = (() => {
    const floor = minVisaExpiry();
    const issue = isoToDate(issueDate);
    return issue && issue > floor ? issue : floor;
  })();

  const frontUploaded = frontFiles.some(f => f.status === 'success');
  const backUploaded = backFiles.some(f => f.status === 'success');

  // Seed the expiry from the entry screen (sessionStorage), falling back to the
  // legacy ?expiry query param. Only sets if still empty so it never clobbers edits.
  useEffect(() => {
    const fromSession =
      typeof window !== 'undefined' ? sessionStorage.getItem('visaExpiryDate') ?? '' : '';
    const fromQuery = searchParams?.get('expiry') ?? '';
    const initial = fromSession || fromQuery;
    if (initial) setExpiryDate(v => v || initial);
  }, [searchParams]);

  // Prefill from the saved VISA stage (POST …/get/workflow/stagewisedate
  // { stagename: "VISA" }) so a revisit shows the previously-entered details,
  // the captured document ids, and the uploaded document previews.
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

        if (str(d.visaType)) setDocumentType(str(d.visaType));
        if (str(d.visaNumber)) setDocumentNumber(str(d.visaNumber));
        if (str(d.issueDate)) setIssueDate(str(d.issueDate));
        if (str(d.expiryDate)) setExpiryDate(str(d.expiryDate));
        // Country name from the response; the iso2 code backing the dropdown is
        // resolved in the effect below once the country list has loaded.
        if (str(d.issuingCountry)) setCountry(str(d.issuingCountry));

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
        // Non-fatal — the form just stays empty.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Resolve the Country dropdown's iso2 code from the prefilled country name once
  // the country list has loaded (the response carries the name, not the code).
  useEffect(() => {
    if (!country || countryCode || countryOptions.length === 0) return;
    const hit = countryOptions.find(
      (c) => c.name.toLowerCase() === country.toLowerCase(),
    );
    if (hit) setCountryCode(hit.iso2);
  }, [country, countryCode, countryOptions]);

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

  // Additional document → VisaTranslation. Used by the modal's real uploadFn.
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

  // Proceed gate — both files uploaded AND every visa field filled. The
  // additional document stays optional, so it never blocks Proceed. While the
  // details card is in edit mode, Proceed stays disabled until the user clicks
  // Save (which exits edit mode); clicking Save with no changes re-enables it.
  const isDisabled =
    editMode ||
    !frontUploaded ||
    !backUploaded ||
    !documentType.trim() ||
    !documentNumber.trim() ||
    !issueDate ||
    !expiryDate ||
    !country.trim();

  const onFieldChange = (key: keyof VisaDetails) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleBack = () => router.back();

  // Visa payload for POST /visa. Document ids fall back to sessionStorage if
  // state isn't set yet. Missing ids are sent as null (NOT empty string) — the
  // API rejects "" for the GUID fields, which fails body binding
  // ("The req field is required."); null is accepted. translationDocumentId is
  // null whenever no additional document was uploaded.
  const buildVisaPayload = () => {
    const front = frontDocumentId || sessionStorage.getItem('frontDocumentId') || '';
    const back = backDocumentId || sessionStorage.getItem('backDocumentId') || '';
    const translation =
      translationDocumentId || sessionStorage.getItem('translationDocumentId') || '';

    return {
      visaNumber: documentNumber,
      visaType: documentType,
      issuingCountry: country,
      issueDate,
      expiryDate,
      frontDocumentId: front || null,
      backDocumentId: back || null,
      translationDocumentId: translation || null,
    };
  };

  // Bottom CTA — validate the visa fields, then POST everything (details + the
  // uploaded document ids) in one request and advance to /esign. Stays put on failure.
  const handleProceed = async () => {
    if (submitting) return;
    const current: VisaDetails = {
      documentType,
      documentNumber,
      issueDate,
      expiryDate,
      country,
    };
    const errs = validateDetails(current);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted fields and try again');
      return;
    }
    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await apiService.submitVisa(applicationId, buildVisaPayload());
      // router.push('/esign');
      let route = "";
      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
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

  const inputCls = (key: keyof VisaDetails) =>
    `${styles.editFieldInput}${errors[key] ? ` ${styles.editFieldInputError}` : ''}`;

  // Details pencil/Save toggle. Pencil → enter edit mode. Save → validate the
  // fields and exit edit mode (the actual POST happens on the bottom Proceed).
  const handleEditToggle = () => {
    if (!editMode) {
      setEditMode(true);
      return;
    }
    const current: VisaDetails = {
      documentType, documentNumber, issueDate, expiryDate, country,
    };
    const errs = validateDetails(current);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted fields and try again');
      return;
    }
    setEditMode(false);
  };

  // ─── Upload sections ──────────────────────────────────────────────────────
  // Front and Back are upload-only now (title + card). The extracted details
  // for both live together in the single details card below.
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

  // ─── Details card (Figma 0:117650) ────────────────────────────────────────
  // One dashed-border card with all 8 fields. Read-only "Label: value" rows by
  // default; the pencil (locked until both uploads succeed) flips them to
  // inputs. The toggle becomes "Save" while editing.
  const expiredWarning = expired && (
    <div className={styles.expiryErrorRow} role="alert">
      <span className={styles.expiryErrorIcon}>
        <IconExclamationCircle />
      </span>
      <p className={styles.expiryErrorText}>Visa has already expired</p>
    </div>
  );

  const detailsCard = (
    <div className={styles.extractedCard}>
      {editMode ? (
        <div className={styles.detailsEditHeader}>
          <button
            type="button"
            className={styles.editToggleBtn}
            onClick={handleEditToggle}
            disabled={submitting}
            aria-disabled={submitting}
            aria-label="Save details"
            aria-pressed
            title="Save"
          >
            {submitting ? 'Saving' : 'Save'}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.editBtn}
          onClick={handleEditToggle}
          aria-label="Edit details"
          aria-pressed={false}
          title="Edit"
        >
          <IconEdit />
        </button>
      )}

      {editMode ? (
        <div className={styles.detailsEditFields}>
          <FieldRow id="documentType" label="Document Type" error={errors.documentType}>
            <select
              id="documentType"
              value={documentType}
              onChange={(e) => { setDocumentType(e.target.value); onFieldChange('documentType'); }}
              className={inputCls('documentType')}
              aria-invalid={!!errors.documentType}
            >
              <option value="">Select</option>
              <option value="Visa">Visa</option>
              <option value="Visa Card">Visa Card</option>
            </select>
          </FieldRow>

          <FieldRow id="documentNumber" label="Document Number" error={errors.documentNumber}>
            <input
              id="documentNumber"
              type="text"
              maxLength={15}
              value={documentNumber}
              onChange={(e) => {
                setDocumentNumber(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                onFieldChange('documentNumber');
              }}
              className={inputCls('documentNumber')}
              aria-invalid={!!errors.documentNumber}
              placeholder="e.g. IND121233H"
              autoComplete="off"
            />
          </FieldRow>

          <FieldRow id="issueDate" label="Document Issue Date" error={errors.issueDate}>
            <DateField
              inputId="issueDate"
              value={isoToDate(issueDate)}
              onChange={(d) => { setIssueDate(dateToIso(d)); onFieldChange('issueDate'); }}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              maxDate={new Date()}
              className={`p-prime-cal${errors.issueDate ? ' p-prime-cal-error' : ''}`}
            />
          </FieldRow>

          <FieldRow id="expiryDate" label="Document Expiry Date" error={errors.expiryDate}>
            <DateField
              inputId="expiryDate"
              value={isoToDate(expiryDate)}
              onChange={(d) => { setExpiryDate(dateToIso(d)); onFieldChange('expiryDate'); }}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              minDate={expiryMinDate}
              className={`p-prime-cal${errors.expiryDate ? ' p-prime-cal-error' : ''}${expired ? ` ${styles.expiredCalendar}` : ''}`}
            />
            {expired && !errors.expiryDate && expiredWarning}
          </FieldRow>

          <FieldRow id="country" label="Country" error={errors.country}>
            <select
              id="country"
              value={countryCode}
              onChange={(e) => handleCountryChange(e.target.value)}
              className={inputCls('country')}
              aria-invalid={!!errors.country}
            >
              <option value="">Select country</option>
              {countryOptions.map((c) => (
                <option key={c.iso2} value={c.iso2}>{c.name}</option>
              ))}
            </select>
          </FieldRow>
        </div>
      ) : (
        <div className={styles.extractedInlineList}>
          <ReadOnlyRow label="Document Type" value={documentType} />
          <ReadOnlyRow label="Document Number" value={documentNumber} />
          <ReadOnlyRow label="Document Issue Date" value={formatDateForDisplay(issueDate)} />
          <ReadOnlyRow label="Document Expiry Date" value={formatDateForDisplay(expiryDate)} />
          <ReadOnlyRow label="Country" value={country} />
          {expiredWarning}
        </div>
      )}
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
                Upload your Visa (front &amp; back) and confirm the details below.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {frontSection}
          {backSection}
          {additionalSection}
          {detailsCard}
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
                Upload your Visa (front &amp; back) and confirm the details below.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {frontSection}
              {backSection}
              {additionalSection}
              {detailsCard}
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
