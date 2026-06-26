"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./occup-details.module.scss";
import { useSessionValue } from '@/hooks/useSessionValue';

// OccupDetails — step 4: Occupation Details
// Figma: 8TizndCcBb3VyE5CIJBEZe
//   Desktop node 0-27578 · Mobile node 0-27476

// Dummy values matching Figma — swap with API data when ready
const OCCUPATION_OPTIONS = [
  "Public Sector",
  "Private Sector",
  "Government Service",
  "Student",
  "Business",
  "Professional",
  "Agriculturist",
  "Retired",
  "Housewife",
  "Forex Dealer",
  "Unemployed",
  "Others",
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

export default function OccupDetails() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [selected, setSelected] = useState("");
  // const [occupationResponse, setOccupationResponse] = useState<any[]>([]);
  // const [selectedOccupation, setSelectedOccupation] = useState('');
  // const [guid, setGuid] = useState('');

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    // getPersonalDetails();
    getOccupationData();
  }, []);

  // const getOccupationData = async () => {
  //   showSpinner();
  //   const reqData = {
  //     flag: 'OCCUPATION',
  //     formnumber: typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') : '',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/WorkflowDetails/getworkflowdata', reqData, hideSpinner);
  //     if (response?.status === true && response?.message === 'Data found' && response?.data?.length) {
  //       setSelectedOccupation(response.data[0].OccupationDetail || '');
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
  //         setOccupationResponse(response.data.data7 || []);
  //       }
  //     }
  //   } catch { hideSpinner(); }
  // };

  // const PersonalDetailsave = async (flag: string, declaration: string) => {
  //   showSpinner();
  //   const reqData = {
  //     Flag: flag,
  //     Occupation: declaration,
  //     FormNumber: typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') : '',
  //     utm_source: 'search-engine',
  //     utm_medium: 'organic',
  //     utm_campaign: 'Onboarding-DIY',
  //     Guid: guid,
  //     Stage: '4',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/personalDetail/save', reqData, hideSpinner);
  //     if (response?.status === true) {
  //       setSelectedOccupation(declaration);
  //       if (rejectStatus !== 'R') {
  //         setTimeout(() => { router.push('/personalDetailsForm/5'); hideSpinner(); }, 200);
  //       } else {
  //         navigationService.navigateToNextStep();
  //       }
  //     } else {
  //       toast.error(response?.message || 'Error', { autoClose: 4000 });
  //       hideSpinner();
  //     }
  //   } catch { hideSpinner(); }
  // };

    const getOccupationData = async () => {
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
  
        const savedOccupDetails =
          response?.data?.occupation ?? response?.occupation ?? "";
  
        if (savedOccupDetails && OCCUPATION_OPTIONS.includes(savedOccupDetails)) {
          setSelected(savedOccupDetails);
        }
      } catch (error: any) {
        const errorData = error?.response?.data;
      } finally {
        hideSpinner();
      }
    };


  const goBack = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/personalDetailsForm/3");
      hideSpinner();
    }, 200);
  };

  const handleSelect = async (option: string) => {
    setSelected(option);

    const applicationId =
      sessionStorage.getItem("ApplicationId") ??
      "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const reqData = {      
      occupation: option,
      stageCodes: "PERSONAL_DETAILS4",
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
      aria-label="Occupation options"
    >
      {OCCUPATION_OPTIONS.map((option) => (
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
      <section aria-label="Occupation Details" className={styles.mobilePage}>
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
            <h1 className={styles.mobileTitle}>Occupation Details</h1>
            <p className={styles.mobileSubtitle}>
              Select any one from the below
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>{optionButtons}</div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Occupation Details" className={styles.desktopPage}>
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
              <h1 className={styles.desktopCardTitle}>Occupation Details</h1>
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
