"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./passport-upload.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import apiService from "@/services/api.service";
import dynamicBackService from "@/services/back-navigation.service";
import { useSpinner } from "../spinner/Spinner";
import secureSessionService from "@/services/secure-session.service";

const getApplicationId = (): string =>
  typeof window !== "undefined"
    ? (secureSessionService.getItem("ApplicationId") ?? "")
    : "";

// PassportDetails — Passport type selection screen
// Figma: Onboarding-Mob-Passportdetails (0:35835) + desktop (0:35923)

// Value carried in the URL / sent to the API. The Foreign option is labelled
// "Foreign Country" in the UI but must travel as just "Foreign".
type PassportType = "Indian" | "Foreign" | "";

// ─── SVG: back arrow ────────────────────────────────────────────────────────
function IconBackArrow() {
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
        d="M19 12H5"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M12 19L5 12L12 5"
        stroke="#2B2B2B"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Radio option ────────────────────────────────────────────────────────────
function RadioOption({
  label,
  value,
  selected,
  onSelect,
}: {
  label: string;
  value: PassportType;
  selected: PassportType;
  onSelect: (v: PassportType) => void;
}) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      className={`${styles.radioOption}${isSelected ? ` ${styles.radioOptionSelected}` : ""}`}
      onClick={() => onSelect(value)}
      aria-pressed={isSelected}
    >
      <span
        className={`${styles.radioCircle}${isSelected ? ` ${styles.radioCircleFilled}` : ""}`}
      >
        {isSelected && <span className={styles.radioDot} />}
      </span>
      <span
        className={`${styles.radioLabel}${isSelected ? ` ${styles.radioLabelSelected}` : ""}`}
      >
        {label}
      </span>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function PassportDetails() {
  const router = useRouter();
  const [selected, setSelected] = useState<PassportType>("");
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  // Prefill the passport type from the saved PASSPORT stage (data.passportType)
  // so a revisit shows the previously chosen option pre-selected.
  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) return;

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getPassportWorkflow(applicationId);
        if (!alive) return;
        const saved = String(
          (res?.data as Record<string, unknown> | undefined)?.passportType ??
            "",
        );
        if (saved === "Indian" || saved === "Foreign") setSelected(saved);
      } catch {
        // Non-fatal — the user just picks the type manually.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // const handleBack = () => router.push('/manual-document-screen');

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("PASSPORT", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  // Route to the all-in-one upload screen with the chosen type as a query
  // param so /passportUpload/upload can show it (or branch on it).
  const handleProceed = () => {
    if (!selected) return;
    router.push(`/passportUpload/upload?type=${encodeURIComponent(selected)}`);
  };

  const isDisabled = selected === "";

  return (
    <>
      {/* ═══ MOBILE LAYOUT ══════════════════════════════════════════════════════
          Figma: 0:35835 — Onboarding-Mob-Passportdetails (360 × 800)
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Passport Details">
        {/* Gray header */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button
                type="button"
                className={styles.mobileBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Passport Details</h1>
              <p className={styles.mobileSubtitle}>
                Upload your passport (front &amp; back) to auto-fill details, or
                enter them manually.
              </p>
            </div>
          </div>
        </div>

        {/* White card */}
        <div className={styles.mobileCard}>
          <div className={styles.selectTypeSection}>
            <p className={styles.selectTypeLabel}>Select Passport Type *</p>
            <div className={styles.radioGroup}>
              <RadioOption
                label="Indian"
                value="Indian"
                selected={selected}
                onSelect={setSelected}
              />
              <RadioOption
                label="Foreign Country"
                value="Foreign"
                selected={selected}
                onSelect={setSelected}
              />
            </div>
          </div>
        </div>

        {/* Fixed bottom button */}
        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ""}`}
            onClick={handleProceed}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            Upload Passport
          </LoadingButton>
        </div>
      </div>

      {/* ═══ DESKTOP LAYOUT ═════════════════════════════════════════════════════
          Figma: 0:35923 — Desktop card
      ══════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Passport Details">
        <div className={styles.desktopCard}>
          {/* Card header */}
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Passport Details</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload your passport (front &amp; back) to auto-fill details, or
                enter them manually.
              </p>
            </div>
          </div>

          {/* Card body */}
          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <div className={styles.selectTypeSection}>
                <p className={styles.selectTypeLabel}>Select Passport Type *</p>
                <div className={styles.radioGroup}>
                  <RadioOption
                    label="Indian"
                    value="Indian"
                    selected={selected}
                    onSelect={setSelected}
                  />
                  <RadioOption
                    label="Foreign Country"
                    value="Foreign"
                    selected={selected}
                    onSelect={setSelected}
                  />
                </div>
              </div>
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ""}`}
                onClick={handleProceed}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                Upload Passport
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
