"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { InputOtp } from "primereact/inputotp";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./email-home-otp-screen.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";

// EmailHomeOtpScreen — equivalent to Angular EmailHomeOtpScreenComponent
// OTP verification for email — Figma: Email-UI-Revamp nodes 0:18445, 0:18194, 0:19259, 0:18708, 0:18971

const BackArrowSvg = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15 18L9 12L15 6"
      stroke="#2B2B2B"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EditSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12.6087 3.49506C12.9705 3.3452 13.3583 3.26807 13.7499 3.26807C14.1415 3.26807 14.5293 3.3452 14.8911 3.49506C15.2529 3.64492 15.5816 3.86457 15.8585 4.14148C16.1354 4.41839 16.3551 4.74712 16.5049 5.10892C16.6548 5.47072 16.7319 5.85849 16.7319 6.25009C16.7319 6.64169 16.6548 7.02946 16.5049 7.39126C16.3551 7.75306 16.1354 8.08179 15.8585 8.3587L7.10853 17.1087C6.99132 17.2259 6.83235 17.2918 6.66659 17.2918H3.33325C2.98807 17.2918 2.70825 17.0119 2.70825 16.6668V13.3334C2.70825 13.1677 2.7741 13.0087 2.89131 12.8915L11.6413 4.14148C11.9182 3.86457 12.247 3.64492 12.6087 3.49506Z"
      fill="#280071"
    />
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M10.8081 4.97481C11.0521 4.73073 11.4479 4.73073 11.6919 4.97481L15.0253 8.30814C15.2694 8.55222 15.2694 8.94795 15.0253 9.19202C14.7812 9.4361 14.3855 9.4361 14.1414 9.19202L10.8081 5.85869C10.564 5.61461 10.564 5.21888 10.8081 4.97481Z"
      fill="#280071"
    />
  </svg>
);

// Figma node 0:19259 — exclamation circle for wrong OTP state. Unused now that
// the inline "Incorrect OTP." message is removed (backend toasts the message).
// const ExclamationCircleSvg = () => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     width="20"
//     height="20"
//     viewBox="0 0 24 24"
//     fill="none"
//     stroke="#ff2e00"
//     strokeWidth="2"
//     strokeLinecap="round"
//     strokeLinejoin="round"
//   >
//     <circle cx="12" cy="12" r="10" />
//     <line x1="12" y1="8" x2="12" y2="12" />
//     <line x1="12" y1="16" x2="12.01" y2="16" />
//   </svg>
// );

// Figma node 0:18971 — success check circle
const SuccessCheckSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="100"
    height="100"
    viewBox="0 0 100 100"
    fill="none"
  >
    <g clipPath="url(#clip0_success_email)">
      <path
        d="M50 93.75C38.3968 93.75 27.2688 89.1406 19.0641 80.9359C10.8594 72.7312 6.25 61.6032 6.25 50C6.25 38.3968 10.8594 27.2688 19.0641 19.0641C27.2688 10.8594 38.3968 6.25 50 6.25C61.6032 6.25 72.7312 10.8594 80.9359 19.0641C89.1406 27.2688 93.75 38.3968 93.75 50C93.75 61.6032 89.1406 72.7312 80.9359 80.9359C72.7312 89.1406 61.6032 93.75 50 93.75Z"
        stroke="#039855"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M27.0257 52.3938L43.5632 68.9375L75.2569 37.625"
        stroke="#039855"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </g>
    <defs>
      <clipPath id="clip0_success_email">
        <rect width="100" height="100" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

export default function EmailHomeOtpScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [otp, setOtp] = useState("");
  const [displayEmail, setDisplayEmail] = useState("00:30");
  const [timeroff1, setTimeroff1] = useState(true);
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);
  // Re-triggerable flag for the wrong-OTP shake. Cleared on animationend so the
  // next failed attempt can replay it even if isWrongOTP was already true.
  const [shakeOtp, setShakeOtp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  // True once the backend reports OTP_002 ("Maximum resend limit reached"); we
  // then replace the Resend option with a Home button.
  const [maxResendReached, setMaxResendReached] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  // Email is rendered on screen, so it must live in state — a ref update would
  // not re-render, leaving the address blank until some other state change
  // (the resend timer tick) happened to repaint it.
  const [email, setEmail] = useState("");
  const mobileRef = useRef("");

  const utmSource = searchParams.get("utm_source") || "NA";
  const utmMedium = searchParams.get("utm_medium") || "NA";
  const utmCampaign = searchParams.get("utm_campaign") || "NA";

  const applicationId =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("ApplicationId") ?? "")
      : "";

  const isVerifyDisabled = otp.length !== 6;

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    if (typeof window !== "undefined") {
      // 'email' is set by HomeComponent for Semi-Digital (response.emailAddress)
      // or by email-home-textpage for the manual entry flow.
      setEmail(sessionStorage.getItem("email") || "");
      mobileRef.current = sessionStorage.getItem("mobile") || "";
    }
    // The OTP is already sent during registration on the previous screen, so we
    // do NOT call the send API on page load — just start the resend countdown.
    startTimerEmail();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimerEmail = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    let seconds = 30;
    let statSec = 30;
    setDisplayEmail("00:30");
    setTimeroff1(true);

    intervalRef.current = setInterval(() => {
      seconds--;
      if (statSec !== 0) statSec--;
      else statSec = 29;
      const textSec = statSec < 10 ? "0" + statSec : String(statSec);
      setDisplayEmail(`00:${textSec}`);
      if (seconds === 0) {
        setTimeroff1(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 1000);
  };

  const handleOtpChange = (value: string | null | undefined) => {
    const val = value ?? "";
    setOtp(val);
    if (isWrongOTP) setIsWrongOTP(false);
    if (isRightOTP) setIsRightOTP(false);
  };

  const editEmailID = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/email-home-textpage");
      hideSpinner();
    }, 200);
  };

  const getEmailOtp = async (isResend: boolean) => {
    showSpinner();
    if (!applicationId) {
      toast.error("Your session has expired, please start again.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      setTimeout(() => {
        router.push("/home");
        hideSpinner();
      }, 200);
      return;
    }
    setOtp("");
    setIsWrongOTP(false);
    setIsRightOTP(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    try {
      const response = await apiService.sendNriOtp(
        applicationId,
        "Email",
        hideSpinner,
        {
          emailAddress: email,
        },
      );
      hideSpinner();
      // Keep the countdown running regardless of the send status.
      startTimerEmail();
      setOtp("");
      if (response && isResend) {
        toast.success("OTP sent successfully!", {
          position: "bottom-center",
          autoClose: 2000,
        });
      }
    } catch (error: any) {
      hideSpinner();
      // OTP_002 = max resend limit reached → replace the timer with the Home option.
      if (error?.response?.data?.errorCode === "OTP_002") {
        setMaxResendReached(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
        return;
      }
      // Any other failure: keep the timer running so the user can retry resend.
      startTimerEmail();
    }
  };

  const getEmailOtpVerify = async () => {
    showSpinner();
    if (!applicationId) {
      toast.error("Your session has expired, please start again.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      setTimeout(() => {
        router.push("/home");
        hideSpinner();
      }, 200);
      return;
    }
    setIsWrongOTP(false);
    setIsRightOTP(false);
    try {
      const response = await apiService.verifyNriOtp(
        applicationId,
        "Email",
        otp,
        hideSpinner,
      );
      hideSpinner();
      // A 200 response can still carry { verified: false } - only treat an
      // explicitly verified response as success.
      if (response?.verified) {
        if (response.applicationNumber) {
          sessionStorage.setItem("applicationNumber", response.applicationNumber);
        }
        if (response.nextStage) {
          sessionStorage.setItem("nextStage", response.nextStage);
        }
        setIsRightOTP(true);
        setIsWrongOTP(false);
        if (typeof window !== "undefined") sessionStorage.removeItem("email");
        if (intervalRef.current) clearInterval(intervalRef.current);
        setShowSuccessModal(true);
        setTimeout(() => {
          setShowSuccessModal(false);
          // router.push("/uploadProcess/1");
          let route = "";
          try {
            const uiMetadata = response?.uiMetadata
              ? JSON.parse(response.uiMetadata)
              : null;

            route = uiMetadata?.route || "";
          } catch (error: any) {
            route = "";
          }

          if (route) {
            router.push(`/${route}`);
            return;
          } else {
            toast.error("Next Route Not provided", {
              position: "bottom-center",
              autoClose: 3000,
            });
          }
        }, 2000);
      } else {
        setIsWrongOTP(true);
        setIsRightOTP(false);
        setShakeOtp(true);
      }
    } catch {
      setIsWrongOTP(true);
      setIsRightOTP(false);
      setShakeOtp(true);
      hideSpinner();
    }
  };

  // Figma 0:19259 — wrong OTP: #ff2e00 border + text
  const otpInputClass = `${styles.otpBox}${isWrongOTP ? ` ${styles.otpBoxError}` : isRightOTP ? ` ${styles.otpBoxSuccess}` : ""}`;

  const otpForm = (
    <div className={styles.otpBody}>
      {/* Email address + Edit */}
      <div className={styles.emailRow}>
        <span className={styles.emailAddress}>{email}</span>
        <button type="button" className={styles.editBtn} onClick={editEmailID}>
          <EditSvg />
          <span>Edit</span>
        </button>
      </div>

      {/* OTP input */}
      <div className={styles.otpField}>
        <span id="email-otp-label" className={styles.otpLabel}>Enter OTP</span>
        <div
          className={`${styles.otpInputWrap}${shakeOtp ? ` ${styles.shake}` : ""}`}
          onAnimationEnd={() => setShakeOtp(false)}
          role="group"
          aria-labelledby="email-otp-label"
        >
          <InputOtp
            value={otp}
            onChange={(e) => handleOtpChange(e.value as string)}
            length={6}
            integerOnly
            aria-label="Enter the 6 digit OTP sent to your email"
            pt={{ input: { root: { className: otpInputClass } } }}
          />
        </div>
      </div>

      {/* Resend row */}
      <div className={styles.resendRow}>
        {maxResendReached ? (
          <span className={styles.resendTimer}>
            Maximum resend attempts reached. Please try again after 15 mins.
          </span>
        ) : (
          <>
            <span className={styles.resendText}>
              Didn&apos;t receive the OTP?
            </span>
            {timeroff1 ? (
              <span className={styles.resendTimer}>
                Resend OTP ({displayEmail} sec)
              </span>
            ) : (
              <button
                type="button"
                className={styles.resendBtn}
                onClick={() => getEmailOtp(true)}
              >
                Resend OTP
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE ── */}
      <section
        aria-label="Email OTP Verification"
        className={styles.mobilePage}
      >
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={editEmailID}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>OTP Verification</h5>
              <p className={styles.mobileSubtitle}>
                You will receive OTP on your registered Email ID
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>{otpForm}</div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isVerifyDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ""}`}
            onClick={getEmailOtpVerify}
            disabled={isVerifyDisabled}
          >
            Verify
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP ── */}
      <section
        aria-label="Email OTP Verification"
        className={styles.desktopPage}
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={editEmailID}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>OTP Verification</h5>
              <p className={styles.desktopCardSubtitle}>
                You will receive OTP on your registered Email ID
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            {otpForm}
            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isVerifyDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ""}`}
                onClick={getEmailOtpVerify}
                disabled={isVerifyDisabled}
              >
                Verify
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>

      {/* ── SUCCESS MODAL — Figma 0:18971 ──
          Transient success confirmation — it auto-dismisses and navigates on,
          with no interactive content. So it's a live status announcement, not
          a focus-trapping dialog: role="status" lets screen readers read the
          confirmation without stranding keyboard users (WCAG 4.1.3). */}
      {showSuccessModal && (
        <div
          className={styles.modalOverlay}
          role="status"
          aria-live="polite"
        >
          <div className={styles.modalCard}>
            <SuccessCheckSvg />
            <h5 className={styles.modalTitle}>Email Verification</h5>
            <p className={styles.modalSubtitle}>
              Your Email ID has been verified successfully
            </p>
          </div>
        </div>
      )}
    </>
  );
}
