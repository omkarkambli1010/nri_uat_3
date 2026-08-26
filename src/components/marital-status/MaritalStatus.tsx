"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./maritalstatus.module.scss";
import { useSessionValue } from "@/hooks/useSessionValue";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

const MARITAL_OPTIONS = ["Single", "Married"];

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

export default function MaritalStatus() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [selected, setSelected] = useState("");

  const rejectStatus = useSessionValue("RejectStatus");

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  // Prefill the saved marital status from the PERSONAL workflow stage, mirroring
  // how the other personal-details pages (TradingExp, AnnualIncome, …) bind.
  const getMaritalStatusData = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    if (!applicationId) return;

    showSpinner();
    try {
      const response = await apiService.getPersonalDetailsWorkflow(
        applicationId,
        hideSpinner,
      );
      console.log("Marital Status Workflow Response:", response);

      // Note: the PERSONAL workflow returns the field as lowercase
      // "maritalstatus" (the save endpoint uses camelCase "maritalStatus").
      const saved = String(
        response?.data?.maritalstatus ??
          response?.data?.maritalStatus ??
          response?.maritalstatus ??
          "",
      );
      const match = MARITAL_OPTIONS.find(
        (o) => o.toLowerCase() === saved.trim().toLowerCase(),
      );
      if (match) setSelected(match);
    } catch (error: any) {
      console.log("Marital Status Workflow Error:", error?.response?.data);
    } finally {
      hideSpinner();
    }
  };

  useEffect(() => {
    getMaritalStatusData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // const goBack = () => {
  //   showSpinner();
  //   setTimeout(() => {
  //     // Semi-digital users come from the manual document-upload journey
  //     // (/aadhar/upload); full-digital users come from DigiLocker.
  //     const isSemiDigital =
  //       secureSessionService.getItem("accountType") === "semi-digital";
  //     // router.push(isSemiDigital ? "/aadhar/upload" : "/digilocker-screen");
  //     router.push(isSemiDigital ? "/uploadProcess/1" : "/aadhar");
  //     hideSpinner();
  //   }, 200);
  // };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("PERSONAL_DETAILS0", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const handleSelect = async (option: string) => {
    setSelected(option);

    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const reqData = {
      maritalStatus: option,
      stageCodes: "PERSONAL_DETAILS0",
      idempotencyKey: "",
    };

    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/personal-details`,
        reqData,
        hideSpinner,
      );

      console.log("Personal Details Marital Status Response:", response);

      let route = "";

      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Route Error:", error);
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

      console.log("Personal Details Marital Status Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const optionButtons = (
    <div
      className={styles.optionGrid}
      role="group"
      aria-label="Marital status options"
    >
      {MARITAL_OPTIONS.map((option) => (
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
      <section aria-label="Personal Details" className={styles.mobilePage}>
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
            <h1 className={styles.mobileTitle}>Marital Status</h1>
            <p className={styles.mobileSubtitle}>
              Select any one from the below
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>{optionButtons}</div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Personal Details" className={styles.desktopPage}>
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
              <h1 className={styles.desktopCardTitle}>Marital Status</h1>
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
