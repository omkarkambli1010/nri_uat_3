"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./declaration.module.scss";
import { publicPath } from "@/utils/publicPath";
// Declaration — plan process step 1
// Figma: Onboarding / Step 4 / Declaration → 0:25471 (mobile) + 0:25592 (desktop)

const lifecycleDays = [
  { Days: "Daily", description: "on or before 1st Friday of every month" },
  { Days: "30 Days", description: "on or before 1st Friday of every month" },
  {
    Days: "90 Days",
    description:
      "on or before 1st Friday of every quarter (Jan, Apr, Jul, Oct)",
  },
];

const DEFAULT_TERMS_TEXT = `
  <p>Please read and accept the terms and conditions to proceed.</p>
  <ul>
    <li>I agree that all information provided is true and correct.</li>
    <li>I understand that SBI Securities may verify my details for account opening.</li>
  </ul>`;

const DEFAULT_TAX_PAYER_TEXT = `
  <p>I hereby declare that I am a resident taxpayer in India and my PAN details are correct.</p>`;

const DEFAULT_POLITICAL_EXPOSED_TEXT = `
  <p>Politically exposed persons include senior government officials, executives of state-owned enterprises, and their close relatives.</p>`;

const DEFAULT_QUESTIONNAIRE_RESPONSE = [
  {
    Title: "Automatic Credit",
    TitleId: "automatic-credit",
    Questions: [
      {
        QuestionId: "q-auto-credit",
        Question:
          "I/We authorise you to receive credit in my / our account without any instruction from me/ us.",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "Pledge",
    TitleId: "pledge",
    Questions: [
      {
        QuestionId: "q-pledge",
        Question:
          "I / We would like to instruct the DP to accept all the pledge instructions in my / our account with out any other further instruction from my / our end (If not marked, the default option would be 'No')",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "DDPI Operation",
    TitleId: "ddpi",
    Questions: [
      {
        QuestionId: "q-ddpi",
        Question:
          "Account to be operated through Demat Debit And Pledge Instruction (DDPI)",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "DIS",
    TitleId: "dis",
    Questions: [
      {
        QuestionId: "q-dis",
        Question: "I/We require Delivery Instruction Slip (DIS)",
        SelectedAns: "No",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "SMS Alert Facility",
    TitleId: "sms-alert",
    Description:
      "Mandatory if you are giving Demat Debit And Pledge Instruction (DDPI). Ensure that the mobile number is provided in the KYC Application Form.",
    inlineLayout: true,
    Questions: [
      {
        QuestionId: "q-sms-first",
        Question: "First Holder",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
      {
        QuestionId: "q-sms-second",
        Question: "Second Holder",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
      {
        QuestionId: "q-sms-third",
        Question: "Third Holder",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "ECS Mandate",
    TitleId: "ecs",
    Questions: [
      {
        QuestionId: "q-ecs",
        Question:
          "Do you wish to receive dividend / interest directly in to your Designated Bank Account through ECS?",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
        note: "ECS (If not marked, the default option would be 'Yes') [ECS is mandatory for locations notified by SEBI from time to time]",
      },
    ],
  },
  {
    Title: "BSDA Facility",
    TitleId: "bsda",
    Questions: [
      {
        QuestionId: "q-bsda",
        Question: "I/We wish to avail the BSDA facility^",
        SelectedAns: "No",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "Account Statement",
    TitleId: "account-statement",
    Questions: [
      {
        QuestionId: "q-acct-stmt",
        Question: "",
        SelectedAns: "As per SEBI Regulation",
        Answer: [
          { Key: "As per SEBI Regulation" },
          { Key: "Daily" },
          { Key: "Weekly" },
          { Key: "Fortnightly" },
          { Key: "Monthly" },
        ],
        note: "(If not marked the default option would be in Physical)",
      },
    ],
  },
  {
    Title: "RTA",
    TitleId: "rta",
    Questions: [
      {
        QuestionId: "q-rta",
        Question: "I / We would like to share the email ID with the RTA",
        SelectedAns: "Yes",
        Answer: [{ Key: "Yes" }, { Key: "No" }],
      },
    ],
  },
  {
    Title: "Standard Documents / Annual Report",
    TitleId: "std-docs",
    Questions: [
      {
        QuestionId: "q-std-docs",
        Question: "",
        SelectedAns: "Electronic",
        Answer: [
          { Key: "Electronic" },
          { Key: "Physical" },
          { Key: "Both Physical and Electronic" },
        ],
        note: "(If not marked the default option would be in Physical)",
      },
    ],
  },
  {
    Title: "Easi / Ideas",
    TitleId: "easi-ideas",
    Questions: [],
    textLines: [
      "If yes, please complete registration through depository website.",
      "[BO can view his/her ISIN balances, transactions and value of the portfolio online through Depository website]",
    ],
  },
];

// ─── SVG Icons ──────────────────────────────────────────────────

function IconBackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
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

function IconInfo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="8.25" stroke="#280071" strokeWidth="1.5" />
      <path
        d="M9 8.25V12.75"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="5.625" r="0.75" fill="#280071" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6L8 10L12 6"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Reusable Checkbox Row ───────────────────────────────────────

interface CheckboxRowProps {
  id: string;
  checked: boolean;
  onChange: (val: boolean) => void;
  label: React.ReactNode;
  onInfoClick?: () => void;
  infoLabel?: string;
}

function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  onInfoClick,
  infoLabel,
}: CheckboxRowProps) {
  return (
    <div className={styles.declarationRow} onClick={() => onChange(!checked)}>
      <div className={styles.declarationRowLeft}>
        <div className={styles.checkboxWrap}>
          <input
            id={id}
            type="checkbox"
            className={styles.customCheckbox}
            checked={checked}
            onChange={(e) => {
              e.stopPropagation();
              onChange(e.target.checked);
            }}
            onClick={(e) => e.stopPropagation()}
            aria-labelledby={`${id}-label`}
          />
        </div>
        <label
          id={`${id}-label`}
          htmlFor={id}
          className={styles.itemLabel}
          onClick={(e) => e.stopPropagation()}
        >
          {label}
        </label>
      </div>
      {onInfoClick && (
        <button
          type="button"
          className={styles.infoBtn}
          onClick={(e) => {
            e.stopPropagation();
            onInfoClick();
          }}
          aria-label={infoLabel || "More information"}
        >
          <IconInfo />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────

export default function Declaration() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [isIndianCitizen, setIsIndianCitizen] = useState(true);
  const [ispep, setIspep] = useState(false);
  const [istradingPref, setIstradingPref] = useState(false);
  const [issettledfunds, setIssettledfunds] = useState(false);
  const [istermsandcond, setIstermsandcond] = useState(false);
  const [isyono, setIsyono] = useState(false);
  const [IsYonoForm, setIsYonoForm] = useState(false);
  const [selectAll, setSelectAll] = useState(true);
  const [isProceedButton, setIsProceedButton] = useState(true);
  const [selectedOption, setSelectedOption] = useState(lifecycleDays[2]);
  const [selectedPreferenceDays, setSelectedPreferenceDays] = useState(
    lifecycleDays[2].Days,
  );
  const [preferenceDeny, setPreferenceDeny] = useState(false);

  const [questionnaireResponse, setQuestionnaireResponse] = useState<any[]>(
    DEFAULT_QUESTIONNAIRE_RESPONSE,
  );
  const [termsConditionData, setTermsConditionData] =
    useState(DEFAULT_TERMS_TEXT);
  const [taxPayerData, setTaxPayerData] = useState(DEFAULT_TAX_PAYER_TEXT);
  const [politicalExposedData, setPoliticalExposedData] = useState(
    DEFAULT_POLITICAL_EXPOSED_TEXT,
  );

  // Modal states
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showTaxpayerModal, setShowTaxpayerModal] = useState(false);
  const [showPoliticalModal, setShowPoliticalModal] = useState(false);
  const [showTradingPrefModal, setShowTradingPrefModal] = useState(false);
  const [showFundCycleModal, setShowFundCycleModal] = useState(false);
  const [showConfirmPrefModal, setShowConfirmPrefModal] = useState(false);

  const rejectStatus =
    typeof window !== "undefined"
      ? sessionStorage.getItem("RejectStatus")
      : null;
  const utmSource =
    typeof window !== "undefined"
      ? sessionStorage.getItem("UTMSOURCE") || "search-engine"
      : "search-engine";

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    // getDeclarationData();
    // getTradingPreferenceAcceptance();
    // getPlanProcess();
    selectAllCheckboxes(true, false);
  }, []);

  const getPlanProcess = async () => {
    showSpinner();
    const reqData = {
      flag: "all",
      formnumber:
        typeof window !== "undefined"
          ? sessionStorage.getItem("FormNumber")
          : "",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/masters/get",
        reqData,
        hideSpinner,
      );
      if (response?.status === true) {
        const riskModal: any[] = response.data?.data17 || [];
        const yonoData: any[] = response.data?.data20 || [];
        riskModal.forEach((item: any) => {
          if (item.Category === "Tax payer declaration")
            setTaxPayerData(item.Discription);
          else if (item.Category === "Terms and Conditions")
            setTermsConditionData(item.Discription);
          else if (
            item.Category === "Who is a politically exposed ot related person"
          )
            setPoliticalExposedData(item.Discription);
        });
        const isYonoCustomer = yonoData[0]?.IsYono === 1;
        if (isYonoCustomer) {
          setIsYonoForm(true);
          setIsyono(true);
        }
      }
      hideSpinner();
    } catch {
      hideSpinner();
    }
  };

  const getDeclarationData = async () => {
    showSpinner();
    const reqData = {
      flag: "declaration",
      formnumber:
        typeof window !== "undefined"
          ? sessionStorage.getItem("FormNumber")
          : "",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/WorkflowDetails/getworkflowdata",
        reqData,
        hideSpinner,
      );
      if (
        response?.status === true &&
        response?.message === "Data found" &&
        response?.data?.[0]
      ) {
        const d = response.data[0];
        setIsIndianCitizen(d.ResidentInd ?? true);
        setIspep(d.IsPEP);
        setIstradingPref(d.Prefernces);
        setIstermsandcond(d.TermsAndCondition);
        if (d.FundcycleDays) {
          setSelectedPreferenceDays(d.FundcycleDays);
          setSelectedOption({ Days: d.FundcycleDays, description: "" });
        }
        if (d.IsYonoConsent === "Yes") setIsyono(true);
        setIssettledfunds(true);
      }
      setSelectAll(true);
      selectAllCheckboxes(true, false);
      hideSpinner();
    } catch {
      hideSpinner();
    }
  };

  const getTradingPreferenceAcceptance = async () => {
    const reqData = {
      formNumber:
        typeof window !== "undefined"
          ? sessionStorage.getItem("FormNumber")
          : "",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/tradeprefrence/gettradeprefrence",
        reqData,
        hideSpinner,
      );
      if (response?.status === true) {
        const qr: any[] = response.data || [];
        qr.forEach((d: any) => {
          if (!d.SelectedAns) d.SelectedAns = "YES";
        });
        setQuestionnaireResponse(qr);
      }
    } catch { }
  };

  const selectAllCheckboxes = (checked: boolean, isProceed: boolean) => {
    if (checked && !isProceed) {
      setIsIndianCitizen(true);
      setIspep(true);
      setIsyono(IsYonoForm);
      setIstradingPref(true);
      setIssettledfunds(true);
      setIstermsandcond(true);
      setIsProceedButton(false);
    } else {
      setIsIndianCitizen(false);
      setIspep(false);
      setIsyono(false);
      setIstradingPref(false);
      setIssettledfunds(false);
      setIstermsandcond(false);
      setIsProceedButton(true);
    }
  };

  // isIndianCitizen is not a visible checkbox (no UI element for it), so exclude it
  // from the "all selected" check — the API always sends IsTaxResident: 'Yes' anyway.
  const checkAllCheckboxesSelected = (
    pep: boolean,
    trading: boolean,
    settled: boolean,
    terms: boolean,
    yono: boolean,
  ) => {
    const allVisible = pep && trading && settled && terms;
    const allSelected = IsYonoForm ? allVisible && yono : allVisible;
    setSelectAll(allSelected);
    setIsProceedButton(!allSelected);
  };

  const handleCheckbox = (field: string, value: boolean) => {
    const newState = {
      ispep,
      istradingPref,
      issettledfunds,
      istermsandcond,
      isyono,
      [field]: value,
    };
    if (field === "isIndianCitizen") setIsIndianCitizen(value);
    if (field === "ispep") setIspep(value);
    if (field === "istradingPref") setIstradingPref(value);
    if (field === "issettledfunds") setIssettledfunds(value);
    if (field === "istermsandcond") setIstermsandcond(value);
    if (field === "isyono") setIsyono(value);
    checkAllCheckboxesSelected(
      newState.ispep,
      newState.istradingPref,
      newState.issettledfunds,
      newState.istermsandcond,
      newState.isyono,
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    selectAllCheckboxes(checked, !checked);
  };

  const selectOption = (option: (typeof lifecycleDays)[0]) => {
    setSelectedOption(option);
    setSelectedPreferenceDays(option.Days);
  };

  const checkIfPreferenceChanged = (qr: any[]): boolean => {
    if (!qr || qr.length === 0) return false;
    const items: any[] = [];
    qr.forEach((group: any) => {
      (group.Questions || []).forEach((q: any) => {
        items.push({
          Title: group.Title,
          TitleId: group.TitleId,
          QuestionId: q.QuestionId,
          AnswerKey: q.SelectedAns,
        });
      });
    });
    const get = (idx: number) => items[idx];
    return !!(
      (get(0)?.Title === "Automatic Credit" && get(0)?.AnswerKey !== "YES") ||
      (get(1)?.Title === "Pledge" && get(1)?.AnswerKey !== "YES") ||
      (get(2)?.Title === "DIS" && get(2)?.AnswerKey !== "NO") ||
      (get(3)?.Title === "DDPI Operation" && get(3)?.AnswerKey !== "YES") ||
      (get(4)?.Title === "SMS Alert Facility" &&
        get(4)?.AnswerKey !== "YES" &&
        get(4)?.QuestionId === 5) ||
      (get(5)?.Title === "SMS Alert Facility" &&
        get(5)?.AnswerKey !== "NO" &&
        get(5)?.QuestionId === 6) ||
      (get(6)?.Title === "SMS Alert Facility" &&
        get(6)?.AnswerKey !== "NO" &&
        get(6)?.QuestionId === 7) ||
      (get(7)?.Title === "ECS Mandate" && get(7)?.AnswerKey !== "YES") ||
      (get(8)?.Title === "BSDA Facility" && get(8)?.AnswerKey !== "YES") ||
      (get(9)?.Title === "Account Statement" &&
        get(9)?.AnswerKey !== "As per SEBI Regulation") ||
      (get(10)?.Title === "RTA" && get(10)?.AnswerKey !== "YES") ||
      (get(11)?.Title === "Standard Documents / Annual Report" &&
        get(11)?.AnswerKey !== "Electronic") ||
      (get(12)?.Title === "easi / Ideas" && get(12)?.AnswerKey !== "YES")
    );
  };

  const saveTradePreferenceQA = async () => {
    showSpinner();
    const items: any[] = [];
    questionnaireResponse.forEach((group: any) => {
      (group.Questions || []).forEach((q: any) => {
        items.push({
          Title: group.Title,
          TitleId: group.TitleId,
          QuestionId: q.QuestionId,
          AnswerKey: q.SelectedAns,
          utm_source: utmSource,
        });
      });
    });
    const diff = checkIfPreferenceChanged(questionnaireResponse);
    if (diff) {
      setShowConfirmPrefModal(true);
      hideSpinner();
      return;
    }
    setShowTradingPrefModal(false);
    const reqData = {
      FormNumber:
        typeof window !== "undefined"
          ? sessionStorage.getItem("FormNumber")
          : "",
      tradePrefrenceSaveRequestModel: items,
    };
    try {
      await apiService.postRequest(
        "api/v1/tradeprefrence/savetradeprefrence",
        reqData,
        hideSpinner,
      );
      if (typeof window !== "undefined")
        sessionStorage.setItem("Preference", "Yes");
      hideSpinner();
    } catch {
      hideSpinner();
    }
  };

  // const declarationAPICall = async () => {
  //   router.push('/planprocess/2');
  //   return;
  //   // TODO: replace with API call
  //   const diff = checkIfPreferenceChanged(questionnaireResponse);
  //   if (diff) {
  //     setShowConfirmPrefModal(true);
  //     return;
  //   }
  //   showSpinner();
  //   const yonoConsentValue = (isyono && IsYonoForm) ? 'Yes' : 'No';
  //   const reqData = {
  //     flag: 'declaration',
  //     isPEP: 'Yes',
  //     IsTaxResident: 'Yes',
  //     Declaration: 'Yes',
  //     Prefernces: 'Yes',
  //     TermsAndCondition: 'Yes',
  //     FundcycleDays: selectedPreferenceDays,
  //     FormNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
  //     utm_source: utmSource,
  //     IsYono: yonoConsentValue,
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/schemeSegmentDetail/save', reqData, hideSpinner);
  //     if (response?.status === true) {
  //       if (rejectStatus !== 'R') {
  //         setTimeout(() => { router.push('/planprocess/2'); hideSpinner(); }, 200);
  //       } else {
  //         setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
  //       }
  //     } else {
  //       toast.warning(response?.message || 'Error', { position: 'bottom-center', autoClose: 200 });
  //       hideSpinner();
  //     }
  //   } catch { hideSpinner(); }
  // };

  const getRouteFromUiMetadata = (uiMetadata?: string) => {
    if (!uiMetadata) return "";

    try {
      const parsed = JSON.parse(uiMetadata);
      return parsed?.route || "";
    } catch {
      return "";
    }
  };

  const declarationAPICall = async () => {
    const diff = checkIfPreferenceChanged(questionnaireResponse);

    if (!diff) {
      setShowConfirmPrefModal(true);
      return;
    }

    const applicationId =
      sessionStorage.getItem("ApplicationId") ??
      "";

    if (!applicationId) {
      toast.error("Application Id not found", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    const reqData = {
      pepAccepted: ispep,
      preferenceAccepted: istradingPref,
      termsAccepted: istermsandcond,
      mitcAccepted: issettledfunds,
      idempotencyKey: "",
    };

    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/declaration`,
        reqData,
        hideSpinner,
      );

      console.log("Declaration Response:", response);

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

      console.log("Declaration Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const redirectToBankDetails = () => {
    showSpinner();
    const mode =
      typeof window !== "undefined" ? sessionStorage.getItem("mode") : "";
    const isYonoClient =
      typeof window !== "undefined" ? sessionStorage.getItem("IsYono") : "";
    const yonobankstatus =
      typeof window !== "undefined" ? sessionStorage.getItem("yonobank") : "";
    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    if (
      yonobankstatus === "UNIQUE" &&
      (isYonoClient === "YONO" || isYonoClient === "Branch Portal")
    ) {
      setTimeout(() => {
        router.push("/personalDetailsForm/5");
        hideSpinner();
      }, 200);
    } else {
      setTimeout(() => {
        router.push("/personalDetailsForm/6");
        hideSpinner();
      }, 200);
    }
  };

  // ─── Preference Denied screen ──────────────────────────────────

  if (preferenceDeny) {
    return (
      <div
        className={styles.preferenceDeniedWrap}
        aria-label="Declaration Denied"
      >
        <div className={styles.preferenceDeniedInner}>
          <img
            src={publicPath("/assets/images/diy/TradePreference.png")}
            alt="Trade Preference"
          />
          <h5>
            You have selected the option to open account with Physical
            Application.
          </h5>
          <p>
            Please contact us on{" "}
            <a href="mailto:helpdesk@sbicapsec.com">helpdesk@sbicapsec.com</a>{" "}
            or <span>022 - 6854 5502/55</span> or visit the nearest branch.
          </p>
        </div>
      </div>
    );
  }

  // ─── Shared declaration item list ─────────────────────────────
  // Rendered identically on mobile and desktop; gap is controlled by the parent

  const declarationItemsMobile = (
    <>
      {/* Select All */}
      <div
        className={styles.declarationRow}
        onClick={() => handleSelectAll(!selectAll)}
        role="checkbox"
        aria-checked={selectAll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") handleSelectAll(!selectAll);
        }}
      >
        <div className={styles.declarationRowLeft}>
          <div className={styles.checkboxWrap}>
            <input
              id="mob-selectAll"
              type="checkbox"
              className={styles.customCheckbox}
              checked={selectAll}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectAll(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select all declarations"
            />
          </div>
          <label
            htmlFor="mob-selectAll"
            className={styles.selectAllLabelMob}
            onClick={(e) => e.stopPropagation()}
          >
            Select All
          </label>
        </div>
      </div>

      {/* PEP */}
      <CheckboxRow
        id="mob-pep"
        checked={ispep}
        onChange={(v) => handleCheckbox("ispep", v)}
        label="I am not politically-exposed (PEP) or related to a PEP"
        onInfoClick={() => setShowPoliticalModal(true)}
        infoLabel="What is a PEP?"
      />

      {/* Trading Preferences */}
      <CheckboxRow
        id="mob-tradingPref"
        checked={istradingPref}
        onChange={(v) => handleCheckbox("istradingPref", v)}
        label={
          <>
            <span
              className={styles.labelLink}
              onClick={(e) => {
                e.stopPropagation();
                setShowTradingPrefModal(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter")
                  setShowTradingPrefModal(true);
              }}
            >
              Preferences
            </span>{" "}
            set by SBI Securities
          </>
        }
        onInfoClick={() => setShowTradingPrefModal(true)}
        infoLabel="View trading preferences"
      />

      {/* Fund Settlement */}
      <div
        className={styles.declarationRow}
        onClick={() => handleCheckbox("issettledfunds", !issettledfunds)}
      >
        <div className={styles.fundSettlementLeft}>
          <div className={styles.fundSettlementTextGroup}>
            <div className={styles.checkboxWrap}>
              <input
                id="mob-settledFunds"
                type="checkbox"
                className={styles.customCheckbox}
                checked={issettledfunds}
                onChange={(e) => {
                  e.stopPropagation();
                  handleCheckbox("issettledfunds", e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Fund settlement consent"
              />
            </div>
            <label
              htmlFor="mob-settledFunds"
              className={styles.fundLabelText}
              onClick={(e) => e.stopPropagation()}
            >
              I want my unused funds to be settled after every
            </label>
          </div>
          <button
            type="button"
            className={styles.fundDropdownBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowFundCycleModal(true);
            }}
            aria-label={`Change fund settlement cycle, currently ${selectedOption.Days}`}
          >
            <span className={styles.fundDaysText}>{selectedOption.Days}</span>
            <IconChevronDown />
          </button>
        </div>
      </div>

      {/* Terms & Conditions */}
      <CheckboxRow
        id="mob-terms"
        checked={istermsandcond}
        onChange={(v) => handleCheckbox("istermsandcond", v)}
        label={
          <>
            Most important{" "}
            <span
              className={styles.labelLink}
              onClick={(e) => {
                e.stopPropagation();
                setShowTermsModal(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") setShowTermsModal(true);
              }}
            >
              Terms &amp; Conditions
            </span>
          </>
        }
        onInfoClick={() => setShowTermsModal(true)}
        infoLabel="View Terms & Conditions"
      />

      {/* YONO Consent (conditional) */}
      {IsYonoForm && (
        <CheckboxRow
          id="mob-yono"
          checked={isyono}
          onChange={(v) => handleCheckbox("isyono", v)}
          label="I hereby give my explicit consent to share my financial portfolio and account details with SBI for my personal access on digital platforms of SBI like Yono App, Internet Banking etc."
        />
      )}
    </>
  );

  const declarationItemsDesktop = (
    <>
      {/* Select All */}
      <div
        className={styles.declarationRow}
        onClick={() => handleSelectAll(!selectAll)}
        role="checkbox"
        aria-checked={selectAll}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") handleSelectAll(!selectAll);
        }}
      >
        <div className={styles.declarationRowLeft}>
          <div className={styles.checkboxWrap}>
            <input
              id="desk-selectAll"
              type="checkbox"
              className={styles.customCheckbox}
              checked={selectAll}
              onChange={(e) => {
                e.stopPropagation();
                handleSelectAll(e.target.checked);
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Select all declarations"
            />
          </div>
          {/* Desktop: Select All text is bold purple (Figma) */}
          <label
            htmlFor="desk-selectAll"
            className={styles.selectAllLabelDesk}
            onClick={(e) => e.stopPropagation()}
          >
            Select All
          </label>
        </div>
      </div>

      {/* PEP */}
      <CheckboxRow
        id="desk-pep"
        checked={ispep}
        onChange={(v) => handleCheckbox("ispep", v)}
        label="I am not politically-exposed (PEP) or related to a PEP"
        onInfoClick={() => setShowPoliticalModal(true)}
        infoLabel="What is a PEP?"
      />

      {/* Trading Preferences */}
      <CheckboxRow
        id="desk-tradingPref"
        checked={istradingPref}
        onChange={(v) => handleCheckbox("istradingPref", v)}
        label={
          <>
            <span
              className={styles.labelLink}
              onClick={(e) => {
                e.stopPropagation();
                setShowTradingPrefModal(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter")
                  setShowTradingPrefModal(true);
              }}
            >
              Preferences
            </span>{" "}
            set by SBI Securities
          </>
        }
        onInfoClick={() => setShowTradingPrefModal(true)}
        infoLabel="View trading preferences"
      />

      {/* Fund Settlement */}
      <div
        className={styles.declarationRow}
        onClick={() => handleCheckbox("issettledfunds", !issettledfunds)}
      >
        <div className={styles.fundSettlementLeft}>
          <div className={styles.fundSettlementTextGroup}>
            <div className={styles.checkboxWrap}>
              <input
                id="desk-settledFunds"
                type="checkbox"
                className={styles.customCheckbox}
                checked={issettledfunds}
                onChange={(e) => {
                  e.stopPropagation();
                  handleCheckbox("issettledfunds", e.target.checked);
                }}
                onClick={(e) => e.stopPropagation()}
                aria-label="Fund settlement consent"
              />
            </div>
            <label
              htmlFor="desk-settledFunds"
              className={styles.fundLabelText}
              onClick={(e) => e.stopPropagation()}
            >
              I want my unused funds to be settled after every
            </label>
          </div>
          <button
            type="button"
            className={styles.fundDropdownBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowFundCycleModal(true);
            }}
            aria-label={`Change fund settlement cycle, currently ${selectedOption.Days}`}
          >
            <span className={styles.fundDaysText}>{selectedOption.Days}</span>
            <IconChevronDown />
          </button>
        </div>
      </div>

      {/* Terms & Conditions */}
      <CheckboxRow
        id="desk-terms"
        checked={istermsandcond}
        onChange={(v) => handleCheckbox("istermsandcond", v)}
        label={
          <>
            Most important{" "}
            <span
              className={styles.labelLink}
              onClick={(e) => {
                e.stopPropagation();
                setShowTermsModal(true);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") setShowTermsModal(true);
              }}
            >
              Terms &amp; Conditions
            </span>
          </>
        }
        onInfoClick={() => setShowTermsModal(true)}
        infoLabel="View Terms & Conditions"
      />

      {/* YONO Consent (conditional) */}
      {IsYonoForm && (
        <CheckboxRow
          id="desk-yono"
          checked={isyono}
          onChange={(v) => handleCheckbox("isyono", v)}
          label="I hereby give my explicit consent to share my financial portfolio and account details with SBI for my personal access on digital platforms of SBI like Yono App, Internet Banking etc."
        />
      )}
    </>
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <>
      {/* ═══ MOBILE LAYOUT (hidden on lg+) ══════════════════════════
          Figma: 0:25471 — Onboarding-Mob-Declaration
          bg-[#f8f8f8], gray header (rounded-b-20), white card (rounded-t-24),
          gap-36 between items, 328×48 proceed button
      ══════════════════════════════════════════════════════════════ */}
      <main
        className={styles.mobilePage}
        aria-label="Declaration for SBI Securities Account"
      >
        {/* Gray header area */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              {rejectStatus !== "R" && (
                <button
                  type="button"
                  className={styles.mobileBackBtn}
                  onClick={redirectToBankDetails}
                  aria-label="Go back"
                >
                  <IconBackArrow />
                </button>
              )}
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>
                Declaration for SBI Securities Account
              </h1>
              <p className={styles.mobileSubtitle}>
                By clicking proceed, I acknowledge and confirm that the
                information provided by me is true and correct
              </p>
            </div>
          </div>
        </div>

        {/* White card — rounded top corners, shadow, gap-36 */}
        <div
          className={styles.mobileCard}
          role="form"
          aria-label="Declaration checkboxes"
        >
          {declarationItemsMobile}
        </div>

        {/* Proceed button area — pb-16 */}
        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={styles.mobileProceedBtn}
            disabled={isProceedButton}
            aria-disabled={isProceedButton}
            onClick={declarationAPICall}
          >
            Proceed
          </button>
        </div>
      </main>

      {/* ═══ DESKTOP LAYOUT (hidden below lg) ═══════════════════════
          Figma: 0:25592 — Onboarding-Web-Declaration
          bg-[#f8f8f8], centered card (max-w-800, border, shadow, rounded-24),
          card header (title 18px, subtitle 14px), gap-24 between items,
          350×56 proceed button
      ══════════════════════════════════════════════════════════════ */}
      <main
        className={styles.desktopPage}
        aria-label="Declaration for SBI Securities Account"
      >
        <div className={styles.desktopContent}>
          <article className={styles.desktopCard}>
            {/* Card Header */}
            <div className={styles.desktopCardHeader}>
              {rejectStatus !== "R" && (
                <button
                  type="button"
                  className={styles.desktopBackBtn}
                  onClick={redirectToBankDetails}
                  aria-label="Go back"
                >
                  <IconBackArrow />
                </button>
              )}
              <div className={styles.desktopTitleBlock}>
                <h1 className={styles.desktopCardTitle}>
                  Declaration for SBI Securities Account
                </h1>
                <p className={styles.desktopCardSubtitle}>
                  By clicking proceed, I acknowledge and confirm that the
                  information provided by me is true and correct
                </p>
              </div>
            </div>

            {/* Card Body */}
            <div className={styles.desktopCardBody}>
              {/* Items — gap-24 (Figma) */}
              <div
                className={styles.declarationItems}
                role="form"
                aria-label="Declaration checkboxes"
              >
                {declarationItemsDesktop}
              </div>

              {/* Proceed — 350×56 (Figma) */}
              <div className={styles.desktopProceedWrapper}>
                <button
                  type="button"
                  className={styles.desktopProceedBtn}
                  disabled={isProceedButton}
                  aria-disabled={isProceedButton}
                  onClick={declarationAPICall}
                >
                  Proceed
                </button>
              </div>
            </div>
          </article>
        </div>
      </main>

      {/* ═══ MODALS ═════════════════════════════════════════════════ */}

      {/* Terms & Conditions Modal */}
      {showTermsModal && (
        <div
          className={styles.fscOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="termsModalTitle"
          onClick={() => setShowTermsModal(false)}
        >
          <div className={styles.fscSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fscDash} aria-hidden="true" />

            <div className={styles.fscContent}>
              <p id="termsModalTitle" className={styles.pepTitle}>
                Terms and Conditions
              </p>

              <div
                className={styles.sheetScrollContent}
                dangerouslySetInnerHTML={{ __html: termsConditionData }}
              />
            </div>

            <button
              type="button"
              className={styles.fscDoneBtn}
              onClick={() => {
                setShowTermsModal(false);
                if (typeof window !== "undefined")
                  sessionStorage.setItem("AcceptTerms", "Yes");
              }}
            >
              I accept
            </button>
          </div>
        </div>
      )}

      {/* Tax Payer Modal */}
      {showTaxpayerModal && (
        <>
          <div
            className="modal fade show uploadPan"
            style={{ display: "block" }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="taxModalTitle"
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div
                  className="modal-header d-block"
                  style={{ cursor: "pointer" }}
                  onClick={() => setShowTaxpayerModal(false)}
                >
                  <h1 className="modal-title fs-5" id="taxModalTitle" />
                  <button
                    type="button"
                    className="btn-horizontal-line"
                    aria-label="Close modal"
                    onClick={() => setShowTaxpayerModal(false)}
                  />
                </div>
                <div className="modal-body">
                  <h5 className="text-start">Tax payer declaration</h5>
                  <div dangerouslySetInnerHTML={{ __html: taxPayerData }} />
                </div>
                <div className="modal-footer p-0">
                  <button
                    type="button"
                    className="btn btn_cls"
                    onClick={() => setShowTaxpayerModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}

      {/* Politically Exposed Person Modal */}
      {showPoliticalModal && (
        <div
          className={styles.fscOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="pepModalTitle"
          onClick={() => setShowPoliticalModal(false)}
        >
          <div className={styles.fscSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fscDash} aria-hidden="true" />

            <div className={styles.fscContent}>
              <p id="pepModalTitle" className={styles.pepTitle}>
                Who is a politically exposed or related person
              </p>

              <p className={styles.pepSubtitle}>
                Politically exposed or related person include, but are not
                limited to:
              </p>

              <div className={styles.pepBulletList}>
                <div className={styles.pepBulletItem}>
                  <p>Senior executives of state-owned corporations</p>
                </div>
                <div className={styles.pepBulletItem}>
                  <p>Important political party officials</p>
                </div>
                <div className={styles.pepBulletItem}>
                  <p>Family members and close relatives of all of the above</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className={styles.fscDoneBtn}
              onClick={() => setShowPoliticalModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Trading Preference Modal */}
      {showTradingPrefModal && (
        <div
          className={styles.fscOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tradePrefModalTitle"
        >
          <div className={styles.fscSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fscDash} aria-hidden="true" />

            <div className={styles.fscContent}>
              <p id="tradePrefModalTitle" className={styles.pepTitle}>
                Trading preference acceptance
              </p>

              <div className={styles.sheetScrollContent} data-lenis-prevent>
                <form method="post" className={styles.tradingQnaList}>
                  {questionnaireResponse.map((group: any, gi: number) => (
                    <div key={gi} className={styles.tradingQnaCard}>
                      {group.Title && (
                        <div className={styles.tradingQnaCardHeader}>
                          {group.Title}
                        </div>
                      )}
                      <div className={styles.tradingQnaCardBody}>
                        {group.Description && (
                          <p className={styles.tradingQnaText}>
                            {group.Description}
                          </p>
                        )}
                        {(group.textLines || []).map(
                          (line: string, li: number) => (
                            <p key={li} className={styles.tradingQnaText}>
                              {line}
                            </p>
                          ),
                        )}
                        {(group.Questions || []).map((q: any, qi: number) =>
                          group.inlineLayout ? (
                            <div
                              key={qi}
                              className={styles.tradingQnaInlineRow}
                            >
                              <span className={styles.tradingQnaInlineLabel}>
                                {q.Question}
                              </span>
                              <div className={styles.tradingQnaAnswers}>
                                {(q.Answer || []).map(
                                  (ans: any, ai: number) => (
                                    <label
                                      key={ai}
                                      className={styles.radioItem}
                                    >
                                      <input
                                        type="radio"
                                        name={`radio-${q.QuestionId}`}
                                        value={ans.Key}
                                        checked={q.SelectedAns === ans.Key}
                                        onChange={() => {
                                          const updated = [
                                            ...questionnaireResponse,
                                          ];
                                          updated[gi].Questions[
                                            qi
                                          ].SelectedAns = ans.Key;
                                          setQuestionnaireResponse(updated);
                                        }}
                                      />
                                      {ans.Key}
                                    </label>
                                  ),
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              key={qi}
                              className={styles.tradingQnaQuestionRow}
                            >
                              {q.Question && (
                                <p className={styles.tradingQnaText}>
                                  {q.Question}
                                </p>
                              )}
                              <div className={styles.tradingQnaAnswers}>
                                {(q.Answer || []).map(
                                  (ans: any, ai: number) => (
                                    <label
                                      key={ai}
                                      className={styles.radioItem}
                                    >
                                      <input
                                        type="radio"
                                        name={`radio-${q.QuestionId}`}
                                        value={ans.Key}
                                        checked={q.SelectedAns === ans.Key}
                                        onChange={() => {
                                          const updated = [
                                            ...questionnaireResponse,
                                          ];
                                          updated[gi].Questions[
                                            qi
                                          ].SelectedAns = ans.Key;
                                          setQuestionnaireResponse(updated);
                                        }}
                                      />
                                      {ans.Key}
                                    </label>
                                  ),
                                )}
                              </div>
                              {q.note && (
                                <p className={styles.tradingQnaNote}>
                                  {q.note}
                                </p>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  ))}
                </form>
              </div>
            </div>

            <button
              type="button"
              className={styles.fscDoneBtn}
              onClick={() => setShowTradingPrefModal(false)}
            >
              I Agree
            </button>
          </div>
        </div>
      )}

      {/* Fund Settlement Cycle Modal — Figma 0:105487 (desktop) / 0:105189 (mobile) */}
      {showFundCycleModal && (
        <div
          className={styles.fscOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fsc-modal-title"
          onClick={() => setShowFundCycleModal(false)}
        >
          <div className={styles.fscSheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.fscDash} aria-hidden="true" />

            <div className={styles.fscContent}>
              <p id="fsc-modal-title" className={styles.fscTitle}>
                Fund settlement cycle
              </p>

              <div className={styles.fscOptions}>
                {lifecycleDays.map((option) => (
                  <label key={option.Days} className={styles.fscOption}>
                    <input
                      type="radio"
                      name="fsc-radio"
                      className={styles.fscRadio}
                      checked={selectedOption.Days === option.Days}
                      onChange={() => selectOption(option)}
                    />
                    <div className={styles.fscOptionContent}>
                      <p className={styles.fscOptionTitle}>{option.Days}</p>
                      <p className={styles.fscOptionDesc}>
                        {option.description}
                      </p>
                    </div>
                  </label>
                ))}
              </div>

              <div className={styles.fscNote}>
                <p>
                  <strong>Note:</strong> Fund settlement cycle, all unused funds
                  from your SBI Securities account gets transferred back to your
                  bank account.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.fscDoneBtn}
              onClick={() => setShowFundCycleModal(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Confirm Preference Change Modal */}
      {showConfirmPrefModal && (
        <>
          <div
            className="modal fade show uploadPan"
            style={{ display: "block" }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmPrefModalTitle"
          >
            <div className="modal-dialog">
              <div className="modal-content">
                <div className={styles.confirmPrefBody}>
                  <h5 id="confirmPrefModalTitle">
                    Trading Preference Acceptance
                  </h5>
                  <p>
                    If you want to select any other option in Preferences set by
                    SBI Securities,{" "}
                    <strong>
                      account needs to be opened using a physical form.
                    </strong>
                  </p>
                  <div className={`modal-footer p-0 mt-4 ${styles.btnAlign}`}>
                    <button
                      type="button"
                      className="btn btn_cls_outline"
                      onClick={() => {
                        setShowConfirmPrefModal(false);
                        setPreferenceDeny(true);
                      }}
                    >
                      Continue
                    </button>
                    <button
                      type="button"
                      className="btn btn_cls"
                      onClick={() => {
                        setShowConfirmPrefModal(false);
                        getTradingPreferenceAcceptance();
                      }}
                    >
                      Do not change
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" />
        </>
      )}
    </>
  );
}
