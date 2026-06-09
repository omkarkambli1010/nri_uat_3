'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './oci.module.scss';

// OciUpload — Screen 1: Document Type + Card No. form
// Figma: Onboarding-Mob-OCI/PIO-Upload (0:38489 empty / 0:38815 filled)
//        Figma: Onboarding-Web-OCI/PIO-Upload (0:38576 / 0:38902)

type DocType = 'OCI' | 'PIO' | '';

const DOC_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'OCI', label: 'OCI' },
  { value: 'PIO', label: 'PIO' },
];

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

export default function OciUpload() {
  const router = useRouter();
  const [docType, setDocType]   = useState<DocType>('');
  const [cardNo, setCardNo]     = useState('');

  const handleBack = () => router.back();

  // Button label changes dynamically with selection (Figma: "Upload 'OCI' Front")
  const buttonLabel = docType
    ? `Upload '${docType}' Front`
    : "Upload 'Select' Front";

  const isDisabled = docType === '' || cardNo.trim() === '';

  const handleUploadClick = () => {
    if (isDisabled) return;
    // Persist card details so the upload screen can include them in the
    // poi-oci/upload submit.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oci_cardType', docType);
      sessionStorage.setItem('oci_cardNumber', cardNo.trim());
    }
    router.push('/oci/upload');
  };

  return (
    <>
      {/* ═══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="OCI or PIO Card">

        {/* Gray header */}
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

        {/* White card */}
        <div className={styles.mobileCard}>

          {/* Field: Document Type */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-doc-type">Document Type</label>
            <div className={styles.fieldInputWrap}>
              <select
                id="mob-doc-type"
                className={`${styles.fieldSelect}${docType === '' ? ` ${styles.placeholder}` : ''}`}
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocType)}
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
          </div>

          {/* Field: Card No. */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-card-no">Card No.</label>
            <input
              id="mob-card-no"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter number"
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
            />
          </div>

        </div>

        {/* Fixed bottom button */}
        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleUploadClick}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            {buttonLabel}
          </button>
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

                {/* Field: Document Type */}
                <div className={styles.desktopFieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="desk-doc-type">Document Type</label>
                  <div className={styles.fieldInputWrap}>
                    <select
                      id="desk-doc-type"
                      className={`${styles.fieldSelect}${docType === '' ? ` ${styles.placeholder}` : ''}`}
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as DocType)}
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
                </div>

                {/* Field: Card No. */}
                <div className={styles.desktopFieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="desk-card-no">Card No.</label>
                  <input
                    id="desk-card-no"
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Enter number"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                  />
                </div>

              </div>
            </div>

            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleUploadClick}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                {buttonLabel}
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
