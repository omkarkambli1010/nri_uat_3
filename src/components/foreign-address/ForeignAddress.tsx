"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field/DateField";
import styles from "./foreign-address.module.scss";
import uploadStyles from "@/components/oci/oci.module.scss";
import { FOREIGN_UPLOAD_TYPES } from "@/constants/foreignUpload-type";
import LoadingButton from "@/components/ui/LoadingButton";
import { useCountryNames } from "@/components/country-select/useCountries";
import { useSpinner } from "@/components/spinner/Spinner";
import { FileUploadCard } from "@/components/file-upload/FileUploadCard";
import type { UploadedFile } from "@/components/file-upload/fileUpload.types";
import { buildInitialFileFromUrl } from "@/components/file-upload/buildInitialFile";
import apiService from "@/services/api.service";
import { toast } from "@/services/toast.service";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

const strToDate = (s: string): Date | null => (s ? new Date(s) : null);

const dateToStr = (d: Date | null | undefined): string => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const addMonthsClamped = (from: Date, months: number): Date => {
  const shifted = from.getMonth() + months;
  const year = from.getFullYear() + Math.floor(shifted / 12);
  const month = ((shifted % 12) + 12) % 12;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(from.getDate(), lastDayOfMonth));
};

const DOCUMENT_TYPE_ENTRIES = Object.entries(FOREIGN_UPLOAD_TYPES) as [
  string,
  string,
][];

const proofTypeLabel = (key: string): string =>
  (FOREIGN_UPLOAD_TYPES as Record<string, string>)[key] ?? key;
const OVD_DOCUMENT_TYPES = new Set<string>([
  "Pio",
  "Oci",
  "DrivingLicense",
  "PermanentResidentCard",
  "ForeignGovtIssuedIdentityCard",
  "ResidentPermitOrVisa",
  "IqamaOrNationalAddressCertificate",
]);

const isOvd = (key: string): boolean => OVD_DOCUMENT_TYPES.has(key);

// Pincode: 6 alphanumeric characters (letters and digits only - no spaces,
// hyphens or other special characters). Change {6} to {3,6} below if shorter
// codes should be accepted.
const POSTAL_RE = /^[A-Z0-9]{6}$/;
const PINCODE_MAX = 6;
const cleanPincode = (v: string) =>
  v.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, PINCODE_MAX);
const PROOF_NUMBER_RE = /^[A-Za-z0-9\s-]+$/;

// ── Upload constraints (front + back proof) ──────────────────────────────────
const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = "PDF, JPG, JPEG, HEIC & PNG";
const SIZE_ERR =
  "File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.";
const TYPE_ERR =
  "Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.";

const getApplicationId = (): string =>
  typeof window !== "undefined"
    ? (secureSessionService.getItem("ApplicationId") ?? "")
    : "";

const routeFromUiMetadata = (res: unknown): string | null => {
  const meta = (res ?? {}) as Record<string, unknown>;
  try {
    const ui =
      typeof meta.uiMetadata === "string"
        ? JSON.parse(meta.uiMetadata)
        : meta.uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, "")}` : null;
  } catch {
    return null;
  }
};

function CaretDown() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="#999"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon({ color = "#999999" }: { color?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="8" stroke={color} strokeWidth="1.4" />
      <path
        d="M10 9v4.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <circle cx="10" cy="6.5" r="0.9" fill={color} />
    </svg>
  );
}

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

type FieldKey =
  | "docType"
  | "docNumber"
  | "expiryDate"
  | "selCountry"
  | "addrLine1"
  | "city"
  | "addrState"
  | "pincode";

interface ReusableDocEntry {
  documentType?: string;
  documentID?: string;
  documentId?: string;
  presignedUrl?: string;
  preSignedUrl?: string;
  url?: string;
  documentSide?: string;
}
interface ReusableGroup {
  sourceStage?: string;
  bindWhenProofTypeContains?: string[];
  proofNumber?: string;
  expiryDate?: string | null;
  documents?: ReusableDocEntry[];
}

interface SavedProofSnapshot {
  docType: string;
  docNumber: string;
  expiryDate: string;
  frontInitial: UploadedFile | null;
  backInitial: UploadedFile | null;
  frontDocumentId: string;
  backDocumentId: string;
}

const COUNTRIES_TO_EXCLUDE = ["india"];

const normCountry = (v: string): string =>
  v.toLowerCase().replace(/[^a-z]/g, "");

const COUNTRY_ALIASES: Record<string, string> = {
  easttimor: "timorleste",
  timorleste: "timorleste",
  ivorycoast: "cotedivoire",
  cotedivoire: "cotedivoire",
  burma: "myanmar",
  myanmar: "myanmar",
  holland: "netherlands",
  netherlands: "netherlands",
  southkorea: "koreasouth",
  republicofkorea: "koreasouth",
  koreasouth: "koreasouth",
  northkorea: "koreanorth",
  koreanorth: "koreanorth",
  uae: "unitedarabemirates",
  unitedarabemirates: "unitedarabemirates",
  uk: "unitedkingdom",
  greatbritain: "unitedkingdom",
  unitedkingdom: "unitedkingdom",
  usa: "unitedstates",
  unitedstatesofamerica: "unitedstates",
  unitedstates: "unitedstates",
  czechia: "czechrepublic",
  czechrepublic: "czechrepublic",
  swaziland: "eswatini",
  eswatini: "eswatini",
  macedonia: "northmacedonia",
  northmacedonia: "northmacedonia",
  capeverde: "caboverde",
  caboverde: "caboverde",
};

const countryKey = (v: string): string => {
  const n = normCountry(v);
  return COUNTRY_ALIASES[n] ?? n;
};

const resolveCountry = (raw: string, list: string[]): string => {
  if (!raw) return "";
  const exact = list.find((c) => c === raw);
  if (exact) return exact;
  const key = countryKey(raw);
  return list.find((c) => countryKey(c) === key) ?? "";
};

export default function ForeignAddress() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const { names: countryNames, loading: countryLoading } = useCountryNames();

  // "India" is not a valid choice on the foreign address screen.
  const countryOptions = useMemo(
    () =>
      (countryNames ?? []).filter(
        (c) => !COUNTRIES_TO_EXCLUDE.includes(normCountry(c)),
      ),
    [countryNames],
  );

  // raw country string as received from the API, before list matching
  const rawCountryRef = useRef("");

  const [prefillDone, setPrefillDone] = useState(false);

  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [selCountry, setSelCountry] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrLine3, setAddrLine3] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [pincode, setPincode] = useState("");
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);

  const [frontDocumentId, setFrontDocumentId] = useState("");
  const [backDocumentId, setBackDocumentId] = useState("");

  const [reusableGroups, setReusableGroups] = useState<ReusableGroup[]>([]);
  const savedSnapshotRef = useRef<SavedProofSnapshot | null>(null);

  const getFreshFile = (files: UploadedFile[]): File | null =>
    files.find(
      (f) =>
        f.file instanceof File && !f.id.startsWith("saved-") && f.file.size > 0,
    )?.file ?? null;

  const hasSeeded = (files: UploadedFile[]): boolean =>
    files.some((f) => f.id.startsWith("saved-"));

  const freshFront = getFreshFile(frontFiles);
  const freshBack = getFreshFile(backFiles);

  const frontReady =
    freshFront !== null || (!!frontDocumentId && hasSeeded(frontFiles));
  const backReady =
    freshBack !== null || (!!backDocumentId && hasSeeded(backFiles));
  const filesReady = frontReady && backReady;

  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>(
    {},
  );

  const showExpiry = isOvd(docType);

  const minExpiryDate = useMemo(() => addMonthsClamped(new Date(), 3), []);
  const minExpiryStr = dateToStr(minExpiryDate);
  const minExpiryDisplay = minExpiryStr.split("-").reverse().join("/"); // DD/MM/YYYY

  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) {
      setPrefillDone(true);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getForeignAddressWorkflow(applicationId);
        if (!alive) return;

        setReusableGroups(
          Array.isArray(res?.reusableDocuments)
            ? (res.reusableDocuments as ReusableGroup[])
            : [],
        );

        const d = res?.data as Record<string, unknown> | undefined;
        if (!d) return;

        const str = (v: unknown): string => (v == null ? "" : String(v));
        if (str(d.line1)) setAddrLine1(str(d.line1));
        if (str(d.line2)) setAddrLine2(str(d.line2));
        if (str(d.line3)) setAddrLine3(str(d.line3));
        if (str(d.city)) setCity(str(d.city));
        if (str(d.stateProvince) || str(d.state))
          setAddrState(str(d.stateProvince) || str(d.state));
        if (str(d.postalCode) || str(d.pincode))
          setPincode(cleanPincode(str(d.postalCode) || str(d.pincode)));
        if (str(d.country)) {
          rawCountryRef.current = str(d.country);
          // re-resolved in the effect below once the country list has loaded
          setSelCountry(resolveCountry(str(d.country), countryOptions));
        }
        if (str(d.proofNumber)) setDocNumber(str(d.proofNumber));
        if (str(d.expiryDate)) setExpiryDate(str(d.expiryDate).slice(0, 10));
        const docs = Array.isArray(res?.documents)
          ? (res.documents as Record<string, unknown>[])
          : [];

        const pickDocId = (
          doc: Record<string, unknown> | undefined,
        ): string => {
          const v = doc?.documentId ?? doc?.documentID ?? doc?.id;
          return v == null ? "" : String(v);
        };
        if (pickDocId(docs[0])) setFrontDocumentId(pickDocId(docs[0]));
        if (pickDocId(docs[1])) setBackDocumentId(pickDocId(docs[1]));

        const matchDocType = (value: string): string | undefined => {
          const v = value.trim().toLowerCase();
          if (!v) return undefined;
          const hit = DOCUMENT_TYPE_ENTRIES.find(
            ([key, label]) =>
              key.toLowerCase() === v || label.toLowerCase() === v,
          );
          return hit?.[0];
        };
        const docTypeKey =
          matchDocType(str(docs[0]?.documentType)) ??
          matchDocType(str(d.proofType));
        if (docTypeKey) setDocType(docTypeKey);

        const urls = docs
          .map((doc) => str(doc.presignedUrl ?? doc.preSignedUrl ?? doc.url))
          .filter(Boolean);

        const [front, back] = await Promise.all([
          buildInitialFileFromUrl(urls[0] ?? "", "proof-document"),
          buildInitialFileFromUrl(urls[1] ?? "", "proof-document"),
        ]);
        if (alive) {
          if (front) setFrontInitial(front);
          if (back) setBackInitial(back);
          savedSnapshotRef.current = {
            docType: docTypeKey ?? "",
            docNumber: str(d.proofNumber),
            expiryDate: str(d.expiryDate).slice(0, 10),
            frontInitial: front ?? null,
            backInitial: back ?? null,
            frontDocumentId: pickDocId(docs[0]),
            backDocumentId: pickDocId(docs[1]),
          };
        }
      } catch {
      } finally {
        if (alive) setPrefillDone(true);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    showSpinner();
    return () => hideSpinner();
  }, []);

  useEffect(() => {
    if (prefillDone && !countryLoading) hideSpinner();
  }, [prefillDone, countryLoading]);

  // The country list loads asynchronously, so the saved value is matched again
  // as soon as the options are available. Without this the <select> silently
  // shows the first option in the list instead of the saved country.
  useEffect(() => {
    if (countryLoading || countryOptions.length === 0) return;
    const raw = rawCountryRef.current;
    if (!raw) return;
    if (countryOptions.includes(selCountry)) return;
    setSelCountry(resolveCountry(raw, countryOptions));
  }, [countryLoading, countryOptions, selCountry]);

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("FOREIGN_ADDRESS", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): Partial<Record<FieldKey, string>> => {
    const e: Partial<Record<FieldKey, string>> = {};

    if (!docType) {
      e.docType = "Please select a valid Address Proof Document Type.";
    }

    if (!docNumber.trim() || !PROOF_NUMBER_RE.test(docNumber.trim())) {
      e.docNumber = "Please enter Address Proof number";
    }

    if (showExpiry) {
      if (!expiryDate) {
        e.expiryDate = "Please Select Expiry date";
      } else if (expiryDate < minExpiryStr) {
        e.expiryDate = `Document must be valid for at least 3 more months (on or after ${minExpiryDisplay})`;
      }
    }

    if (!selCountry) {
      e.selCountry = "Please select a valid country.";
    }

    if (!addrLine1.trim()) {
      e.addrLine1 = "Address Line 1 is required.";
    }

    if (!city.trim()) {
      e.city = "City is required.";
    }

    if (!addrState.trim()) {
      e.addrState = "State is required.";
    }

    if (!pincode.trim() || !POSTAL_RE.test(pincode.trim().toUpperCase())) {
      e.pincode = "Please enter a valid 6-character pincode (letters and numbers only).";
    }

    return e;
  };

  const errors = validate();
  const isValid = Object.keys(errors).length === 0;

  // Show an error only once the field has been touched (blur) or a submit was
  // attempted (handleProceed marks every field touched).
  const errFor = (k: FieldKey): string | undefined =>
    touched[k] ? errors[k] : undefined;

  const markTouched = (k: FieldKey) => setTouched((t) => ({ ...t, [k]: true }));

  // Find the reusable group whose SOURCE STAGE matches the selected Document
  // Type. The reused data is the exact document uploaded on that stage (e.g.
  // sourceStage "OCI" = an OCI card), so it binds only when the user picks that
  // same type. Picking a different type (e.g. PIO) is a fresh entry, not a bind.
  const reusableGroupFor = (docTypeKey: string): ReusableGroup | undefined => {
    if (!docTypeKey) return undefined;
    const key = docTypeKey.toUpperCase();
    const label = proofTypeLabel(docTypeKey).toUpperCase();
    return reusableGroups.find((g) => {
      const src = (g.sourceStage ?? "").toUpperCase();
      return src !== "" && (src === key || src === label);
    });
  };

  // Bind a reusable group's proof number / expiry / front-back documents into
  // the form. Document previews are seeded from their presigned URLs and the ids
  // captured, so Proceed re-submits them by id (no re-upload needed).
  const bindReusableGroup = async (
    docTypeKey: string,
    group: ReusableGroup,
  ) => {
    setDocNumber(group.proofNumber ?? "");
    setExpiryDate(
      isOvd(docTypeKey) && group.expiryDate
        ? String(group.expiryDate).slice(0, 10)
        : "",
    );

    const docs = Array.isArray(group.documents) ? group.documents : [];
    const sideOf = (doc: ReusableDocEntry) =>
      (doc.documentSide ?? "").toLowerCase();
    const front = docs.find((doc) => sideOf(doc) === "front") ?? docs[0];
    const back = docs.find((doc) => sideOf(doc) === "back") ?? docs[1];
    const idOf = (doc?: ReusableDocEntry) =>
      String(doc?.documentID ?? doc?.documentId ?? "");
    const urlOf = (doc?: ReusableDocEntry) =>
      String(doc?.presignedUrl ?? doc?.preSignedUrl ?? doc?.url ?? "");

    setFrontDocumentId(idOf(front));
    setBackDocumentId(idOf(back));

    const [f, b] = await Promise.all([
      buildInitialFileFromUrl(urlOf(front), "oci-front"),
      buildInitialFileFromUrl(urlOf(back), "oci-back"),
    ]);
    setFrontInitial(f);
    setBackInitial(b);
  };

  // Restore the user's own saved proof captured on prefill.
  const restoreSavedSnapshot = (snap: SavedProofSnapshot) => {
    setDocNumber(snap.docNumber);
    setExpiryDate(isOvd(snap.docType) ? snap.expiryDate : "");
    setFrontDocumentId(snap.frontDocumentId);
    setBackDocumentId(snap.backDocumentId);
    setFrontInitial(snap.frontInitial);
    setBackInitial(snap.backInitial);
  };

  const clearProofData = () => {
    setDocNumber("");
    setExpiryDate("");
    setFrontDocumentId("");
    setBackDocumentId("");
    setFrontInitial(null);
    setBackInitial(null);
  };

  const handleDocTypeChange = (value: string) => {
    setDocType(value);
    if (!isOvd(value)) {
      setExpiryDate("");
      setTouched((t) => ({ ...t, expiryDate: false }));
    }

    const group = reusableGroupFor(value);
    if (group) {
      void bindReusableGroup(value, group);
      return;
    }

    const snap = savedSnapshotRef.current;
    if (snap && value && value === snap.docType) {
      restoreSavedSnapshot(snap);
      return;
    }

    clearProofData();
  };

  const docLabel = docType ? proofTypeLabel(docType) : "Document";

  const canSubmit = isValid && filesReady && !submitting;

  const handleProceed = async () => {
    if (submitting) return;

    setTouched({
      docType: true,
      docNumber: true,
      expiryDate: true,
      selCountry: true,
      addrLine1: true,
      city: true,
      addrState: true,
      pincode: true,
    });
    if (!isValid) {
      toast.error("Please fill all the required fields highlighted below.");
      return;
    }

    if (!frontReady && !backReady) {
      toast.error("Please upload the front and back of your document.");
      return;
    }
    if (!frontReady) {
      toast.error("Please upload the front of your document.");
      return;
    }
    if (!backReady) {
      toast.error("Please upload the back of your document.");
      return;
    }

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error("Your session has expired, please start again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.submitForeignAddress(applicationId, {
        line1: addrLine1.trim(),
        line2: addrLine2.trim(),
        line3: addrLine3.trim(),
        city: city.trim(),
        stateProvince: addrState.trim(),
        postalCode: pincode.trim(),
        country: selCountry, // from the "Select Country" dropdown
        proofType: docType, // enum key, e.g. "ResidentPermitOrVisa"
        proofNumber: docNumber.trim(),
        expiryDate, // YYYY-MM-DD (empty for non-OVD docs)
        // Per slot: send the freshly-picked file, otherwise re-use the saved
        // document by id (revisit without re-upload).
        frontFile: freshFront ?? undefined,
        backFile: freshBack ?? undefined,
        existingFrontDocumentId: freshFront ? undefined : frontDocumentId,
        existingBackDocumentId: freshBack ? undefined : backDocumentId,
      });

      // Navigate per uiMetadata route from the response, fall back to /esign.
      router.push(routeFromUiMetadata(res) ?? "/esign");
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  // ── Upload sections (front + back) — rendered below the fields ──────────────
  const frontSection = (
    <div className={uploadStyles.section}>
      <p className={uploadStyles.sectionTitle}>Upload {docLabel} Front</p>
      <FileUploadCard
        key={frontInitial?.id ?? "front-empty"}
        initialFiles={frontInitial ? [frontInitial] : undefined}
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setFrontFiles}
      />
    </div>
  );

  const backSection = (
    <div className={uploadStyles.section}>
      <p className={uploadStyles.sectionTitle}>Upload {docLabel} Back</p>
      <FileUploadCard
        key={backInitial?.id ?? "back-empty"}
        initialFiles={backInitial ? [backInitial] : undefined}
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setBackFiles}
      />
    </div>
  );

  // ── MOBILE ────────────────────────────────────────────────────────────────
  const mobileLayout = (
    <div className={styles.mobilePage}>
      {/* Gray header */}
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderInner}>
          <button
            type="button"
            className={styles.mobileBackBtn}
            onClick={goBack}
            aria-label="Go back"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M15 18l-6-6 6-6"
                stroke="#2b2b2b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>Enter Foreign Address</h1>
            <p className={styles.mobileSubtitle}>
              Enter your details manually and upload any document (front and
              back) for verification.
            </p>
          </div>
        </div>
      </div>

      {/* White card form */}
      <div className={styles.mobileCard} data-lenis-prevent>
        {/* BRD note — English translation required for non-English documents */}
        <p className={styles.translationNote}>
          Note: Please upload an English-translated copy for non-English documents.
        </p>

        {/* Document Type */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-doc-type">
            Document Type *
          </label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-doc-type"
              className={styles.fieldSelect}
              value={docType}
              onChange={(e) => handleDocTypeChange(e.target.value)}
              onBlur={() => markTouched("docType")}
            >
              <option value="" disabled>
                Select
              </option>
              {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            <span className={styles.fieldSelectCaret}>
              <CaretDown />
            </span>
          </div>
          {errFor("docType") && (
            <p className={styles.fieldError}>{errFor("docType")}</p>
          )}
        </div>

        {/* Document Number */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-doc-number">
            Document Number *
          </label>
          <input
            id="mob-doc-number"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter number"
            value={docNumber}
            onChange={(e) => setDocNumber(e.target.value)}
            onBlur={() => markTouched("docNumber")}
          />
          {errFor("docNumber") && (
            <p className={styles.fieldError}>{errFor("docNumber")}</p>
          )}
        </div>

        {/* Document Expiry Date — OVD documents only */}
        {showExpiry && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-expiry">
              Document Expiry Date *
            </label>
            <DateField
              // Remount when the document type changes so a programmatic expiry
              // reset (e.g. binding PIO/OCI whose reused expiry is empty) is
              // reflected — DateField otherwise ignores a value cleared to null.
              key={`mob-expiry-${docType}`}
              inputId="mob-expiry"
              value={strToDate(expiryDate)}
              onChange={(d) => setExpiryDate(dateToStr(d))}
              minDate={minExpiryDate}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              className="p-prime-cal"
            />
            {errFor("expiryDate") && (
              <p className={styles.fieldError}>{errFor("expiryDate")}</p>
            )}
          </div>
        )}

        {/* Select Country */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-sel-country">
            Select Country *
          </label>
          <div className={styles.fieldSelectWrap}>
            <select
              id="mob-sel-country"
              className={styles.fieldSelect}
              value={selCountry}
              onChange={(e) => setSelCountry(e.target.value)}
              onBlur={() => markTouched("selCountry")}
            >
              <option value="" disabled>
                Select
              </option>
              {countryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className={styles.fieldSelectCaret}>
              <CaretDown />
            </span>
          </div>
          {errFor("selCountry") && (
            <p className={styles.fieldError}>{errFor("selCountry")}</p>
          )}
        </div>

        {/* Address Line 1 */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr1">
            Address Line 1 *
          </label>
          <input
            id="mob-addr1"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 1"
            value={addrLine1}
            onChange={(e) => setAddrLine1(e.target.value.slice(0, 50))}
            onBlur={() => markTouched("addrLine1")}
          />
          {errFor("addrLine1") && (
            <p className={styles.fieldError}>{errFor("addrLine1")}</p>
          )}
        </div>

        {/* Address Line 2 — optional */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr2">
            Address Line 2
          </label>
          <input
            id="mob-addr2"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 2"
            value={addrLine2}
            onChange={(e) => setAddrLine2(e.target.value.slice(0, 50))}
          />
        </div>

        {/* Address Line 3 — optional */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-addr3">
            Address Line 3
          </label>
          <input
            id="mob-addr3"
            type="text"
            className={styles.fieldInput}
            placeholder="Enter address line 3"
            value={addrLine3}
            onChange={(e) => setAddrLine3(e.target.value.slice(0, 50))}
          />
        </div>

        {/* City + State — side by side, gap-24 */}
        <div className={styles.mobileRowGroup}>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-city">
              City *
            </label>
            <input
              id="mob-city"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onBlur={() => markTouched("city")}
            />
            {errFor("city") && (
              <p className={styles.fieldError}>{errFor("city")}</p>
            )}
          </div>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-state">
              State *
            </label>
            <input
              id="mob-state"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
              onBlur={() => markTouched("addrState")}
            />
            {errFor("addrState") && (
              <p className={styles.fieldError}>{errFor("addrState")}</p>
            )}
          </div>
        </div>

        {/* Pincode + hint */}
        <div className={styles.fieldGroup}>
          <label className={styles.fieldLabel} htmlFor="mob-pincode">
            Pincode *
          </label>
          <input
            id="mob-pincode"
            type="text"
            inputMode="text"
            autoComplete="postal-code"
            maxLength={PINCODE_MAX}
            className={styles.fieldInput}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => setPincode(cleanPincode(e.target.value))}
            onPaste={(e) => {
              e.preventDefault();
              setPincode(cleanPincode(e.clipboardData.getData("text")));
            }}
            onBlur={() => markTouched("pincode")}
          />
          {errFor("pincode") && (
            <p className={styles.fieldError}>{errFor("pincode")}</p>
          )}
          <div className={styles.pincodeHint}>
            {/* <InfoIcon color="#999999" /> */}
            <p className={styles.pincodeHintText}>
              In absence of PIN for foreign address, Enter pincode as
              &apos;111111&apos;.
            </p>
          </div>
        </div>

        {/* Document upload (front + back); saved doc preview sits inside front */}
        <div className={styles.uploadGroup}>
          {frontSection}
          {backSection}
        </div>
      </div>

      {/* Fixed bottom — disabled until every field is valid and both files added */}
      <div className={styles.mobileProceedArea}>
        <LoadingButton
          type="button"
          className={`${styles.mobileProceedBtn}${!canSubmit ? ` ${styles.mobileProceedBtnDisabled}` : ""}`}
          onClick={handleProceed}
          disabled={submitting}
          aria-disabled={!canSubmit}
        >
          {submitting ? "Submitting" : "Proceed"}
        </LoadingButton>
      </div>
    </div>
  );

  // ── DESKTOP ───────────────────────────────────────────────────────────────
  const desktopLayout = (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        {/* Header */}
        <div className={styles.desktopCardHeader}>
          <button
            type="button"
            className={styles.desktopBackBtn}
            onClick={goBack}
            aria-label="Go back"
          >
            <BackArrow />
          </button>
          <div className={styles.desktopTitleBlock}>
            <h1 className={styles.desktopCardTitle}>Enter Foreign Address</h1>
            <p className={styles.desktopCardSubtitle}>
              Enter your details manually and upload any document (front and
              back) for verification.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className={styles.desktopCardBody}>
          {/* data-lenis-prevent: let this inner area scroll natively on wheel
              (AppShell's Lenis smooth-scroll otherwise captures the wheel). */}
          <div className={styles.desktopFormArea} data-lenis-prevent>
            {/* BRD note — English translation required for non-English documents */}
            <p className={styles.translationNote}>
              Note: Please upload an English-translated copy for non-English documents.
            </p>

            {/* Document Type */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Type *</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={docType}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
                  onBlur={() => markTouched("docType")}
                  aria-label="Document Type"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {DOCUMENT_TYPE_ENTRIES.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
                <span className={styles.deskSelectCaret}>
                  <CaretDown />
                </span>
              </div>
            </div>
            {errFor("docType") && (
              <p className={styles.desktopFieldError}>{errFor("docType")}</p>
            )}

            {/* Document Number */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Number *</p>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Enter number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                onBlur={() => markTouched("docNumber")}
                aria-label="Document Number"
              />
            </div>
            {errFor("docNumber") && (
              <p className={styles.desktopFieldError}>{errFor("docNumber")}</p>
            )}

            {/* Document Expiry Date — OVD documents only */}
            {showExpiry && (
              <>
                <div className={styles.desktopFieldRow}>
                  <p className={styles.desktopLabel}>Document Expiry Date *</p>
                  <div className={styles.deskCalendarWrap}>
                    <DateField
                      // Remount on document-type change so a programmatic expiry
                      // reset (binding PIO/OCI with an empty reused expiry) shows.
                      key={`desk-expiry-${docType}`}
                      inputId="desk-expiry"
                      value={strToDate(expiryDate)}
                      onChange={(d) => setExpiryDate(dateToStr(d))}
                      minDate={minExpiryDate}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className="p-prime-cal"
                    />
                  </div>
                </div>
                {errFor("expiryDate") && (
                  <p className={styles.desktopFieldError}>
                    {errFor("expiryDate")}
                  </p>
                )}
              </>
            )}

            {/* Select Country */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Select Country *</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={selCountry}
                  onChange={(e) => setSelCountry(e.target.value)}
                  onBlur={() => markTouched("selCountry")}
                  aria-label="Select Country"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {countryOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <span className={styles.deskSelectCaret}>
                  <CaretDown />
                </span>
              </div>
            </div>
            {errFor("selCountry") && (
              <p className={styles.desktopFieldError}>{errFor("selCountry")}</p>
            )}

            {/* Address — Line 1 + Line 2 inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Address *</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 1"
                  value={addrLine1}
                  onChange={(e) => setAddrLine1(e.target.value.slice(0, 50))}
                  onBlur={() => markTouched("addrLine1")}
                  aria-label="Address Line 1"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter address line 2"
                  value={addrLine2}
                  onChange={(e) => setAddrLine2(e.target.value.slice(0, 50))}
                  aria-label="Address Line 2"
                />
              </div>
            </div>
            {errFor("addrLine1") && (
              <p className={styles.desktopFieldError}>{errFor("addrLine1")}</p>
            )}

            {/* Address Line 3 — offset, no label, optional */}
            <div className={styles.desktopAddrLine3Row}>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Address line 3"
                value={addrLine3}
                onChange={(e) => setAddrLine3(e.target.value.slice(0, 50))}
                aria-label="Address Line 3"
              />
            </div>

            {/* City & State — inline (two 212px inputs). Errors render in a
                sibling row that mirrors the input columns so each error sits
                under its own field. */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>City &amp; State *</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  onBlur={() => markTouched("city")}
                  aria-label="City"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter state"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  onBlur={() => markTouched("addrState")}
                  aria-label="State"
                />
              </div>
            </div>
            {(errFor("city") || errFor("addrState")) && (
              <div className={styles.desktopCityStateErrorRow}>
                <span className={styles.desktopHalfError}>{errFor("city") ?? ""}</span>
                <span className={styles.desktopHalfError}>{errFor("addrState") ?? ""}</span>
              </div>
            )}

            {/* Pincode + hint */}
            <div className={styles.fieldGroup}>
              <div className={styles.desktopFieldRow}>
                <p className={styles.desktopLabel}>Pincode *</p>
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="postal-code"
                  maxLength={PINCODE_MAX}
                  className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => setPincode(cleanPincode(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault();
                    setPincode(cleanPincode(e.clipboardData.getData("text")));
                  }}
                  onBlur={() => markTouched("pincode")}
                  aria-label="Pincode"
                />
              </div>
              {errFor("pincode") && (
                <p className={styles.desktopPincodeError}>
                  {errFor("pincode")}
                </p>
              )}
              <div className={styles.desktopPincodeHint}>
                {/* <InfoIcon color="#3b4c72" /> */}
                <p className={styles.desktopPincodeHintText}>
                  In absence of PIN for foreign address, Enter pincode as
                  &apos;111111&apos;.
                </p>
              </div>
            </div>

            {/* Document upload (front + back); saved doc preview sits inside front */}
            <div className={styles.uploadGroup}>
              {frontSection}
              {backSection}
            </div>
          </div>

          {/* Proceed — disabled until every field is valid and both files added */}
          <div className={styles.desktopProceedWrapper}>
            <LoadingButton
              type="button"
              className={`${styles.desktopProceedBtn}${!canSubmit ? ` ${styles.desktopProceedBtnDisabled}` : ""}`}
              onClick={handleProceed}
              disabled={submitting}
              aria-disabled={!canSubmit}
            >
              {submitting ? "Submitting" : "Proceed"}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
