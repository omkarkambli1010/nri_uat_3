"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./annual-income.module.scss";

// AnnualIncome — step 3: Annual Income
// Figma: 8TizndCcBb3VyE5CIJBEZe
//   Desktop node 0-28219 · Mobile node 0-28129

// Dummy values matching Figma — swap with API data when ready
const INCOME_OPTIONS = [
  "Below 1 lac",
  "1 lac - 5 lacs",
  "5 lacs - 10 lacs",
  "10 lacs - 25 lacs",
  "25 lacs - 1 Crore",
  "Above 1 Crore",
];

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

export default function AnnualIncome() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [selected, setSelected] = useState("");
  // const [incomeResponse, setIncomeResponse] = useState<any[]>([]);
  // const [selectedIncome, setSelectedIncome] = useState('');
  // const [guid, setGuid] = useState('');

  const rejectStatus =
    typeof window !== "undefined"
      ? sessionStorage.getItem("RejectStatus")
      : null;

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    // getPersonalDetails();
    // getIncomeData();
  }, []);

  // const getIncomeData = async () => {
  //   showSpinner();
  //   const reqData = {
  //     flag: 'AnnualIncome',
  //     formnumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/WorkflowDetails/getworkflowdata', reqData, hideSpinner);
  //     if (response?.status === true && response?.message === 'Data found' && response?.data?.length) {
  //       setSelectedIncome(response.data[0].AnnualIncome || '');
  //     }
  //   } catch { hideSpinner(); }
  // };

  // const getPersonalDetails = async () => {
  //   showSpinner();
  //   try {
  //     const response = await apiService.postRequest('api/v1/masters/get', { flag: 'all' }, hideSpinner);
  //     if (response) {
  //       setGuid(response.request_id || '');
  //       if (response?.status === true && response?.data) {
  //         setIncomeResponse(response.data.data9 || []);
  //       }
  //     }
  //   } catch { hideSpinner(); }
  // };

  // const PersonalDetailsave = async (flag: string, declaration: string) => {
  //   showSpinner();
  //   const reqData = {
  //     Flag: flag,
  //     AnnualIncome: declaration,
  //     FormNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
  //     utm_source: 'search-engine',
  //     utm_medium: 'organic',
  //     utm_campaign: 'Onboarding-DIY',
  //     Guid: guid,
  //     Stage: '3',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/personalDetail/save', reqData, hideSpinner);
  //     if (response?.status === true) {
  //       setSelectedIncome(declaration);
  //       if (rejectStatus !== 'R') {
  //         setTimeout(() => { router.push('/personalDetailsForm/4'); hideSpinner(); }, 200);
  //       } else {
  //         navigationService.navigateToNextStep();
  //       }
  //     } else {
  //       toast.error(response?.message || 'Error', { autoClose: 4000 });
  //       hideSpinner();
  //     }
  //   } catch { hideSpinner(); }
  // };

  const goBack = () => {
    showSpinner();
    setTimeout(() => {
      router.back();
      hideSpinner();
    }, 200);
  };

  const handleSelect = async (option: string) => {
    debugger;
    setSelected(option);

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const reqData = {
      incomeSlab: option,
      stageCodes: "PERSONAL_DETAILS3",
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
    <div
      className={styles.optionGrid}
      role="group"
      aria-label="Annual Income options"
    >
      {INCOME_OPTIONS.map((option) => (
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
      <section aria-label="Annual Income" className={styles.mobilePage}>
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
            <h1 className={styles.mobileTitle}>Annual Income</h1>
            <p className={styles.mobileSubtitle}>
              Select any one from the below
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>{optionButtons}</div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Annual Income" className={styles.desktopPage}>
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
              <h1 className={styles.desktopCardTitle}>Annual Income</h1>
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
