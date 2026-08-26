"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import { SignatureUploadModal } from "@/components/upload-signature/SignatureUploadModal";
import { signatureStore } from "@/components/upload-signature/signatureStore";
import styles from "./upload-signature-info.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

const DESKTOP_MQ = "(min-width: 992px)";

// UploadSignatureInfo — Signature Verification options screen.
// Figma desktop: node 0:40586 ; mobile: node 0:39776.

type SignatureOption = "draw" | "upload";

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
      width="8"
      height="15"
      viewBox="0 0 8 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 1L1 7.5L7 14"
        stroke="#666666"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RadioControl({ selected }: { selected: boolean }) {
  return (
    <div className={styles.radioWrap} aria-hidden="true">
      <div
        className={`${styles.radioOuter}${selected ? " " + styles.radioOuterSelected : ""}`}
      >
        {selected && <span className={styles.radioDot} />}
      </div>
    </div>
  );
}

interface OptionCardProps {
  value: SignatureOption;
  title: string;
  subtitle: string;
  recommended?: boolean;
  selected: boolean;
  onSelect: (value: SignatureOption) => void;
}

function OptionCard({
  value,
  title,
  subtitle,
  recommended,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      className={`${styles.optionCard}${selected ? " " + styles.optionCardSelected : ""}`}
      onClick={() => onSelect(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(value);
        }
      }}
    >
      {recommended && (
        <span className={styles.recommendedBadge}>Recommended</span>
      )}
      <RadioControl selected={selected} />
      <div className={styles.optionContent}>
        <p className={styles.optionTitle}>{title}</p>
        <p className={styles.optionSubtitle}>{subtitle}</p>
      </div>
    </div>
  );
}

export default function UploadSignatureInfo() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [selected, setSelected] = useState<SignatureOption>("draw");
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
  //     router.push('/planprocess/2');
  //     hideSpinner();
  //   }, 200);
  // };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("SIGNATURE", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const handleProceed = () => {
    if (selected === "upload") {
      // Open the upload modal directly on this page. After the user picks a
      // file and confirms Proceed in the modal, we stash it in the module
      // store and navigate to /uploadSignature where the verify state picks
      // it up immediately.
      setShowUploadModal(true);
      return;
    }
    showSpinner();
    setTimeout(() => {
      router.push("/uploadSignature");
      hideSpinner();
    }, 200);
  };

  const onModalUploaded = (file: {
    name: string;
    blob: Blob;
    objectUrl: string;
    type: string;
    size: number;
  }) => {
    signatureStore.set(file);
    setShowUploadModal(false);
    showSpinner();
    setTimeout(() => {
      router.push("/uploadSignature");
      hideSpinner();
    }, 200);
  };

  return (
    <section
      className="pan_details_form"
      aria-label="Signature Verification"
      style={{
        background: "#f8f8f8",
        minHeight: "calc(100vh - 90px)",
        padding: 0,
      }}
    >
      <SignatureUploadModal
        open={showUploadModal}
        isDesktop={!!isDesktop}
        onClose={() => setShowUploadModal(false)}
        onUploaded={onModalUploaded}
      />
      {/* ══════════════════════════════════════════════════════════
          MOBILE LAYOUT
          ══════════════════════════════════════════════════════════ */}
      <div className="mobile_css" style={{ width: "100%" }}>
        <div className={styles.mobGrayHeader}>
          <div className={styles.mobBackRow}>
            {!isRejectStatus && (
              <button
                type="button"
                className={styles.mobBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <MobBackChevron />
              </button>
            )}
          </div>
          <div className={styles.mobTitleBlock}>
            <div className={styles.mobTitleRow}>
              <p className={styles.mobTitle}>Signature Verification</p>
              <button
                type="button"
                className={styles.needHelpChip}
                onClick={openFaq}
              >
                Need Help?
              </button>
            </div>
            <p className={styles.mobSubtitle}>Choose from the below options</p>
          </div>
        </div>

        <div className={styles.mobContentCard}>
          <div
            className={styles.optionsList}
            role="radiogroup"
            aria-label="Signature option"
          >
            <OptionCard
              value="draw"
              title="Draw signature"
              subtitle="Dots, lines or random shapes won't be accepted"
              recommended
              selected={selected === "draw"}
              onSelect={setSelected}
            />
            <OptionCard
              value="upload"
              title="Upload your signature"
              subtitle="Sign on a plane white paper and upload it."
              selected={selected === "upload"}
              onSelect={setSelected}
            />
          </div>
        </div>

        <div className={styles.mobBtnBar}>
          <LoadingButton
            type="button"
            className={styles.mobProceedBtn}
            onClick={handleProceed}
          >
            Proceed
          </LoadingButton>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          DESKTOP LAYOUT
          ══════════════════════════════════════════════════════════ */}
      <div className="desktop_css">
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
                <h5>Signature Verification</h5>
                <button
                  type="button"
                  className={styles.needHelpChip}
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              <p>Choose from the below options</p>
            </div>
          </div>

          <div className={styles.deskBody}>
            <div
              className={styles.optionsList}
              role="radiogroup"
              aria-label="Signature option"
            >
              <OptionCard
                value="draw"
                title="Draw signature"
                subtitle="Dots, lines or random shapes won't be accepted"
                recommended
                selected={selected === "draw"}
                onSelect={setSelected}
              />
              <OptionCard
                value="upload"
                title="Upload your signature"
                subtitle="Sign on a plane white paper and upload it."
                selected={selected === "upload"}
                onSelect={setSelected}
              />
            </div>

            <div className={styles.deskBtnRow}>
              <LoadingButton
                type="button"
                className={styles.proceedBtn}
                onClick={handleProceed}
              >
                Proceed
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
