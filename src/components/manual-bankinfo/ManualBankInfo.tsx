'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import navigationService from '@/services/navigation.service';
import styles from './manual-bankinfo.module.scss';

// ── Placeholder bank data (replace with real data from state/API) ─────────────

const BANK_DETAILS = {
  bankName: 'State Bank of India',
  nameAsPerBank: 'Saloni Kevin Shah',
  accountType: 'Savings',
  accountNumber: '123456789073256',
  ifscCode: 'SBIN1234567',
  micrCode: '12345678',
  bankAddress: 'Lorem Ipsum is simply dummy text of the printing and typesetting industry.',
} as const;

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p className={styles.detailRow}>
      {label}{' '}
      <span className={styles.detailValue}>{value}</span>
    </p>
  );
}

// ── Shared content blocks ─────────────────────────────────────────────────────

function SuccessContent() {
  return (
    <div className={styles.successContent}>
      <CheckCircleIcon />
      <p className={styles.successText}>
        Your bank details has been added successfully
      </p>
      <div className={styles.detailsBox}>
        <DetailRow label="Bank Name:" value={BANK_DETAILS.bankName} />
        <DetailRow label="Name as per Bank:" value={BANK_DETAILS.nameAsPerBank} />
        <DetailRow label="Account Type:" value={BANK_DETAILS.accountType} />
        <DetailRow label="Account Number:" value={BANK_DETAILS.accountNumber} />
        <DetailRow label="IFSC Code:" value={BANK_DETAILS.ifscCode} />
        <DetailRow label="MICR Code:" value={BANK_DETAILS.micrCode} />
        <DetailRow label="Bank Address:" value={BANK_DETAILS.bankAddress} />
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ManualBankInfo() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
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
          <SuccessContent />
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={styles.mobileProceedBtn}
            onClick={handleProceed}
            suppressHydrationWarning
          >
            Proceed
          </button>
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
            <SuccessContent />

            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={styles.desktopProceedBtn}
                onClick={handleProceed}
                suppressHydrationWarning
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
