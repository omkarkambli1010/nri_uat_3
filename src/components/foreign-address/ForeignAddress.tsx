'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import styles from './foreign-address.module.scss';
import { FOREIGN_UPLOAD_TYPES } from '@/constants/foreignUpload-type';
import LoadingButton from '@/components/ui/LoadingButton';

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

// FATF-restricted countries (Country Master Status = N). Excluded from the
// dropdown and rejected on validation. None of the allowed COUNTRIES below are
// on this list today — the check is defensive for when the master grows.
const FATF_RESTRICTED = new Set<string>([
  'North Korea', 'Iran', 'Myanmar', 'Syria', 'Yemen',
]);

const ALL_COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'United Arab Emirates', 'Germany', 'France',
  'Japan', 'New Zealand', 'Switzerland', 'Netherlands',
  'Bahrain', 'Kuwait', 'Qatar', 'Saudi Arabia',
];

// Country Master Status = Y (allowed) — FATF-restricted entries filtered out.
const COUNTRIES = ALL_COUNTRIES.filter((c) => !FATF_RESTRICTED.has(c));

// Postal/ZIP — alphanumeric (letters, digits, space, hyphen), 3–12 chars.
const POSTAL_RE = /^[A-Za-z0-9\s-]{3,12}$/;
// Address proof number — alphanumeric (letters, digits, space, hyphen).
const PROOF_NUMBER_RE = /^[A-Za-z0-9\s-]+$/;

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

  // Tracks which fields the user has interacted with (blur) or attempted to
  // submit — errors only render for touched fields.
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});

  const showExpiry = isOvd(docType);

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

    if (!selCountry || FATF_RESTRICTED.has(selCountry)) {
      e.selCountry = 'Please select a valid country. FATF-restricted countries are not allowed.';
    }

    if (!addrLine1.trim()) {
      e.addrLine1 = 'Address Line 1 is required.';
    }

    if (!city.trim()) {
      e.city = 'City is required.';
    }

    if (!addrState.trim()) {
      e.addrState = 'State/Province is required for the selected country.';
    }

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

  // Button label reflects selected document type (display label, not the enum key).
  const btnLabel = `Upload '${docType ? proofTypeLabel(docType) : 'Select'}' Front`;

  const handleProceed = () => {
    // Mark all fields touched so every error becomes visible on submit.
    setTouched({
      docType: true, docNumber: true, expiryDate: true, selCountry: true,
      addrLine1: true, city: true, addrState: true, pincode: true,
    });
    if (!isValid) return;

    // Persist the whole form so the upload screen can submit it alongside the
    // proof files. Field names map to the API multipart parts (see
    // apiService.submitForeignAddress). fa_documentType keeps the display label
    // for the upload-screen section titles.
    if (typeof window !== 'undefined') {
      const address = {
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
      };
      sessionStorage.setItem('fa_address', JSON.stringify(address));
      sessionStorage.setItem('fa_documentType', proofTypeLabel(docType));
    }
    router.push('/foreignAddress/upload');
  };

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

        {/* Document Type */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-doc-type">Document Type</label>
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
          <label className={styles.fieldLabel} htmlFor="mob-doc-number">Document Number</label>
          <input
            id="mob-doc-number"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter number"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
            onBlur={() => markTouched('docNumber')}
          />
          {errFor('docNumber') && <p className={styles.fieldError}>{errFor('docNumber')}</p>}
        </div>

        {/* Document Expiry Date — OVD documents only */}
        {showExpiry && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-expiry">Document Expiry Date</label>
            <DateField
              inputId="mob-expiry"
              value={strToDate(expiryDate)}
              onChange={(d) => setExpiryDate(dateToStr(d))}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              className="p-prime-cal"
            />
            {errFor('expiryDate') && <p className={styles.fieldError}>{errFor('expiryDate')}</p>}
          </div>
        )}

        {/* Select Country */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-sel-country">Select Country</label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-sel-country"
              className={styles.fieldSelect}
              value={selCountry}
              onChange={(e) => setSelCountry(e.target.value)}
              onBlur={() => markTouched('selCountry')}
            >
              <option value="" disabled>Select</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
          {errFor('selCountry') && <p className={styles.fieldError}>{errFor('selCountry')}</p>}
        </div>

        {/* Address Line 1 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr1">Address Line 1</label>
          <input
            id="mob-addr1"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 1"
            value={addrLine1}
            onChange={(e) => setAddrLine1(e.target.value.toUpperCase())}
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
            onChange={(e) => setAddrLine2(e.target.value.toUpperCase())}
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
            onChange={(e) => setAddrLine3(e.target.value.toUpperCase())}
          />
        </div>

        {/* City + State — side by side, gap-24 */}
        <div className={styles.mobileRowGroup}>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-city">City</label>
            <input
              id="mob-city"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value.toUpperCase())}
              onBlur={() => markTouched('city')}
            />
            {errFor('city') && <p className={styles.fieldError}>{errFor('city')}</p>}
          </div>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-state">State</label>
            <input
              id="mob-state"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value.toUpperCase())}
              onBlur={() => markTouched('addrState')}
            />
            {errFor('addrState') && <p className={styles.fieldError}>{errFor('addrState')}</p>}
          </div>
        </div>

        {/* Pincode + hint */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-pincode">Pincode</label>
          <input
            id="mob-pincode"
            type="text"
            maxLength={12}
            className={styles.fieldInput}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.toUpperCase())}
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

      </div>

      {/* Fixed bottom — disabled until every field is valid */}
      <div className={styles.mobileProceedArea}>
        <LoadingButton
          type="button"
          className={`${styles.mobileProceedBtn}${!isValid ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
          onClick={handleProceed}
          disabled={!isValid}
          aria-disabled={!isValid}
        >
          {btnLabel}
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


            {/* Document Type */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Type</p>
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
              <p className={styles.desktopLabel}>Document Number</p>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Enter number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value.toUpperCase())}
                onBlur={() => markTouched('docNumber')}
                aria-label="Document Number"
              />
            </div>
            {errFor('docNumber') && <p className={styles.desktopFieldError}>{errFor('docNumber')}</p>}

            {/* Document Expiry Date — OVD documents only */}
            {showExpiry && (
              <>
                <div className={styles.desktopFieldRow}>
                  <p className={styles.desktopLabel}>Document Expiry Date</p>
                  <div className={styles.deskCalendarWrap}>
                    <DateField
                      inputId="desk-expiry"
                      value={strToDate(expiryDate)}
                      onChange={(d) => setExpiryDate(dateToStr(d))}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      className="p-prime-cal"
                    />
                  </div>
                </div>
                {errFor('expiryDate') && <p className={styles.desktopFieldError}>{errFor('expiryDate')}</p>}
              </>
            )}

            {/* Select Country */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Select Country</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={selCountry}
                  onChange={(e) => setSelCountry(e.target.value)}
                  onBlur={() => markTouched('selCountry')}
                  aria-label="Select Country"
                >
                  <option value="" disabled>Select</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>
            {errFor('selCountry') && <p className={styles.desktopFieldError}>{errFor('selCountry')}</p>}

            {/* Address — Line 1 + Line 2 inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Address</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 1"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('addrLine1')}
                  aria-label="Address Line 1"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 2"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value.toUpperCase())}
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
                onChange={(e) => setAddrLine3(e.target.value.toUpperCase())}
                aria-label="Address Line 3"
              />
            </div>

            {/* City & State — inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>City &amp; State</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('city')}
                  aria-label="City"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter state"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('addrState')}
                  aria-label="State"
                />
              </div>
            </div>
            {(errFor('city') || errFor('addrState')) && (
              <p className={styles.desktopFieldError}>{errFor('city') ?? errFor('addrState')}</p>
            )}

            {/* Pincode + hint */}
            <div className={styles.fieldGroup}>
              <div className={styles.desktopFieldRow}>
                <p className={styles.desktopLabel}>Pincode</p>
                <input
                  type="text"
                  maxLength={12}
                  className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.toUpperCase())}
                  onBlur={() => markTouched('pincode')}
                  aria-label="Pincode"
                />
              </div>
              {errFor('pincode') && <p className={styles.desktopFieldError}>{errFor('pincode')}</p>}
              <div className={styles.desktopPincodeHint}>
                <InfoIcon color="#3b4c72" />
                <p className={styles.desktopPincodeHintText}>
                  In absence of PIN for foreign address, Enter pincode as &apos;111111&apos;.
                </p>
              </div>
            </div>

          </div>

          {/* Proceed — disabled until every field is valid */}
          <div className={styles.desktopProceedWrapper}>
            <LoadingButton
              type="button"
              className={`${styles.desktopProceedBtn}${!isValid ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
              onClick={handleProceed}
              disabled={!isValid}
              aria-disabled={!isValid}
            >
              {btnLabel}
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
