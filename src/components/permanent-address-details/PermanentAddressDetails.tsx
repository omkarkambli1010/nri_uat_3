'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import navigationService from '@/services/navigation.service';
import styles from './permanent-address-details.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// PermanentAddressDetails — gateway screen before permanent address flow
// Figma: NRO-PERMENANT-IND-ADDRESS — Desktop 2:4200, Mobile 2:4109
// Yes (Aadhaar-linked mobile) → /aadhar (eKYC)
// No → /permanentAddress (manual entry)

const BackArrowSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="#2B2B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type AadhaarLinked = 'yes' | 'no' | '';

export default function PermanentAddressDetails() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [aadhaarLinked, setAadhaarLinked] = useState<AadhaarLinked>('');

  const isProceedDisabled = aadhaarLinked === '';

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  const goBack = () => {
    router.back();
  };

  const handleProceed = () => {
    if (isProceedDisabled) return;
    showSpinner();
    setTimeout(() => {
      if (aadhaarLinked === 'yes') {
        router.push('/digilocker-screen');
      } else {
        router.push('/manual-document-screen');
      }
      hideSpinner();
    }, 200);
  };

  const renderQuestion = (groupName: string) => (
    <div className={styles.questionBlock}>
      <p className={styles.questionLabel}>Is your mobile number linked to Aadhaar?</p>
      <div className={styles.radioGroup}>
        <label className={styles.radioOption}>
          <input
            type="radio"
            name={groupName}
            value="yes"
            checked={aadhaarLinked === 'yes'}
            onChange={(e) => setAadhaarLinked(e.target.value as AadhaarLinked)}
            className={styles.radioInput}
          />
          <span className={styles.radioLabel}>Yes</span>
        </label>
        <label className={styles.radioOption}>
          <input
            type="radio"
            name={groupName}
            value="no"
            checked={aadhaarLinked === 'no'}
            onChange={(e) => setAadhaarLinked(e.target.value as AadhaarLinked)}
            className={styles.radioInput}
          />
          <span className={styles.radioLabel}>No</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE  (< 768px) ── */}
      <section aria-label="Enter Permanent (Indian) Address Details" className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button type="button" className={styles.mobileBackBtn} onClick={goBack} aria-label="Go back" suppressHydrationWarning>
              <BackArrowSvg />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>Enter Permanent (Indian) Address Details</h5>
              <p className={styles.mobileSubtitle}>
                To fetch your Indian address using Aadhaar, your mobile number must be linked to Aadhaar
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {renderQuestion('aadhaarLinked-mob')}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isProceedDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isProceedDisabled}
            suppressHydrationWarning
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP  (≥ 768px) ── */}
      <section aria-label="Enter Permanent (Indian) Address Details" className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={goBack} aria-label="Go back" suppressHydrationWarning>
              <BackArrowSvg />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>Enter Permanent (Indian) Address Details</h5>
              <p className={styles.desktopCardSubtitle}>
                To fetch your Indian address using Aadhaar, your mobile number must be linked to Aadhaar
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {renderQuestion('aadhaarLinked-desk')}
            </div>
            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isProceedDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isProceedDisabled}
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
 