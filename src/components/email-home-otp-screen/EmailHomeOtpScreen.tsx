"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InputOtp } from "primereact/inputotp";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import aesService from "@/services/aes.service";
import navigationService from "@/services/navigation.service";
import styles from "./email-home-otp-screen.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import { setRejectStatus } from "@/lib/reject-status";
import secureSessionService from "@/services/secure-session.service";

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

const MAX_RESEND_ERROR_CODE = "OTP_002";

const TOAST_OPTS = {
  position: "bottom-center" as const,
  autoClose: 2000,
};

const DEEP_LINK_KEYS = [
  "applicationId",
  "emailAddress",
  "rmCode",
  "journeyType",
  "nextStage",
  "loginProvider",
  "idempotencyKey",
  "utmSource",
  "utmCampaign",
  "utmMedium",
  "iSmartId",
  "promocode",
  "request",
  "name_submitted",
] as const;

type DeepLinkParams = Record<(typeof DEEP_LINK_KEYS)[number], string>;

const KEY_ALIASES: Partial<Record<(typeof DEEP_LINK_KEYS)[number], string[]>> = {
  emailAddress: ["email"],
  utmSource: ["utm_source"],
  utmCampaign: ["utm_campaign"],
  utmMedium: ["utm_medium"],
};

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 18"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 6"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const EditSvg = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
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

// ─── Pure helpers (no React, no component state) ─────────────────────────────

const readQueryParams = (): DeepLinkParams => {
  const out = {} as DeepLinkParams;
  const search =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);

  DEEP_LINK_KEYS.forEach((key) => {
    const candidates = [key, ...(KEY_ALIASES[key] ?? [])];
    const value =
      candidates.map((name) => search?.get(name) ?? "").find(Boolean) ?? "";
    out[key] = value.trim();
  });
  return out;
};

const normalizeCipher = (value: string): string =>
  value
    .replace(/\/slash\/g/g, "/")
    .replace(/\/plus\/g/g, "+")
    .replace(/\/equal\/g/g, "=");

const decryptParam = (raw: string, clientid: string): string => {
  if (!raw) return "";
  try {
    return (
      aesService.decrypt(
        normalizeCipher(decodeURIComponent(raw)),
        clientid,
        clientid,
      ) ?? ""
    );
  } catch {
    return "";
  }
};

const parseRoute = (uiMetadata?: string): string => {
  try {
    return JSON.parse(uiMetadata ?? "{}").route ?? "";
  } catch {
    return "";
  }
};

const storeDeepLinkParams = (q: DeepLinkParams) => {
  const entries: Array<[string, string]> = [
    ["ApplicationId", q.applicationId],
    ["email", q.emailAddress],
    ["journeyType", q.journeyType],
    ["accountType", q.journeyType === "NroDigital" ? "digital" : "semi-digital"],
    ["rmCode", q.rmCode],
    ["nextStage", q.nextStage],
    ["loginProvider", q.loginProvider],
    ["idempotencyKey", q.idempotencyKey],
    ["UTMSOURCE", q.utmSource],
    ["UTMCAMP", q.utmCampaign],
    ["UTMMEDIUM", q.utmMedium],
    ["iSmartId", q.iSmartId],
    ["promocode", q.promocode],
  ];
  entries.forEach(([key, value]) => {
    if (value) secureSessionService.setItem(key, value);
  });

  secureSessionService.setItem("deepLinkParams", JSON.stringify(q));
  secureSessionService.setItem("deepLinkUrl", window.location.href);
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmailHomeOtpScreen() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [otp, setOtp] = useState("");
  const [displayEmail, setDisplayEmail] = useState("00:30");
  const [timeroff1, setTimeroff1] = useState(true);
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [maxResendReached, setMaxResendReached] = useState(false);
  const [email, setEmail] = useState("");
  const [isFromUrl, setIsFromUrl] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);
  const applicationIdRef = useRef("");
  const mobileRef = useRef("");

  const isVerifyDisabled = otp.length !== OTP_LENGTH;

  const getApplicationId = useCallback(
    (): string =>
      applicationIdRef.current ||
      secureSessionService.getItem("ApplicationId") ||
      "",
    [],
  );

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimerEmail = useCallback(() => {
    clearTimer();
    let seconds = RESEND_SECONDS;
    setDisplayEmail(`00:${RESEND_SECONDS}`);
    setTimeroff1(true);

    intervalRef.current = setInterval(() => {
      seconds--;
      const textSec = seconds < 10 ? `0${seconds}` : String(seconds);
      setDisplayEmail(`00:${textSec}`);
      if (seconds <= 0) {
        setTimeroff1(false);
        clearTimer();
      }
    }, 1000);
  }, [clearTimer]);

  const redirectToHome = useCallback(
    (message?: string) => {
      if (message) toast.error(message, TOAST_OPTS);
      setTimeout(() => router.push("/home"), 200);
    },
    [router],
  );

  // ── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    navigationService.setRouter(router, hideSpinner);

    const q = readQueryParams();
    const isDeepLink = Boolean(q.applicationId);
    setIsFromUrl(isDeepLink);

    const clientid = secureSessionService.getItem("clientid") ?? "";
    const decryptedEmail = decryptParam(q.request, clientid);
    const decryptedFullname = decryptParam(q.name_submitted, clientid);

    if (decryptedEmail) {
      secureSessionService.setItem("request", decryptedEmail);
    }
    if (decryptedFullname) {
      secureSessionService.setItem("NameSubmitted", decryptedFullname);
    }

    if (isDeepLink) {
      applicationIdRef.current = q.applicationId;
      storeDeepLinkParams(q);
    }

    const resolvedEmail =
      (isDeepLink ? q.emailAddress : "") ||
      decryptedEmail ||
      secureSessionService.getItem("request") ||
      "";

    setEmail(resolvedEmail);
    mobileRef.current = secureSessionService.getItem("request") || "";

    secureSessionService.setItem(
      "deepLinkResolved",
      JSON.stringify({
        applicationId: q.applicationId,
        request: resolvedEmail,
        isDeepLink,
      }),
    );

    if (isDeepLink) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    startTimerEmail();

    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

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

  const markOtpInvalid = () => {
    setIsWrongOTP(true);
    setIsRightOTP(false);
    setShakeOtp(true);
  };

  const getEmailOtp = async (isResend: boolean) => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      redirectToHome("Your session has expired, please start again.");
      return;
    }

    showSpinner();
    setOtp("");
    setIsWrongOTP(false);
    setIsRightOTP(false);
    clearTimer();

    try {
      const response = await apiService.sendNriOtp(
        applicationId,
        "Email",
        hideSpinner,
        { emailAddress: email },
      );
      hideSpinner();
      // Keep the countdown running regardless of the send status.
      startTimerEmail();
      setOtp("");
      if (response && isResend) {
        toast.success("OTP sent successfully!", TOAST_OPTS);
      }
    } catch (error: unknown) {
      hideSpinner();

      const errorCode = (
        error as { response?: { data?: { errorCode?: string } } }
      )?.response?.data?.errorCode;

      // OTP_002 = max resend limit reached -> replace the timer with the notice.
      if (errorCode === MAX_RESEND_ERROR_CODE) {
        setMaxResendReached(true);
        clearTimer();
        return;
      }
      // Any other failure: keep the timer running so the user can retry resend.
      startTimerEmail();
    }
  };

  const getEmailOtpVerify = async () => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      redirectToHome("Your session has expired, please start again.");
      return;
    }

    showSpinner();
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

      // A 200 response can still carry { verified: false } — only treat an
      // explicitly verified response as success.
      if (!response?.verified) {
        markOtpInvalid();
        return;
      }

      if (response.applicationNumber) {
        secureSessionService.setItem(
          "applicationNumber",
          response.applicationNumber,
        );
      }
      if (response.nextStage) {
        secureSessionService.setItem("nextStage", response.nextStage);
      }
      secureSessionService.setItem(
        "NomineeOptOut",
        response?.NomineeOptOut?.toString() ?? "true",
      );
      secureSessionService.setItem(
        "AccT",
        response?.accessToken?.toString() ?? "",
      );

      setRejectStatus(response?.rejectStatus);
      setIsRightOTP(true);
      setIsWrongOTP(false);

      if (typeof window !== "undefined") {
        secureSessionService.removeItem("email");
      }
      clearTimer();
      setShowSuccessModal(true);

      setTimeout(() => {
        setShowSuccessModal(false);
        const route = parseRoute(response?.uiMetadata);
        if (route) {
          router.push(`/${route}`);
          return;
        }
        toast.error("Next Route Not provided", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }, 2000);
    } catch {
      markOtpInvalid();
      hideSpinner();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  // Figma 0:19259 — wrong OTP: #ff2e00 border + text
  const otpInputClass = `${styles.otpBox}${
    isWrongOTP
      ? ` ${styles.otpBoxError}`
      : isRightOTP
        ? ` ${styles.otpBoxSuccess}`
        : ""
  }`;

  // Arrived via deep link -> there is no previous screen, so no back button.
  const backButton = (className: string) =>
    !isFromUrl && (
      <button
        type="button"
        className={className}
        onClick={editEmailID}
        aria-label="Go back"
      >
        <BackArrow />
      </button>
    );

  const verifyButton = (base: string, disabledClass: string) => (
    <LoadingButton
      type="button"
      className={`${base}${isVerifyDisabled ? ` ${disabledClass}` : ""}`}
      onClick={getEmailOtpVerify}
      disabled={isVerifyDisabled}
    >
      Verify
    </LoadingButton>
  );

  const otpForm = (
    <div className={styles.otpBody}>
      {/* Email address + Edit */}
      <div className={styles.emailRow}>
        <span className={styles.emailAddress}>{email}</span>
        {/* Matches the mobile screen: Edit stays available even on a deep
            link. Wrap this in `!isFromUrl && (...)` if the email that arrived
            in the URL must not be changed. */}
        <button type="button" className={styles.editBtn} onClick={editEmailID}>
          <EditSvg />
          <span>Edit</span>
        </button>
      </div>

      {/* OTP input */}
      <div className={styles.otpField}>
        <span id="email-otp-label" className={styles.otpLabel}>
          Enter OTP
        </span>
        <div
          className={`${styles.otpInputWrap}${shakeOtp ? ` ${styles.shake}` : ""}`}
          onAnimationEnd={() => setShakeOtp(false)}
          role="group"
          aria-labelledby="email-otp-label"
        >
          <InputOtp
            value={otp}
            onChange={(e) => handleOtpChange(e.value as string)}
            length={OTP_LENGTH}
            integerOnly
            aria-label={`Enter the ${OTP_LENGTH} digit OTP sent to your email`}
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
            {backButton(styles.mobileBackBtn)}
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>OTP Verification</h5>
              <p className={styles.mobileSubtitle}>
                You will receive OTP on your Email ID
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>{otpForm}</div>

        <div className={styles.mobileProceedArea}>
          {verifyButton(
            styles.mobileProceedBtn,
            styles.mobileProceedBtnDisabled,
          )}
        </div>
      </section>

      {/* ── DESKTOP ── */}
      <section
        aria-label="Email OTP Verification"
        className={styles.desktopPage}
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            {backButton(styles.desktopBackBtn)}
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>OTP Verification</h5>
              <p className={styles.desktopCardSubtitle}>
                You will receive OTP on your Email ID
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            {otpForm}
            <div className={styles.desktopProceedWrapper}>
              {verifyButton(
                styles.desktopProceedBtn,
                styles.desktopProceedBtnDisabled,
              )}
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
        <div className={styles.modalOverlay} role="status" aria-live="polite">
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
