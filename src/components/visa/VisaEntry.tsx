'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import styles from './visa.module.scss';

// VisaEntry — /visa entry screen (Figma node 0:119049 mobile, 0:119133 desktop).
// One field — Select Visa Expiry — and a single "Upload" button that routes
// to the all-in-one /visa/upload page, passing the picked date as ?expiry
// so the upload form pre-fills.

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
  const [expiryDate, setExpiryDate] = useState('');

  const expired = isExpired(expiryDate);
  // Mirrors original /visa behaviour: button greys out only when empty; an
  // expired date still enables Upload (warning is informational, not blocking).
  const canUpload = !!expiryDate;

  const handleBack = () => router.back();

  const handleUpload = () => {
    if (!canUpload) return;
    // Persist the picked expiry so the upload screen can pre-fill + submit it.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('visaExpiryDate', expiryDate);
    }
    router.push('/visa/upload');
  };

  // Shared field block — same JSX on mobile + desktop; the wrapper provides width.
  const fieldBlock = (idSuffix: 'mob' | 'desk') => (
    <div className={styles.expiryField}>
      <label htmlFor={`${idSuffix}-visa-expiry`} className={styles.expiryLabel}>
        Select Visa Expiry
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
          panelClassName="p-prime-cal-sm"
          className={`p-prime-cal${expired ? ` ${styles.expiredCalendar}` : ''}`}
        />
        {expired && (
          <div className={styles.expiryErrorRow} role="alert">
            <span className={styles.expiryErrorIcon}>
              <IconExclamationCircle />
            </span>
            <p className={styles.expiryErrorText}>Visa has already expired</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE LAYOUT — Figma 0:119049 ═══════════════════════════════════ */}
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
                Enter your overseas address details manually.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {fieldBlock('mob')}
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${!canUpload ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleUpload}
            disabled={!canUpload}
            aria-disabled={!canUpload}
          >
            Upload
          </button>
        </div>

      </div>

      {/* ═══ DESKTOP LAYOUT — Figma 0:119133 ══════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Visa Details">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Visa Details</h1>
              <p className={styles.desktopCardSubtitle}>
                Scan your card to auto-fill details instantly
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {fieldBlock('desk')}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${!canUpload ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleUpload}
                disabled={!canUpload}
                aria-disabled={!canUpload}
              >
                Upload
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
