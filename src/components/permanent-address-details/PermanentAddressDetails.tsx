"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import navigationService from "@/services/navigation.service";
import styles from "./permanent-address-details.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";
import apiService from "@/services/api.service";
import { toast } from "@/services/toast.service";

// PermanentAddressDetails — gateway screen before permanent address flow
// Figma: NRO-PERMENANT-IND-ADDRESS — Desktop 2:4200, Mobile 2:4109
//
// The Yes / No answer is posted to
//   POST …/applications/{id}/digilocker/confirmation
// and the next screen comes from the response rather than from a hardcoded
// path, so the backend owns the journey order:
//
//   { "stagecode": "DIGILOCKER",
//     "uiMetadata": "{\"route\": \"digilocker-screen\"}",
//     "status": true }
//
// uiMetadata is a JSON *string*, so it has to be parsed before the route can
// be read.

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

type AadhaarLinked = "yes" | "no" | "";

// Used only when the API answers without a usable route, so a missing or
// malformed uiMetadata cannot strand the user on this screen.
const FALLBACK_ROUTES: Record<"yes" | "no", string> = {
  yes: "digilocker-screen",
  no: "personalDetailsForm/0",
};

/** Pulls `route` out of the uiMetadata JSON string; "" when absent or invalid. */
const parseRoute = (uiMetadata?: string): string => {
  if (!uiMetadata) return "";
  try {
    return String(JSON.parse(uiMetadata)?.route ?? "").trim();
  } catch {
    return "";
  }
};

export default function PermanentAddressDetails() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [aadhaarLinked, setAadhaarLinked] = useState<AadhaarLinked>("");
  const [submitting, setSubmitting] = useState(false);

  const isProceedDisabled = aadhaarLinked === "" || submitting;

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  // const goBack = () => {
  //   router.back();
  // };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("DIGILOCKER_CONFIRMATION", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const handleProceed = async () => {
    if (aadhaarLinked === "" || submitting) return;

    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    if (!applicationId) {
      toast.error("Your session has expired, please start again.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      setTimeout(() => router.push("/home"), 200);
      return;
    }
    setSubmitting(true);
    showSpinner();
    try {
      const response = await apiService.confirmDigilocker(
        applicationId,
        aadhaarLinked,
        hideSpinner,
      );

      if (response?.status === false) {
        return;
      }

      const nextRoute = parseRoute(response?.uiMetadata) || FALLBACK_ROUTES[aadhaarLinked];
      router.push(`/${nextRoute}`);
    } catch {
    } finally {
      hideSpinner();
      setSubmitting(false);
    }
  };

  const renderQuestion = (groupName: string) => (
    <div className={styles.questionBlock}>
      <p className={styles.questionLabel}>
        Is your mobile number linked to Aadhaar? *
      </p>
      <div className={styles.radioGroup}>
        <label className={styles.radioOption}>
          <input
            type="radio"
            name={groupName}
            value="yes"
            checked={aadhaarLinked === "yes"}
            onChange={(e) => setAadhaarLinked(e.target.value as AadhaarLinked)}
            className={styles.radioInput}
          />
          <span className={styles.radioLabel}>Yes</span>
        </label>
        <label className={styles.radioOption}>
          <input
            // disabled={true}
            type="radio"
            name={groupName}
            value="no"
            checked={aadhaarLinked === "no"}
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
      <section
        aria-label="Enter Permanent (Indian) Address Details"
        className={styles.mobilePage}
      >
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
              {/* <BackArrowSvg /> */}
              <BackArrow />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>
                Enter Permanent (Indian) Address Details
              </h5>
              <p className={styles.mobileSubtitle}>
                To fetch your Indian address using Aadhaar, your mobile number
                must be linked to Aadhaar
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {renderQuestion("aadhaarLinked-mob")}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isProceedDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ""}`}
            onClick={handleProceed}
            disabled={isProceedDisabled}
            suppressHydrationWarning
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP  (≥ 768px) ── */}
      <section
        aria-label="Enter Permanent (Indian) Address Details"
        className={styles.desktopPage}
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
              {/* <BackArrowSvg /> */}
              <BackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>
                Enter Permanent (Indian) Address Details
              </h5>
              <p className={styles.desktopCardSubtitle}>
                To fetch your Indian address using Aadhaar, your mobile number
                must be linked to Aadhaar
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {renderQuestion("aadhaarLinked-desk")}
            </div>
            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isProceedDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ""}`}
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
