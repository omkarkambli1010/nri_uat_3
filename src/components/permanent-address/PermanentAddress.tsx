'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import styles from './permanent-address.module.scss';
import { FOREIGN_UPLOAD_TYPES } from '@/constants/foreignUpload-type';

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

// PermanentAddress — Enter Permanent Address form
// Mirrors the Foreign Address - Manual form (same fields & layout).
// Route: /permanentAddress

// [enumKey, displayLabel] — the select carries the enum key (sent to the API as
// ProofType); the label is shown to the user.
const DOCUMENT_TYPE_ENTRIES = Object.entries(FOREIGN_UPLOAD_TYPES) as [string, string][];

// enum key → display label (used for the button text and the upload-screen titles).
const proofTypeLabel = (key: string): string =>
  (FOREIGN_UPLOAD_TYPES as Record<string, string>)[key] ?? key;

const COUNTRIES = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'United Arab Emirates', 'Germany', 'France',
  'Japan', 'New Zealand', 'Switzerland', 'Netherlands',
  'Bahrain', 'Kuwait', 'Qatar', 'Saudi Arabia',
];

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

export default function PermanentAddress() {
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

  // Button label reflects selected document type (display label, not the enum key).
  const btnLabel = `Upload '${docType ? proofTypeLabel(docType) : 'Select'}' Front`;

  // Enabled only once every required field is filled. Address line 2 & 3 are
  // optional (line 3 has no "Enter…" placeholder in Figma).
  const isDisabled =
    !docType ||
    !docNumber.trim() ||
    !expiryDate ||
    !selCountry ||
    !addrLine1.trim() ||
    !city.trim() ||
    !addrState.trim() ||
    !pincode.trim();

  const handleProceed = () => {
    if (isDisabled) return;
    // Persist the whole form so the upload screen can submit it alongside the
    // proof files. Field names map to the API multipart parts (see
    // apiService.submitPermanentAddress). pa_documentType keeps the display label
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
        expiryDate,                    // YYYY-MM-DD
      };
      sessionStorage.setItem('pa_address', JSON.stringify(address));
      sessionStorage.setItem('pa_documentType', proofTypeLabel(docType));
    }
    router.push('/permanentAddress/upload');
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
            <h1 className={styles.mobileTitle}>Enter Permanent Address</h1>
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
              onChange={(e) => setDocType(e.target.value)}
            >
              <option value="" disabled>Select</option>
              {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
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
            onChange={(e) => setDocNumber(e.target.value)}
          />
        </div>

        {/* Document Expiry Date */}
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
        </div>

        {/* Select Country */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-sel-country">Select Country</label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-sel-country"
              className={styles.fieldSelect}
              value={selCountry}
              onChange={(e) => setSelCountry(e.target.value)}
            >
              <option value="" disabled>Select</option>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
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
            onChange={(e) => setAddrLine1(e.target.value)}
          />
        </div>

        {/* Address Line 2 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr2">Address Line 2</label>
          <input
            id="mob-addr2"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 2"
            value={addrLine2}
            onChange={(e) => setAddrLine2(e.target.value)}
          />
        </div>

        {/* Address Line 3 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr3">Address Line 3</label>
          <input
            id="mob-addr3"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 3"
            value={addrLine3}
            onChange={(e) => setAddrLine3(e.target.value)}
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
              onChange={(e) => setCity(e.target.value)}
            />
          </div>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-state">State</label>
            <input
              id="mob-state"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
            />
          </div>
        </div>

        {/* Pincode + hint */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-pincode">Pincode</label>
          <input
            id="mob-pincode"
            type="text"
            inputMode="numeric"
            maxLength={10}
            className={styles.fieldInput}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
          />
          <div className={styles.pincodeHint}>
            <InfoIcon color="#999999" />
            <p className={styles.pincodeHintText}>
              In absence of PIN for permanent address, Enter pincode as &apos;111111&apos;.
            </p>
          </div>
        </div>

      </div>

      {/* Fixed bottom — always enabled */}
      <div className={styles.mobileProceedArea}>
        <button
          type="button"
          className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
          onClick={handleProceed}
          disabled={isDisabled}
          aria-disabled={isDisabled}
        >
          {btnLabel}
        </button>
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
            <h1 className={styles.desktopCardTitle}>Enter Permanent Address</h1>
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
                  onChange={(e) => setDocType(e.target.value)}
                  aria-label="Document Type"
                >
                  <option value="" disabled>Select</option>
                  {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>

            {/* Document Number */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Number</p>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Enter number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                aria-label="Document Number"
              />
            </div>

            {/* Document Expiry Date */}
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

            {/* Select Country */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Select Country</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={selCountry}
                  onChange={(e) => setSelCountry(e.target.value)}
                  aria-label="Select Country"
                >
                  <option value="" disabled>Select</option>
                  {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>

            {/* Address — Line 1 + Line 2 inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Address</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 1"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value)}
                  aria-label="Address Line 1"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 2"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value)}
                  aria-label="Address Line 2"
                />
              </div>
            </div>

            {/* Address Line 3 — offset, no label */}
            <div className={styles.desktopAddrLine3Row}>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Address line 3"
                value={addrLine3}
                onChange={(e) => setAddrLine3(e.target.value)}
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
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="City"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter state"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  aria-label="State"
                />
              </div>
            </div>

            {/* Pincode + hint */}
            <div className={styles.fieldGroup}>
              <div className={styles.desktopFieldRow}>
                <p className={styles.desktopLabel}>Pincode</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  aria-label="Pincode"
                />
              </div>
              <div className={styles.desktopPincodeHint}>
                <InfoIcon color="#3b4c72" />
                <p className={styles.desktopPincodeHintText}>
                  In absence of PIN for permanent address, Enter pincode as &apos;111111&apos;.
                </p>
              </div>
            </div>

          </div>

          {/* Proceed — always enabled */}
          <div className={styles.desktopProceedWrapper}>
            <button
              type="button"
              className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
              onClick={handleProceed}
              disabled={isDisabled}
              aria-disabled={isDisabled}
            >
              {btnLabel}
            </button>
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
