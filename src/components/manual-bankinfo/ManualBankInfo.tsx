'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import navigationService from '@/services/navigation.service';
import apiService, { BankRpdStatusResponse } from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from './manual-bankinfo.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12H19" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12L11 18" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12L11 6" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Figma: green circle with check, 48×48
function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-label="Success" role="img">
      <circle cx="24" cy="24" r="22.5" stroke="#22c55e" strokeWidth="2" />
      <path
        d="M14 24.5l7.5 7.5 12.5-14"
        stroke="#22c55e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────

// Renders nothing when the value is empty — the RPD status response only
// includes a subset of fields, so unsupplied rows are hidden.
function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <p className={styles.detailRow}>
      {label}{' '}
      <span className={styles.detailValue}>{value}</span>
    </p>
  );
}

// ── Shared content blocks ─────────────────────────────────────────────────────

function SuccessContent({ details }: { details: BankRpdStatusResponse | null }) {
  return (
    <div className={styles.successContent}>
      <CheckCircleIcon />
      <p className={styles.successText}>
        Your bank details has been added successfully
      </p>
      <div className={styles.detailsBox}>
        <DetailRow label="Bank Name:" value={details?.bankName} />
        <DetailRow label="Name as per Bank:" value={details?.holderName} />
        <DetailRow label="Account Type:" value={details?.accountType} />
        <DetailRow label="Account Number:" value={details?.accountNumber} />
        <DetailRow label="IFSC Code:" value={details?.ifscCode} />
        <DetailRow label="MICR Code:" value={details?.micrCode} />
        <DetailRow label="Bank Address:" value={details?.bankAddress} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ManualBankInfo() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [bankDetails, setBankDetails] = useState<BankRpdStatusResponse | null>(null);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  // Fetch the verified bank details (reverse-penny-drop status) on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const applicationId = window.sessionStorage.getItem('ApplicationId') || '';
    const vendorSessionId = window.sessionStorage.getItem('VendorSessionId') || '';

    if (!applicationId || !vendorSessionId) {
      toast.error('Your session has expired, please start again.', {
        position: 'bottom-center',
        autoClose: 3000,
      });
      return;
    }

    let cancelled = false;
    (async () => {
      showSpinner();
      try {
        const data = await apiService.getBankRpdStatus(
          applicationId,
          vendorSessionId,
          hideSpinner,
        );
        if (!cancelled) setBankDetails(data);
      } catch {
        // apiService.handleError already surfaced the backend message.
      } finally {
        hideSpinner();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const goBack = () => {
    showSpinner();
    setTimeout(() => { router.back(); hideSpinner(); }, 200);
  };

  // TODO: replace with real API call once endpoint is available
  const submitBankDetails = async (): Promise<void> => {
    // await apiService.postRequest('api/v1/BankDetails/submit', { ... });
  };

  const handleProceed = async () => {
    showSpinner();
    await submitBankDetails();
    setTimeout(() => { router.push('/planprocess/1'); hideSpinner(); }, 200);
  };

  return (
    <>
      {/* ── MOBILE (< 768px) ─────────────────────────────────────────────────── */}
      <section
        aria-label="Bank Details Added Successfully"
        className={styles.mobilePage}
        suppressHydrationWarning
      >
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderTop}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
              <BackArrow />
            </button>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <SuccessContent details={bankDetails} />
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={styles.mobileProceedBtn}
            onClick={handleProceed}
            suppressHydrationWarning
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section
        aria-label="Bank Details Added Successfully"
        className={styles.desktopPage}
        suppressHydrationWarning
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
              <BackArrow />
            </button>
          </div>

          <div className={styles.desktopCardBody}>
            <SuccessContent details={bankDetails} />

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={styles.desktopProceedBtn}
                onClick={handleProceed}
                suppressHydrationWarning
              >
                Proceed
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
