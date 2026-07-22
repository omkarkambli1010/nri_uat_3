"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import { buildFaqUrl } from "@/lib/faq-link";
import { EsignIllustration } from "./EsignIllustration";
import styles from "./esign.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";

const DESKTOP_MQ = "(min-width: 992px)";

const SUBTITLE =
  "Almost done! Verify your details and complete e-sign securely with Aadhaar OTP.";

const CONSENT_TEXT =
  "By clicking on “Proceed to E-Sign” you agree to digitally sign the account " +
  "opening form and you will redirected to the e-Sign service provider website.";

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 6"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobBackChevron() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 17V19C4 20.1 4.9 21 6 21H18C19.1 21 20 20.1 20 19V17"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11L12 16L17 11"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 4V16"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Esign() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [rmCode, setRmCode] = useState("");
  const [rmName, setRmName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    document.title = "E-Sign | SBI Securities";

    const rejectStatus =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("RejectStatus")
        : "";

    setIsRejectStatus(rejectStatus === "R");
  }, []);

  const getApplicationId = () =>
    (typeof window !== "undefined" &&
      sessionStorage.getItem("ApplicationId")) ||
    "";

  const openFaq = () => router.push(buildFaqUrl(pathname || "/esign"));

  const goBack = () => {
    showSpinner();
    setTimeout(() => {
      router.back();
      hideSpinner();
    }, 200);
  };

  const decodeHtmlUrl = (url: string) => {
    if (typeof document === "undefined") return url;

    const textarea = document.createElement("textarea");
    textarea.innerHTML = url;
    return textarea.value;
  };

  const getAofGenerateData = async () => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found. Please restart the process.");
      return null;
    }

    const response = await apiService.postNri(
      `applications/${applicationId}/aof/generate`,
      null,
      hideSpinner,
      {
        accept: "application/json",
      },
    );

    return response;
  };

  const reviewApplicationForm = async () => {
    if (submitting) return;

    showSpinner();

    try {
      const response = await getAofGenerateData();

      if (response?.status === true && response?.presignedUrl) {
        const previewUrl = decodeHtmlUrl(response.presignedUrl);

        window.open(previewUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error(
          response?.detail || "Unable to load the application form.",
        );
      }
    } catch (error: any) {
      const errorData = error?.response?.data;

      console.log("Esign Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const proceedToEsign = async () => {
    if (submitting) return;

    setSubmitting(true);
    showSpinner();

    try {
      const response = await getAofGenerateData();

      if (response?.status === true && response?.redirectUrl) {
        const redirectUrl = decodeHtmlUrl(response.redirectUrl);

        window.location.href = redirectUrl;
      } else {
        toast.error(
          response?.message || "Unable to start e-sign. Please try again.",
        );
        setSubmitting(false);
        hideSpinner();
      }
    } catch {
      toast.error("An error occurred while starting e-sign.");
      setSubmitting(false);
      hideSpinner();
    }
  };

  const rmNameRow = rmName ? (
    <p className={styles.rmName}>
      RM Name - <strong>{rmName}</strong>
    </p>
  ) : null;

  const reviewCard = (
    <button
      type="button"
      className={styles.reviewCard}
      onClick={reviewApplicationForm}
    >
      <DownloadIcon />
      <span>Review your application form</span>
    </button>
  );

  const illustration = (
    <div className={styles.illustrationWrap}>
      <EsignIllustration />
    </div>
  );

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="E-Sign"
        style={{ background: "#f8f8f8", minHeight: "calc(100vh - 90px)" }}
      />
    );
  }

  if (isDesktop) {
    return (
      <section
        className="pan_details_form"
        aria-label="E-Sign"
        style={{
          background: "#f8f8f8",
          minHeight: "calc(100vh - 90px)",
          padding: 0,
        }}
      >
        <div className={styles.deskCard}>
          <div className={styles.deskHeader}>
            {!isRejectStatus && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            )}

            <div className={styles.deskHeaderText}>
              <div className={styles.deskTitleRow}>
                <h5>Finish Account Setup using E-Sign</h5>
                <button
                  type="button"
                  className={styles.needHelpChip}
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              <p>{SUBTITLE}</p>
            </div>
          </div>

          <div className={styles.deskBody}>
            <div className={styles.deskBodyScroll}>
              <p className={styles.consentText}>{CONSENT_TEXT}</p>

              {illustration}
              {reviewCard}
            </div>

            <div className={styles.deskFooter}>
              <LoadingButton
                type="button"
                className={styles.deskBtnFilled}
                onClick={proceedToEsign}
              >
                Proceed to E-Sign
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="pan_details_form"
      aria-label="E-Sign"
      style={{
        background: "#f8f8f8",
        minHeight: "calc(100vh - 90px)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className={styles.mobGrayHeader}>
        {!isRejectStatus && (
          <div className={styles.mobBackRow}>
            <button
              type="button"
              className={styles.mobBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <MobBackChevron />
            </button>
          </div>
        )}

        <div className={styles.mobTitleBlock}>
          <div className={styles.mobTitleRow}>
            <p className={styles.mobTitle}>Finish account setup using eSign</p>
            <button
              type="button"
              className={styles.needHelpChip}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>
          <p className={styles.mobSubtitle}>{SUBTITLE}</p>
        </div>
      </div>

      <div className={styles.mobCard}>
        <p className={styles.consentText}>{CONSENT_TEXT}</p>

        {illustration}
        {reviewCard}
      </div>

      <div className={styles.mobBtnBar}>
        <LoadingButton
          type="button"
          className={styles.deskBtnFilled}
          onClick={proceedToEsign}
        >
          Proceed to E-Sign
        </LoadingButton>
      </div>
    </section>
  );
}
