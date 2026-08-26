"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import styles from "./addNominee-landing.module.scss";
import { publicPath } from "@/utils/publicPath";
import apiService from "@/services/api.service";
import { toast } from "@/services/toast.service";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

// AddNomineeLanding — "Add Nominee" instruction / landing screen.
// Figma desktop: node 0:43797 ; mobile: node 0:43519.

const DESKTOP_MQ = "(min-width: 992px)";
const FAMILY_ILLUSTRATION = publicPath("/assets/images/diy/asian-family.png");

// ── Opt-out declaration copy ────────────────────────────────────────────────
// The regulatory wording shown before a customer opts out of nomination, kept
// as data rather than markup so the desktop modal and the mobile sheet render
// exactly the same text.
const POPUP_TITLE = "Nominee Opt-out Confirmation";

const POPUP_INTRO =
  "I hereby confirm that I do not wish to appoint any nominee(s) to my demat account/trading account at this point of time.";

const POPUP_UNDERSTAND = "I understand that \u2013";

const POPUP_CLAUSES = [
  {
    marker: "(i)",
    text: "the nomination helps to quickly identify the person for transfer of securities and helps in faster and smoother transmission of my securities to my legal heir(s) after my demise.",
  },
  {
    marker: "(ii)",
    text: "in the absence of a nomination, my legal heir(s) may require the submission of certain additional legal or court-issued documents which may delay the process of transmission of securities to my legal heir(s).",
  },
  {
    marker: "(iii)",
    text: "if no claim is made on the account for a prolonged period after my demise, the holdings may be treated as unclaimed assets and they may be transferred to Investor Education and protection Fund Authority (IEPF) in accordance with the applicable regulatory framework.",
  },
];

const POPUP_CLOSING =
  "I confirm that I have understood the above implications and that my decision to opt out of nomination is voluntary.";

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

export default function AddNomineeLanding() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [showOptOutPopup, setShowOptOutPopup] = useState(false);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
   //setIsRejectStatus(secureSessionService.getItem("RejectStatus") === "R");
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  };

  // const goBack = () => {
  //   showSpinner();
  //   setTimeout(() => {
  //     router.back();
  //     hideSpinner();
  //   }, 200);
  // };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("NOMINEE_OPT_OUT", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const goToAddNominee = () => {
    // Fallback to 'new' when no FormNumber is in secureSessionService. The dynamic
    // route /addNominee/[formNumber] returns 404 for an empty segment, and
    // the page reads FormNumber from secureSessionService anyway — so the URL slug
    // is just a placeholder.
    const formNumber =
      (typeof window !== "undefined" && secureSessionService.getItem("FormNumber")) ||
      "new";
    showSpinner();
    setTimeout(() => {
      router.push(`/addNominee/${formNumber}`);
      hideSpinner();
    }, 200);
  };

  const openOptOutPopup = () => setShowOptOutPopup(true);
  const closeOptOutPopup = () => setShowOptOutPopup(false);

  // Only one of the desktop/mobile variants is mounted at a time, so a single
  // trap ref serves both.
  const optOutDialogRef = useFocusTrap<HTMLDivElement>(
    showOptOutPopup,
    closeOptOutPopup,
  );

  const getApplicationId = () => {
    return typeof window !== "undefined"
      ? secureSessionService.getItem("ApplicationId") || ""
      : "";
  };

  const generateIdempotencyKey = () => {
    return typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const submitNomineeOptOut = async () => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }

    return apiService.postNri(
      `applications/${applicationId}/nominee-details`,
      {
        nominees: [],
        nomineeAdd: "No",
        isNominee: false,
        idempotencyKey: "", //generateIdempotencyKey(),
      },
      hideSpinner,
    );
  };

  const confirmOptOut = async () => {
    try {
      setShowOptOutPopup(false);
      showSpinner();

      let response = await submitNomineeOptOut();

      let route = "";

      try {
        if (response?.status === true) {
          secureSessionService.setItem("NomineeOptOut", "true");
        }

        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Route Error:", error);
      }

      if (route) {
        setTimeout(() => {
          router.push(`/${route}`);
          hideSpinner();
        }, 200);
        return;
      } else {
        toast.error("Next Route Not provided", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    } catch (error) {
      hideSpinner();
      console.error("Nominee opt-out submission failed:", error);
    }
  };

  const description =
    "Nominee will receive your investment in the event of unforeseen circumstances. Adding Nominee is mandated by SEBI guidelines. If skipped now, it must be added later post account opening.";

  const optOutDeclaration = (
    <div className={styles.declarationBody}>
      <p className={styles.declarationPara}>{POPUP_INTRO}</p>
      <p className={styles.declarationPara}>{POPUP_UNDERSTAND}</p>
      <ul className={styles.declarationList}>
        {POPUP_CLAUSES.map((clause) => (
          <li key={clause.marker} className={styles.declarationItem}>
            <span className={styles.declarationMarker}>{clause.marker}</span>
            <span>{clause.text}</span>
          </li>
        ))}
      </ul>
      <p className={styles.declarationPara}>{POPUP_CLOSING}</p>
    </div>
  );

  // Figma: desktop = centered modal (0:44390), mobile = bottom-sheet (0:46166)
  const optOutPopup =
    showOptOutPopup &&
    (isDesktop ? (
      <div
        ref={optOutDialogRef}
        className={styles.popupOverlay}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optOutPopupTitle"
        tabIndex={-1}
        onClick={closeOptOutPopup}
      >
        <div className={styles.popupCard} onClick={(e) => e.stopPropagation()}>
          <div className={styles.popupHeaderRow}>
            <h6 id="optOutPopupTitle" className={styles.popupTitle}>
              {POPUP_TITLE}
            </h6>
            <button
              type="button"
              className={styles.popupClose}
              onClick={closeOptOutPopup}
              aria-label="Close"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M6 6L18 18"
                  stroke="#2b2b2b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                <path
                  d="M18 6L6 18"
                  stroke="#2b2b2b"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          {optOutDeclaration}
          <button
            type="button"
            className={styles.popupBtnFilled}
            onClick={confirmOptOut}
          >
            Agree &amp; Continue
          </button>
        </div>
      </div>
    ) : (
      <div
        ref={optOutDialogRef}
        className={styles.sheetBackdrop}
        role="dialog"
        aria-modal="true"
        aria-labelledby="optOutPopupTitle"
        tabIndex={-1}
        onClick={closeOptOutPopup}
      >
        <div className={styles.sheetCard} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className={styles.sheetDash}
            onClick={closeOptOutPopup}
            aria-label="Close"
          />
          <div className={styles.sheetTextBlock}>
            <h6 id="optOutPopupTitle" className={styles.sheetTitle}>
              {POPUP_TITLE}
            </h6>
            {optOutDeclaration}
          </div>
          <button
            type="button"
            className={styles.sheetBtnFilled}
            onClick={confirmOptOut}
          >
            Agree &amp; Continue
          </button>
        </div>
      </div>
    ));

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="Add Nominee"
        style={{ background: "#f8f8f8", minHeight: "calc(100vh - 90px)" }}
      />
    );
  }

  // ── Desktop layout ─────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <section
        className="pan_details_form"
        aria-label="Add Nominee"
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
                <h5>Add Nominee</h5>
                <button
                  type="button"
                  className={styles.needHelpChip}
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              <p>This is an optional step, you can always do it later</p>
            </div>
          </div>

          <div className={styles.deskBody}>
            <div className={styles.deskIllustrationWrap}>
              <p className={styles.deskDescription}>{description}</p>
              <img
                src={FAMILY_ILLUSTRATION}
                alt=""
                className={styles.deskIllustration}
                aria-hidden="true"
              />
            </div>

            <div className={styles.deskBtnRow}>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={openOptOutPopup}
              >
                I Wish to Opt Out
              </button>
              <button
                type="button"
                className={styles.btnFilled}
                onClick={goToAddNominee}
              >
                Add Nominee
              </button>
            </div>
          </div>
        </div>
        {optOutPopup}
      </section>
    );
  }

  // ── Mobile layout ──────────────────────────────────────────────────────────
  return (
    <section
      className="pan_details_form"
      aria-label="Add Nominee"
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
            <p className={styles.mobTitle}>Add Nominee</p>
            <button
              type="button"
              className={styles.needHelpChip}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>
          <p className={styles.mobSubtitle}>
            This is an optional step, you can always do it later
          </p>
        </div>
      </div>

      <div className={styles.mobContentCard}>
        <p className={styles.mobDescription}>{description}</p>
        <img
          src={FAMILY_ILLUSTRATION}
          alt=""
          className={styles.mobIllustration}
          aria-hidden="true"
        />
      </div>

      <div className={styles.mobBtnBar}>
        <button
          type="button"
          className={styles.mobBtnOutline}
          onClick={openOptOutPopup}
        >
          I wish to Opt Out
        </button>
        <button
          type="button"
          className={styles.mobBtnFilled}
          onClick={goToAddNominee}
        >
          Add Nominee
        </button>
      </div>
      {optOutPopup}
    </section>
  );
}
