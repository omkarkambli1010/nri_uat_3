"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./personal-details-form.module.scss";
import { useSessionValue } from '@/hooks/useSessionValue';

// PersonalDetailsForm — step 1: Gender selection
// Figma: 8TizndCcBb3VyE5CIJBEZe
//   Desktop node 0-30237 · Mobile node 0-29661

// Dummy values matching Figma — swap with API data when ready
const GENDER_OPTIONS = ["Male", "Female", "Transgender"];

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

export default function PersonalDetailsForm() {
  const router = useRouter();
  // const params = useParams();
  // const step = params?.step as string;
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [selected, setSelected] = useState("");
  // const [maritalResponse, setMaritalResponse] = useState<any[]>([]);
  // const [selectedMarital, setSelectedMarital] = useState('');
  // const [guid, setGuid] = useState('');

  const rejectStatus = useSessionValue('RejectStatus');

  // ─── Fetch saved PERSONAL workflow data on mount ───────────────────────
  const getPersonalDetailsData = async () => {
    const applicationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ApplicationId")
        : null;

    if (!applicationId) return;

    showSpinner();

    try {
      const response = await apiService.getPersonalDetailsWorkflow(
        applicationId,
        hideSpinner,
      );
      console.log("Trading Exp Workflow Response:", response);
      const savedGender =
        response?.data?.gender ?? response?.gender ?? "";

      if (savedGender && GENDER_OPTIONS.includes(savedGender)) {
        setSelected(savedGender);
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
    } finally {
      hideSpinner();
    }
  };

  useEffect(() => {
    getPersonalDetailsData();
  }, []);

  const goBack = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/personalDetailsForm/0");
      hideSpinner();
    }, 200);
  };

  // const handleSelect = (option: string) => {
  //   setSelected(option);
  //   showSpinner();
  //   setTimeout(() => {
  //     router.push('/personalDetailsForm/2');
  //     hideSpinner();
  //   }, 200);
  // };

  const handleSelect = async (option: string) => {
    setSelected(option);

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const reqData = {
      gender: option,
      stageCodes: "PERSONAL_DETAILS1",
      idempotencyKey: "",
    };

    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/personal-details`,
        reqData,
        hideSpinner,
      );

      console.log("Personal Details Gender Response:", response);

      let route = "";

      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Selfie Route Error:", error);
      }

      if (route) {
        router.push(`/${route}`);
        return;
      } else {
        toast.error("Next Route Not provided", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    } catch (error: any) {
      const errorData = error?.response?.data;

      console.log("Personal Details Gender Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const optionButtons = (
    <div className={styles.optionGrid} role="group" aria-label="Gender options">
      {GENDER_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          className={`${styles.optionBtn}${selected === option ? ` ${styles.selected}` : ""}`}
          onClick={() => handleSelect(option)}
          aria-pressed={selected === option}
        >
          {option}
        </button>
      ))}
    </div>
  );

  return (
    <>
      {/* ── MOBILE (< 768px) ─────────────────────────────────────────────────── */}
      <section aria-label="Gender" className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          {rejectStatus !== "R" ? (
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <BackArrow />
            </button>
          ) : (
            <div className={styles.backPlaceholder} aria-hidden="true" />
          )}
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>Gender</h1>
            <p className={styles.mobileSubtitle}>
              Select any one from the below
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>{optionButtons}</div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Gender" className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            {rejectStatus !== "R" ? (
              <button
                type="button"
                className={styles.desktopBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            ) : null}
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Gender</h1>
              <p className={styles.desktopCardSubtitle}>
                Select any one from the below
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>{optionButtons}</div>
        </div>
      </section>
    </>
  );
}
