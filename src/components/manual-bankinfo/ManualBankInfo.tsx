"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import navigationService from "@/services/navigation.service";
import apiService, { BankRpdStatusResponse } from "@/services/api.service";
import { toast } from "@/services/toast.service";
import styles from "./manual-bankinfo.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import secureSessionService from "@/services/secure-session.service";

// ── Types for Bank Stage API Response ─────────────────────────────────────────

type SelectedAccountType = "nre" | "nro";

export interface BankStageWiseResponse {
  status: boolean;
  applicationId: string;
  stagename: string;
  data: BankStageData | BankStageData[];
  documents?: BankStageDocument[];
}

export interface BankStageData {
  applicationId?: string;
  accountType?: string;
  accountNumber?: string;
  ifscCode?: string;
  micrcode?: string;
  branchcode?: string;
  branchaddress?: string;
  bankaccounttype?: string;
  bankName?: string;
  branchName?: string | null;
  accountHolderName?: string;
  verificationMethod?: string;
  status?: string;
  nameMatchOutcome?: string;
  nameMatchScore?: number;
  documentId?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BankStageDocument {
  documentType?: string;
  documentID?: string;
  documentId?: string;
  presignedUrl?: string;
  documentSide?: string | null;
}

// ── Exportable Function ───────────────────────────────────────────────────────

export const getBankStageData = async (
  applicationId: string,
  hideSpinner?: () => void,
): Promise<BankStageWiseResponse> => {
  const reqData = {
    stagename: "bank",
    idempotencyKey: "",
  };

  const response = await apiService.postNri(
    `applications/${applicationId}/get/workflow/stagewisedata`,
    reqData,
    hideSpinner,
  );

  return response as BankStageWiseResponse;
};

// ── Mapper: API response data → Existing UI model ─────────────────────────────

export const mapBankStageDataToBankDetails = (
  data?: BankStageData,
  forcedAccountType?: SelectedAccountType,
): BankRpdStatusResponse | null => {
  if (!data) return null;

  const accountTypeLabel =
    forcedAccountType === "nro"
      ? "NRO"
      : forcedAccountType === "nre"
        ? "Non PIS NRE"
        : data.accountType || data.bankaccounttype || "";

  return {
    bankName: data.bankName || "",
    holderName: data.accountHolderName || "",
    accountType: accountTypeLabel,
    accountNumber: data.accountNumber || "",
    ifscCode: data.ifscCode || "",
    micrCode: data.micrcode || "",
    bankAddress: data.branchaddress || "",
  } as BankRpdStatusResponse;
};

// ── SVG Icons ─────────────────────────────────────────────────────────────────

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

function CheckCircleIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      aria-label="Success"
      role="img"
    >
      <circle cx="24" cy="24" r="22.5" stroke="#22c55e" strokeWidth="2" />
      <path
        d="M14 24.5l7.5 7.5 12.5-14"
        stroke="#22c55e"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Detail row helper ─────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;

  return (
    <p className={styles.detailRow}>
      {label} <span className={styles.detailValue}>{value}</span>
    </p>
  );
}

// ── Bank detail box only, no tick here ────────────────────────────────────────

function BankDetailsBox({
  details,
}: {
  details: BankRpdStatusResponse | null;
}) {
  return (
    <div className={styles.detailsBox}>
      <DetailRow label="Bank Name:" value={details?.bankName} />
      <DetailRow label="Name as per Bank:" value={details?.holderName} />
      <DetailRow label="Account Type:" value={details?.accountType} />
      <DetailRow label="Account Number:" value={details?.accountNumber} />
      <DetailRow label="IFSC Code:" value={details?.ifscCode} />
      <DetailRow label="MICR Code:" value={details?.micrCode} />
      <DetailRow label="Bank Address:" value={details?.bankAddress} />
    </div>
  );
}

// ── Shared content block: one tick, multiple account boxes ────────────────────

function SuccessContent({
  detailsList,
}: {
  detailsList: BankRpdStatusResponse[];
}) {
  return (
    <div className={styles.successContent}>
      <CheckCircleIcon />

      <p className={styles.successText}>
        Your bank details has been added successfully
      </p>

      {detailsList.length === 0 ? (
        <BankDetailsBox details={null} />
      ) : (
        detailsList.map((details, index) => (
          <BankDetailsBox
            key={`${details.accountType || "bank"}-${index}`}
            details={details}
          />
        ))
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ManualBankInfo() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [bankDetailsList, setBankDetailsList] = useState<
    BankRpdStatusResponse[]
  >([]);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, [router, hideSpinner]);

  const getSelectedAccountTypesFromSession = (): SelectedAccountType[] => {
    if (typeof window === "undefined") return ["nre", "nro"];

    const rawSelectedAccountTypes = secureSessionService.getItem(
      "SelectedAccountTypes",
    );

    if (!rawSelectedAccountTypes) return ["nre", "nro"];

    try {
      const parsed = JSON.parse(rawSelectedAccountTypes);

      if (!Array.isArray(parsed)) return ["nre", "nro"];

      const normalized = parsed
        .map((item) => String(item).toLowerCase())
        .filter(
          (item): item is SelectedAccountType =>
            item === "nre" || item === "nro",
        );

      const uniqueTypes = Array.from(new Set(normalized));

      return uniqueTypes.length > 0 ? uniqueTypes : ["nre", "nro"];
    } catch {
      return ["nre", "nro"];
    }
  };

  const normalizeAccountType = (
    accountType?: string,
  ): SelectedAccountType | null => {
    const type = String(accountType || "").toLowerCase();

    if (type.includes("nro") || type.includes("Nro")) return "nro";
    if (
      type.includes("nre") ||
      type.includes("Nre") ||
      type.includes("Non PIS NRE")
    )
      return "nre";

    return null;
  };

  const getBankRecordsFromResponse = (
    response: BankStageWiseResponse,
  ): BankStageData[] => {
    const data = response?.data;

    if (Array.isArray(data)) return data;
    if (data) return [data];

    return [];
  };

  const findBankRecordForAccountType = (
    bankRecords: BankStageData[],
    type: SelectedAccountType,
  ) => {
    const exactRecord = bankRecords.find((record) => {
      const accountType = normalizeAccountType(record.accountType);
      return accountType === type;
    });

    if (exactRecord) return exactRecord;

    /*
      Backend currently returns only one data object even when session has
      both ["nro","nre"]. To keep both account types displayed in this summary
      page, use available bank data as fallback for the missing account type.
    */
    return bankRecords[0];
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applicationId = secureSessionService.getItem("ApplicationId") || "";

    if (!applicationId) {
      toast.error("Your session has expired, please start again.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    let cancelled = false;

    const fetchBankStageData = async () => {
      showSpinner();

      try {
        const response = await getBankStageData(applicationId, hideSpinner);

        if (cancelled) return;

        if (response?.status === true && response?.data) {
          const selectedAccountTypes = getSelectedAccountTypesFromSession();
          const bankRecords = getBankRecordsFromResponse(response);

          const mappedBankDetailsList = selectedAccountTypes
            .map((type) => {
              const bankRecord = findBankRecordForAccountType(
                bankRecords,
                type,
              );

              return mapBankStageDataToBankDetails(bankRecord, type);
            })
            .filter(
              (details): details is BankRpdStatusResponse => details !== null,
            );

          setBankDetailsList(mappedBankDetailsList);
        } else {
          setBankDetailsList([]);
        }
      } catch (error: any) {
        const errorData = error?.response?.data;

        console.log("Bank Stage Data Error:", errorData);
      } finally {
        hideSpinner();
      }
    };

    fetchBankStageData();

    return () => {
      cancelled = true;
    };
  }, [hideSpinner, showSpinner]);

  const goBack = () => {
    showSpinner();

    setTimeout(() => {
      router.push("/manual-bankdetails");
      hideSpinner();
    }, 200);
  };

  const submitBankDetails = async (): Promise<void> => {
    // await apiService.postRequest('api/v1/BankDetails/submit', { ... });
  };

  const handleProceed = async () => {
    showSpinner();

    await submitBankDetails();

    setTimeout(() => {
      router.push("/planprocess/1");
      hideSpinner();
    }, 200);
  };

  return (
    <>
      {/* ── MOBILE (< 768px) ─────────────────────────────────────────────────── */}
      <section
        aria-label="Bank Details Added Successfully"
        className={styles.mobilePage}
        suppressHydrationWarning
      >
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderTop}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
              <BackArrow />
            </button>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <SuccessContent detailsList={bankDetailsList} />
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={styles.mobileProceedBtn}
            onClick={handleProceed}
            suppressHydrationWarning
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section
        aria-label="Bank Details Added Successfully"
        className={styles.desktopPage}
        suppressHydrationWarning
      >
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
              <BackArrow />
            </button>
          </div>

          <div className={styles.desktopCardBody}>
            <SuccessContent detailsList={bankDetailsList} />

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={styles.desktopProceedBtn}
                onClick={handleProceed}
                suppressHydrationWarning
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
