"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
// import { toast } from '@/services/toast.service';
// import apiService from '@/services/api.service';
import navigationService from "@/services/navigation.service";
import styles from "./link-bank-account.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import { useSessionValue } from "@/hooks/useSessionValue";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

// LinkBankAccount — step 6: Bank Details (Select Bank Account Type)
// Figma: MzSMJbkZfKDT6S8z3G0rVU
//   Desktop node 0-101583 · Mobile node 0-101800
// Both checkboxes must be checked to enable Proceed

const ACCOUNT_TYPES = [
  { id: "nro", label: "NRO (Savings Account)" },
  { id: "nre", label: "Non PIS NRE (Savings Account)" },
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

function CheckIcon() {
  return (
    <svg
      width="12"
      height="10"
      viewBox="0 0 12 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 5L4.5 8.5L11 1.5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckboxOption({
  label,
  checked,
  onToggle,
  readOnly = false,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className={styles.checkboxItem}>
      <button
        type="button"
        className={styles.checkboxBtn}
        // onClick={onToggle}
        // aria-pressed={checked}
        // aria-label={label}
        onClick={readOnly ? undefined : onToggle}
        aria-pressed={checked}
        aria-readonly={readOnly || undefined}
        aria-label={label}
        style={readOnly ? { cursor: "default" } : undefined}
      >
        <div
          className={`${styles.checkboxBox}${checked ? ` ${styles.checkboxBoxChecked}` : ""}`}
        >
          {checked && <CheckIcon />}
        </div>
      </button>
      <span
        className={`${styles.checkboxLabel}${checked ? ` ${styles.checkboxLabelChecked}` : ""}`}
      >
        {label}
      </span>
    </div>
  );
}

export default function LinkBankAccount() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  // Both unchecked by default — any one must be checked to enable Proceed
  const [selected, setSelected] = useState<string[]>([]);

  const rejectStatus = useSessionValue("RejectStatus");

  // BRD: the "Non PIS NRE" account option is only valid for the semi-digital
  // journey. For the (fully) digital journey, show NRO only.
  // const isSemiDigital = useSessionValue("accountType") === "semi-digital";
  const accountType = useSessionValue("accountType");
  const isSemiDigital = accountType === "semi-digital";
  const isDigital = accountType === "digital";

  const accountTypes = isSemiDigital
    ? ACCOUNT_TYPES
    : ACCOUNT_TYPES.filter(({ id }) => id !== "nre");

  useEffect(() => {
    if (isDigital) setSelected(["nro"]);
  }, [isDigital]);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  // const fetchBankAccountData = async () => {
  //   showSpinner();
  //   const reqData = {
  //     flag: 'BankAccountType',
  //     formnumber: typeof window !== 'undefined' ? secureSessionService.getItem('ApplicationId') : '',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/WorkflowDetails/getworkflowdata', reqData, hideSpinner);
  //     if (response?.status === true && response?.data?.length) {
  //       setSelected(response.data[0].accountTypes || []);
  //     }
  //     hideSpinner();
  //   } catch { hideSpinner(); }
  // };

  // const saveBankAccountType = async () => {
  //   showSpinner();
  //   const reqData = {
  //     Flag: 'bankaccounttype',
  //     AccountTypes: selected,
  //     FormNumber: typeof window !== 'undefined' ? secureSessionService.getItem('ApplicationId') : '',
  //   };
  //   try {
  //     const response = await apiService.postRequest('api/v1/personalDetail/save', reqData, hideSpinner);
  //     if (response?.status === true) {
  //       if (rejectStatus !== 'R') {
  //         setTimeout(() => { router.push('/PennyDrop/1'); hideSpinner(); }, 200);
  //       } else {
  //         navigationService.navigateToNextStep();
  //       }
  //     } else {
  //       toast.error(response?.message || 'Error', { autoClose: 4000 });
  //       hideSpinner();
  //     }
  //   } catch { hideSpinner(); }
  // };

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
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

    await dynamicBackService("BANK", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const handleProceed = () => {
    showSpinner();

    secureSessionService.setItem("SelectedAccountTypes", JSON.stringify(selected));

    setTimeout(() => {
      router.push("/manual-bankdetails");
      hideSpinner();
    }, 200);
  };

  // const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedAccountTypes = secureSessionService.getItem("SelectedAccountTypes");

      if (savedAccountTypes) {
        try {
          const parsed = JSON.parse(savedAccountTypes);

          if (Array.isArray(parsed)) {
            setSelected(parsed);
          }
        } catch (error) {
          console.error("Error parsing SelectedAccountTypes:", error);
        }
      }
    }
  }, []);

  // Disabled unless BOTH checkboxes are checked
  const isDisabled = selected.length < 1; //ACCOUNT_TYPES.length;

  const checkboxGroup = (
    <div className={styles.checkboxGroup}>
      {accountTypes.map(({ id, label }) => (
        <CheckboxOption
          key={id}
          label={label}
          checked={selected.includes(id)}
          onToggle={() => toggle(id)}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* ── MOBILE (< 768px) ─────────────────────────────────────────────────── */}
      <section aria-label="Bank Details" className={styles.mobilePage}>
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
            <h1 className={styles.mobileTitle}>Bank Details</h1>
            <p className={styles.mobileSubtitle}>
              Make your fund transfer easy by just verifying your account!
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <p className={styles.sectionLabel}>Select Bank Account Type</p>
          {checkboxGroup}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.btnDisabled}` : ""}`}
            onClick={handleProceed}
            disabled={isDisabled}
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Bank Details" className={styles.desktopPage}>
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
              <h1 className={styles.desktopCardTitle}>Bank Details</h1>
              <p className={styles.desktopCardSubtitle}>
                Make your fund transfer easy by just verifying your account!
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <p className={styles.sectionLabel}>Select Bank Account Type</p>
              {checkboxGroup}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.btnDisabled}` : ""}`}
                onClick={handleProceed}
                disabled={isDisabled}
              >
                Proceed
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
