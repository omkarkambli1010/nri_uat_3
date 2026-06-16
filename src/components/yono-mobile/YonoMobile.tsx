'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './yono-mobile.module.scss';

export default function YonoMobile() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [mobileError, setMobileError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    document.title = 'Mobile Verification | SBI Securities';
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startOtpTimer = () => {
    setOtpTimer(60);
    timerRef.current = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const validateMobile = (value: string) => {
    if (!value) return 'Mobile number is required';
    if (!/^[6-9]\d{9}$/.test(value)) return 'Enter a valid 10-digit mobile number';
    return '';
  };

  const sendOtp = async () => {
    const err = validateMobile(mobileNumber);
    if (err) {
      setMobileError(err);
      return;
    }
    setMobileError('');
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/yono/mobile/otp', {
        MobileNo: mobileNumber,
        flag: 'SendYonoMobileOTP',
      }, hideSpinner);

      if (response?.status === true) {
        setShowOtpScreen(true);
        startOtpTimer();
        toast.success('OTP sent successfully!', { position: 'bottom-center', autoClose: 3000 });
      } else {
        toast.error(response?.message ?? 'Failed to send OTP. Please try again.', {
          position: 'bottom-center',
          autoClose: 3500,
        });
      }
    } catch {
      // error handled by apiService
    } finally {
      hideSpinner();
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const verifyOtp = async () => {
    const otpStr = otp.join('');
    if (otpStr.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP', { position: 'bottom-center', autoClose: 3000 });
      return;
    }
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/yono/mobile/verify', {
        MobileNo: mobileNumber,
        OTP: otpStr,
        flag: 'VerifyYonoMobileOTP',
      }, hideSpinner);

      if (response?.status === true) {
        router.push('/yono-email');
      } else {
        toast.error(response?.message ?? 'Invalid OTP. Please try again.', {
          position: 'bottom-center',
          autoClose: 3500,
        });
      }
    } catch {
      // error handled by apiService
    } finally {
      hideSpinner();
    }
  };

  const resendOtp = () => {
    setOtp(['', '', '', '', '', '']);
    sendOtp();
  };

  return (
    <section aria-label="YONO Mobile Verification" className={`pan_details_form ${styles.yonoMobilePage}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            {!showOtpScreen ? (
              <>
                <div className="mobile_css">
                  <div className="back_cls">
                    <h5>Mobile Verification</h5>
                  </div>
                </div>
                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <h5>Mobile Verification</h5>
                  <p>Enter your registered mobile number</p>
                </div>
                <hr className="desktop_css" />

                <div className={styles.formGroup}>
                  <label htmlFor="mobileNumber" className={styles.label}>
                    Mobile Number <span className={styles.required}>*</span>
                  </label>
                  <input
                    id="mobileNumber"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, ''));
                      setMobileError('');
                    }}
                    placeholder="Enter 10-digit mobile number"
                    className={`${styles.input} ${mobileError ? styles.inputError : ''}`}
                    aria-describedby="mobileError"
                  />
                  {mobileError && (
                    <p id="mobileError" className={styles.errorText}>{mobileError}</p>
                  )}
                </div>

                <div className={styles.proceedBtn}>
                  <LoadingButton
                    type="button"
                    className="btn btn_cls"
                    onClick={sendOtp}
                    disabled={mobileNumber.length !== 10}
                  >
                    Send OTP
                  </LoadingButton>
                </div>
              </>
            ) : (
              <>
                <div className="mobile_css">
                  <div className="back_cls">
                    <button
                      type="button"
                      className={styles.backBtn}
                      onClick={() => setShowOtpScreen(false)}
                      aria-label="Go back"
                    >
                      &larr;
                    </button>
                    <h5>Verify OTP</h5>
                  </div>
                </div>
                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <h5>Verify OTP</h5>
                  <p>Enter the OTP sent to +91 {mobileNumber}</p>
                </div>
                <hr className="desktop_css" />

                <p className={styles.otpInfo}>
                  Enter the 6-digit OTP sent to <strong>+91 {mobileNumber}</strong>
                </p>

                <div className={styles.otpInputs}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => handleOtpKeyDown(e, i)}
                      className={styles.otpBox}
                      aria-label={`OTP digit ${i + 1}`}
                    />
                  ))}
                </div>

                <div className={styles.resendRow}>
                  {otpTimer > 0 ? (
                    <p>Resend OTP in <strong>{otpTimer}s</strong></p>
                  ) : (
                    <button type="button" className={styles.resendBtn} onClick={resendOtp}>
                      Resend OTP
                    </button>
                  )}
                </div>

                <div className={styles.proceedBtn}>
                  <LoadingButton
                    type="button"
                    className="btn btn_cls"
                    onClick={verifyOtp}
                    disabled={otp.join('').length !== 6}
                  >
                    Verify OTP
                  </LoadingButton>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
 