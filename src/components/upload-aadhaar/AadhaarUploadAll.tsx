"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { FileUploadCard } from "@/components/file-upload/FileUploadCard";
import type { UploadedFile } from "@/components/file-upload/fileUpload.types";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./aadhaar-upload.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import { useSessionValue } from "@/hooks/useSessionValue";
import dynamicBackService from "@/services/back-navigation.service";
import { toast } from "@/services/toast.service";

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = "PDF, JPG, JPEG, HEIC & PNG";
const SIZE_ERR = "File size exceeds 5 MB. Please upload a smaller file.";
const TYPE_ERR =
  "Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.";

const getApplicationId = () =>
  typeof window !== "undefined"
    ? (sessionStorage.getItem("ApplicationId") ?? "")
    : "";
const resolveNextRoute = (response: any): string | null => {
  const raw = response?.nextStageurl;
  if (raw) {
    try {
      const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      const route = parsed?.route;
      if (typeof route === "string" && route.trim()) {
        return route.startsWith("/") ? route : `/${route}`;
      }
    } catch {}
  }

  const m = /^PERSONAL_DETAILS(\d+)$/i.exec(response?.nextStage ?? "");
  if (m) return `/personalDetailsForm/${m[1]}`;

  return null;
};

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

export default function AadhaarUploadAll() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);

  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);

  const [submitting, setSubmitting] = useState(false);

  const rejectStatus = useSessionValue("RejectStatus");

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, [router, hideSpinner]);

  const captureFront = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      setFrontFile(file);
      onProgress(100);
    },
    [],
  );

  const captureBack = useCallback(
    async (file: File, onProgress: (p: number) => void) => {
      setBackFile(file);
      onProgress(100);
    },
    [],
  );

  const handleFrontFilesChange = useCallback((files: UploadedFile[]) => {
    setFrontFiles(files);
    if (!files.some((f) => f.status === "success")) setFrontFile(null);
  }, []);

  const handleBackFilesChange = useCallback((files: UploadedFile[]) => {
    setBackFiles(files);
    if (!files.some((f) => f.status === "success")) setBackFile(null);
  }, []);

  const frontReady =
    !!frontFile && frontFiles.some((f) => f.status === "success");
  const backReady = !!backFile && backFiles.some((f) => f.status === "success");

  const isDisabled = !frontReady || !backReady || submitting;

  // const handleBack = () => {
  //   showSpinner();
  //   setTimeout(() => { router.push('/aadhar'); hideSpinner(); }, 200);
  // };

  const goBack = async () => {
    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    await dynamicBackService("AADHAR_UPLOAD", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const handleProceed = async () => {
    if (isDisabled || !frontFile || !backFile) return;

    setSubmitting(true);
    showSpinner();
    try {
      const response = await apiService.uploadAadhaar(
        getApplicationId(),
        frontFile,
        backFile,
        undefined,
        hideSpinner,
      );

      if (response?.status === true) {
        const route = resolveNextRoute(response);
        if (route) {
          router.push(route);
        } else {
          navigationService.navigateToNextStep();
        }
      } else {
        toast.error(
          response?.rejectionReason ||
            response?.message ||
            "Aadhaar upload failed. Please try again.",
          { position: "bottom-center", autoClose: 3500 },
        );
        hideSpinner();
      }
    } catch {
      // apiService.handleError already showed a toast + called hideSpinner.
    } finally {
      setSubmitting(false);
      hideSpinner();
    }
  };

  const showBack = rejectStatus !== "R";

  const frontSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Aadhaar (Front)</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={captureFront}
        onFilesChange={handleFrontFilesChange}
      />
    </div>
  );

  const backSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Aadhaar (Back)</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={captureBack}
        onFilesChange={handleBackFilesChange}
      />
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE LAYOUT ════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload Aadhaar">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            {showBack && (
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
            )}
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload Aadhaar</h1>
              <p className={styles.mobileSubtitle}>
                Upload the front &amp; back side of your Aadhaar card.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {frontSection}
          {backSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ""}`}
            onClick={handleProceed}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            Proceed
          </LoadingButton>
        </div>
      </div>

      {/* ═══ DESKTOP LAYOUT ═══════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload Aadhaar">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            {showBack && (
              <button
                type="button"
                className={styles.desktopBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <IconBackArrow />
              </button>
            )}
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload Aadhaar</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload the front &amp; back side of your Aadhaar card.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {frontSection}
              {backSection}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ""}`}
                onClick={handleProceed}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                Proceed
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
