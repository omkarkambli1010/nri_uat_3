'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './permanent-address.module.scss';

// Screen 1 — Select Address Proof Type
// Figma: Onboarding-Mob-PermanentAddress-Noselection-Upload (0:44186)
//        Onboarding-Web-PermanentAddress-Noselection-Upload (0:43680, 0:43914)
// Route: /permanentAddress

const ADDRESS_PROOF_TYPES = [
  'Driving License',
  'Aadhaar Card',
  'Voter ID',
  'Passport',
  'Utility Bill',
  'Bank Statement',
];

function CaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#999" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PermanentAddressSelect() {
  const router = useRouter();
  const [proofType, setProofType]         = useState('Driving License'); // pre-filled per Figma

  // Button label mirrors selected type — Figma: "Upload 'Driving License' Front"
  const btnLabel = proofType ? `Upload '${proofType}' Front` : 'Upload Document Front';

  // Stash the chosen proof type and go to the all-in-one Front + Back upload.
  const handleUpload = () => {
    if (proofType) sessionStorage.setItem('pa_proofType', proofType);
    router.push('/permanentAddress/upload');
  };

  // ── MOBILE ─────────────────────────────────────────────────────────────────
  const mobileLayout = (
    <div className={styles.mobilePage}>

      {/* Gray rounded-bottom header */}
      {/* Figma: bg #f8f8f8, border-bottom-radius 20px, gap-12, px-16 */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderInner}>
          <button
            type="button"
            className={styles.mobileBackBtn}
            onClick={() => router.back()}
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          <div className={styles.mobileTitleBlock}>
            {/* Figma: 16px SemiBold #2b2b2b */}
            <h1 className={styles.mobileTitle}>Enter Permanent (Indian) Address Details</h1>
            {/* Figma: 12px Regular #2b2b2b */}
            <p className={styles.mobileSubtitle}>
              To fetch your Indian address using Aadhaar, your mobile number must be linked to Aadhaar
            </p>
          </div>
        </div>
      </div>

      {/* White card */}
      {/* Figma: bg white, border-top-radius 24px, shadow, p-24 */}
      <div className={styles.mobileCard}>
        {/* Address Proof Type field */}
        {/* Figma: label 14px Regular #666, select h-40, border #d9d9d9, radius-8 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-proof-type">
            Address Proof Type
          </label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-proof-type"
              className={styles.fieldSelect}
              value={proofType}
              onChange={(e) => setProofType(e.target.value)}
            >
              <option value="" disabled>Select</option>
              {ADDRESS_PROOF_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <span className={styles.fieldSelectCaret}><CaretDown /></span>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      {/* Figma: h-48, w-328, bg #280071, radius-8, 16px SemiBold white */}
      <div className={styles.mobileProceedArea}>
        <button
          type="button"
          className={styles.mobileProceedBtn}
          onClick={handleUpload}
        >
          {btnLabel}
        </button>
      </div>
    </div>
  );

  // ── DESKTOP ────────────────────────────────────────────────────────────────
  const desktopLayout = (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>

        {/* Header */}
        {/* Figma: flex, gap-8, p-24, border-bottom 0.5px #d9d9d9 */}
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
            {/* Figma: 18px SemiBold #2b2b2b */}
            <h1 className={styles.desktopCardTitle}>Enter Permanent (Indian) Address Details</h1>
            {/* Figma: 14px Regular #666 */}
            <p className={styles.desktopCardSubtitle}>
              To fetch your Indian address using Aadhaar, your mobile number must be linked to Aadhaar
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={styles.desktopCardBody}>
          <div className={styles.desktopFormArea}>
            {/* Address Proof Type row */}
            {/* Figma: label (16px Regular #666) + select (h-40, border #d9d9d9, radius-8) */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Address Proof Type</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={proofType}
                  onChange={(e) => setProofType(e.target.value)}
                  aria-label="Address Proof Type"
                >
                  <option value="" disabled>Select</option>
                  {ADDRESS_PROOF_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <span className={styles.deskSelectCaret}><CaretDown /></span>
              </div>
            </div>
          </div>

          {/* Proceed button */}
          {/* Figma: centered, bg #280071, white, 16px SemiBold */}
          <div className={styles.desktopProceedWrapper}>
            <button
              type="button"
              className={styles.desktopProceedBtn}
              onClick={handleUpload}
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
