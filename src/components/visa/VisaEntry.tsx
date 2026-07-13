'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import styles from './visa.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';
import apiService from '@/services/api.service';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

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

// Earliest acceptable visa expiry — today + 3 months (BRD: a visa must have
// more than 3 months of validity remaining). Mirrors VisaUpload's minVisaExpiry()
// so the entry gate matches the upload screen's validation.
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
  const [expiryDate, setExpiryDate] = useState('');

  // Prefill the expiry from the saved VISA stage (POST …/get/workflow/
  // stagewisedate { stagename: "VISA" }) so a revisit shows the previously
  // entered visa expiry date.
  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) return;

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getVisaWorkflow(applicationId);
        if (!alive) return;
        const d = res?.data as Record<string, unknown> | undefined;
        const saved = d?.expiryDate == null ? '' : String(d.expiryDate);
        if (saved) {
          setExpiryDate(saved);
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('visaExpiryDate', saved);
          }
        }
      } catch {
        // Non-fatal — the field just stays empty.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const expired = isExpired(expiryDate);
  // BRD: a visa must have more than 3 months of validity remaining. The picker
  // disables every date before today + 3 months (past + next 3 months) via
  // minDate, so it can't normally be selected; `tooSoon` is a backstop for a
  // manually typed date (and drives the inline warning). `expired` picks the copy.
  const tooSoon = !!expiryDate && new Date(expiryDate) < minVisaExpiry();
  const canUpload = !!expiryDate;

  const handleBack = () => router.back();

  const handleUpload = () => {
    // Backstop for a manually typed date that slipped past the picker's minDate.
    if (!canUpload || tooSoon) return;
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
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${!canUpload ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleUpload}
            disabled={!canUpload}
            aria-disabled={!canUpload}
          >
            Upload
          </LoadingButton>
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
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${!canUpload ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleUpload}
                disabled={!canUpload}
                aria-disabled={!canUpload}
              >
                Upload
              </LoadingButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
 