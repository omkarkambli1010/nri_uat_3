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
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import LoadingButton from "@/components/ui/LoadingButton";
import { useSpinner } from "@/components/spinner/Spinner";
import { FileUploadCard } from "@/components/file-upload/FileUploadCard";
import type { UploadedFile } from "@/components/file-upload/fileUpload.types";
import navigationService from "@/services/navigation.service";
import apiService, { BankMasterIFSCResponse } from "@/services/api.service";
import { toast } from "@/services/toast.service";
import { publicPath } from "@/utils/publicPath";
import { getBankStageData } from "../manual-bankinfo/ManualBankInfo";
import { useSessionValue } from "@/hooks/useSessionValue";
import styles from "./manual-bankdetails.module.scss";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

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

interface StageDocument {
  documentType?: string;
  documentID?: string;
  documentId?: string;
  presignedUrl?: string;
  preSignedURL?: string;
  documentSide?: string | null;
}

interface StageBankData {
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

interface ManualBankRequest {
  accountNumber: string;
  ifscCode: string;
  holderName: string;
  accountType: "Nro" | "NreNonPis";
  documentId: string;
  idempotencyKey: string;
}

const STATEMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];
const STATEMENT_MAX_SIZE = 5 * 1024 * 1024;
const STATEMENT_ACCEPTED_LABEL = "PDF, JPG, JPEG, HEIC & PNG";
const STATEMENT_SIZE_ERR =
  "File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.";
const STATEMENT_TYPE_ERR =
  "Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.";

// "Select Bank Account Type" options (merged from the former LinkBankAccount
// step). NRO is always available; Non PIS NRE only on the semi-digital journey.
const ACCOUNT_TYPES: { id: SelectedAccountType; label: string }[] = [
  { id: "nro", label: "NRO (Savings Account)" },
  { id: "nre", label: "Non PIS NRE (Savings Account)" },
];

const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

const cleanPresignedUrl = (url?: string): string =>
  String(url || "")
    .replace(/&amp;amp;amp;/g, "&")
    .replace(/&amp;amp;/g, "&")
    .replace(/&amp;/g, "&");

const getFileNameFromUrl = (url: string, fallbackName: string): string => {
  if (!url) return fallbackName;

  try {
    const parsedUrl = new URL(url);
    const fileName = parsedUrl.pathname.split("/").pop();
    return fileName ? decodeURIComponent(fileName) : fallbackName;
  } catch {
    const fileName = url.split("?")[0].split("/").pop();
    return fileName ? decodeURIComponent(fileName) : fallbackName;
  }
};

const getDocumentMimeType = (url: string): string => {
  const normalizedUrl = url.toLowerCase().split("?")[0];

  if (normalizedUrl.endsWith(".pdf")) return "application/pdf";
  if (normalizedUrl.endsWith(".jpg") || normalizedUrl.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalizedUrl.endsWith(".png")) return "image/png";
  if (normalizedUrl.endsWith(".heic")) return "image/heic";
  if (normalizedUrl.endsWith(".heif")) return "image/heif";

  return "application/octet-stream";
};

const createStageUploadedFile = (
  documentId: string,
  documentUrl: string,
  fallbackName: string,
): UploadedFile => {
  const fileName = getFileNameFromUrl(documentUrl, fallbackName);
  const mimeType = getDocumentMimeType(documentUrl);

  return {
    id: documentId,
    file: new File([], fileName, {
      type: mimeType,
      lastModified: Date.now(),
    }),
    status: "success",
    progress: 100,
    previewUrl: documentUrl,
  };
};

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

// "Select Bank Account Type" checkbox — merged from LinkBankAccount / step 6
function CheckboxOption({
  label,
  checked,
  onToggle,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={styles.checkboxItem}>
      <button
        type="button"
        className={styles.checkboxBtn}
        onClick={onToggle}
        aria-pressed={checked}
        aria-label={label}
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

interface IFSCSelectProps {
  value: string;
  onChange: (code: string, details?: IFSCEntry | null) => void;
}

function IFSCSelect({ value, onChange }: IFSCSelectProps) {
  const [inputText, setInputText] = useState(value);
  const [selectedCode, setSelectedCode] = useState(value.trim().toUpperCase());
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [results, setResults] = useState<IFSCEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");
  const optionRefs = useRef<(HTMLLIElement | null)[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const uid = useId();
  const lastEmittedRef = useRef(value.trim().toUpperCase());

  const emitChange = (code: string, details?: IFSCEntry | null) => {
    lastEmittedRef.current = code;
    onChange(code, details);
  };

  useEffect(() => {
    const normalized = value.trim().toUpperCase();
    if (normalized === lastEmittedRef.current) return;
    lastEmittedRef.current = normalized;
    setInputText(normalized);
    setSelectedCode(normalized);
  }, [value]);

  useEffect(() => {
    if (!isOpen || !inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = () => {
      if (!inputRef.current) return;
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    };
    window.addEventListener("scroll", handleScroll, true);
    return () => window.removeEventListener("scroll", handleScroll, true);
  }, [isOpen]);

  const mapApiResponseToIFSCEntry = (
    data: BankMasterIFSCResponse,
  ): IFSCEntry => ({
    code: data.ifscCode.trim().toUpperCase(),
    branch:
      data.branchName?.trim() ||
      data.address?.trim() ||
      data.bankName?.trim() ||
      "Branch details not available",
    bankName: data.bankName,
    address: data.address,
    micrNo: data.micrNo,
    bbmCd: data.bbmCd,
  });

  const handleSelect = (item: IFSCEntry) => {
    const code = item.code.trim().toUpperCase();
    setInputText(code);
    setSelectedCode(code);
    emitChange(code, item);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const fetchIFSCDetails = async (ifscCode: string) => {
    const requestId = ++requestIdRef.current;

    try {
      setIsLoading(true);
      setApiError("");

      const list = await apiService.searchBankMasterByIfsc(ifscCode);
      if (requestId !== requestIdRef.current) return;
      if (!list.length) throw new Error("No IFSC details found");

      const uniqueResults = Array.from(
        new Map(
          list.map(mapApiResponseToIFSCEntry).map((item) => [item.code, item]),
        ).values(),
      );

      if (!uniqueResults.length) throw new Error("No IFSC details found");

      setResults(uniqueResults);
      const exact = uniqueResults.find((item) => item.code === ifscCode);

      if (exact) {
        handleSelect(exact);
        return;
      }

      setIsOpen(true);
      setActiveIndex(0);
    } catch {
      if (requestId !== requestIdRef.current) return;
      setResults([]);
      setActiveIndex(-1);
      setApiError("No matching IFSC code found");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    const query = inputText.trim().toUpperCase();

    if (query.length <= 1 || query === selectedCode) {
      if (query.length <= 1) {
        setResults([]);
        setApiError("");
      }
      return;
    }

    const timer = setTimeout(() => void fetchIFSCDetails(query), 400);
    return () => clearTimeout(timer);
  }, [inputText, selectedCode]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    setInputText(raw);
    setSelectedCode("");
    emitChange("", null);
    setIsOpen(true);
    setActiveIndex(-1);

    if (raw.length <= 1) {
      setResults([]);
      setApiError("");
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (event.key === "ArrowDown" || event.key === "Enter")) {
      setIsOpen(true);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((previous) => Math.min(previous + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((previous) => Math.max(previous - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (activeIndex >= 0 && results[activeIndex])
        handleSelect(results[activeIndex]);
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setIsOpen(false);
      const exact = results.find(
        (item) => item.code === inputText.trim().toUpperCase(),
      );
      if (exact) handleSelect(exact);
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
        maxLength={15}
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
          onWheel={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
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
          ) : inputText.length <= 1 ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              Enter IFSC code to search
            </li>
          ) : results.length === 0 ? (
            <li
              className={styles.ifscNoResults}
              role="option"
              aria-selected={false}
            >
              Searching IFSC details...
            </li>
          ) : (
            results.map((item, index) => (
              <li
                key={`${item.code}-${index}`}
                id={`${uid}-opt-${index}`}
                ref={(element) => {
                  optionRefs.current[index] = element;
                }}
                className={`${styles.ifscOption}${
                  index === activeIndex ? ` ${styles.ifscOptionActive}` : ""
                }`}
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault();
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
      {uploadSlot}
      <p className={styles.sectionTitle}>{title}</p>

      <div className={styles.fieldGroup}>
        <label className={styles.fieldLabel}>Enter your Account No.</label>
        <div className={styles.inputCol}>
          <div className={styles.inputWrapper}>
            <input
              type={showAccount ? "text" : "password"}
              inputMode="numeric"
              className={`${styles.input} ${styles.withEye}${
                errors.duplicateAccount ? ` ${styles.inputError}` : ""
              }`}
              placeholder="e.g. 00112233445566"
              value={accountNo}
              onChange={(event) =>
                onChange("accountNo", event.target.value.replace(/[^0-9]/g, ""))
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
              className={`${styles.input}${
                errors.accountMismatch ? ` ${styles.inputError}` : ""
              }`}
              placeholder="e.g. 00112233445566"
              value={reAccountNo}
              onChange={(event) =>
                onChange(
                  "reAccountNo",
                  event.target.value.replace(/[^0-9]/g, ""),
                )
              }
              onPaste={(event) => event.preventDefault()}
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
            onChange={(code, details) => onChange("ifsc", code, details)}
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

export default function ManualBankDetails() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  // const [showModal, setShowModal] = useState(false);
  const [isStageDataLoading, setIsStageDataLoading] = useState(true);

  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bank-account-type selection (merged from the former LinkBankAccount step).
  // Starts empty — the user picks a type, or it is prefilled/forced below.
  const [selectedAccountTypes, setSelectedAccountTypes] = useState<
    SelectedAccountType[]
  >([]);

  // BRD: the "Non PIS NRE" option is only valid on the semi-digital journey; the
  // digital journey uses NRO only, so no selector is shown there at all.
  const accountType = useSessionValue("accountType");
  const isSemiDigital = accountType === "semi-digital";
  const isDigital = accountType === "digital";
  const accountTypeOptions = isSemiDigital
    ? ACCOUNT_TYPES
    : ACCOUNT_TYPES.filter(({ id }) => id !== "nre");

  const [nroStatementFiles, setNroStatementFiles] = useState<UploadedFile[]>(
    [],
  );
  const [nreStatementFiles, setNreStatementFiles] = useState<UploadedFile[]>(
    [],
  );
  const [nroStatementDocumentId, setNroStatementDocumentId] = useState("");
  const [nreStatementDocumentId, setNreStatementDocumentId] = useState("");
  const [nroStatementPreviewUrl, setNroStatementPreviewUrl] = useState("");
  const [nreStatementPreviewUrl, setNreStatementPreviewUrl] = useState("");

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
  }, [router, hideSpinner]);

  useEffect(() => {
    return () => {
      if (modalTimerRef.current) clearTimeout(modalTimerRef.current);
    };
  }, []);

  // Returns [] when nothing usable is stored. Since the type selector now lives
  // on this page, "no saved value" means the user has not chosen yet — it must
  // not fall back to both types, or every section would render pre-selected.
  const getSelectedAccountTypesFromSession = (): SelectedAccountType[] => {
    if (typeof window === "undefined") return [];

    const raw = secureSessionService.getItem("SelectedAccountTypes");
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const normalized = parsed
        .map((item) => String(item).toLowerCase())
        .filter(
          (item): item is SelectedAccountType =>
            item === "nre" || item === "nro",
        );

      return Array.from(new Set(normalized));
    } catch {
      return [];
    }
  };

  const persistAccountTypes = (types: SelectedAccountType[]) => {
    if (typeof window === "undefined") return;
    secureSessionService.setItem(
      "SelectedAccountTypes",
      JSON.stringify(types),
    );
  };

  // Prefill the selection from a prior visit. When nothing is saved the
  // selection stays empty and the user picks.
  useEffect(() => {
    const saved = getSelectedAccountTypesFromSession();
    if (saved.length) setSelectedAccountTypes(saved);
  }, []);

  // Digital journey: NRO only, forced and persisted, with no selector shown.
  useEffect(() => {
    if (!isDigital) return;
    setSelectedAccountTypes(["nro"]);
    persistAccountTypes(["nro"]);
  }, [isDigital]);

  // Toggle a type and mirror the selection to secureSessionService — the downstream
  // ManualBankInfo screen reads SelectedAccountTypes.
  const toggleAccountType = (id: SelectedAccountType) => {
    setSelectedAccountTypes((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      persistAccountTypes(next);
      return next;
    });
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applicationId = secureSessionService.getItem("ApplicationId") || "";

    if (!applicationId) {
      setIsStageDataLoading(false);
      return;
    }

    let cancelled = false;

    const normalizeAccountType = (
      accountType?: string,
    ): SelectedAccountType | null => {
      const type = String(accountType || "")
        .trim()
        .toLowerCase()
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ");

      if (type.includes("nro")) return "nro";
      if (
        type.includes("nre") ||
        type.includes("non pis nre") ||
        type.includes("nrenonpis")
      ) {
        return "nre";
      }

      return null;
    };

    const getDocuments = (response: any): StageDocument[] => {
      if (Array.isArray(response?.documents)) return response.documents;
      if (Array.isArray(response?.data?.documents))
        return response.data.documents;
      return [];
    };

    const getBankRecords = (response: any): StageBankData[] => {
      const data = response?.data;
      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.bankDetails)) return data.bankDetails;
      if (Array.isArray(data?.bankDetail)) return data.bankDetail;
      if (Array.isArray(data?.banks)) return data.banks;
      if (data && !Array.isArray(data?.documents)) return [data];
      return [];
    };

    const findDocument = (
      documents: StageDocument[],
      type: SelectedAccountType,
      fallbackId?: string,
    ) => {
      const byType = documents.find((document) => {
        const documentType = String(document.documentType || "").toLowerCase();
        return type === "nro"
          ? documentType.includes("nro")
          : documentType.includes("nre");
      });

      if (byType) return byType;

      return documents.find(
        (document) =>
          Boolean(fallbackId) &&
          (document.documentID || document.documentId) === fallbackId,
      );
    };

    const mapIfsc = (bank: StageBankData): IFSCEntry => ({
      code: String(bank.ifscCode || "")
        .trim()
        .toUpperCase(),
      branch:
        bank.branchName || bank.branchaddress || "Branch details not available",
      bankName: bank.bankName || "",
      address: bank.branchaddress || "",
      micrNo: bank.micrcode || "",
      bbmCd: bank.branchcode || "",
    });

    const bind = (
      bank: StageBankData,
      type: SelectedAccountType,
      documents: StageDocument[],
    ) => {
      const document = findDocument(documents, type, bank.documentId);
      const documentId =
        document?.documentID || document?.documentId || bank.documentId || "";
      const documentUrl = cleanPresignedUrl(
        document?.presignedUrl || document?.preSignedURL,
      );
      const normalizedIfsc = String(bank.ifscCode || "")
        .trim()
        .toUpperCase();
      const ifscDetails = mapIfsc(bank);

      if (type === "nro") {
        setNroAccountNo(bank.accountNumber || "");
        setNroReAccountNo(bank.accountNumber || "");
        setNroIfsc(normalizedIfsc);
        setNroIfscDetails(ifscDetails);
        setNroStatementDocumentId(documentId);
        setNroStatementPreviewUrl(documentUrl);

        setNroStatementFiles(
          documentId && documentUrl
            ? [
                createStageUploadedFile(
                  documentId,
                  documentUrl,
                  "NRO-Bank-Statement",
                ),
              ]
            : [],
        );

        return;
      }

      setNreAccountNo(bank.accountNumber || "");
      setNreReAccountNo(bank.accountNumber || "");
      setNreIfsc(normalizedIfsc);
      setNreIfscDetails(ifscDetails);
      setNreStatementDocumentId(documentId);
      setNreStatementPreviewUrl(documentUrl);

      setNreStatementFiles(
        documentId && documentUrl
          ? [
              createStageUploadedFile(
                documentId,
                documentUrl,
                "Non-PIS-NRE-Bank-Statement",
              ),
            ]
          : [],
      );
    };

    const fetchStageData = async () => {
      showSpinner();

      try {
        const response: any = await getBankStageData(applicationId);
        if (cancelled || response?.status !== true) return;

        const documents = getDocuments(response);
        const records = getBankRecords(response);

        // Prefer the types the server actually holds data for: a returning user
        // in a fresh browser session has no SelectedAccountTypes to read back,
        // and would otherwise see an empty form over their saved details.
        const typesFromRecords = Array.from(
          new Set(
            records
              .map((item) =>
                normalizeAccountType(item.accountType || item.bankaccounttype),
              )
              .filter((type): type is SelectedAccountType => type !== null),
          ),
        );

        const accountTypes = typesFromRecords.length
          ? typesFromRecords
          : getSelectedAccountTypesFromSession();

        if (accountTypes.length) {
          setSelectedAccountTypes(accountTypes);
          persistAccountTypes(accountTypes);
        }

        accountTypes.forEach((type) => {
          const record = records.find(
            (item) =>
              normalizeAccountType(item.accountType || item.bankaccounttype) ===
              type,
          );

          if (record) bind(record, type, documents);
        });
      } catch (error: any) {
        console.log("Bank Stage Data Error:", error?.response?.data || error);
      } finally {
        if (!cancelled) {
          setIsStageDataLoading(false);
        }
        requestAnimationFrame(() => {
          if (!cancelled) {
            hideSpinner();
          }
        });
      }
    };

    void fetchStageData();

    return () => {
      cancelled = true;
    };
  }, [hideSpinner, showSpinner]);

  const showNroSection = selectedAccountTypes.includes("nro");
  const showNreSection = selectedAccountTypes.includes("nre");
  const showBothSections = showNroSection && showNreSection;

  const getApplicationId = () =>
    typeof window !== "undefined"
      ? secureSessionService.getItem("ApplicationId") || ""
      : "";

  const uploadNroStatement = async (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void> => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    onProgress(10);

    const response: UploadDocumentResponse = await apiService.uploadNriDocument(
      {
        applicationId,
        documentType: "BankStatement_NRO",
        file,
      },
      hideSpinner,
    );

    if (!response?.status || !response?.documentId) {
      throw new Error("NRO statement upload failed.");
    }

    setNroStatementDocumentId(response.documentId);
    if (response.preSignedURL) {
      setNroStatementPreviewUrl(cleanPresignedUrl(response.preSignedURL));
    }
    onProgress(100);
  };

  const uploadNreStatement = async (
    file: File,
    onProgress: (progress: number) => void,
  ): Promise<void> => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    onProgress(10);

    const response: UploadDocumentResponse = await apiService.uploadNriDocument(
      {
        applicationId,
        documentType: "BankStatement_NonPIS_NRE",
        file,
      },
      hideSpinner,
    );

    if (!response?.status || !response?.documentId) {
      throw new Error("NRE statement upload failed.");
    }

    setNreStatementDocumentId(response.documentId);
    if (response.preSignedURL) {
      setNreStatementPreviewUrl(cleanPresignedUrl(response.preSignedURL));
    }
    onProgress(100);
  };

  const handleNroFilesChange = (files: UploadedFile[]) => {
    setNroStatementFiles(files);

    const hasSuccessFile = files.some((file) => file.status === "success");

    if (!hasSuccessFile) {
      setNroStatementDocumentId("");
    }
  };

  const handleNreFilesChange = (files: UploadedFile[]) => {
    setNreStatementFiles(files);

    const hasSuccessFile = files.some((file) => file.status === "success");

    if (!hasSuccessFile) {
      setNreStatementDocumentId("");
    }
  };

  const submitManualBankDetails = async (): Promise<any> => {
    showSpinner();
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      throw new Error("Application ID not found");
    }

    const bankDetails: ManualBankRequest[] = [];

    if (showNroSection) {
      bankDetails.push({
        accountNumber: nroAccountNo,
        ifscCode: nroIfsc,
        holderName: "",
        accountType: "Nro",
        documentId: nroStatementDocumentId,
        idempotencyKey: "",
      });
    }

    if (showNreSection) {
      bankDetails.push({
        accountNumber: nreAccountNo,
        ifscCode: nreIfsc,
        holderName: "",
        accountType: "NreNonPis",
        documentId: nreStatementDocumentId,
        idempotencyKey: "",
      });
    }

    const response = await apiService.postNri(
      `applications/${applicationId}/bank/manual`,
      bankDetails,      
    );

    console.log("Bank Stage Response:", response);

    hideSpinner();
    let route = "";

    try {
      if (response?.status === true) {
        toast.success("Your Bank details have been added successfully...", {
          position: "top-center",
          autoClose: 2500,
        });

        await delay(200);
      }
      const uiMetadata = response?.uiMetadata
        ? JSON.parse(response.uiMetadata)
        : null;

      route = uiMetadata?.route || "";
    } catch (error: any) {
      route = "";
      console.log("Bank Route Error:", error);
    }

    if (route) {
      return route;
    } else {
      toast.error("Next Route Not provided", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return "";
    }
  };

  const handleProceed = async () => {
    showSpinner();
    try {
      // setShowModal(true);
      const route = await submitManualBankDetails();

      modalTimerRef.current = setTimeout(() => {
        // setShowModal(false);
        setTimeout(() => {
          // router.push("/manualBankInfo");
          router.push(`/${route}`);
          hideSpinner();
        }, 200);
      }, 600);
    } catch (error) {
      // setShowModal(false);
      hideSpinner();
      console.log("Manual bank details submission failed:", error);
      toast.error("Unable to submit bank details. Please try again.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }
  };

  const handleNroChange: BankSectionProps["onChange"] = (
    field,
    value,
    details,
  ) => {
    if (field === "accountNo") setNroAccountNo(value);
    else if (field === "reAccountNo") setNroReAccountNo(value);
    else {
      setNroIfsc(value);
      setNroIfscDetails(details || null);
    }
  };

  const handleNreChange: BankSectionProps["onChange"] = (
    field,
    value,
    details,
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

  const nroFileUploaded =
    Boolean(nroStatementDocumentId) ||
    nroStatementFiles.some((file) => file.status === "success");
  const nreFileUploaded =
    Boolean(nreStatementDocumentId) ||
    nreStatementFiles.some((file) => file.status === "success");

  const isNroInvalid =
    showNroSection &&
    (!nroAccountNo ||
      !nroReAccountNo ||
      !nroIfsc ||
      nroAccountNo !== nroReAccountNo ||
      !nroFileUploaded);
  const isNreInvalid =
    showNreSection &&
    (!nreAccountNo ||
      !nreReAccountNo ||
      !nreIfsc ||
      nreAccountNo !== nreReAccountNo ||
      !nreFileUploaded);
  const isDisabled =
    isNroInvalid ||
    isNreInvalid ||
    accountsAreDuplicate ||
    (!showNroSection && !showNreSection);

  const renderNroSection = () => (
    <BankSection
      title="Enter NRO (Savings Account) details"
      uploadSlot={
        <>
          <p className={styles.sbiNote}>
            <strong>Note:</strong> ONLY SBI bank account details are accepted
          </p>

          {!isStageDataLoading && (
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
              initialFiles={nroStatementFiles}
            />
          )}
        </>
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
      onToggleShow={() => setNroShowAccount((value) => !value)}
    />
  );

  const renderNreSection = () => (
    <BankSection
      title="Enter Non PIS NRE (Savings Account) details"
      uploadSlot={
        !isStageDataLoading ? (
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
            initialFiles={nreStatementFiles}
          />
        ) : null
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
      onToggleShow={() => setNreShowAccount((value) => !value)}
    />
  );

  // Merged from the former LinkBankAccount step. Always rendered, matching that
  // screen: on the digital journey accountTypeOptions is NRO alone and it is
  // pre-selected above, so the user still sees which account type applies.
  const renderAccountTypeSelection = () => (
    <>
      <p className={styles.sectionLabel}>Select Bank Account Type</p>
      <div className={styles.checkboxGroup}>
        {accountTypeOptions.map(({ id, label }) => (
          <CheckboxOption
            key={id}
            label={label}
            checked={selectedAccountTypes.includes(id)}
            onToggle={() => toggleAccountType(id)}
          />
        ))}
      </div>
    </>
  );

  const renderNeedHelpBtn = () => (
    <button
      type="button"
      className={styles.needHelpBtn}
      suppressHydrationWarning
      onClick={() => router.push(`/faq?from=${pathname}`)}
    >
      Need Help?
    </button>
  );

  // const goBack = () => {
  //   showSpinner();
  //   setTimeout(() => {
  //     router.push("/personalDetailsForm/5");
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
            {renderNeedHelpBtn()}
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
          {renderAccountTypeSelection()}
          {showNroSection && renderNroSection()}
          {showNreSection && renderNreSection()}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${
              isDisabled ? ` ${styles.btnDisabled}` : ""
            }`}
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
                {renderNeedHelpBtn()}
              </div>
              <p className={styles.desktopCardSubtitle}>
                Enter bank account number and IFSC for bank verification
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {renderAccountTypeSelection()}
              {showNroSection && renderNroSection()}
              {showNreSection && renderNreSection()}
            </div>
            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${
                  isDisabled ? ` ${styles.btnDisabled}` : ""
                }`}
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

      {/* {showModal && (
        <div
          className={styles.modalOverlay}
          role="status"
          aria-live="polite"
          aria-busy="true"
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
      )} */}
    </>
  );
}
