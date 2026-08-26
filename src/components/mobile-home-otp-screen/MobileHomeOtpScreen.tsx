"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InputOtp } from "primereact/inputotp";
import { toast } from "@/services/toast.service";
import { useSpinner } from "@/components/spinner/Spinner";
import apiService from "@/services/api.service";
import aesService from "@/services/aes.service";
import styles from "./mobile-home-otp-screen.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import { setRejectStatus } from "@/lib/reject-status";
import secureSessionService from "@/services/secure-session.service";

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;
const PAGE_TITLE =
  "Open Demat Account - Free Demat & Trading Account Opening Online | SBI Securities";

const MAX_RESEND_ERROR_CODE = "OTP_002";

const TOAST_OPTS = {
  position: "bottom-center" as const,
  autoClose: 2000,
};

const DEEP_LINK_KEYS = [
  "applicationId",
  "mobileNumber",
  "rmCode",
  "countryCode",
  "journeyType",
  "nextStage",
  "loginProvider",
  "idempotencyKey",
  "utmSource",
  "utmCampaign",
  "utmMedium",
  "iSmartId",
  "promocode",
  "otpChannel",
  "request",
  "name_submitted",
] as const;

type DeepLinkParams = Record<(typeof DEEP_LINK_KEYS)[number], string>;

type OtpChannel = "sms" | "whatsapp";

// ─── Icons ───────────────────────────────────────────────────────────────────

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

function EditSvg() {
  return (
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
}

// ─── Pure helpers (no React, no component state) ─────────────────────────────

const readQueryParams = (): DeepLinkParams => {
  const out = {} as DeepLinkParams;
  const search =
    typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search);

  DEEP_LINK_KEYS.forEach((key) => {
    out[key] = (search?.get(key) ?? "").trim();
  });
  return out;
};

// Ciphertext arrives URL-safe: the encoder swaps the characters that break in a
// query string. Mirrors the Angular replaceAll chain in
// MobileHomeOtpScreenComponent.ngOnInit.
const normalizeCipher = (value: string): string =>
  value
    .replace(/\/slash\/g/g, "/")
    .replace(/\/plus\/g/g, "+")
    .replace(/\/equal\/g/g, "=");

// Decrypts an AES param the same way the Angular screen does (clientid used as
// both key and IV). Returns "" when the param is absent or undecryptable, so a
// plaintext link is unaffected.
const decryptParam = (raw: string, clientid: string): string => {
  if (!raw) return "";
  try {
    return aesService.decrypt(
      normalizeCipher(decodeURIComponent(raw)),
      clientid,
      clientid,
    ) ?? "";
  } catch {
    return "";
  }
};

// Same rule the home screen uses: Indian numbers get SMS, everyone else
// WhatsApp.
const channelForMobile = (mobileNumber: string): OtpChannel =>
  mobileNumber.startsWith("+91") ? "sms" : "whatsapp";

// The API expects the channel capitalised; the session stores it lower-case.
const toApiChannel = (channel: string): string =>
  channel === "whatsapp" ? "WhatsApp" : "Sms";

const parseRoute = (uiMetadata?: string): string => {
  try {
    return JSON.parse(uiMetadata ?? "{}").route ?? "";
  } catch {
    return "";
  }
};

const storeDeepLinkParams = (q: DeepLinkParams, otpChannel: string) => {
  const entries: Array<[string, string]> = [
    ["ApplicationId", q.applicationId],
    ["mobile", q.mobileNumber],
    ["otpChannel", otpChannel],
    ["accountType", q.journeyType === "NroDigital" ? "digital" : "semi-digital"],
    ["journeyType", q.journeyType],
    ["countryCode", q.countryCode],
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
  // Blank params (rmCode=, idempotencyKey=) are skipped rather than written:
  // secureSessionService.setItem(key, "") stores an encrypted empty string and
  // getItem then reports null for it, so writing a blank silently destroys
  // whatever the previous screen saved under that key.
  entries.forEach(([key, value]) => {
    if (value) secureSessionService.setItem(key, value);
  });

  secureSessionService.setItem(
    "registerPayload",
    JSON.stringify({
      mobileNumber: q.mobileNumber,
      countryCode: q.countryCode,
      journeyType: q.journeyType,
      loginProvider: q.loginProvider || "Mobile",
      rmCode: q.rmCode || null,
      idempotencyKey: q.idempotencyKey || null,
      utmSource: q.utmSource || "NA",
      utmCampaign: q.utmCampaign || "NA",
      utmMedium: q.utmMedium || "NA",
      iSmartId: q.iSmartId || null,
      promocode: q.promocode || "NA",
    }),
  );

  secureSessionService.setItem("deepLinkParams", JSON.stringify(q));
  secureSessionService.setItem("deepLinkUrl", window.location.href);
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function MobileHomeOtpScreen() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [otp, setOtp] = useState("");
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);
  const [shakeOtp, setShakeOtp] = useState(false);
  const [timeroff, setTimeroff] = useState(true);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [maxResendReached, setMaxResendReached] = useState(false);
  const [mobile, setMobile] = useState("");
  const [isWhatsApp, setIsWhatsApp] = useState(false);
  const [isFromUrl, setIsFromUrl] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initRef = useRef(false);
  const applicationIdRef = useRef("");

  const isVerifyDisabled = otp.length !== OTP_LENGTH;
  const channel = toApiChannel(isWhatsApp ? "whatsapp" : "sms");

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

  const startTimer = useCallback(() => {
    setTimeroff(true);
    setSecondsLeft(RESEND_SECONDS);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          setTimeroff(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearTimer]);

  const redirectToHome = useCallback(
    (message?: string) => {
      if (message) toast.error(message, TOAST_OPTS);
      setTimeout(() => router.push("/home"), 200);
    },
    [router],
  );

  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    document.title = PAGE_TITLE;

    const q = readQueryParams();
    const isDeepLink = Boolean(q.applicationId);

    setIsFromUrl(isDeepLink);

    const clientid = secureSessionService.getItem("clientid") ?? "";

    const decryptedMobile = decryptParam(q.request, clientid);
    const decryptedFullname = decryptParam(q.name_submitted, clientid);

    if (decryptedMobile) {
      secureSessionService.setItem("request", decryptedMobile);
    }
    if (decryptedFullname) {
      secureSessionService.setItem("NameSubmitted", decryptedFullname);
    }

    const resolvedChannel: OtpChannel = isDeepLink
      ? q.otpChannel === "whatsapp" || q.otpChannel === "sms"
        ? q.otpChannel
        : channelForMobile(q.mobileNumber)
      : secureSessionService.getItem("otpChannel") === "whatsapp"
        ? "whatsapp"
        : "sms";

    if (isDeepLink) {
      applicationIdRef.current = q.applicationId;
      storeDeepLinkParams(q, resolvedChannel);
    }

    const resolvedMobile =
      (isDeepLink ? q.mobileNumber : "") ||
      decryptedMobile ||
      secureSessionService.getItem("request") ||
      "";

    setMobile(resolvedMobile);
    setIsWhatsApp(resolvedChannel === "whatsapp");

    secureSessionService.setItem(
      "deepLinkResolved",
      JSON.stringify({
        applicationId: q.applicationId,
        request: resolvedMobile,
        channel: resolvedChannel,
        isDeepLink,
      }),
    );

    if (isDeepLink) {
      window.history.replaceState(null, "", window.location.pathname);
    }

    startTimer();

    return clearTimer;
  }, [startTimer, clearTimer]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOtpChange = (value: string | null | undefined) => {
    setOtp(value ?? "");
    if (isWrongOTP) setIsWrongOTP(false);
  };

  const editMobileNumber = () => redirectToHome();

  const markOtpInvalid = () => {
    setIsWrongOTP(true);
    setIsRightOTP(false);
    setShakeOtp(true);
  };

  const getMobileOtp = async (
    isResend: boolean,
    otpChannel: string = channel,
  ) => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      redirectToHome("Your session has expired, please start again.");
      return;
    }

    showSpinner();
    try {
      const response = await apiService.sendNriOtp(
        applicationId,
        otpChannel,
        hideSpinner,
      );
      hideSpinner();
      startTimer();
      setOtp("");
      if (response && isResend) {
        toast.success("OTP sent successfully!", TOAST_OPTS);
      }
    } catch (error: unknown) {
      hideSpinner();

      const errorCode = (
        error as { response?: { data?: { errorCode?: string } } }
      )?.response?.data?.errorCode;

      if (errorCode === MAX_RESEND_ERROR_CODE) {
        setMaxResendReached(true);
        clearTimer();
        return;
      }
      startTimer();
    }
  };

  const getMobileOtpVerify = async () => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      redirectToHome("Your session has expired, please start again.");
      return;
    }

    showSpinner();
    try {
      const response = await apiService.verifyNriOtp(
        applicationId,
        channel,
        otp,
        hideSpinner,
      );
      hideSpinner();

      if (!response) {
        markOtpInvalid();
        return;
      }

      secureSessionService.setItem(
        "AccT",
        response?.accessToken?.toString() ?? "",
      );
      secureSessionService.setItem(
        "NomineeOptOut",
        response?.NomineeOptOut?.toString() ?? "true",
      );
      setRejectStatus(response?.rejectStatus);
      setIsRightOTP(true);
      setIsWrongOTP(false);
      toast.success("OTP verified successfully!", TOAST_OPTS);

      const nextRoute = parseRoute(response.uiMetadata);
      router.push(nextRoute ? `/${nextRoute}` : "/email");
    } catch {
      markOtpInvalid();
      hideSpinner();
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const otpInputClass = [
    styles.otpBox,
    isWrongOTP ? styles.otpBoxError : "",
    !isWrongOTP && isRightOTP ? styles.otpBoxSuccess : "",
  ]
    .filter(Boolean)
    .join(" ");

  const channelHint = isWhatsApp
    ? "You will receive OTP on your WhatsApp"
    : "You will receive OTP on your mobile number";

  const backButton = (className: string) =>
    !isFromUrl && (
      <button
        type="button"
        className={className}
        onClick={editMobileNumber}
        aria-label="Go back"
      >
        <BackArrow />
      </button>
    );

  const verifyButton = (base: string, disabledClass: string) => (
    <LoadingButton
      type="button"
      className={`${base}${isVerifyDisabled ? ` ${disabledClass}` : ""}`}
      onClick={getMobileOtpVerify}
      disabled={isVerifyDisabled}
    >
      Verify
    </LoadingButton>
  );

  const otpForm = (
    <div className={styles.otpBody}>
      {/* Phone number + Edit */}
      <div className={styles.phoneRow}>
        <span className={styles.phoneNumber}>{mobile}</span>
        <button
          type="button"
          className={styles.editBtn}
          onClick={editMobileNumber}
        >
          <EditSvg />
          <span>Edit</span>
        </button>
      </div>

      {/* OTP input */}
      <div className={styles.otpField}>
        <span id="mob-otp-label" className={styles.otpLabel}>
          Enter OTP
        </span>
        <div
          className={`${styles.otpInputWrap}${shakeOtp ? ` ${styles.shake}` : ""}`}
          onAnimationEnd={() => setShakeOtp(false)}
          role="group"
          aria-labelledby="mob-otp-label"
        >
          <InputOtp
            value={otp}
            onChange={(e) => handleOtpChange(e.value as string)}
            length={OTP_LENGTH}
            integerOnly
            aria-label={`Enter the ${OTP_LENGTH} digit OTP sent to your mobile number`}
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
            {timeroff ? (
              <span className={styles.resendTimer}>
                Resend OTP : {secondsLeft} sec
              </span>
            ) : (
              <button
                type="button"
                className={styles.resendBtn}
                onClick={() => getMobileOtp(true)}
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
        aria-label="Mobile OTP Verification"
        className={styles.mobilePage}
      >
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            {backButton(styles.mobileBackBtn)}
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>OTP Verification</h5>
              <p className={styles.mobileSubtitle}>{channelHint}</p>
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
        aria-label="Mobile OTP Verification"
        className={styles.desktopPage}
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            {backButton(styles.desktopBackBtn)}
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>OTP Verification</h5>
              <p className={styles.desktopCardSubtitle}>{channelHint}</p>
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
    </>
  );
}
