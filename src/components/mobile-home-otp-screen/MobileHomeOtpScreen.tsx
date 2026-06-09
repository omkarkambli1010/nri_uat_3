'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { InputOtp } from 'primereact/inputotp';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import styles from './mobile-home-otp-screen.module.scss';
import { publicPath } from "@/utils/publicPath";

const BackArrowSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="#2B2B2B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>             
);

const EditSvg = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20" fill="none">
    <path fillRule="evenodd" clipRule="evenodd" d="M12.6087 3.49506C12.9705 3.3452 13.3583 3.26807 13.7499 3.26807C14.1415 3.26807 14.5293 3.3452 14.8911 3.49506C15.2529 3.64492 15.5816 3.86457 15.8585 4.14148C16.1354 4.41839 16.3551 4.74712 16.5049 5.10892C16.6548 5.47072 16.7319 5.85849 16.7319 6.25009C16.7319 6.64169 16.6548 7.02946 16.5049 7.39126C16.3551 7.75306 16.1354 8.08179 15.8585 8.3587L7.10853 17.1087C6.99132 17.2259 6.83235 17.2918 6.66659 17.2918H3.33325C2.98807 17.2918 2.70825 17.0119 2.70825 16.6668V13.3334C2.70825 13.1677 2.7741 13.0087 2.89131 12.8915L11.6413 4.14148C11.9182 3.86457 12.247 3.64492 12.6087 3.49506Z" fill="#280071" />
    <path fillRule="evenodd" clipRule="evenodd" d="M10.8081 4.97481C11.0521 4.73073 11.4479 4.73073 11.6919 4.97481L15.0253 8.30814C15.2694 8.55222 15.2694 8.94795 15.0253 9.19202C14.7812 9.4361 14.3855 9.4361 14.1414 9.19202L10.8081 5.85869C10.564 5.61461 10.564 5.21888 10.8081 4.97481Z" fill="#280071" />
  </svg>
);

export default function MobileHomeOtpScreen() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [otp, setOtp] = useState('');
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);
  // Re-triggerable flag for the wrong-OTP shake. Cleared on animationend so the
  // next failed attempt can replay it even if isWrongOTP was already true.
  const [shakeOtp, setShakeOtp] = useState(false);
  const [timeroff, setTimeroff] = useState(true);
  const [displayMobile, setDisplayMobile] = useState(30);
  // True once the backend reports OTP_002 ("Maximum resend limit reached"); we
  // then hide the Resend OTP option since further sends are blocked.
  const [maxResendReached, setMaxResendReached] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // mobile and isWhatsApp are rendered, so they must match the server's HTML on
  // the first client render. sessionStorage only exists on the client, so start
  // them empty and hydrate the real values in the effect below — reading during
  // render produces server/client divergence and a hydration mismatch.
  const [mobile, setMobile] = useState('');
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  // applicationId is only used in handlers (never rendered), so a render-time
  // read is safe and keeps it available synchronously for the auto-send below.
  const applicationId = typeof window !== 'undefined' ? sessionStorage.getItem("ApplicationId")?? '' : '';
  const channel = isWhatsApp ? 'WhatsApp' : 'Sms';

  const isVerifyDisabled = otp.length !== 6;

  // uiMetadata is a JSON string from the API carrying the next route. Returns '' if absent.
  const parseRoute = (uiMetadata?: string): string => {
    try {
      return JSON.parse(uiMetadata ?? '{}').route ?? '';
    } catch {
      return '';
    }
  };

  useEffect(() => {
    document.title =
      'Open Demat Account - Free Demat & Trading Account Opening Online | SBI Securities';
    setMobile(sessionStorage.getItem('mobile') ?? '');
    setIsWhatsApp(sessionStorage.getItem('otpChannel') === 'whatsapp');
    // The OTP is already sent during registration on the previous screen, so we
    // do NOT call the send API on page load — just start the resend countdown.
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    setTimeroff(true);
    setDisplayMobile(30);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setDisplayMobile((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimeroff(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOtpChange = (value: string | null | undefined) => {
    const val = value ?? '';
    setOtp(val);
    if (isWrongOTP) setIsWrongOTP(false);
  };

  const editMobileNumber = () => router.push('/');

  const getMobileOtp = async (isResend: boolean, otpChannel: string = channel) => {
    if (!applicationId) {
      toast.error('Your session has expired, please start again.', { position: 'bottom-center', autoClose: 2000 });
      router.push('/');
      return;
    }
    showSpinner();
    try {
      const response = await apiService.sendNriOtp(applicationId, otpChannel, hideSpinner);
      hideSpinner();
      // Keep the countdown running regardless of the send status.
      startTimer();
      setOtp('');
      if (response && isResend) {
        toast.success('OTP sent successfully!', { position: 'bottom-center', autoClose: 2000 });
      }
    } catch (error: any) {
      hideSpinner();
      // OTP_002 = max resend limit reached → replace the timer with the Home option.
      if (error?.response?.data?.errorCode === 'OTP_002') {
        setMaxResendReached(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      // Any other failure: keep the timer running so the user can retry resend.
      startTimer();
    }
  };

  const getMobileOtpVerify = async () => {
    if (!applicationId) {
      toast.error('Your session has expired, please start again.', { position: 'bottom-center', autoClose: 2000 });
      router.push('/');
      return;
    }
    showSpinner();
    try {
      const response = await apiService.verifyNriOtp(applicationId, channel, otp, hideSpinner);
      hideSpinner();
      if (response) {
        setIsRightOTP(true);
        setIsWrongOTP(false);
        toast.success('OTP verified successfully!', { position: 'bottom-center', autoClose: 2000 });
        // Routing is driven by the API via uiMetadata; fall back to /email.
        const nextRoute = parseRoute(response.uiMetadata);
        router.push(nextRoute ? `/${nextRoute}` : '/email');
      } else {
        setIsWrongOTP(true);
        setIsRightOTP(false);
        setShakeOtp(true);
      }
    } catch {
      // The backend message is already toasted by apiService.handleError.
      setIsWrongOTP(true);
      setIsRightOTP(false);
      setShakeOtp(true);
      hideSpinner();
    }
  };

  const otpInputClass = `${styles.otpBox}${isWrongOTP ? ` ${styles.otpBoxError}` : isRightOTP ? ` ${styles.otpBoxSuccess}` : ''}`;

  const otpForm = (
    <div className={styles.otpBody}>
      {/* Phone number + Edit */}
      <div className={styles.phoneRow}>
        <span className={styles.phoneNumber}>{mobile}</span>
        <button type="button" className={styles.editBtn} onClick={editMobileNumber}>
          <EditSvg />
          <span>Edit</span>
        </button>
      </div>

      {/* OTP input */}
      <div className={styles.otpField}>
        <label className={styles.otpLabel}>Enter OTP</label>
        <div
          className={`${styles.otpInputWrap}${shakeOtp ? ` ${styles.shake}` : ''}`}
          onAnimationEnd={() => setShakeOtp(false)}
        >
          <InputOtp
            value={otp}
            onChange={(e) => handleOtpChange(e.value as string)}
            length={6}
            integerOnly
            pt={{ input: { root: { className: otpInputClass } } }}
          />
        </div>
        {isWrongOTP && (
          <div className={styles.otpError}>
            <img src={publicPath("/assets/images/diy/invalid_otp.png")} alt="" aria-hidden />
            <span>Please enter the valid 6 digit OTP sent to your mobile number.</span>
          </div>
        )}
      </div>

      {/* Resend row */}
      <div className={styles.resendRow}>
        <span className={styles.resendText}>Didn&apos;t receive the OTP?</span>
        {maxResendReached ? (
          <button type="button" className={styles.resendBtn} onClick={() => router.push('/')}>
            Home
          </button>
        ) : timeroff ? (
          <span className={styles.resendTimer}>Resend OTP : {displayMobile} sec</span>
        ) : (
          <button type="button" className={styles.resendBtn} onClick={() => getMobileOtp(true)}>
            Resend OTP
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE ── */}
      <section aria-label="Mobile OTP Verification" className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={editMobileNumber}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>OTP Verification</h5>
              <p className={styles.mobileSubtitle}>{isWhatsApp ? 'You will receive OTP on your WhatsApp' : 'You will receive OTP on your mobile number'}</p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {otpForm}
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${isVerifyDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={getMobileOtpVerify}
            disabled={isVerifyDisabled}
          >
            Verify
          </button>
        </div>
      </section>

      {/* ── DESKTOP ── */}
      <section aria-label="Mobile OTP Verification" className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={editMobileNumber}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>OTP Verification</h5>
              <p className={styles.desktopCardSubtitle}>
                {isWhatsApp ? 'You will receive OTP on your WhatsApp' : 'You will receive OTP on your mobile number'}
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            {otpForm}
            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${isVerifyDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={getMobileOtpVerify}
                disabled={isVerifyDisabled}
              >
                Verify
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
