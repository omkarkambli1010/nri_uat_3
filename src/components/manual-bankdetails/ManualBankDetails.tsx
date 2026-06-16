"use client";

import {
  ChangeEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import LoadingButton from '@/components/ui/LoadingButton';
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import navigationService from "@/services/navigation.service";
import { FileUploadCard } from "@/components/file-upload/FileUploadCard";
import type { UploadedFile } from "@/components/file-upload/fileUpload.types";
import styles from "./manual-bankdetails.module.scss";
import { publicPath } from "@/utils/publicPath";
import apiService, { BankMasterIFSCResponse } from "@/services/api.service";
import { DOCUMENT_TYPES } from "@/constants/document-types";
import { toast } from "@/services/toast.service";

// ── Constants ─────────────────────────────────────────────────────────────────

interface IFSCEntry {
  code: string;
  branch: string;
  bankName?: string;
  address?: string;
  micrNo?: string;
  bbmCd?: string;
}

type SelectedAccountType = "nre" | "nro";

interface UploadDocumentResponse {
  documentId: string;
  s3Key: string;
  preSignedURL: string;
  status: boolean;
}

const STATEMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];

const STATEMENT_MAX_SIZE = 5 * 1024 * 1024; // 5 MB

const STATEMENT_ACCEPTED_LABEL = "PDF, JPG, JPEG, HEIC & PNG";

const STATEMENT_SIZE_ERR =
  "File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.";

const STATEMENT_TYPE_ERR =
  "Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.";

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

function InfoIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="7" stroke="#280071" strokeWidth="1.2" />
      <path
        d="M8 7v4"
        stroke="#280071"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="8" cy="5" r="0.75" fill="#280071" />
    </svg>
  );
}

function EyeOpenIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 10C2.5 10 5 5 10 5C15 5 17.5 10 17.5 10C17.5 10 15 15 10 15C5 15 2.5 10 2.5 10Z"
        stroke="#666666"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="10" r="2.5" stroke="#666666" strokeWidth="1.2" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3L17 17"
        stroke="#666666"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M8.23 5.1A7.5 7.5 0 0110 5c5 0 7.5 5 7.5 5a13.3 13.3 0 01-2.14 3.06M5.8 6.8A13.4 13.4 0 002.5 10s2.5 5 7.5 5a7.5 7.5 0 004.2-1.27"
        stroke="#666666"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 8.55A2.5 2.5 0 0111.5 11.5"
        stroke="#666666"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.4" />
      <path
        d="M8 5v4"
        stroke="#dc2626"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11" r="0.75" fill="#dc2626" />
    </svg>
  );
}

// ── IFSC Autocomplete ─────────────────────────────────────────────────────────

interface IFSCSelectProps {
  value: string;
  onChange: (code: string, details?: IFSCEntry | null) => void;
}

function IFSCSelect({ value, onChange }: IFSCSelectProps) {
  const [inputText, setInputText] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [results, setResults] = useState<IFSCEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();

  useEffect(() => {
    setInputText(value);
  }, [value]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleScroll = () => {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
        });
      }
    };

    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  const mapApiResponseToIFSCEntry = (
    data: BankMasterIFSCResponse,
  ): IFSCEntry => {
    return {
      code: data.ifscCode,
      branch:
        data.branchName?.trim() ||
        data.address?.trim() ||
        data.bankName?.trim() ||
        "Branch details not available",
      bankName: data.bankName,
      address: data.address,
      micrNo: data.micrNo,
      bbmCd: data.bbmCd,
    };
  };

  const fetchIFSCDetails = async (ifscCode: string) => {
    try {
      setIsLoading(true);
      setApiError("");
      setResults([]);

      const data = await apiService.getBankMasterByIfsc(ifscCode);

      if (!data?.ifscCode) {
        throw new Error("No IFSC details found");
      }

      const mappedResult = mapApiResponseToIFSCEntry(data);

      setResults([mappedResult]);
      setIsOpen(true);
      setActiveIndex(0);
    } catch {
      setResults([]);
      setApiError("No matching IFSC code found");
      onChange("", null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const q = inputText.trim().toUpperCase();

    if (q.length !== 11) {
      setResults([]);
      setApiError("");
      return;
    }

    const timer = setTimeout(() => {
      fetchIFSCDetails(q);
    }, 400);

    return () => clearTimeout(timer);
  }, [inputText]);

  const handleSelect = (item: IFSCEntry) => {
    setInputText(item.code);
    onChange(item.code, item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");

    setInputText(raw);
    onChange("", null);
    setIsOpen(true);
    setActiveIndex(-1);

    if (raw.length < 11) {
      setResults([]);
      setApiError("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === "ArrowDown" || e.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    switch (e.key) {
      case "ArrowDown": {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = Math.min(prev + 1, results.length - 1);
          setTimeout(() => {
            optionRefs.current[next]?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }, 0);
          return next;
        });
        break;
      }

      case "ArrowUp": {
        e.preventDefault();
        setActiveIndex((prev) => {
          const p = Math.max(prev - 1, 0);
          setTimeout(() => {
            optionRefs.current[p]?.scrollIntoView({
              block: "nearest",
              behavior: "smooth",
            });
          }, 0);
          return p;
        });
        break;
      }

      case "Enter": {
        e.preventDefault();
        if (activeIndex >= 0 && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        }
        break;
      }

      case "Escape": {
        setIsOpen(false);
        setActiveIndex(-1);
        break;
      }
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);

      const exact = results.find((c) => c.code === inputText);

      if (exact) {
        onChange(exact.code, exact);
      } else if (!value) {
        setInputText("");
      } else {
        setInputText(value);
      }
    }, 160);
  };

  const listboxId = `${uid}-ifsc-listbox`;

  return (
    <div className={styles.ifscWrapper}>
      <input
        ref={inputRef}
        type="text"
        className={`${styles.input} ${styles.ifscInput}`}
        placeholder="Search IFSC code"
        value={inputText}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        maxLength={11}
        role="combobox"
        aria-expanded={isOpen}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-activedescendant={
          activeIndex >= 0 ? `${uid}-opt-${activeIndex}` : undefined
        }
        suppressHydrationWarning
      />

      <span className={styles.ifscChevron} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path
            d="M6 9l6 6 6-6"
            stroke="#888"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {isOpen && (
        <ul
          id={listboxId}
          className={styles.ifscDropdown}
          role="listbox"
          aria-label="IFSC suggestions"
          style={{
            top: `${dropdownPos.top}px`,
            left: `${dropdownPos.left}px`,
            width: `${dropdownPos.width}px`,
          }}
          onWheel={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {isLoading ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              Searching IFSC details...
            </li>
          ) : apiError ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              {apiError}
            </li>
          ) : inputText.length > 0 && inputText.length < 11 ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              Enter complete 11-character IFSC code
            </li>
          ) : results.length === 0 ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              Enter IFSC code to search
            </li>
          ) : (
            results.map((item, i) => (
              <li
                key={item.code}
                id={`${uid}-opt-${i}`}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                className={`${styles.ifscOption}${i === activeIndex ? ` ${styles.ifscOptionActive}` : ""}`}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(item);
                }}
              >
                <span className={styles.ifscCode}>{item.code}</span>
                <span className={styles.ifscBranch}>
                  {item.bankName ? `${item.bankName} — ` : ""}
                  {item.branch}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

// ── Bank Section ──────────────────────────────────────────────────────────────

interface BankSectionErrors {
  accountMismatch: boolean;
  duplicateAccount: boolean;
}

interface BankSectionProps {
  title: string;
  uploadSlot: ReactNode;
  accountNo: string;
  reAccountNo: string;
  ifsc: string;
  ifscDetails: IFSCEntry | null;
  showAccount: boolean;
  errors: BankSectionErrors;
  onChange: (
    field: "accountNo" | "reAccountNo" | "ifsc",
    value: string,
    details?: IFSCEntry | null,
  ) => void;
  onToggleShow: () => void;
}

function BankSection({
  title,
  uploadSlot,
  accountNo,
  reAccountNo,
  ifsc,
  ifscDetails,
  showAccount,
  errors,
  onChange,
  onToggleShow,
}: BankSectionProps) {
  return (
    <div className={styles.bankSection}>
      <p className={styles.sectionTitle}>{title}</p>

      {uploadSlot}

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Enter your Account No.</label>
        <div className={styles.inputCol}>
          <div className={styles.inputWrapper}>
            <input
              type={showAccount ? "text" : "password"}
              inputMode="numeric"
              className={`${styles.input} ${styles.withEye}${errors.duplicateAccount ? ` ${styles.inputError}` : ""}`}
              placeholder="e.g. 00112233445566"
              value={accountNo}
              onChange={(e) =>
                onChange("accountNo", e.target.value.replace(/[^0-9]/g, ""))
              }
              maxLength={20}
              aria-invalid={errors.duplicateAccount}
              suppressHydrationWarning
            />
            <button
              type="button"
              className={styles.eyeBtn}
              onClick={onToggleShow}
              aria-label={
                showAccount ? "Hide account number" : "Show account number"
              }
              suppressHydrationWarning
            >
              {showAccount ? <EyeOpenIcon /> : <EyeClosedIcon />}
            </button>
          </div>
          {errors.duplicateAccount && (
            <p className={styles.fieldError} role="alert">
              <AlertIcon />
              NRO and NRE account numbers must be different.
            </p>
          )}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Re-enter your Account No.</label>
        <div className={styles.inputCol}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              inputMode="numeric"
              className={`${styles.input}${errors.accountMismatch ? ` ${styles.inputError}` : ""}`}
              placeholder="e.g. 00112233445566"
              value={reAccountNo}
              onChange={(e) =>
                onChange("reAccountNo", e.target.value.replace(/[^0-9]/g, ""))
              }
              onPaste={(e) => e.preventDefault()}
              maxLength={20}
              aria-invalid={errors.accountMismatch}
              suppressHydrationWarning
            />
          </div>
          {errors.accountMismatch && (
            <p className={styles.fieldError} role="alert">
              <AlertIcon />
              Account numbers do not match.
            </p>
          )}
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Enter IFSC Code</label>
        <div className={styles.inputCol}>
          <IFSCSelect
            value={ifsc}
            onChange={(v, details) => onChange("ifsc", v, details)}
          />
        </div>
      </div>

      <div className={styles.addressBox}>
        {ifscDetails ? (
          <>
            <p className={styles.addressText}>
              {ifscDetails.bankName || "Bank details not available"}
            </p>
            <p className={styles.addressText}>
              {ifscDetails.address ||
                ifscDetails.branch ||
                "Branch address not available"}
            </p>
            {ifscDetails.micrNo && (
              <p className={styles.addressText}>MICR: {ifscDetails.micrNo}</p>
            )}
          </>
        ) : (
          <p className={styles.addressText}>
            Enter IFSC code above to see branch details
          </p>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function ManualBankDetails() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [showModal, setShowModal] = useState(false);
  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    };
  }, []);

  const [selectedAccountTypes, setSelectedAccountTypes] = useState<
    SelectedAccountType[]
  >(["nre", "nro"]);

  const [nroStatementFiles, setNroStatementFiles] = useState<UploadedFile[]>(
    [],
  );
  const [nreStatementFiles, setNreStatementFiles] = useState<UploadedFile[]>(
    [],
  );

  const [nroStatementDocumentId, setNroStatementDocumentId] = useState("");
  const [nreStatementDocumentId, setNreStatementDocumentId] = useState("");

  const [nroAccountNo, setNroAccountNo] = useState("");
  const [nroReAccountNo, setNroReAccountNo] = useState("");
  const [nroIfsc, setNroIfsc] = useState("");
  const [nroIfscDetails, setNroIfscDetails] = useState<IFSCEntry | null>(null);
  const [nroShowAccount, setNroShowAccount] = useState(false);

  const [nreAccountNo, setNreAccountNo] = useState("");
  const [nreReAccountNo, setNreReAccountNo] = useState("");
  const [nreIfsc, setNreIfsc] = useState("");
  const [nreIfscDetails, setNreIfscDetails] = useState<IFSCEntry | null>(null);
  const [nreShowAccount, setNreShowAccount] = useState(false);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const rawSelectedAccountTypes = window.sessionStorage.getItem(
      "SelectedAccountTypes",
    );

    if (!rawSelectedAccountTypes) return;

    try {
      const parsed = JSON.parse(rawSelectedAccountTypes);

      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((item) => String(item).toLowerCase())
          .filter(
            (item): item is SelectedAccountType =>
              item === "nre" || item === "nro",
          );

        if (normalized.length > 0) {
          setSelectedAccountTypes(normalized);
        }
      }
    } catch {
      setSelectedAccountTypes(["nre", "nro"]);
    }
  }, []);

  const showNroSection = selectedAccountTypes.includes("nro");
  const showNreSection = selectedAccountTypes.includes("nre");
  const showBothSections = showNroSection && showNreSection;

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  }

  const goBack = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/personalDetailsForm/6");
      hideSpinner();
    }, 200);
  };

  const getApplicationId = () => {
    return typeof window !== "undefined"
      ? window.sessionStorage.getItem("ApplicationId") || ""
      : "";
  };

  const generateIdempotencyKey = () => {
    return typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const uploadNroStatement = async (
    file: File,
    onProgress: (p: number) => void,
  ): Promise<void> => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }

    onProgress(10);

    const response: UploadDocumentResponse = await apiService.uploadNriDocument(
      {
        applicationId,
        documentType: DOCUMENT_TYPES.BANK_NRO,
        file,
      },
      hideSpinner,
    );

    if (!response?.status || !response?.documentId) {
      throw new Error("NRO statement upload failed.");
    }

    setNroStatementDocumentId(response.documentId);
    onProgress(100);
  };

  const uploadNreStatement = async (
    file: File,
    onProgress: (p: number) => void,
  ): Promise<void> => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }

    onProgress(10);

    const response: UploadDocumentResponse = await apiService.uploadNriDocument(
      {
        applicationId,
        documentType: DOCUMENT_TYPES.BANK_NRE,
        file,
      },
      hideSpinner,
    );

    if (!response?.status || !response?.documentId) {
      throw new Error("NRE statement upload failed.");
    }

    setNreStatementDocumentId(response.documentId);
    onProgress(100);
  };

  const handleNroFilesChange = (files: UploadedFile[]) => {
    setNroStatementFiles(files);

    const hasSuccessFile = files.some((f) => f.status === "success");
    if (!hasSuccessFile) {
      setNroStatementDocumentId("");
    }
  };

  const handleNreFilesChange = (files: UploadedFile[]) => {
    setNreStatementFiles(files);

    const hasSuccessFile = files.some((f) => f.status === "success");
    if (!hasSuccessFile) {
      setNreStatementDocumentId("");
    }
  };

  const submitManualBankDetails = async () => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }

    const path = `applications/${applicationId}/bank/manual`;

    const requests: Promise<any>[] = [];

    if (showNroSection) {
      requests.push(
        apiService.postNri(
          path,
          {
            accountNumber: nroAccountNo,
            ifscCode: nroIfsc,
            holderName: "",
            accountType: "Nro",
            documentId: nroStatementDocumentId,
            // idempotencyKey: generateIdempotencyKey(),
            idempotencyKey: '',
          },
          hideSpinner,
        ),
      );
    }

    if (showNreSection) {
      requests.push(
        apiService.postNri(
          path,
          {
            accountNumber: nreAccountNo,
            ifscCode: nreIfsc,
            holderName: "",
            accountType: "NreNonPis",
            documentId: nreStatementDocumentId,
            // idempotencyKey: generateIdempotencyKey(),
            idempotencyKey: '',
          },
          hideSpinner,
        ),
      );
    }

    await Promise.all(requests);
  };

  const handleProceed = async () => {
    try {
      setShowModal(true);
      showSpinner();

      await submitManualBankDetails();

      modalTimerRef.current = setTimeout(() => {
        setShowModal(false);

        setTimeout(() => {
          router.push("/manualBankInfo");
          hideSpinner();
        }, 200);
      }, 2500);
    } catch (error) {
      setShowModal(false);
      hideSpinner();

      console.error("Manual bank details submission failed:", error);
    }
  };

  const handleNroChange = (
    field: "accountNo" | "reAccountNo" | "ifsc",
    value: string,
    details?: IFSCEntry | null,
  ) => {
    if (field === "accountNo") setNroAccountNo(value);
    else if (field === "reAccountNo") setNroReAccountNo(value);
    else {
      setNroIfsc(value);
      setNroIfscDetails(details || null);
    }
  };

  const handleNreChange = (
    field: "accountNo" | "reAccountNo" | "ifsc",
    value: string,
    details?: IFSCEntry | null,
  ) => {
    if (field === "accountNo") setNreAccountNo(value);
    else if (field === "reAccountNo") setNreReAccountNo(value);
    else {
      setNreIfsc(value);
      setNreIfscDetails(details || null);
    }
  };

  const nroAccountMismatch =
    showNroSection &&
    nroReAccountNo.length > 0 &&
    nroAccountNo !== nroReAccountNo;

  const nreAccountMismatch =
    showNreSection &&
    nreReAccountNo.length > 0 &&
    nreAccountNo !== nreReAccountNo;

  const accountsAreDuplicate =
    showBothSections &&
    nroAccountNo.length > 0 &&
    nreAccountNo.length > 0 &&
    nroAccountNo === nreAccountNo;

  const nroFileUploaded = nroStatementFiles.some((f) => f.status === "success");
  const nreFileUploaded = nreStatementFiles.some((f) => f.status === "success");

  const isNroInvalid =
    showNroSection &&
    (!nroAccountNo ||
      !nroReAccountNo ||
      !nroIfsc ||
      nroAccountNo !== nroReAccountNo ||
      !nroFileUploaded ||
      !nroStatementDocumentId);

  const isNreInvalid =
    showNreSection &&
    (!nreAccountNo ||
      !nreReAccountNo ||
      !nreIfsc ||
      nreAccountNo !== nreReAccountNo ||
      !nreFileUploaded ||
      !nreStatementDocumentId);

  const isDisabled =
    isNroInvalid ||
    isNreInvalid ||
    accountsAreDuplicate ||
    (!showNroSection && !showNreSection);

  const nroSection = (
    <BankSection
      title="Enter NRO (Savings Account) details"
      uploadSlot={
        <FileUploadCard
          title="Upload NRO Statement"
          acceptedTypes={STATEMENT_TYPES}
          maxSize={STATEMENT_MAX_SIZE}
          acceptedLabel={STATEMENT_ACCEPTED_LABEL}
          sizeErrorMessage={STATEMENT_SIZE_ERR}
          typeErrorMessage={STATEMENT_TYPE_ERR}
          cropImages
          uploadFn={uploadNroStatement}
          onFilesChange={handleNroFilesChange}
        />
      }
      accountNo={nroAccountNo}
      reAccountNo={nroReAccountNo}
      ifsc={nroIfsc}
      ifscDetails={nroIfscDetails}
      showAccount={nroShowAccount}
      errors={{
        accountMismatch: nroAccountMismatch,
        duplicateAccount: accountsAreDuplicate,
      }}
      onChange={handleNroChange}
      onToggleShow={() => setNroShowAccount((v) => !v)}
    />
  );

  const nreSection = (
    <BankSection
      title="Enter Non PIS NRE (Savings Account) details"
      uploadSlot={
        <FileUploadCard
          title="Upload Non PIS NRE Statement"
          acceptedTypes={STATEMENT_TYPES}
          maxSize={STATEMENT_MAX_SIZE}
          acceptedLabel={STATEMENT_ACCEPTED_LABEL}
          sizeErrorMessage={STATEMENT_SIZE_ERR}
          typeErrorMessage={STATEMENT_TYPE_ERR}
          cropImages
          uploadFn={uploadNreStatement}
          onFilesChange={handleNreFilesChange}
        />
      }
      accountNo={nreAccountNo}
      reAccountNo={nreReAccountNo}
      ifsc={nreIfsc}
      ifscDetails={nreIfscDetails}
      showAccount={nreShowAccount}
      errors={{
        accountMismatch: nreAccountMismatch,
        duplicateAccount: accountsAreDuplicate,
      }}
      onChange={handleNreChange}
      onToggleShow={() => setNreShowAccount((v) => !v)}
    />
  );

  const needHelpBtn = (
    <button
      type="button"
      className={styles.needHelpBtn}
      suppressHydrationWarning
      onClick={openFaq}
    >
      Need Help?
    </button>
  );

  return (
    <>
      <section
        aria-label="Add Bank Details Manually"
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
            {needHelpBtn}
          </div>
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>
              Add your bank details manually
            </h1>
            <p className={styles.mobileSubtitle}>
              Enter bank account number and IFSC for bank verification
            </p>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {showNroSection && nroSection}
          {showNreSection && nreSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.btnDisabled}` : ""}`}
            onClick={handleProceed}
            disabled={isDisabled}
            suppressHydrationWarning
          >
            Proceed
          </LoadingButton>
        </div>
      </section>

      <section
        aria-label="Add Bank Details Manually"
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
            <div className={styles.desktopTitleBlock}>
              <div className={styles.desktopTitleRow}>
                <h1 className={styles.desktopCardTitle}>
                  Add your bank details manually
                </h1>
                {needHelpBtn}
              </div>
              <p className={styles.desktopCardSubtitle}>
                Enter bank account number and IFSC for bank verification
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {showNroSection && nroSection}
              {showNreSection && nreSection}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.btnDisabled}` : ""}`}
                onClick={handleProceed}
                disabled={isDisabled}
                suppressHydrationWarning
              >
                Proceed
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>

      {showModal && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="verify-modal-title"
        >
          <div className={styles.modalCard}>
            <div className={styles.modalDash} aria-hidden="true" />

            <div className={styles.modalContent}>
              <Image
                src={publicPath("/verifying-animation.gif")}
                alt=""
                width={300}
                height={75}
                unoptimized
                className={styles.modalAnimation}
                aria-hidden="true"
              />
              <p id="verify-modal-title" className={styles.modalTitle}>
                Verifying details
              </p>
              <p className={styles.modalSubtitle}>
                This usually takes less than a minute.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
