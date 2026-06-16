'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import aesService from '@/services/aes.service';
import moengagesdkService from '@/services/moengagesdk.service';
import styles from './digilocker-screen.module.scss';
import { publicPath } from "@/utils/publicPath";
import LoadingButton from '@/components/ui/LoadingButton';

// DigilockerScreen — Aadhaar & PAN verification via DigiLocker
// Figma: ExXo1tRiZv7Zcb9DGMnyiI
//   Web   node 1-5263 — Onboarding-Web-PANMANUAL-Verification-Filled
//   Mobile node 1-5158 — Onboarding-Mob-PANMANUAL-Verification-Success

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DigilockerScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [nameSubmitted, setNameSubmitted] = useState('');

  const clientid =
    typeof window !== 'undefined' ? sessionStorage.getItem('clientid') ?? '' : '';

  useEffect(() => {
    document.title = 'Digilocker Screen - Onboarding-DIY-PWA';
    getDigilockerName();
  }, []);

  const getDigilockerName = async () => {
    try {
      const response = await apiService.postRequest('api/v1/masters/get', {
        flag: 'Getnameasperpan',
        FormNumber: sessionStorage.getItem('ApplicationId'),
      });
      if (response?.status === true) {
        const decrypted = JSON.parse(aesService.decrypt(response.data, clientid, clientid));
        setNameSubmitted(decrypted?.data?.[0]?.nameasperpan ?? '');
      }
    } catch {
      // silently fail
    }
  };

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  }

  const redirectDigiLocker = async () => {
    const applicationId =
      typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }
    showSpinner();
    try {
      const res = await apiService.initiateDigilocker(applicationId);
      // Success returns { oAuthUrl, status: true } — send the user to DigiLocker.
      if (res?.oAuthUrl) {
        window.location.href = String(res.oAuthUrl); // keep spinner up during redirect
        return;
      }
      toast.error('Could not start DigiLocker verification. Please try again.');
      hideSpinner();
    } catch {
      // apiService.handleError already surfaced the backend message.
      hideSpinner();
    }
  };

  const handleBack = () => router.back();

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════
          Figma 1-5158 — Onboarding-Mob-PANMANUAL-Verification-Success (360px)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="DigiLocker Aadhaar and PAN Verification">

        {/* Gray header: back + DigiLocker logo row + title */}
        {/* Figma: gap-8 between sections, flex-col */}
        <div className={styles.mobileHeader}>
          <button
            type="button"
            className={styles.mobileBackBtn}
            onClick={handleBack}
            aria-label="Go back"
          >
            <BackArrow />
          </button>

          {/* Figma: DigiLocker logo (98×24) + Need Help? pill — space-between */}
          <div className={styles.mobileDigiRow}>
            <Image
              src={publicPath("/assets/images/diy/digilocker_img.png")}
              alt="DigiLocker"
              width={98}
              height={24}
            />
            <button
              type="button"
              className={styles.needHelpBtn}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>

          {/* Figma: 16px SemiBold #2b2b2b */}
          <h1 className={styles.mobileTitle}>
            Verify your Aadhaar &amp; PAN via Digilocker
          </h1>
        </div>

        {/* White card — rounded-top-24, shadow, flex-1 */}
        <div className={styles.mobileCard}>

          {/* Aadhaar section — centered, gap-8 */}
          {/* Figma: 12px text, 226×143 image, 12px gray hint */}
          <div className={styles.contentSection}>
            <p className={styles.enterAadhaarText}>
              Enter Aadhaar number or VID for{' '}
              <strong>&apos;{nameSubmitted}&apos;</strong>
            </p>
            <div className={styles.aadhaarImageWrap}>
              <Image
                src={publicPath("/assets/images/diy/aadhar_card_sample_img.png")}
                alt="Sample Aadhaar card"
                width={226}
                height={143}
                draggable={false}
              />
            </div>
            <p className={styles.otpHintText}>
              In the next step, OTP will be sent to your Aadhaar linked Mobile number
            </p>
          </div>

          {/* Gray highlight band — full-width, spans card edge-to-edge */}
          {/* Figma: rgba(241,241,246,0.5), h-185, flex-col, gap-12 */}
          <div className={styles.highlightSection}>
            <p className={styles.selectText}>
              Select <strong>Aadhaar and PAN</strong> on the next screen
            </p>
            <div className={styles.gifWrap}>
              <Image
                src={publicPath("/assets/images/diy/digilocker_toogle_video.gif")}
                alt="DigiLocker document selection guide"
                width={312}
                height={82}
                draggable={false}
                unoptimized
              />
            </div>
            <p className={styles.mPinText}>
              Create a 6-digit M-PIN (for new DigiLocker users)
            </p>
          </div>

        </div>

        {/* Sticky bottom button — pb-16, w-328, h-48, bg #280071 */}
        <div className={styles.mobileProceedArea}>
          <LoadingButton type="button" className={styles.proceedBtn} onClick={redirectDigiLocker}>
            Verify with Digilocker
          </LoadingButton>
        </div>

      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════
          Figma 1-5263 — Onboarding-Web-PANMANUAL-Verification-Filled (1440px)
          Card: 800px wide, 680px tall, rounded-24, border #d9d9d9, shadow
      ════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="DigiLocker Aadhaar and PAN Verification">
        <div className={styles.desktopCard}>

          {/* Card header — p-24, border-bottom 0.5px #d9d9d9 */}
          {/* Figma: [back-arrow] [digilocker-logo + title] [Need Help?] */}
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={handleBack}
              aria-label="Go back"
            >
              <BackArrow />
            </button>

            {/* DigiLocker logo stacked above title, flex-1 */}
            <div className={styles.desktopHeaderMid}>
              <Image
                src={publicPath("/assets/images/diy/digilocker_img.png")}
                alt="DigiLocker"
                width={98}
                height={24}
              />
              {/* Figma: 16px SemiBold #2b2b2b */}
              <h1 className={styles.desktopCardTitle}>
                Verify your Aadhaar &amp; PAN via Digilocker
              </h1>
            </div>

            <button
              type="button"
              className={styles.needHelpBtn}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>

          {/* Card body — flex-col, items-center */}
          <div className={styles.desktopCardBody}>

            {/* Aadhaar section — centered, gap-8 */}
            {/* Figma: 14px text, 226×143 image (border, rounded-16), 12px gray hint */}
            <div className={styles.desktopContentSection}>
              <p className={styles.enterAadhaarText}>
                Enter Aadhaar number or VID for{' '}
                <strong>&apos;{nameSubmitted}&apos;</strong>
              </p>
              <div className={styles.aadhaarImageWrap}>
                <Image
                  src={publicPath("/assets/images/diy/aadhar_card_sample_img.png")}
                  alt="Sample Aadhaar card"
                  width={226}
                  height={143}
                  draggable={false}
                />
              </div>
              <p className={styles.otpHintText}>
                In the next step, OTP will be sent to your Aadhaar linked Mobile number
              </p>
            </div>

            {/* Gray highlight band — full-width, breaks card body padding */}
            {/* Figma: 800px wide, h-185, absolute left-[-24px], rgba(241,241,246,0.5) */}
            <div className={styles.desktopHighlightSection}>
              <p className={styles.selectText}>
                Select <strong>Aadhaar and PAN</strong> on the next screen
              </p>
              <div className={styles.gifWrap}>
                <Image
                  src={publicPath("/assets/images/diy/digilocker_toogle_video.gif")}
                  alt="DigiLocker document selection guide"
                  width={358}
                  height={94}
                  draggable={false}
                  unoptimized
                />
              </div>
              <p className={styles.mPinText}>
                Create a 6-digit M-PIN (for new DigiLocker users)
              </p>
            </div>

            {/* CTA — centered, w-350, h-56, bg #280071 */}
            <div className={styles.desktopProceedWrapper}>
              <LoadingButton type="button" className={styles.proceedBtn} onClick={redirectDigiLocker}>
                Verify with Digilocker
              </LoadingButton>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
