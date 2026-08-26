"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import DateField from "@/components/date-field/DateField";
import styles from "./permanent-address.module.scss";
import uploadStyles from "@/components/oci/oci.module.scss";
import {
  FOREIGN_UPLOAD_TYPES,
  PERMANENT_UPLOAD_TYPES,
} from "@/constants/foreignUpload-type";
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

const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? "" : String(v);
};

const strToDate = (s: string): Date | null => (s ? new Date(s) : null);

// Convert Date | null → 'YYYY-MM-DD' string  (for state / API)
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

const DOCUMENT_TYPE_ENTRIES = Object.entries(PERMANENT_UPLOAD_TYPES) as [
  string,
  string,
][];

const proofTypeLabel = (key: string): string =>
  (PERMANENT_UPLOAD_TYPES as Record<string, string>)[key] ?? key;

const EXPIRY_DOCUMENT_TYPES = new Set<string>([
  "DrivingLicense",
  "PassportAddress",
]);
const hasExpiry = (key: string): boolean => EXPIRY_DOCUMENT_TYPES.has(key);

// Country list comes from the Country Master API (status = 'Y' only) via the
// useCountryNames hook.

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

// uiMetadata JSON → next route (e.g. '{"route":"esign"}' → '/esign').
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

// Info icon for the pincode hint (replaces an expired Figma asset URL).
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

export default function PermanentAddress() {
  const router = useRouter();
  const { names: countryNames } = useCountryNames();

  const indiaOptions = useMemo(() => {
    const matches = countryNames.filter(
      (c) => c.trim().toLowerCase() === "india",
    );
    return matches.length ? matches : ["India"];
  }, [countryNames]);

  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [expiryError, setExpiryError] = useState("");
  const [selCountry, setSelCountry] = useState("");
  const [addrLine1, setAddrLine1] = useState("");
  const [addrLine2, setAddrLine2] = useState("");
  const [addrLine3, setAddrLine3] = useState("");
  const [city, setCity] = useState("");
  const [addrState, setAddrState] = useState("");
  const [pincode, setPincode] = useState("");

  // Pincode is a 6-digit numeric PIN — strip non-digits and cap length at 6 so
  // the field can never hold more than 6 digits or any letters/symbols.
  const handlePincodeChange = (value: string) =>
    setPincode(value.replace(/\D/g, "").slice(0, 6));

  // Proof files (front + back), selected on this same page and submitted with
  // the address fields in one multipart request on Proceed.
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles, setBackFiles] = useState<UploadedFile[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Previously-uploaded proof documents seeded into the front/back cards on revisit.
  const [frontInitial, setFrontInitial] = useState<UploadedFile | null>(null);
  const [backInitial, setBackInitial] = useState<UploadedFile | null>(null);

  // Existing proof document ids captured from the saved stage's documents[]
  // (index 0 → front, 1 → back). Sent as Existing*DocumentId on a revisit when
  // the user hasn't re-picked that slot's file.
  const [frontDocumentId, setFrontDocumentId] = useState("");
  const [backDocumentId, setBackDocumentId] = useState("");

  // Reusable documents from earlier stages (e.g. PASSPORT) + a snapshot of the
  // user's own saved proof so doc-type switches can bind / restore correctly.
  const [reusableGroups, setReusableGroups] = useState<ReusableGroup[]>([]);
  const savedSnapshotRef = useRef<SavedProofSnapshot | null>(null);

  // Gate the form on the prefill (fields + document previews) so it never flashes
  // empty or half-bound; the global loader stays up until it settles.
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [prefillDone, setPrefillDone] = useState(false);

  // Prefill from the saved INDIANADDRESS stage (POST …/get/workflow/stagewisedata
  // { stagename: "INDIANADDRESS" }) so a revisit shows the previously-entered
  // address and proof document previews.
  useEffect(() => {
    showSpinner();
    const applicationId = getApplicationId();
    if (!applicationId) {
      setPrefillDone(true);
      return;
    }

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getPermanentAddressWorkflow(applicationId);
        if (!alive) return;

        // Capture reusable documents from earlier stages regardless of whether
        // this stage has saved data yet (first visit has data = null).
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
        if (str(d.state)) setAddrState(str(d.state));
        if (str(d.pincode)) setPincode(str(d.pincode));
        if (str(d.country)) setSelCountry(str(d.country));
        if (str(d.proofNumber)) setDocNumber(str(d.proofNumber));
        if (str(d.expiryDate)) setExpiryDate(str(d.expiryDate));

        const docs = Array.isArray(res?.documents)
          ? (res.documents as Record<string, unknown>[])
          : [];

        // Capture the saved proof document ids (index 0 → front, 1 → back) so a
        // revisit can re-submit them by id instead of re-uploading the bytes.
        const pickDocId = (
          doc: Record<string, unknown> | undefined,
        ): string => {
          const v = doc?.documentId ?? doc?.documentID ?? doc?.id;
          return v == null ? "" : String(v);
        };
        if (pickDocId(docs[0])) setFrontDocumentId(pickDocId(docs[0]));
        if (pickDocId(docs[1])) setBackDocumentId(pickDocId(docs[1]));

        // Document Type — prefer the saved proof's documentType, fall back to
        // data.proofType. Match against the enum keys AND display labels.
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

        const urls = docs.map((doc) => pickUrl(doc)).filter(Boolean);
        const [front, back] = await Promise.all([
          buildInitialFileFromUrl(urls[0] ?? "", "proof-document"),
          buildInitialFileFromUrl(urls[1] ?? "", "proof-document"),
        ]);
        if (!alive) return;
        if (front) setFrontInitial(front);
        if (back) setBackInitial(back);

        // Snapshot the user's own saved proof so re-selecting its Document Type
        // (after switching away) restores it instead of clearing the form.
        savedSnapshotRef.current = {
          docType: docTypeKey ?? '',
          docNumber: str(d.proofNumber),
          expiryDate: str(d.expiryDate).slice(0, 10),
          frontInitial: front ?? null,
          backInitial: back ?? null,
          frontDocumentId: pickDocId(docs[0]),
          backDocumentId: pickDocId(docs[1]),
        };
      } catch {
        // Non-fatal — the form just stays empty.
      } finally {
        if (alive) setPrefillDone(true);
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillDone) hideSpinner();
    return () => hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDone]);

  // Only India is allowed here. Default-select it once the option resolves, and
  // normalize an India-ish prefilled value (e.g. "INDIA") to the master's exact
  // spelling so the <select> matches an option. Never forces a non-India value.
  useEffect(() => {
    if (indiaOptions.length !== 1) return;
    const canonical = indiaOptions[0];
    const isIndiaish = selCountry.trim().toLowerCase() === "india";
    if (selCountry !== canonical && (!selCountry || isIndiaish)) {
      setSelCountry(canonical);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indiaOptions, selCountry]);

  // A freshly-picked file: a real File with bytes that isn't the byte-less
  // saved-document preview (those carry an id prefixed "saved-").
  const getFreshFile = (files: UploadedFile[]): File | null =>
    files.find(
      (f) =>
        f.file instanceof File && !f.id.startsWith("saved-") && f.file.size > 0,
    )?.file ?? null;

  // Whether the seeded saved-document preview is still shown for a slot. Removing
  // it (without picking a new file) makes the slot not-ready, forcing a re-pick.
  const hasSeeded = (files: UploadedFile[]): boolean =>
    files.some((f) => f.id.startsWith("saved-"));

  const freshFront = getFreshFile(frontFiles);
  const freshBack = getFreshFile(backFiles);

  // Per-slot readiness: a new file was picked, OR a saved document exists and its
  // preview is still shown (so it can be re-sent by id).
  const frontReady =
    freshFront !== null || (!!frontDocumentId && hasSeeded(frontFiles));
  const backReady =
    freshBack !== null || (!!backDocumentId && hasSeeded(backFiles));
  const filesReady = frontReady && backReady;

  // Display label for the selected document type, used in the upload section
  // titles ("Upload <Document> Front/Back").
  const docLabel = docType ? proofTypeLabel(docType) : "Document";

  // Expiry only applies to documents that have one (Driving License, Passport).
  const showExpiry = hasExpiry(docType);

  const minExpiryDate = useMemo(() => addMonthsClamped(new Date(), 3), []);
  const minExpiryStr = dateToStr(minExpiryDate);
  const minExpiryDisplay = minExpiryStr.split("-").reverse().join("/"); // DD/MM/YYYY

  const normalizeKey = (s: string): string => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  const reusableGroupFor = (docTypeKey: string): ReusableGroup | undefined => {
    if (!docTypeKey) return undefined;
    const key = normalizeKey(docTypeKey);
    const label = normalizeKey(proofTypeLabel(docTypeKey));
    return reusableGroups.find((g) => {
      const binds = (g.bindWhenProofTypeContains ?? []).map(normalizeKey);
      if (binds.includes(key) || binds.includes(label)) return true;
      const src = normalizeKey(g.sourceStage ?? '');
      return src !== '' && (src === key || src === label);
    });
  };

  // Bind a reusable group's proof number / expiry / front-back documents into
  // the form. Previews are seeded from the presigned URLs and the document ids
  // captured, so Proceed re-submits them by id (no re-upload needed).
  const bindReusableGroup = async (docTypeKey: string, group: ReusableGroup) => {
    setDocNumber(group.proofNumber ?? '');
    setExpiryDate(
      hasExpiry(docTypeKey) && group.expiryDate ? String(group.expiryDate).slice(0, 10) : '',
    );
    setExpiryError('');

    const docs = Array.isArray(group.documents) ? group.documents : [];
    const sideOf = (doc: ReusableDocEntry) => (doc.documentSide ?? '').toLowerCase();
    const front = docs.find((doc) => sideOf(doc) === 'front') ?? docs[0];
    const back = docs.find((doc) => sideOf(doc) === 'back') ?? docs[1];
    const idOf = (doc?: ReusableDocEntry) => String(doc?.documentID ?? doc?.documentId ?? '');
    const urlOf = (doc?: ReusableDocEntry) =>
      String(doc?.presignedUrl ?? doc?.preSignedUrl ?? doc?.url ?? '');

    setFrontDocumentId(idOf(front));
    setBackDocumentId(idOf(back));

    const [f, b] = await Promise.all([
      buildInitialFileFromUrl(urlOf(front), 'proof-front'),
      buildInitialFileFromUrl(urlOf(back), 'proof-back'),
    ]);
    setFrontInitial(f);
    setBackInitial(b);
  };

  // Restore the user's own saved proof captured on prefill.
  const restoreSavedSnapshot = (snap: SavedProofSnapshot) => {
    setDocNumber(snap.docNumber);
    setExpiryDate(hasExpiry(snap.docType) ? snap.expiryDate : '');
    setFrontDocumentId(snap.frontDocumentId);
    setBackDocumentId(snap.backDocumentId);
    setFrontInitial(snap.frontInitial);
    setBackInitial(snap.backInitial);
  };

  const clearProofData = () => {
    setDocNumber('');
    setExpiryDate('');
    setFrontDocumentId('');
    setBackDocumentId('');
    setFrontInitial(null);
    setBackInitial(null);
  };

  // Changing the Document Type:
  //  1. If a reusable group matches (e.g. Passport → sourceStage PASSPORT),
  //     bind its proof number / expiry / document previews.
  //  2. Else if it's the user's own saved proof type, restore that snapshot.
  //  3. Else clear the proof fields for a fresh entry.
  // Documents without an expiry also get any stale expiry value cleared.
  const handleDocTypeChange = (value: string) => {
    setDocType(value);
    if (!hasExpiry(value)) {
      setExpiryDate("");
      setExpiryError("");
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

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("INDIAN_ADDRESS", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  // Enabled only once every required field is filled. Address line 2 & 3 and
  // State are optional. Expiry is only required for documents that carry one.
  const isDisabled =
    !docType ||
    !docNumber.trim() ||
    (showExpiry && !expiryDate) ||
    !selCountry ||
    !addrLine1.trim() ||
    !city.trim() ||
    !/^\d{6}$/.test(pincode.trim());

  // Proceed is enabled once all fields are filled AND both proof files are
  // selected. It submits everything (fields + files) in one multipart request.
  const canSubmit = !isDisabled && filesReady && !submitting;

  const handleProceed = async () => {
    if (isDisabled) return;

    if (showExpiry) {
      if (!expiryDate) {
        setExpiryError("Please Select Expiry date");
        return;
      }
      if (expiryDate < minExpiryStr) {
        setExpiryError(
          `Document must be valid for at least 3 more months (on or after ${minExpiryDisplay})`,
        );
        return;
      }
    }
    setExpiryError("");

    // Each slot needs either a freshly-picked file or a still-shown saved proof.
    if (!frontReady || !backReady) return; // both proofs required

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error("Your session has expired, please start again.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiService.submitPermanentAddress(applicationId, {
        line1: addrLine1.trim(),
        line2: addrLine2.trim(),
        line3: addrLine3.trim(),
        city: city.trim(),
        State: addrState.trim(),
        Pincode: pincode.trim(),
        country: selCountry, // from the "Select Country" dropdown
        proofType: docType, // enum key, e.g. "ResidentPermitOrVisa"
        proofNumber: docNumber.trim(),
        expiryDate, // YYYY-MM-DD
        idempotencyKey: "",
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
  // No uploadFn: files are collected locally and submitted together on Proceed.
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
            <h1 className={styles.mobileTitle}>Enter Permanent Address</h1>
            <p className={styles.mobileSubtitle}>
              Enter your details manually and upload any document (front and
              back) for verification.
            </p>
          </div>
        </div>
      </div>

      {/* White card form */}
      <div className={styles.mobileCard} data-lenis-prevent>
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
          />
        </div>

        {/* Document Expiry Date — only for documents that carry an expiry */}
        {showExpiry && (
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-expiry">
              Document Expiry Date *
            </label>
            <DateField
              key={`mob-expiry-${docType}`}
              inputId="mob-expiry"
              value={strToDate(expiryDate)}
              onChange={(d) => {
                setExpiryDate(dateToStr(d));
                setExpiryError("");
              }}
              minDate={minExpiryDate}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              className={`p-prime-cal${expiryError ? " p-prime-cal-error" : ""}`}
            />
            {expiryError && (
              <p className={styles.fieldError} role="alert">
                {expiryError}
              </p>
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
            >
              <option value="" disabled>
                Select
              </option>
              {indiaOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <span className={styles.fieldSelectCaret}>
              <CaretDown />
            </span>
          </div>
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
          />
        </div>

        {/* Address Line 2 */}
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

        {/* Address Line 3 */}
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
            />
          </div>
          <div className={styles.mobileRowField}>
            <label className={styles.fieldLabel} htmlFor="mob-state">
              State (Optional)
            </label>
            <input
              id="mob-state"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter State"
              value={addrState}
              onChange={(e) => setAddrState(e.target.value)}
            />
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
            inputMode="numeric"
            maxLength={6}
            className={styles.fieldInput}
            placeholder="Enter pincode"
            value={pincode}
            onChange={(e) => handlePincodeChange(e.target.value)}
          />
          <div className={styles.pincodeHint}>
            {/* <InfoIcon color="#999999" /> */}
            <p className={styles.pincodeHintText}>
              In absence of PIN for permanent address, Enter pincode as
              &apos;111111&apos;.
            </p>
          </div>
        </div>

        {/* Document upload (front + back) */}
        <div className={styles.uploadGroup}>
          {frontSection}
          {backSection}
        </div>
      </div>

      {/* Fixed bottom — disabled until every field is filled and both files added */}
      <div className={styles.mobileProceedArea}>
        <LoadingButton
          type="button"
          className={`${styles.mobileProceedBtn}${!canSubmit ? ` ${styles.mobileProceedBtnDisabled}` : ""}`}
          onClick={handleProceed}
          disabled={!canSubmit}
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
            <h1 className={styles.desktopCardTitle}>Enter Permanent Address</h1>
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
            {/* Document Type */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Type *</p>
              <div className={styles.desktopSelectWrap}>
                <select
                  className={styles.deskSelect}
                  value={docType}
                  onChange={(e) => handleDocTypeChange(e.target.value)}
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

            {/* Document Number */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>Document Number *</p>
              <input
                type="text"
                className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                placeholder="Enter number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                aria-label="Document Number"
              />
            </div>

            {/* Document Expiry Date — only for documents that carry an expiry */}
            {showExpiry && (
              <>
                <div className={styles.desktopFieldRow}>
                  <p className={styles.desktopLabel}>Document Expiry Date *</p>
                  <div className={styles.deskCalendarWrap}>
                    <DateField
                      // Remount on document-type change so a programmatic expiry
                      // reset (binding a reused doc with an empty expiry) shows.
                      key={`desk-expiry-${docType}`}
                      inputId="desk-expiry"
                      value={strToDate(expiryDate)}
                      onChange={(d) => {
                        setExpiryDate(dateToStr(d));
                        setExpiryError("");
                      }}
                      minDate={minExpiryDate}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className={`p-prime-cal${expiryError ? " p-prime-cal-error" : ""}`}
                    />
                  </div>
                </div>
                {expiryError && (
                  <p className={styles.desktopFieldError} role="alert">
                    {expiryError}
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
                  aria-label="Select Country"
                >
                  <option value="" disabled>
                    Select
                  </option>
                  {indiaOptions.map((c) => (
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

            {/* Address Line 3 — offset, no label */}
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

            {/* City & State — inline */}
            <div className={styles.desktopFieldRow}>
              <p className={styles.desktopLabel}>City &amp; State *</p>
              <div className={styles.desktopInputPair}>
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  aria-label="City"
                />
                <input
                  type="text"
                  className={`${styles.deskInput} ${styles.desktopInputHalf}`}
                  placeholder="Enter state (optional)"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                  aria-label="State"
                />
              </div>
            </div>

            {/* Pincode + hint */}
            <div className={styles.fieldGroup}>
              <div className={styles.desktopFieldRow}>
                <p className={styles.desktopLabel}>Pincode *</p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className={`${styles.deskInput} ${styles.desktopInputSingle}`}
                  placeholder="Enter pincode"
                  value={pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  aria-label="Pincode"
                />
              </div>
              <div className={styles.desktopPincodeHint}>
                {/* <InfoIcon color="#3b4c72" /> */}
                <p className={styles.desktopPincodeHintText}>
                  In absence of PIN for permanent address, Enter pincode as
                  &apos;111111&apos;.
                </p>
              </div>
            </div>

            {/* Document upload (front + back) */}
            <div className={styles.uploadGroup}>
              {frontSection}
              {backSection}
            </div>
          </div>

          {/* Proceed — disabled until every field is filled and both files added */}
          <div className={styles.desktopProceedWrapper}>
            <LoadingButton
              type="button"
              className={`${styles.desktopProceedBtn}${!canSubmit ? ` ${styles.desktopProceedBtnDisabled}` : ""}`}
              onClick={handleProceed}
              disabled={!canSubmit}
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
