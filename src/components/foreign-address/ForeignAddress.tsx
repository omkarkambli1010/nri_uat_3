'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import styles from './foreign-address.module.scss';
import uploadStyles from '@/components/oci/oci.module.scss';
import { FOREIGN_UPLOAD_TYPES } from '@/constants/foreignUpload-type';
import LoadingButton from '@/components/ui/LoadingButton';
import { useCountryNames } from '@/components/country-select/useCountries';
import { useSpinner } from '@/components/spinner/Spinner';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { buildInitialFileFromUrl } from '@/components/file-upload/buildInitialFile';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';

// Convert 'YYYY-MM-DD' string → Date | null  (for Calendar value prop)
const strToDate = (s: string): Date | null => (s ? new Date(s) : null);

// Convert Date | null → 'YYYY-MM-DD' string  (for state / API)
const dateToStr = (d: Date | null | undefined): string => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

// ForeignAddress — Enter Foreign Address form
// Figma: Onboarding-Mob-Foreignaddress (0:42951)
//        Onboarding-Web-Foreignaddress (0:43062)
// Route: /foreignAddress

// [enumKey, displayLabel] — the select carries the enum key (sent to the API as
// ProofType, e.g. "ResidentPermitOrVisa"); the label is shown to the user.
const DOCUMENT_TYPE_ENTRIES = Object.entries(FOREIGN_UPLOAD_TYPES) as [string, string][];

// enum key → display label (used for the button text and the upload-screen titles).
const proofTypeLabel = (key: string): string =>
  (FOREIGN_UPLOAD_TYPES as Record<string, string>)[key] ?? key;

// OVD (Officially Valid Documents) — identity/permit documents that carry an
// expiry date. The "Document Expiry Date" field is shown & required ONLY when an
// OVD is selected; pure address-proof documents (bank statement, utility bill,
// company/university letter, lease) hide it.
const OVD_DOCUMENT_TYPES = new Set<string>([
  'Pio',
  'Oci',
  'DrivingLicense',
  'PermanentResidentCard',
  'ForeignGovtIssuedIdentityCard',
  'ResidentPermitOrVisa',
  'IqamaOrNationalAddressCertificate',
]);

const isOvd = (key: string): boolean => OVD_DOCUMENT_TYPES.has(key);

// Country list comes from the Country Master API (status = 'Y' only) via the
// useCountryNames hook; restricted countries are filtered out at the source.

// Postal/ZIP — alphanumeric (letters, digits, space, hyphen), 3–12 chars.
const POSTAL_RE = /^[A-Za-z0-9\s-]{3,12}$/;
// Address proof number — alphanumeric (letters, digits, space, hyphen).
const PROOF_NUMBER_RE = /^[A-Za-z0-9\s-]+$/;

// ── Upload constraints (front + back proof) ──────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// uiMetadata JSON → next route (e.g. '{"route":"esign"}' → '/esign').
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

function CaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Info icon for the pincode hint (replaces an expired Figma asset URL).
function InfoIcon({ color = '#999999' }: { color?: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.4" />
      <path d="M10 9v4.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="10" cy="6.5" r="0.9" fill={color} />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 18"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 6"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Validation field keys
type FieldKey =
  | 'docType' | 'docNumber' | 'expiryDate' | 'selCountry'
  | 'addrLine1' | 'city' | 'addrState' | 'pincode';

export default function ForeignAddress() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const { names: countryNames, loading: countryLoading } = useCountryNames();

  // Keep the global loader up until the country list AND the saved-stage prefill
  // (fields + document previews) have finished, so the form never flashes empty
  // or half-bound. `prefillDone` flips true once the prefill settles.
  const [prefillDone, setPrefillDone] = useState(false);

  const [docType, setDocType] = useState('');
  const [docNumber, setDocNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selCountry, setSelCountry] = useState('');
  const [addrLine1, setAddrLine1] = useState('');
  const [addrLine2, setAddrLine2] = useState('');
  const [addrLine3, setAddrLine3] = useState('');
  const [city, setCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [pincode, setPincode] = useState('');

  // Proof files (front + back), selected on this same page and submitted with
  // the address fields in one multipart request on Proceed.
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Previously-uploaded proof documents (from the saved stage) seeded into the
  // front/back upload cards so they render in the dropzone preview (and can be
  // replaced). Keyed so the card remounts once the async fetch resolves.
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);

  // Existing proof document ids captured from the saved stage's documents[]
  // (index 0 → front, 1 → back). Sent as Existing*DocumentId on a revisit when
  // the user hasn't re-picked that slot's file.
  const [frontDocumentId, setFrontDocumentId] = useState('');
  const [backDocumentId, setBackDocumentId] = useState('');

  // A freshly-picked file: a real File with bytes that isn't the byte-less
  // saved-document preview (those carry an id prefixed "saved-").
  const getFreshFile = (files: UploadedFile[]): File | null =>
    files.find(
      (f) => f.file instanceof File && !f.id.startsWith('saved-') && f.file.size > 0,
    )?.file ?? null;

  // Whether the seeded saved-document preview is still shown for a slot. Removing
  // it (without picking a new file) makes the slot not-ready, forcing a re-pick.
  const hasSeeded = (files: UploadedFile[]): boolean =>
    files.some((f) => f.id.startsWith('saved-'));

  const freshFront = getFreshFile(frontFiles);
  const freshBack = getFreshFile(backFiles);

  // Per-slot readiness: a new file was picked, OR a saved document exists and its
  // preview is still shown (so it can be re-sent by id).
  const frontReady = freshFront !== null || (!!frontDocumentId && hasSeeded(frontFiles));
  const backReady = freshBack !== null || (!!backDocumentId && hasSeeded(backFiles));
  const filesReady = frontReady && backReady;

  // Tracks which fields the user has interacted with (blur) or attempted to
  // submit — errors only render for touched fields.
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  const showExpiry = isOvd(docType);

  // Prefill the form from the saved FOREIGNADDRESS stage (POST …/get/workflow/
  // stagewisedate { stagename: "FOREIGNADDRESS" }) so a revisit shows the
  // previously-entered address. Document uploads are not prefilled — the user
  // re-selects the front/back proof files.
  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      setPrefillDone(true);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getForeignAddressWorkflow(applicationId);
        if (!alive) return;
        const d = res?.data as Record<string, unknown> | undefined;
        if (!d) return;

        const str = (v: unknown): string => (v == null ? '' : String(v));
        if (str(d.line1)) setAddrLine1(str(d.line1));
        if (str(d.line2)) setAddrLine2(str(d.line2));
        if (str(d.line3)) setAddrLine3(str(d.line3));
        if (str(d.city)) setCity(str(d.city));
        // The saved stage returns `stateProvince` / `postalCode` (matching the
        // submit payload) — the older `state` / `pincode` keys are kept only as
        // a fallback so a revisit binds the State and Pincode fields.
        if (str(d.stateProvince) || str(d.state)) setAddrState(str(d.stateProvince) || str(d.state));
        if (str(d.postalCode) || str(d.pincode)) setPincode(str(d.postalCode) || str(d.pincode));
        if (str(d.country)) setSelCountry(str(d.country));
        if (str(d.proofNumber)) setDocNumber(str(d.proofNumber));
        // Expiry is returned as YYYY-MM-DD (may carry a time component) — keep
        // only the date part so DateField can parse it. Shown once an OVD
        // proofType is prefilled below (showExpiry).
        if (str(d.expiryDate)) setExpiryDate(str(d.expiryDate).slice(0, 10));

        // Saved proof documents (documents[] is on the response root, each with
        // a presignedUrl). Seed the first into the Front card and the second
        // (if any) into the Back card so they show in the dropzone preview.
        const docs = Array.isArray(res?.documents)
          ? (res.documents as Record<string, unknown>[])
          : [];

        // Capture the saved proof document ids (index 0 → front, 1 → back) so a
        // revisit can re-submit them by id instead of re-uploading the bytes.
        const pickDocId = (doc: Record<string, unknown> | undefined): string => {
          const v = doc?.documentId ?? doc?.documentID ?? doc?.id;
          return v == null ? '' : String(v);
        };
        if (pickDocId(docs[0])) setFrontDocumentId(pickDocId(docs[0]));
        if (pickDocId(docs[1])) setBackDocumentId(pickDocId(docs[1]));

        // Document Type — prefer the uploaded proof's documentType (the actual
        // foreign-address proof, e.g. "BankStatement"); fall back to
        // data.proofType. Match against both the enum keys AND the display
        // labels, case-insensitively. The DigiLocker source type "AadhaarCard"
        // isn't a foreign option, so it simply won't match.
        const matchDocType = (value: string): string | undefined => {
          const v = value.trim().toLowerCase();
          if (!v) return undefined;
          const hit = DOCUMENT_TYPE_ENTRIES.find(
            ([key, label]) => key.toLowerCase() === v || label.toLowerCase() === v,
          );
          return hit?.[0];
        };
        const docTypeKey =
          matchDocType(str(docs[0]?.documentType)) ?? matchDocType(str(d.proofType));
        if (docTypeKey) setDocType(docTypeKey);

        const urls = docs
          .map((doc) => str(doc.presignedUrl ?? doc.preSignedUrl ?? doc.url))
          .filter(Boolean);

        // Await the document seeding so the loader stays up until the previews
        // are ready too (not just the text fields).
        const [front, back] = await Promise.all([
          buildInitialFileFromUrl(urls[0] ?? '', 'proof-document'),
          buildInitialFileFromUrl(urls[1] ?? '', 'proof-document'),
        ]);
        if (alive) {
          if (front) setFrontInitial(front);
          if (back) setBackInitial(back);
        }
      } catch {
        // Non-fatal — the form just stays empty.
      } finally {
        if (alive) setPrefillDone(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Show the loader on mount; hide it only once both the country list and the
  // prefill have finished, so the UI is fully bound before it's revealed.
  useEffect(() => {
    showSpinner();
    return () => hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillDone && !countryLoading) hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDone, countryLoading]);

  // ── Validation ──────────────────────────────────────────────────────────────
  // Returns a map of fieldKey → error message. Empty map = valid.
  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};

    if (!docType) {
      e.docType = 'Please select a valid Address Proof Document Type.';
    }

    if (!docNumber.trim() || !PROOF_NUMBER_RE.test(docNumber.trim())) {
      e.docNumber = 'Please enter Address Proof number';
    }

    // Expiry only applies to OVD documents.
    if (showExpiry && !expiryDate) {
      e.expiryDate = 'Please Select Expiry date';
    }

    if (!selCountry) {
      e.selCountry = 'Please select a valid country.';
    }

    if (!addrLine1.trim()) {
      e.addrLine1 = 'Address Line 1 is required.';
    }

    if (!city.trim()) {
      e.city = 'City is required.';
    }

    // State/Province is optional per BRD — not validated.

    if (!pincode.trim() || !POSTAL_RE.test(pincode.trim())) {
      e.pincode = 'Please enter a valid Postal/ZIP Code.';
    }

    return e;
  };

  const errors = validate();
  const isValid = Object.keys(errors).length === 0;

  // Show an error only once the field has been touched (blur) or a submit was
  // attempted (handleProceed marks every field touched).
  const errFor = (k: FieldKey): string | undefined => (touched[k] ? errors[k] : undefined);

  const markTouched = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }));

  // When the document type changes away from an OVD, drop any expiry value so a
  // stale date isn't submitted for a non-expiring document.
  const handleDocTypeChange = (value: string) => {
    setDocType(value);
    if (!isOvd(value)) {
      setExpiryDate('');
      setTouched((t) => ({ ...t, expiryDate: false }));
    }
  };

  // Display label for the selected document type, used in the upload section
  // titles ("Upload <Document> Front/Back").
  const docLabel = docType ? proofTypeLabel(docType) : 'Document';

  // Proceed is enabled once all fields are valid AND both proof files are
  // selected. It submits everything (fields + files) in one multipart request.
  const canSubmit = isValid && filesReady && !submitting;

  const handleProceed = async () => {
    if (submitting) return;

    // Mark all fields touched so every inline error becomes visible on submit.
    setTouched({
      docType: true, docNumber: true, expiryDate: true, selCountry: true,
      addrLine1: true, city: true, addrState: true, pincode: true,
    });
    if (!isValid) {
      toast.error('Please fill all the required fields highlighted below.');
      return;
    }

    // Each slot needs either a freshly-picked file or a still-shown saved proof.
    if (!frontReady && !backReady) {
      toast.error('Please upload the front and back of your document.');
      return;
    }
    if (!frontReady) {
      toast.error('Please upload the front of your document.');
      return;
    }
    if (!backReady) {
      toast.error('Please upload the back of your document.');
      return;
    }

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.submitForeignAddress(applicationId, {
        line1: addrLine1.trim(),
        line2: addrLine2.trim(),
        line3: addrLine3.trim(),
        city: city.trim(),
        stateProvince: addrState.trim(),
        postalCode: pincode.trim(),
        country: selCountry,           // from the "Select Country" dropdown
        proofType: docType,            // enum key, e.g. "ResidentPermitOrVisa"
        proofNumber: docNumber.trim(),
        expiryDate,                    // YYYY-MM-DD (empty for non-OVD docs)
        // Per slot: send the freshly-picked file, otherwise re-use the saved
        // document by id (revisit without re-upload).
        frontFile: freshFront ?? undefined,
        backFile: freshBack ?? undefined,
        existingFrontDocumentId: freshFront ? undefined : frontDocumentId,
        existingBackDocumentId: freshBack ? undefined : backDocumentId,
      });

      // Navigate per uiMetadata route from the response, fall back to /esign.
      router.push(routeFromUiMetadata(res) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Upload sections (front + back) — rendered below the fields ──────────────
  // No uploadFn: files are collected locally and submitted together on Proceed.
  // A previously-saved document (frontInitial / backInitial) is seeded into the
  // card so it shows in the dropzone preview, just like a freshly cropped image;
  // the `key` forces a remount once the async fetch resolves.
  const frontSection = (
    <div className={uploadStyles.section}>
      <p className={uploadStyles.sectionTitle}>Upload {docLabel} Front</p>
      <FileUploadCard
        key={frontInitial?.id ?? 'front-empty'}
        initialFiles={frontInitial ? [frontInitial] : undefined}
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
    <div className={uploadStyles.section}>
      <p className={uploadStyles.sectionTitle}>Upload {docLabel} Back</p>
      <FileUploadCard
        key={backInitial?.id ?? 'back-empty'}
        initialFiles={backInitial ? [backInitial] : undefined}
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

  // ── MOBILE ────────────────────────────────────────────────────────────────
  const mobileLayout = (
    <div className={styles.mobilePage}>

      {/* Gray header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderInner}>
          <button
            type="button"
            className={styles.mobileBackBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>Enter Foreign Address</h1>
            <p className={styles.mobileSubtitle}>
              Enter your details manually and upload any document (front and back) for verification.
            </p>
          </div>
        </div>
      </div>

      {/* White card form */}
      <div className={styles.mobileCard} data-lenis-prevent>

        {/* BRD note — English translation required for non-English documents */}
        <p className={styles.translationNote}>
          Note: Requiring English translated copy for non-English documents.
        </p>

        {/* Document Type */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-doc-type">Document Type *</label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-doc-type"
              className={styles.fieldSelect}
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              onBlur={() => markTouched('docType')}
            >
              <option value="" disabled>Select</option>
              {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
          {errFor('docType') && <p className={styles.fieldError}>{errFor('docType')}</p>}
        </div>

        {/* Document Number */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-doc-number">Document Number *</label>
          <input
            id="mob-doc-number"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter number"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            onBlur={() => markTouched('docNumber')}
          />
          {errFor('docNumber') && <p className={styles.fieldError}>{errFor('docNumber')}</p>}
        </div>

        {/* Document Expiry Date — OVD documents only */}
        {showExpiry && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-expiry">Document Expiry Date *</label>
            <DateField
              inputId="mob-expiry"
              value={strToDate(expiryDate)}
              onChange={(d) => setExpiryDate(dateToStr(d))}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              className="p-prime-cal"
            />
            {errFor('expiryDate') && <p className={styles.fieldError}>{errFor('expiryDate')}</p>}
          </div>
        )}

        {/* Select Country */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-sel-country">Select Country *</label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-sel-country"
              className={styles.fieldSelect}
              value={selCountry}
              onChange={(e) => setSelCountry(e.target.value)}
              onBlur={() => markTouched('selCountry')}
            >
              <option value="" disabled>Select</option>
              {countryNames.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
          {errFor('selCountry') && <p className={styles.fieldError}>{errFor('selCountry')}</p>}
        </div>

        {/* Address Line 1 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr1">Address Line 1 *</label>
          <input
            id="mob-addr1"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 1"
            value={addrLine1}
            onChange={(e) => setAddrLine1(e.target.value.slice(0, 50))}
            onBlur={() => markTouched('addrLine1')}
          />
          {errFor('addrLine1') && <p className={styles.fieldError}>{errFor('addrLine1')}</p>}
        </div>

        {/* Address Line 2 — optional */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr2">Address Line 2</label>
          <input
            id="mob-addr2"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 2"
            value={addrLine2}
            onChange={(e) => setAddrLine2(e.target.value.slice(0, 50))}
          />
        </div>

        {/* Address Line 3 — optional */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr3">Address Line 3</label>
          <input
            id="mob-addr3"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 3"
            value={addrLine3}
            onChange={(e) => setAddrLine3(e.target.value.slice(0, 50))}
          />
        </div>

        {/* City + State — side by side, gap-24 */}
        <div className={styles.mobileRowGroup}>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-city">City *</label>
            <input
              id="mob-city"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={() => markTouched('city')}
            />
            {errFor('city') && <p className={styles.fieldError}>{errFor('city')}</p>}
          </div>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-state">State (Optional)</label>
            <input
              id="mob-state"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
              onBlur={() => markTouched('addrState')}
            />
            {errFor('addrState') && <p className={styles.fieldError}>{errFor('addrState')}</p>}
          </div>
        </div>

        {/* Pincode + hint */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-pincode">Pincode *</label>
          <input
            id="mob-pincode"
            type="text"
            maxLength={12}
            className={styles.fieldInput}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            onBlur={() => markTouched('pincode')}
          />
          {errFor('pincode') && <p className={styles.fieldError}>{errFor('pincode')}</p>}
          <div className={styles.pincodeHint}>
            <InfoIcon color="#999999" />
            <p className={styles.pincodeHintText}>
              In absence of PIN for foreign address, Enter pincode as &apos;111111&apos;.
            </p>
          </div>
        </div>

        {/* Document upload (front + back); saved doc preview sits inside front */}
        <div className={styles.uploadGroup}>
          {frontSection}
          {backSection}
        </div>

      </div>

      {/* Fixed bottom — disabled until every field is valid and both files added */}
      <div className={styles.mobileProceedArea}>
        <LoadingButton
          type="button"
          className={`${styles.mobileProceedBtn}${!canSubmit ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
          onClick={handleProceed}
          disabled={submitting}
          aria-disabled={!canSubmit}
        >
          {submitting ? 'Submitting' : 'Proceed'}
        </LoadingButton>
      </div>
    </div>
  );

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  const desktopLayout = (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>

        {/* Header */}
        <div className={styles.desktopCardHeader}>
          <button
            type="button"
            className={styles.desktopBackBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          <div className={styles.desktopTitleBlock}>
            <h1 className={styles.desktopCardTitle}>Enter Foreign Address</h1>
            <p className={styles.desktopCardSubtitle}>
              Enter your details manually and upload any document (front and back) for verification.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={styles.desktopCardBody}>
          {/* data-lenis-prevent: let this inner area scroll natively on wheel
              (AppShell's Lenis smooth-scroll otherwise captures the wheel). */}
          <div className={styles.desktopFormArea} data-lenis-prevent>

            {/* BRD note — English translation required for non-English documents */}
            <p className={styles.translationNote}>
              Note: Requiring English translated copy for non-English documents.
            </p>

            {/* Document Type */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Type *</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={docType}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  onBlur={() => markTouched('docType')}
                  aria-label="Document Type"
                >
                  <option value="" disabled>Select</option>
                  {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>
            {errFor('docType') && <p className={styles.desktopFieldError}>{errFor('docType')}</p>}

            {/* Document Number */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Number *</p>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Enter number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                onBlur={() => markTouched('docNumber')}
                aria-label="Document Number"
              />
            </div>
            {errFor('docNumber') && <p className={styles.desktopFieldError}>{errFor('docNumber')}</p>}

            {/* Document Expiry Date — OVD documents only */}
            {showExpiry && (
              <>
                <div className={styles.desktopFieldRow}>
                  <p className={styles.desktopLabel}>Document Expiry Date *</p>
                  <div className={styles.deskCalendarWrap}>
                    <DateField
                      inputId="desk-expiry"
                      value={strToDate(expiryDate)}
                      onChange={(d) => setExpiryDate(dateToStr(d))}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className="p-prime-cal"
                    />
                  </div>
                </div>
                {errFor('expiryDate') && <p className={styles.desktopFieldError}>{errFor('expiryDate')}</p>}
              </>
            )}

            {/* Select Country */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Select Country *</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={selCountry}
                  onChange={(e) => setSelCountry(e.target.value)}
                  onBlur={() => markTouched('selCountry')}
                  aria-label="Select Country"
                >
                  <option value="" disabled>Select</option>
                  {countryNames.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>
            {errFor('selCountry') && <p className={styles.desktopFieldError}>{errFor('selCountry')}</p>}

            {/* Address — Line 1 + Line 2 inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Address *</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 1"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value.slice(0, 50))}
                  onBlur={() => markTouched('addrLine1')}
                  aria-label="Address Line 1"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 2"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value.slice(0, 50))}
                  aria-label="Address Line 2"
                />
              </div>
            </div>
            {errFor('addrLine1') && <p className={styles.desktopFieldError}>{errFor('addrLine1')}</p>}

            {/* Address Line 3 — offset, no label, optional */}
            <div className={styles.desktopAddrLine3Row}>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Address line 3"
                value={addrLine3}
                onChange={(e) => setAddrLine3(e.target.value.slice(0, 50))}
                aria-label="Address Line 3"
              />
            </div>

            {/* City & State — inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>City &amp; State *</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => markTouched('city')}
                  aria-label="City"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter state (optional)"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  onBlur={() => markTouched('addrState')}
                  aria-label="State (Optional)"
                />
              </div>
            </div>
            {(errFor('city') || errFor('addrState')) && (
              <p className={styles.desktopFieldError}>{errFor('city') ?? errFor('addrState')}</p>
            )}

            {/* Pincode + hint */}
            <div className={styles.fieldGroup}>
              <div className={styles.desktopFieldRow}>
                <p className={styles.desktopLabel}>Pincode *</p>
                <input
                  type="text"
                  maxLength={12}
                  className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  onBlur={() => markTouched('pincode')}
                  aria-label="Pincode"
                />
              </div>
              {errFor('pincode') && <p className={styles.desktopPincodeError}>{errFor('pincode')}</p>}
              <div className={styles.desktopPincodeHint}>
                <InfoIcon color="#3b4c72" />
                <p className={styles.desktopPincodeHintText}>
                  In absence of PIN for foreign address, Enter pincode as &apos;111111&apos;.
                </p>
              </div>
            </div>

            {/* Document upload (front + back); saved doc preview sits inside front */}
            <div className={styles.uploadGroup}>
              {frontSection}
              {backSection}
            </div>

          </div>

          {/* Proceed — disabled until every field is valid and both files added */}
          <div className={styles.desktopProceedWrapper}>
            <LoadingButton
              type="button"
              className={`${styles.desktopProceedBtn}${!canSubmit ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
              onClick={handleProceed}
              disabled={submitting}
              aria-disabled={!canSubmit}
            >
              {submitting ? 'Submitting' : 'Proceed'}
            </LoadingButton>
          </div>
        </div>

      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
 