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

// Esign — "Finish Account Setup using E-Sign" landing screen.
// Figma:
//   Web    — empty RM code 0:23735 / RM code applied 0:24274
//   Mobile — empty RM code 0:23029 / RM code applied 0:23381
// Two states: an optional RM Code can be submitted to reveal the RM's name.

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
  const [rmName, setRmName] = useState(""); // non-empty once a valid RM code is applied
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
  }, []);

  const getFormNumber = () =>
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

  // const onRmCodeChange = (value: string) => {
  //   setRmCode(value);
  //   // Editing the code invalidates any previously resolved RM, so the user
  //   // must re-submit — this also re-enables the Submit button.
  //   if (rmName) setRmName('');
  // };

  // // RM Code lookup. NOTE: the 'ValidateRMCode' flag / 'RMName' response field
  // // are assumed to match the e-sign backend — confirm and adjust if they differ.
  // const submitRmCode = async () => {
  //   const code = rmCode.trim();
  //   if (!code || submitting || rmName) return;
  //   setSubmitting(true);
  //   showSpinner();
  //   try {
  //     const response = await apiService.postRequestEsign(
  //       '',
  //       { ApplicationId: getFormNumber(), flag: 'ValidateRMCode', RMCode: code },
  //       hideSpinner,
  //     );
  //     if (response?.status === true && response?.data?.RMName) {
  //       setRmName(response.data.RMName);
  //       toast.success('RM code applied.');
  //     } else {
  //       toast.error(response?.message || 'Invalid RM code. Please check and try again.');
  //     }
  //   } catch {
  //     toast.error('Could not validate the RM code. Please try again.');
  //   } finally {
  //     setSubmitting(false);
  //     hideSpinner();
  //   }
  // };

  const reviewApplicationForm = async () => {
    // const fn = getFormNumber();
    // if (!fn) {
    //   toast.error('Form number not found. Please restart the process.');
    //   return;
    // }
    // showSpinner();
    // try {
    //   const response = await apiService.postRequestEsign(
    //     '',
    //     { ApplicationId: fn, flag: 'GetEsignPDF' },
    //     hideSpinner,
    //   );
    //   if (response?.status === true && response?.data?.EsignURL) {
    //     window.open(response.data.EsignURL, '_blank', 'noopener,noreferrer');
    //   } else {
    //     toast.error(response?.message || 'Unable to load the application form.');
    //   }
    // } catch {
    //   toast.error('An error occurred while loading the application form.');
    // } finally {
    //   hideSpinner();
    // }
  };

  const proceedToEsign = async () => {
    // const fn = getFormNumber();
    // if (!fn) {
    //   toast.error('Form number not found. Please restart the process.');
    //   return;
    // }
    // showSpinner();
    // try {
    //   const response = await apiService.postRequestEsign(
    //     '',
    //     { ApplicationId: fn, flag: 'GetEsignPDF' },
    //     hideSpinner,
    //   );
    //   if (response?.status === true && response?.data?.EsignURL) {
    //     // Hand off to the e-sign service provider. Spinner stays up until the
    //     // browser navigates away.
    //     window.location.href = response.data.EsignURL;
    //   } else {
    //     toast.error(response?.message || 'Unable to start e-sign. Please try again.');
    //     hideSpinner();
    //   }
    // } catch {
    //   toast.error('An error occurred while starting e-sign.');
    //   hideSpinner();
    // }
  };

  // ── Shared UI fragments ───────────────────────────────────────────────────

  // const rmInputRow = (
  //   <div className={styles.rmInputRow}>
  //     <input
  //       className={styles.rmInput}
  //       placeholder="Enter Code"
  //       aria-label="RM Code (optional)"
  //       value={rmCode}
  //       maxLength={20}
  //       onChange={(e) => onRmCodeChange(e.target.value)}
  //     />
  //     <LoadingButton
  //       type="button"
  //       className={styles.rmSubmitBtn}
  //       disabled={submitDisabled}
  //       onClick={submitRmCode}
  //     >
  //       Submit
  //     </LoadingButton>
  //   </div>
  // );

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

  // ── Initial (pre-measurement) render — avoids a layout flash ──────────────

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="E-Sign"
        style={{ background: "#f8f8f8", minHeight: "calc(100vh - 90px)" }}
      />
    );
  }

  // ── Desktop layout ────────────────────────────────────────────────────────

  if (isDesktop) {
    return (
      <section
        className="pan_details_form"
        aria-label="E-Sign"
        style={{
          background: "#f8f8f8",
          height: "calc(100vh - 90px)",
          padding: 0,
          overflow: "hidden",
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
            <div className={styles.deskBodyScroll} data-lenis-prevent>
              <p className={styles.consentText}>{CONSENT_TEXT}</p>

              {/* <div className={styles.rmRow}>
                <p className={styles.rmLabel}>
                  RM Code <span>(Optional)</span>
                </p>
                <div className={styles.rmField}>
                  {rmInputRow}
                  {rmNameRow}
                </div>
              </div> */}

              {illustration}
              {reviewCard}
            </div>

            <div className={styles.deskFooter}>
              {/* <button type="button" className={styles.deskBtnFilled} onClick={proceedToEsign}>
                Proceed to E-Sign
              </button> */}
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

  // ── Mobile layout ─────────────────────────────────────────────────────────

  return (
    <section
      className="pan_details_form"
      aria-label="E-Sign"
      style={{
        background: "#f8f8f8",
        height: "calc(100vh - 90px)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
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

      <div className={styles.mobCard} data-lenis-prevent>
        <p className={styles.consentText}>{CONSENT_TEXT}</p>

        {/* <div className={styles.mobRmSection}>
          <p className={styles.rmLabel}>
            RM Code <span>(Optional)</span>
          </p>
          {rmInputRow}
          {rmNameRow}
        </div> */}

        {illustration}
        {reviewCard}
      </div>

      <div className={styles.mobBtnBar}>
        {/* <button
          type="button"
          className={styles.mobBtnFilled}
          onClick={proceedToEsign}
        >
          Proceed to E-Sign
        </button> */}
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
