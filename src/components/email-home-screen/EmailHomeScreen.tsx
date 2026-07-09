"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./email-home-screen.module.scss";
import { publicPath } from "@/utils/publicPath";
import { useGoogleSignIn } from "@/hooks/useGoogleSignIn";
import { environment } from "@/environments/environment";
import { buttonKeyProps } from "@/utils/a11y";

// EmailHomeScreen — equivalent to Angular EmailHomeScreenComponent
// Email ID Verification — choose Google OAuth or manual email entry
// Figma: SEMI--FULL-NRE-NRO — Desktop 1:76220, Mobile 1:72658

const BackArrowSvg = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
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

export default function EmailHomeScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const utmSource = searchParams.get("utm_source") || "NA";
  const utmMedium = searchParams.get("utm_medium") || "NA";
  const utmCampaign = searchParams.get("utm_campaign") || "NA";
  const emailVerified = searchParams.get("email_verified") || "";
  const emailParam = searchParams.get("email") || "";
  const nameParam = searchParams.get("name") || "";
  const emailError = searchParams.get("Error") || "";

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);

    if (emailParam && emailVerified === "true") {
      const payload = {
        email: emailParam,
        email_verified: emailVerified,
        name: nameParam,
      };
      getEmailOtpVerify(payload);
    } else if (emailError) {
      toast.error("Google Authentication Failed, Please Try Again...", {
        position: "bottom-center",
        autoClose: 5000,
      });
    }
  }, []);

  const getEmailOtpVerify = async (payload: any) => {
    if (!payload) return;
    const reqData = {
      Flag: "SaveGmail",
      emailid: payload.email,
      emailidverified: payload.email_verified,
      GmailProfileName: payload.name,
      Formnumber: sessionStorage.getItem("FormNumber"),
      mobileno: sessionStorage.getItem("mobile"),
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
    };
    showSpinner();
    try {
      const response = await apiService.postRequest(
        "api/v1/oauth/service/otp/savegmail",
        reqData,
        hideSpinner,
      );
      if (response?.status === true) {
        setTimeout(() => {
          router.push("/uploadProcess/1");
          hideSpinner();
        }, 200);
      } else {
        toast.error(response?.message || "Error", {
          position: "bottom-center",
          autoClose: 3000,
        });
        hideSpinner();
      }
    } catch {
      hideSpinner();
    }
  };

  const { loading, signInWithGoogle } = useGoogleSignIn({
    promptParentId: "one-tap-container",

    fallbackRedirectUrl:
      environment.backendurl + "/GoogleAuthentication/GoogleSignIn.aspx",

    fallbackClientCode:
      typeof window !== "undefined" ? sessionStorage.getItem("FormNumber") : "",

    googleErrorSessionKey: "GoogleError",

    onLoadingChange: (isLoading) => {
      if (isLoading) {
        showSpinner();
      } else {
        hideSpinner();
      }
    },

    onSuccess: async (payload) => {
      if (payload.email_verified === true) {
        await getEmailOtpVerify(payload);
      } else {
        hideSpinner();
        toast.error("Google email is not verified", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    },

    onPromptBlocked: ({ reason }) => {
      console.warn("Google prompt blocked:", reason);

      toast.warning(
        "Please provide permission to fetch your data from Google or please enter Email ID manually",
        {
          position: "bottom-center",
          autoClose: 3000,
        },
      );
    },

    onError: (error) => {
      console.error("Google Authentication Error:", error);

      toast.error("Google Authentication Failed", {
        position: "bottom-center",
        autoClose: 3000,
      });
    },
  });

  const handleGoogleButtonClick = () => {
    //showSpinner();
    signInWithGoogle();
  };

  const emailTextPage = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/email-home-page");
      hideSpinner();
    }, 200);
  };

  const goBack = () => {
    sessionStorage.removeItem("mobile");
    sessionStorage.removeItem("NameSubmitted");
    setTimeout(() => {
      router.push("/home");
      hideSpinner();
    }, 200);
  };

  const googleButton = (
    <button
      type="button"
      className={styles.googleBtn}
      onClick={handleGoogleButtonClick}
      disabled={loading}
    >
      {/* Decorative — the adjacent text already names the action. */}
      <img
        src={publicPath("/assets/images/diy/google_icon_mini.png")}
        alt=""
        aria-hidden="true"
        className={styles.googleIcon}
      />
      <span>{loading ? "Please wait..." : "Continue with Google"}</span>
    </button>
  );

  const orDivider = (
    <div className={styles.orDivider}>
      <div className={styles.orLine} />
      <span className={styles.orText}>Or</span>
      <div className={styles.orLine} />
    </div>
  );

  const altEmail = (
    <div
      className={styles.altEmailBlock}
      {...buttonKeyProps(emailTextPage)}
    >
      <span className={styles.altEmailLink}>Use another E-mail ID</span>
      <span className={styles.altEmailNote}>(Require OTP Verification)</span>
    </div>
  );

  return (
    <>
      <div id="one-tap-container" />

      {/* ── MOBILE  (< 768px) ── */}
      <section aria-label="Email ID Verification" className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h5 className={styles.mobileTitle}>Email ID Verification</h5>
              <p className={styles.mobileSubtitle}>
                All communication related to your account will be sent to this
                email
              </p>
            </div>
          </div>
        </div>
        <div className={styles.mobileCard}>
          {googleButton}
          {orDivider}
          {altEmail}
        </div>
      </section>

      {/* ── DESKTOP  (≥ 768px) ── */}
      <section
        aria-label="Email ID Verification"
        className={styles.desktopPage}
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <BackArrowSvg />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h5 className={styles.desktopCardTitle}>Email ID Verification</h5>
              <p className={styles.desktopCardSubtitle}>
                All communication related to your account will be sent to this
                email
              </p>
            </div>
          </div>
          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentGroup}>
              {googleButton}
              {orDivider}
              {altEmail}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
