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
import LoadingButton from "@/components/ui/LoadingButton";
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
import { getBankStageData } from "../manual-bankinfo/ManualBankInfo";

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

interface StageDocument {
  documentType?: string;
  documentID?: string;
  documentId?: string;
  presignedUrl?: string;
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

// ── Locked Uploaded Document Preview ──────────────────────────────────────────

interface LockedStatementPreviewProps {
  title: string;
  documentUrl: string;
}

function LockedStatementPreview({
  title,
  documentUrl,
}: LockedStatementPreviewProps) {
  const cleanUrl = documentUrl || "";
  const lowerUrl = cleanUrl.toLowerCase();

  const isImage =
    lowerUrl.includes(".png") ||
    lowerUrl.includes(".jpg") ||
    lowerUrl.includes(".jpeg") ||
    lowerUrl.includes(".webp");

  const isPdf = lowerUrl.includes(".pdf");

  return (
    <div>
      <p className={styles.sectionTitle}>{title}</p>

      <div className={styles.addressBox}>
        {cleanUrl ? (
          isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cleanUrl} alt={title || "Statement preview"} />
          ) : (
            <a href={cleanUrl} target="_blank" rel="noopener noreferrer">
              {isPdf ? "View uploaded statement" : "View uploaded document"}
            </a>
          )
        ) : (
          <p className={styles.addressText}>Uploaded document available</p>
        )}
      </div>
    </div>
  );
}

// ── IFSC Autocomplete ─────────────────────────────────────────────────────────

interface IFSCSelectProps {
  value: string;
  disabled?: boolean;
  onChange: (code: string, details?: IFSCEntry | null) => void;
}

function IFSCSelect({ value, disabled = false, onChange }: IFSCSelectProps) {
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

  const requestIdRef = useRef(0);

  const fetchIFSCDetails = async (ifscCode: string) => {
    const requestId = ++requestIdRef.current;
    try {
      setIsLoading(true);
      setApiError("");
      setResults([]);

      const list = await apiService.searchBankMasterByIfsc(ifscCode);
      if (requestId !== requestIdRef.current) return; // stale response

      if (!list.length) {
        throw new Error("No IFSC details found");
      }

      setResults(list.map(mapApiResponseToIFSCEntry));
      setIsOpen(true);
      setActiveIndex(0);
    } catch {
      if (requestId !== requestIdRef.current) return; // stale response
      setResults([]);
      setApiError("No matching IFSC code found");
    } finally {
      if (requestId === requestIdRef.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (disabled) return;

    const q = inputText.trim().toUpperCase();

    if (q.length <= 1) {
      setResults([]);
      setApiError("");
      return;
    }

    const timer = setTimeout(() => {
      fetchIFSCDetails(q);
    }, 400);

    return () => clearTimeout(timer);
  }, [inputText, disabled]);

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

    if (raw.length <= 1) {
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
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
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

      {isOpen && !disabled && (
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
            results.map((item, i) => (
              <li
                key={item.code}
                id={`${uid}-opt-${i}`}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                className={`${styles.ifscOption}${
                  i === activeIndex ? ` ${styles.ifscOptionActive}` : ""
                }`}
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
  disabled?: boolean;
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
  disabled = false,
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
              onChange={(e) =>
                onChange("accountNo", e.target.value.replace(/[^0-9]/g, ""))
              }
              disabled={disabled}
              maxLength={20}
              aria-invalid={errors.duplicateAccount}
              suppressHydrationWarning
            />

            <button
              type="button"
              className={styles.eyeBtn}
              onClick={onToggleShow}
              disabled={disabled}
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
              onChange={(e) =>
                onChange("reAccountNo", e.target.value.replace(/[^0-9]/g, ""))
              }
              onPaste={(e) => e.preventDefault()}
              disabled={disabled}
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
            disabled={disabled}
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
  const [isStageDataLocked, setIsStageDataLocked] = useState(false);

  const modalTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const getSelectedAccountTypesFromSession = (): SelectedAccountType[] => {
    if (typeof window === "undefined") return ["nre", "nro"];

    const rawSelectedAccountTypes = window.sessionStorage.getItem(
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    setSelectedAccountTypes(getSelectedAccountTypesFromSession());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const applicationId = window.sessionStorage.getItem("ApplicationId") || "";

    let cancelled = false;

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

    const cleanPresignedUrl = (url?: string) => {
      return String(url || "")
        .replace(/&amp;amp;amp;/g, "&")
        .replace(/&amp;amp;/g, "&")
        .replace(/&amp;/g, "&");
    };

    const getDocumentsFromResponse = (response: any): StageDocument[] => {
      if (Array.isArray(response?.documents)) return response.documents;
      if (Array.isArray(response?.data?.documents))
        return response.data.documents;

      return [];
    };

    const getBankRecordsFromResponse = (response: any): StageBankData[] => {
      const data = response?.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.bankDetails)) return data.bankDetails;
      if (Array.isArray(data?.bankDetail)) return data.bankDetail;
      if (Array.isArray(data?.banks)) return data.banks;
      if (data) return [data];

      return [];
    };

    const findDocumentForAccountType = (
      documents: StageDocument[],
      type: SelectedAccountType,
      fallbackDocumentId?: string,
    ) => {
      const byType = documents.find((doc) => {
        const documentType = String(doc.documentType || "").toLowerCase();

        if (type === "nro") {
          return documentType.includes("nro");
        }

        return documentType.includes("nre");
      });

      if (byType) return byType;

      return documents.find((doc) => {
        const docId = doc.documentID || doc.documentId || "";
        return !!fallbackDocumentId && docId === fallbackDocumentId;
      });
    };

    const findBankRecordForAccountType = (
      bankRecords: StageBankData[],
      type: SelectedAccountType,
    ) => {
      const exactRecord = bankRecords.find((record) => {
        const accountType = normalizeAccountType(record.accountType);
        return accountType === type;
      });

      if (exactRecord) return exactRecord;

      /*
        Backend currently returns only one data object even when session has
        both ["nro","nre"]. To keep both selected account sections locked and
        bound, use available bank data as fallback for the missing account type.
        Documents are still matched account-wise from the documents array.
      */
      return bankRecords[0];
    };

    const mapStageIfscDetails = (bankData: StageBankData): IFSCEntry => {
      return {
        code: bankData.ifscCode || "",
        branch:
          bankData.branchName ||
          bankData.branchaddress ||
          "Branch details not available",
        bankName: bankData.bankName || "",
        address: bankData.branchaddress || "",
        micrNo: bankData.micrcode || "",
        bbmCd: bankData.branchcode || "",
      };
    };

    const bindStageBankData = (
      bankData: StageBankData,
      type: SelectedAccountType,
      documents: StageDocument[],
    ) => {
      const matchedDocument = findDocumentForAccountType(
        documents,
        type,
        bankData.documentId,
      );

      const documentId =
        matchedDocument?.documentID ||
        matchedDocument?.documentId ||
        bankData.documentId ||
        "";

      const documentUrl = cleanPresignedUrl(matchedDocument?.presignedUrl);

      const mappedIfscDetails = mapStageIfscDetails(bankData);

      if (type === "nro") {
        setNroAccountNo(bankData.accountNumber || "");
        setNroReAccountNo(bankData.accountNumber || "");
        setNroIfsc(bankData.ifscCode || "");
        setNroIfscDetails(mappedIfscDetails);
        setNroStatementDocumentId(documentId);
        setNroStatementPreviewUrl(documentUrl);
      }

      if (type === "nre") {
        setNreAccountNo(bankData.accountNumber || "");
        setNreReAccountNo(bankData.accountNumber || "");
        setNreIfsc(bankData.ifscCode || "");
        setNreIfscDetails(mappedIfscDetails);
        setNreStatementDocumentId(documentId);
        setNreStatementPreviewUrl(documentUrl);
      }
    };

    const fetchBankStageData = async () => {
      showSpinner();

      try {
        const response: any = await getBankStageData(
          applicationId,
          hideSpinner,
        );

        if (cancelled) return;

        if (response?.status === true && response?.data) {
          const sessionAccountTypes = getSelectedAccountTypesFromSession();
          const documents = getDocumentsFromResponse(response);
          const bankRecords = getBankRecordsFromResponse(response);

          if (bankRecords.length > 0) {
            setSelectedAccountTypes(sessionAccountTypes);

            sessionAccountTypes.forEach((type) => {
              const bankRecord = findBankRecordForAccountType(
                bankRecords,
                type,
              );

              if (!bankRecord) return;

              bindStageBankData(bankRecord, type, documents);
            });

            setIsStageDataLocked(true);
          }
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

  const showNroSection = selectedAccountTypes.includes("nro");
  const showNreSection = selectedAccountTypes.includes("nre");
  const showBothSections = showNroSection && showNreSection;

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  };

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

  const uploadNroStatement = async (
    file: File,
    onProgress: (p: number) => void,
  ): Promise<void> => {
    if (isStageDataLocked) return;

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
    if (isStageDataLocked) return;

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
    if (isStageDataLocked) return;

    setNroStatementFiles(files);

    const hasSuccessFile = files.some((f) => f.status === "success");

    if (!hasSuccessFile) {
      setNroStatementDocumentId("");
    }
  };

  const handleNreFilesChange = (files: UploadedFile[]) => {
    if (isStageDataLocked) return;

    setNreStatementFiles(files);

    const hasSuccessFile = files.some((f) => f.status === "success");

    if (!hasSuccessFile) {
      setNreStatementDocumentId("");
    }
  };

  const submitManualBankDetails = async () => {
    if (isStageDataLocked) return;

    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });

      return;
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
            idempotencyKey: "",
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
            idempotencyKey: "",
          },
          hideSpinner,
        ),
      );
    }

    await Promise.all(requests);
  };

  const handleProceed = async () => {
    try {
      showSpinner();

      if (isStageDataLocked) {
        setTimeout(() => {
          router.push("/manualBankInfo");
          hideSpinner();
        }, 200);

        return;
      }

      setShowModal(true);

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
    if (isStageDataLocked) return;

    if (field === "accountNo") {
      setNroAccountNo(value);
    } else if (field === "reAccountNo") {
      setNroReAccountNo(value);
    } else {
      setNroIfsc(value);
      setNroIfscDetails(details || null);
    }
  };

  const handleNreChange = (
    field: "accountNo" | "reAccountNo" | "ifsc",
    value: string,
    details?: IFSCEntry | null,
  ) => {
    if (isStageDataLocked) return;

    if (field === "accountNo") {
      setNreAccountNo(value);
    } else if (field === "reAccountNo") {
      setNreReAccountNo(value);
    } else {
      setNreIfsc(value);
      setNreIfscDetails(details || null);
    }
  };

  const nroAccountMismatch =
    !isStageDataLocked &&
    showNroSection &&
    nroReAccountNo.length > 0 &&
    nroAccountNo !== nroReAccountNo;

  const nreAccountMismatch =
    !isStageDataLocked &&
    showNreSection &&
    nreReAccountNo.length > 0 &&
    nreAccountNo !== nreReAccountNo;

  const accountsAreDuplicate =
    !isStageDataLocked &&
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

  const isDisabled = isStageDataLocked
    ? false
    : isNroInvalid ||
      isNreInvalid ||
      accountsAreDuplicate ||
      (!showNroSection && !showNreSection);

  const renderNroSection = () => (
    <BankSection
      title="Enter NRO (Savings Account) details"
      uploadSlot={
        isStageDataLocked ? (
          <LockedStatementPreview
            title="Uploaded NRO Statement"
            documentUrl={nroStatementPreviewUrl}
          />
        ) : (
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
        )
      }
      accountNo={nroAccountNo}
      reAccountNo={nroReAccountNo}
      ifsc={nroIfsc}
      ifscDetails={nroIfscDetails}
      showAccount={nroShowAccount}
      disabled={isStageDataLocked}
      errors={{
        accountMismatch: nroAccountMismatch,
        duplicateAccount: accountsAreDuplicate,
      }}
      onChange={handleNroChange}
      onToggleShow={() => setNroShowAccount((v) => !v)}
    />
  );

  const renderNreSection = () => (
    <BankSection
      title="Enter Non PIS NRE (Savings Account) details"
      uploadSlot={
        isStageDataLocked ? (
          <LockedStatementPreview
            title="Uploaded Non PIS NRE Statement"
            documentUrl={nreStatementPreviewUrl}
          />
        ) : (
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
        )
      }
      accountNo={nreAccountNo}
      reAccountNo={nreReAccountNo}
      ifsc={nreIfsc}
      ifscDetails={nreIfscDetails}
      showAccount={nreShowAccount}
      disabled={isStageDataLocked}
      errors={{
        accountMismatch: nreAccountMismatch,
        duplicateAccount: accountsAreDuplicate,
      }}
      onChange={handleNreChange}
      onToggleShow={() => setNreShowAccount((v) => !v)}
    />
  );

  const renderNeedHelpBtn = () => (
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

      {showModal && (
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
              {publicPath("/verifying-animation.gif")}
              alt="" width={300}
              height={75}
              unoptimized className={styles.modalAnimation}
              aria-hidden="true"
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
