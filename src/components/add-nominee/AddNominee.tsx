"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import DateField from "@/components/date-field/DateField";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import { COUNTRIES as ALL_COUNTRIES } from "@/components/country-select/countries";
import styles from "./add-nominee.module.scss";

// AddNominee — multi-state nominee form
// Figma:
//   1. Initial form         (W 0:43193 / M 0:43036)
//   2. Address-not-same     (W 0:42679 / M 0:42516)
//   3. Nominee is Minor     (W 0:42255 / M 0:42090)
//   4. Multi-nominee adding (W 0:41612 / M 0:39685)
//   5. Summary list view    (W 0:44400 / M 0:39858)
//   6. Max reached          (W 0:41850)

const DESKTOP_MQ = "(min-width: 992px)";

const RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grand Son",
  "Grand Daughter",
  "Others",
];

// Document Master (nominee proof) — per spec.
const DOCUMENT_TYPE_OPTIONS = [
  "Passport",
  "Driving License",
  "Aadhaar",
];

// FATF-restricted countries (Status = N) excluded from the nominee country
// dropdown. Matched by ISO-2 so it's robust to display-name differences.
const FATF_RESTRICTED_ISO2 = new Set(["kp", "ir", "mm", "sy", "ye"]);
const COUNTRY_OPTIONS = ALL_COUNTRIES.filter((c) => !FATF_RESTRICTED_ISO2.has(c.iso2));

type PrintPref = "yes" | "no" | "";

interface Nominee {
  firstName: string;
  middleName: string;
  lastName: string;
  relationship: string;
  allocation: string;
  mobile: string;
  email: string;
  dob: string;
  sameAsApplicant: boolean;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  documentType: string;
  documentNumber: string;
  printPreference: PrintPref;
  encashPercentage: string;
  guardianFirstName: string;
  guardianMiddleName: string;
  guardianLastName: string;
  guardianRelationship: string;
  guardianAddressLine1: string;
  guardianAddressLine2: string;
  guardianAddressLine3: string;
  guardianCity: string;
  guardianState: string;
  guardianCountry: string;
  guardianPincode: string;
}

interface ApiGuardian {
  fullName: string;
  dateOfBirth: string;
  relationship: string;
  pan: string;
}

interface ApiNominee {
  fullName: string;
  dateOfBirth: string;
  mobile: string;
  email: string;
  relationship: string;
  percentageAllocation: number;
  addressMode: string;
  proofType: string;
  proofValue: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  nomNamePrint: string;
  guardian?: ApiGuardian;
}

const blankNominee: Nominee = {
  firstName: "",
  middleName: "",
  lastName: "",
  relationship: "",
  allocation: "100",
  mobile: "",
  email: "",
  dob: "",
  sameAsApplicant: true,
  addressLine1: "",
  addressLine2: "",
  addressLine3: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
  documentType: "",
  documentNumber: "",
  printPreference: "",
  encashPercentage: "",
  guardianFirstName: "",
  guardianMiddleName: "",
  guardianLastName: "",
  guardianRelationship: "",
  guardianAddressLine1: "",
  guardianAddressLine2: "",
  guardianAddressLine3: "",
  guardianCity: "",
  guardianState: "",
  guardianCountry: "",
  guardianPincode: "",
};

const strToDate = (s: string): Date | null => (s ? new Date(s) : null);
const dateToStr = (d: Date | null | undefined): string => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
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
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 6"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobBackChevron() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8L18.5 9.5L14.5 5.5L4 16V20Z"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6.5L17.5 10.5"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7H20"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10 11V17"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M14 11V17"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 7L6 20H18L19 7"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4H15V7"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusCircleIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="#dc3545"
        strokeWidth="1.5"
      />
      <path
        d="M7 12H17"
        stroke="#dc3545"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="2"
        y="2"
        width="16"
        height="16"
        rx="3"
        stroke="#280071"
        strokeWidth="1.5"
      />
      <path
        d="M10 6V14"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M6 10H14"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 7L6 10L11 4"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function AddNominee() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [view, setView] = useState<"form" | "summary">("form");
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [current, setCurrent] = useState<Nominee>({ ...blankNominee });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Nominee, string>>>(
    {},
  );

  // Pulled once on mount — used for "same as applicant" preview pill
  const [applicantAddress, setApplicantAddress] = useState("");

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    setIsRejectStatus(sessionStorage.getItem("RejectStatus") === "R");
    // Cached applicant address used in the preview pill when "same as applicant" is ticked
    // setApplicantAddress(
    //   sessionStorage.getItem("ApplicantAddress") ||
    //     "Sector 20 Anand Vihar Co-Operative Society, Borivali, Mumbai, Maharashtra 400703",
    // );
    //loadExistingNominees();
  }, []);

  // const loadExistingNominees = async () => {
  //   showSpinner();
  //   const reqData = {
  //     flag: "nominee",
  //     formnumber:
  //       typeof window !== "undefined"
  //         ? sessionStorage.getItem("FormNumber")
  //         : "",
  //   };
  //   try {
  //     const response = await apiService.postRequestNominee(
  //       "api/v1/nomineeservice/getnominee",
  //       reqData,
  //       hideSpinner,
  //     );
  //     if (
  //       response?.status === true &&
  //       Array.isArray(response.data) &&
  //       response.data.length
  //     ) {
  //       const restored: Nominee[] = response.data.map((n: any) => ({
  //         ...blankNominee,
  //         firstName: (n.NomineeName || "").split(" ")[0] || "",
  //         lastName: (n.NomineeName || "").split(" ").slice(1).join(" ") || "",
  //         relationship: n.Relation || "",
  //         allocation: String(n.Percentage || "100"),
  //         dob: n.DOB || "",
  //         addressLine1: n.Address || "",
  //       }));
  //       setNominees(restored);
  //       setView("summary");
  //     }
  //   } catch {
  //     /* ignore */
  //   } finally {
  //     hideSpinner();
  //   }
  // };

  const updateCurrent = <K extends keyof Nominee>(
    key: K,
    value: Nominee[K],
  ) => {
    setCurrent((prev) => ({ ...prev, [key]: value }));
    // Clear the error for this field as soon as the user edits it so they get
    // immediate "fix accepted" feedback. Full re-validation runs on save.
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const errCls = (key: keyof Nominee, isMobile = false) =>
    errors[key] ? (isMobile ? styles.mobInputErr : styles.inputErr) : "";

  const errMsg = (key: keyof Nominee) =>
    errors[key] ? <p className={styles.errorText}>{errors[key]}</p> : null;

  // Document number entry rules depend on the selected type:
  //   Aadhaar → exactly 4 digits (digits only, capped at 4)
  //   everything else → alphanumeric only, uppercased
  const sanitizeDocumentNumber = (value: string): string =>
    current.documentType === "Aadhaar"
      ? value.replace(/[^0-9]/g, "").slice(0, 4)
      : value.toUpperCase().replace(/[^A-Z0-9]/g, "");

  // Switching document type invalidates any number already typed (a PAN value
  // is not a valid Aadhaar value, etc.) — clear it so stale input can't linger.
  const changeDocumentType = (value: string) => {
    updateCurrent("documentType", value);
    updateCurrent("documentNumber", "");
  };

  // The first digit of an Indian mobile number must be 6-9 — strip any leading
  // 0-5 digits as the user types so a number starting with 0-5 can't be entered.
  const sanitizeMobile = (value: string): string =>
    value
      .replace(/[^0-9]/g, "")
      .replace(/^[0-5]+/, "")
      .slice(0, 10);

  const nomineeFullName = (n: Nominee) =>
    [n.firstName, n.middleName, n.lastName].filter(Boolean).join(" ").trim();

  // Total allocation across all saved nominees + the current one (excluding the
  // one being edited so it doesn't double-count).
  const totalAllocation = useMemo(() => {
    const others = nominees.reduce((sum, n, i) => {
      if (editingIndex !== null && i === editingIndex) return sum;
      return sum + (Number(n.allocation) || 0);
    }, 0);
    return others + (Number(current.allocation) || 0);
  }, [nominees, current.allocation, editingIndex]);

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

  const mapProofType = (documentType: string): string => {
    switch (documentType) {
      case "Aadhaar":
        return "Aadhaar";
      case "Passport":
        return "Passport";
      case "Driving License":
        return "DrivingLicense";
      default:
        return documentType;
    }
  };

  const mapNomineeToApiPayload = (n: Nominee): ApiNominee => {
    const apiNominee: ApiNominee = {
      fullName: nomineeFullName(n),
      dateOfBirth: n.dob,
      mobile: n.mobile,
      email: n.email,
      relationship: n.relationship,
      percentageAllocation: Number(n.allocation) || 0,
      addressMode: n.sameAsApplicant ? "SameAsApplicant" : "Manual",
      proofType: mapProofType(n.documentType),
      proofValue: n.documentNumber,
      addressLine1: n.sameAsApplicant ? "" : n.addressLine1,
      addressLine2: n.sameAsApplicant
        ? ""
        : [n.addressLine2, n.addressLine3].filter(Boolean).join(", "),
      city: n.sameAsApplicant ? "" : n.city,
      state: n.sameAsApplicant ? "" : n.state,
      pincode: n.sameAsApplicant ? "" : n.pincode,
      nomNamePrint: n.printPreference === "yes" ? "Yes" : "No",
    };

    return apiNominee;
  };

  const submitNomineeDetails = async () => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
    }

    const total = nominees.reduce(
      (sum, n) => sum + (Number(n.allocation) || 0),
      0,
    );

    if (total !== 100) {
      toast.warning("Total nominee allocation must equal 100%.");
      return null;
    }

    const payload = {
      nominees: nominees.map(mapNomineeToApiPayload),
      nomineeAdd: "Yes",
      isNominee: true,
      idempotencyKey: generateIdempotencyKey(),
    };

    return apiService.postNri(
      `applications/${applicationId}/nominee-details`,
      payload,
      hideSpinner,
    );
  };

  const validateAll = (): Partial<Record<keyof Nominee, string>> => {
    const e: Partial<Record<keyof Nominee, string>> = {};
    const nameRe = /^[a-zA-Z\s]+$/;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const mobileRe = /^[6-9]\d{9}$/;
    const pincodeRe = /^\d{6}$/;
    const alnumRe = /^[A-Za-z0-9]+$/;
    const aadhaarLast4Re = /^\d{4}$/;

    // ── Name fields — mandatory, alphabets only ─────────────────────────────
    if (!current.firstName.trim()) e.firstName = "Please enter nominee name.";
    else if (!nameRe.test(current.firstName.trim()))
      e.firstName = "Only alphabets are allowed in nominee name.";

    if (current.middleName.trim() && !nameRe.test(current.middleName.trim()))
      e.middleName = "Only alphabets are allowed in nominee name.";

    if (!current.lastName.trim()) e.lastName = "Please enter nominee name.";
    else if (!nameRe.test(current.lastName.trim()))
      e.lastName = "Only alphabets are allowed in nominee name.";

    // ── Relationship / Allocation ──────────────────────────────────────────
    if (!current.relationship) e.relationship = "Please select nominee relationship.";

    const allocNum = Number(current.allocation);
    if (!current.allocation || Number.isNaN(allocNum))
      e.allocation = "Allocation is required";
    else if (allocNum < 1 || allocNum > 100)
      e.allocation = "Must be between 1 and 100";
    else if (totalAllocation > 100)
      e.allocation = `Total across nominees exceeds 100% (currently ${totalAllocation}%)`;

    // ── Contact ────────────────────────────────────────────────────────────
    if (!current.mobile) e.mobile = "Mobile number is required";
    else if (!mobileRe.test(current.mobile))
      e.mobile = "Enter a valid 10-digit mobile number";

    if (!current.email.trim()) e.email = "Email is required";
    else if (!emailRe.test(current.email.trim()))
      e.email = "Enter a valid email address";

    // ── DOB — mandatory, valid past date ───────────────────────────────────
    if (!current.dob) e.dob = "Please select nominee date of birth.";
    else {
      const d = new Date(current.dob);
      if (Number.isNaN(d.getTime()) || d > new Date())
        e.dob = "Please select nominee date of birth.";
    }

    // ── Address (only when "same as applicant" is unchecked) ───────────────
    // Per spec the whole address block is mandatory; show one message on each
    // empty field. Country must be a non-FATF country (Status = Y).
    if (!current.sameAsApplicant) {
      const ADDR_MSG = "Please enter complete address.";
      if (!current.addressLine1.trim()) e.addressLine1 = ADDR_MSG;
      if (!current.addressLine2.trim()) e.addressLine2 = ADDR_MSG;
      if (!current.addressLine3.trim()) e.addressLine3 = ADDR_MSG;
      if (!current.city.trim()) e.city = ADDR_MSG;
      if (!current.country.trim()) e.country = ADDR_MSG;
      if (!current.pincode) e.pincode = ADDR_MSG;
      else if (!pincodeRe.test(current.pincode))
        e.pincode = "Enter a valid 6-digit pincode";
    }

    // ── Document type ──────────────────────────────────────────────────────
    if (!current.documentType)
      e.documentType = "Please select a valid Address Proof Document Type.";

    // ── Proof number — Aadhaar = exactly 4 digits; else alphanumeric ───────
    if (!current.documentNumber.trim())
      e.documentNumber = "Please enter Address Proof number";
    else {
      const docNum = current.documentNumber.trim().toUpperCase();
      if (current.documentType === "Aadhaar") {
        if (!aadhaarLast4Re.test(docNum))
          e.documentNumber = "Aadhaar proof number must be exactly 4 digits.";
      } else if (!alnumRe.test(docNum)) {
        e.documentNumber = "Please enter a valid alphanumeric Address Proof number.";
      }
    }

    // ── Print preference ───────────────────────────────────────────────────
    if (!current.printPreference) e.printPreference = "Please select Yes or No";

    return e;
  };

  const saveCurrentNominee = () => {
    const fieldErrors = validateAll();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const firstError = Object.values(fieldErrors)[0];
      if (firstError) toast.warning(firstError);
      return;
    }
    setNominees((prev) => {
      const next = [...prev];
      if (editingIndex !== null) next[editingIndex] = { ...current };
      else next.push({ ...current });
      return next;
    });
    setEditingIndex(null);
    setCurrent({ ...blankNominee });
    setErrors({});
    setView("summary");
  };

  const startAddAnother = () => {
    if (nominees.length >= 3) {
      toast.info("Maximum 3 nominees allowed.");
      return;
    }

    const usedAllocation = nominees.reduce(
      (sum, n) => sum + (Number(n.allocation) || 0),
      0,
    );

    const remaining = Math.max(100 - usedAllocation, 0);

    if (remaining <= 0) {
      toast.warning("Total nominee allocation is already 100%.");
      return;
    }

    setCurrent({ ...blankNominee, allocation: String(remaining) });
    setEditingIndex(null);
    setErrors({});
    setView("form");
  };

  const editNominee = (index: number) => {
    setCurrent({ ...nominees[index] });
    setEditingIndex(index);
    setErrors({});
    setView("form");
  };

  const removeNominee = (index: number) => {
    setNominees((prev) => prev.filter((_, i) => i !== index));
  };

  const removeCurrent = () => {
    // The minus icon on the in-form "Nominee N" header — discards the in-flight
    // form and returns to the summary if there are saved nominees.
    setCurrent({ ...blankNominee });
    setEditingIndex(null);
    setErrors({});
    if (nominees.length > 0) setView("summary");
  };

  const proceed = async () => {
    if (nominees.length === 0) {
      toast.warning("Please add at least one nominee.");
      return;
    }

    const total = nominees.reduce(
      (sum, n) => sum + (Number(n.allocation) || 0),
      0,
    );

    if (total !== 100) {
      toast.warning("Total nominee allocation must equal 100%.");
      return;
    }

    showSpinner();

    try {
      const response = await submitNomineeDetails();

      if (!response) {
        hideSpinner();
        return;
      }

      let route = "";

      try {
        const uiMetadata =
          typeof response?.uiMetadata === "string"
            ? JSON.parse(response.uiMetadata)
            : response?.uiMetadata || null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Nominee Route Error:", error);
      }

      if (route) {
        setTimeout(() => {
          router.push(`/${route}`);
          hideSpinner();
        }, 200);
        return;
      }

      toast.error("Next Route Not provided", {
        position: "bottom-center",
        autoClose: 3000,
      });

      hideSpinner();
    } catch (error) {
      hideSpinner();
      console.error("Nominee details submission failed:", error);
    }
  };

  const openFaq = () => router.push(buildFaqUrl(pathname || "/addNominee"));

  const goBack = () => {
    // Always return to the Add Nominee landing screen, regardless of how the
    // user arrived here (router.back() could land on an unrelated page).
    showSpinner();
    setTimeout(() => {
      router.push("/addNominee-landing");
      hideSpinner();
    }, 200);
  };

  // ── Shared UI fragments ───────────────────────────────────────────────────

  const radioGroup = (
    <div className={styles.radioGroup}>
      <p>
        I / We want the details of my / our nominee to be printed in the
        statement of holding or statement of account, provided to me/ us by the
        DP as follows; (please tick, as appropriate)
      </p>
      <p>Nomination</p>
      <div className={styles.radiosRow}>
        {(["yes", "no"] as PrintPref[]).map((value) => {
          const selected = current.printPreference === value;
          const label = value === "yes" ? "Yes" : "No";
          return (
            <label
              key={value}
              className={`${styles.radioPill}${selected ? " " + styles.radioPillSelected : ""}`}
            >
              <input
                type="radio"
                name="printPreference"
                value={value}
                checked={selected}
                onChange={() => updateCurrent("printPreference", value)}
                style={{ display: "none" }}
              />
              <span
                className={`${styles.radioOuter}${selected ? " " + styles.radioOuterSelected : ""}`}
              >
                {selected && <span className={styles.radioDot} />}
              </span>
              <span>{label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );

  const renderCheckbox = (field: "sameAsApplicant", label: string) => (
    <label className={styles.checkboxRow}>
      <input
        type="checkbox"
        checked={current[field]}
        onChange={(e) => updateCurrent(field, e.target.checked)}
        style={{ display: "none" }}
      />
      <span
        className={`${styles.checkbox}${current[field] ? " " + styles.checkboxChecked : ""}`}
      >
        {current[field] && <CheckIcon />}
      </span>
      <span className={styles.checkboxLabel}>{label}</span>
    </label>
  );

  const checkboxGroup = (
    <div className={styles.checkboxGroup}>
      {renderCheckbox(
        "sameAsApplicant",
        "Nominee address is same as applicant address",
      )}
    </div>
  );

  // ── Desktop layout ────────────────────────────────────────────────────────

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="Add Nominee"
        style={{ background: "#f8f8f8", minHeight: "calc(100vh - 90px)" }}
      />
    );
  }

  if (isDesktop) {
    const showCountHeader = nominees.length > 0 && view === "form";
    const nextNomineeLabel =
      editingIndex !== null
        ? `Nominee ${editingIndex + 1}`
        : `Nominee ${nominees.length + 1}`;

    return (
      <section
        className="pan_details_form"
        aria-label="Add Nominee"
        style={{
          background: "#f8f8f8",
          height: "calc(100vh - 90px)",
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div className={styles.deskCard}>
          <div className={styles.deskHeader}>
            {!isRejectStatus && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            )}
            <div className={styles.deskHeaderText}>
              <div className={styles.deskTitleRow}>
                <h5>Add Nominee</h5>
                <button
                  type="button"
                  className={styles.needHelpChip}
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              <p>You can add up to 3 nominees for your demat account.</p>
            </div>
          </div>

          <div className={styles.deskBody}>
            {/* data-lenis-prevent: opts the form out of the global Lenis smooth-scroll
                so wheel events on the inner scroll container aren't hijacked. */}
            <div className={styles.deskBodyScroll} data-lenis-prevent>
              {view === "summary" ? (
                <div className={styles.summaryList}>
                  {nominees.map((n, i) => (
                    <div key={i} className={styles.summaryItem}>
                      <div className={styles.summaryName}>
                        <p className={styles.name}>
                          {nomineeFullName(n) || `Nominee ${i + 1}`}
                        </p>
                        <p className={styles.allocation}>
                          (Allocation - {n.allocation}%)
                        </p>
                      </div>
                      <div className={styles.summaryActions}>
                        <button
                          type="button"
                          aria-label={`Edit nominee ${i + 1}`}
                          onClick={() => editNominee(i)}
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete nominee ${i + 1}`}
                          onClick={() => removeNominee(i)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                  {nominees.length < 3 && (
                    <button
                      type="button"
                      className={styles.addAnotherLink}
                      onClick={startAddAnother}
                    >
                      <PlusIcon />
                      <span>Add Another Nominee</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {showCountHeader && (
                    <div className={styles.countHeader}>
                      <h6>
                        You have added {nominees.length} nominee
                        {nominees.length > 1 ? "s" : ""}
                      </h6>
                      <div className={styles.countHeaderDivider} />
                      <div className={styles.nomineeBadgeRow}>
                        <p>{nextNomineeLabel}</p>
                        <button
                          type="button"
                          className={styles.removeBtn}
                          onClick={removeCurrent}
                          aria-label="Discard this nominee"
                        >
                          <MinusCircleIcon />
                        </button>
                      </div>
                    </div>
                  )}
                  {!showCountHeader && (
                    <p className={styles.nomineeTitle}>Nominee 1</p>
                  )}

                  {/* Full Name row */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Full Name</p>
                    <div className={styles.field}>
                      <div className={styles.fieldStack}>
                        <input
                          className={`${styles.inputHalf} ${errCls("firstName")}`}
                          placeholder="First Name"
                          value={current.firstName}
                          maxLength={50}
                          onChange={(e) =>
                            updateCurrent(
                              "firstName",
                              e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                            )
                          }
                        />
                        {errMsg("firstName")}
                      </div>
                      <div className={styles.fieldStack}>
                        <input
                          className={`${styles.inputHalf} ${errCls("middleName")}`}
                          placeholder="Middle Name (Optional)"
                          value={current.middleName}
                          maxLength={50}
                          onChange={(e) =>
                            updateCurrent(
                              "middleName",
                              e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                            )
                          }
                        />
                        {errMsg("middleName")}
                      </div>
                    </div>
                  </div>
                  <div className={styles.lastNameRow}>
                    <div className={styles.fieldStack} style={{ flex: "none" }}>
                      <input
                        className={`${styles.inputHalf} ${errCls("lastName")}`}
                        placeholder="Last Name"
                        value={current.lastName}
                        maxLength={50}
                        onChange={(e) =>
                          updateCurrent(
                            "lastName",
                            e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                          )
                        }
                      />
                      {errMsg("lastName")}
                    </div>
                  </div>

                  {/* Relationship */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Relationship</p>
                    <div className={styles.fieldStack}>
                      <select
                        className={`${styles.select} ${errCls("relationship")}`}
                        value={current.relationship}
                        onChange={(e) =>
                          updateCurrent("relationship", e.target.value)
                        }
                      >
                        <option value="">Select Relationship</option>
                        {RELATIONSHIP_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {errMsg("relationship")}
                    </div>
                  </div>

                  {/* Allocation */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Allocation</p>
                    <div className={styles.fieldStack}>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        className={`${styles.input} ${errCls("allocation")}`}
                        value={current.allocation}
                        onChange={(e) =>
                          updateCurrent(
                            "allocation",
                            e.target.value.replace(/[^0-9]/g, ""),
                          )
                        }
                      />
                      {errMsg("allocation")}
                    </div>
                  </div>

                  {/* Mobile */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Mobile Number</p>
                    <div className={styles.fieldStack}>
                      <input
                        className={`${styles.input} ${errCls("mobile")}`}
                        placeholder="Enter Mobile Number"
                        maxLength={10}
                        value={current.mobile}
                        onChange={(e) =>
                          updateCurrent(
                            "mobile",
                            sanitizeMobile(e.target.value),
                          )
                        }
                      />
                      {errMsg("mobile")}
                    </div>
                  </div>

                  {/* Email */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Email ID</p>
                    <div className={styles.fieldStack}>
                      <input
                        type="email"
                        className={`${styles.input} ${errCls("email")}`}
                        placeholder="Enter Email ID"
                        value={current.email}
                        onChange={(e) => updateCurrent("email", e.target.value)}
                      />
                      {errMsg("email")}
                    </div>
                  </div>

                  {/* DOB — matches UploadProcess Calendar pattern */}
                  <div className={styles.row}>
                    <label htmlFor="desk-nom-dob" className={styles.rowLabel}>
                      Date of Birth
                    </label>
                    <div className={styles.fieldStack}>
                      <div className={styles.deskCalendarWrap}>
                        <DateField
                          inputId="desk-nom-dob"
                          value={strToDate(current.dob)}
                          onChange={(d) => updateCurrent("dob", dateToStr(d))}
                          dateFormat="dd/mm/yy"
                          placeholder="DD/MM/YYYY"
                          showIcon
                          iconPos="right"
                          touchUI
                          panelClassName="p-prime-cal-sm"
                          className={`p-prime-cal${errors.dob ? " p-prime-cal-error" : ""}`}
                        />
                      </div>
                      {errMsg("dob")}
                    </div>
                  </div>

                  {/* Same as applicant */}
                  {checkboxGroup}

                  {/* Address — either preview or extra fields */}
                  {current.sameAsApplicant ? (
                    <div className={styles.addressPreview}>
                      <p>{applicantAddress}</p>
                    </div>
                  ) : (
                    <>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>
                          Address Line 1 &amp; 2
                        </p>
                        <div className={styles.field}>
                          <div className={styles.fieldStack}>
                            <input
                              className={`${styles.inputHalf} ${errCls("addressLine1")}`}
                              placeholder="Enter address line 1"
                              value={current.addressLine1}
                              onChange={(e) =>
                                updateCurrent("addressLine1", e.target.value)
                              }
                            />
                            {errMsg("addressLine1")}
                          </div>
                          <div className={styles.fieldStack}>
                            <input
                              className={`${styles.inputHalf} ${errCls("addressLine2")}`}
                              placeholder="Enter address line 2"
                              value={current.addressLine2}
                              onChange={(e) =>
                                updateCurrent("addressLine2", e.target.value)
                              }
                            />
                            {errMsg("addressLine2")}
                          </div>
                        </div>
                      </div>
                      <div className={styles.lastNameRow}>
                        <div className={styles.fieldStack} style={{ flex: "none" }}>
                          <input
                            className={`${styles.input} ${errCls("addressLine3")}`}
                            placeholder="Address line 3"
                            value={current.addressLine3}
                            onChange={(e) =>
                              updateCurrent("addressLine3", e.target.value)
                            }
                          />
                          {errMsg("addressLine3")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>City &amp; State</p>
                        <div className={styles.field}>
                          <div className={styles.fieldStack}>
                            <input
                              className={`${styles.inputHalf} ${errCls("city")}`}
                              placeholder="Enter city"
                              value={current.city}
                              onChange={(e) =>
                                updateCurrent("city", e.target.value)
                              }
                            />
                            {errMsg("city")}
                          </div>
                          <div className={styles.fieldStack}>
                            <input
                              className={`${styles.inputHalf} ${errCls("state")}`}
                              placeholder="Enter state"
                              value={current.state}
                              onChange={(e) =>
                                updateCurrent("state", e.target.value)
                              }
                            />
                            {errMsg("state")}
                          </div>
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Country</p>
                        <div className={styles.fieldStack}>
                          <select
                            className={`${styles.select} ${errCls("country")}`}
                            value={current.country}
                            onChange={(e) =>
                              updateCurrent("country", e.target.value)
                            }
                          >
                            <option value="">Select country</option>
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c.iso2} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                          {errMsg("country")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Pincode</p>
                        <div className={styles.fieldStack}>
                          <input
                            className={`${styles.input} ${errCls("pincode")}`}
                            placeholder="Enter pincode"
                            maxLength={6}
                            value={current.pincode}
                            onChange={(e) =>
                              updateCurrent(
                                "pincode",
                                e.target.value.replace(/[^0-9]/g, ""),
                              )
                            }
                          />
                          {errMsg("pincode")}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Document Type */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Document Type</p>
                    <div className={styles.fieldStack}>
                      <select
                        className={`${styles.select} ${errCls("documentType")}`}
                        value={current.documentType}
                        onChange={(e) => changeDocumentType(e.target.value)}
                      >
                        <option value="">Select</option>
                        {DOCUMENT_TYPE_OPTIONS.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                      {errMsg("documentType")}
                    </div>
                  </div>

                  {/* Document Number */}
                  <div className={styles.row}>
                    <p className={styles.rowLabel}>Document Number</p>
                    <div className={styles.fieldStack}>
                      <input
                        className={`${styles.input} ${errCls("documentNumber")}`}
                        placeholder={
                          current.documentType === "Aadhaar"
                            ? "Last 4 digits of Aadhaar"
                            : "Enter number"
                        }
                        inputMode={
                          current.documentType === "Aadhaar"
                            ? "numeric"
                            : "text"
                        }
                        maxLength={
                          current.documentType === "Aadhaar" ? 4 : undefined
                        }
                        value={current.documentNumber}
                        onChange={(e) =>
                          updateCurrent(
                            "documentNumber",
                            sanitizeDocumentNumber(e.target.value),
                          )
                        }
                      />
                      {errMsg("documentNumber")}
                    </div>
                  </div>

                  {/* Print preference radio */}
                  {radioGroup}
                  {errMsg("printPreference")}

                  {/* Add Another (in-form, only when not at max) */}
                  {!showCountHeader && nominees.length === 0 && (
                    <button
                      type="button"
                      className={styles.addAnotherLink}
                      onClick={saveCurrentNominee}
                    >
                      <PlusIcon />
                      <span>Add Another Nominee</span>
                    </button>
                  )}
                </>
              )}
            </div>

            <div className={styles.deskFooter}>
              <button
                type="button"
                className={styles.deskBtnFilled}
                disabled={view === "form" && !current.firstName.trim()}
                onClick={view === "form" ? saveCurrentNominee : proceed}
              >
                {view === "form" ? "Add Nominee" : "Proceed"}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Mobile layout ─────────────────────────────────────────────────────────

  const showCountHeader = nominees.length > 0 && view === "form";
  const nextNomineeLabel =
    editingIndex !== null
      ? `Nominee ${editingIndex + 1}`
      : `Nominee ${nominees.length + 1}`;

  return (
    <section
      className="pan_details_form"
      aria-label="Add Nominee"
      style={{
        background: "#f8f8f8",
        height: "calc(100vh - 90px)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div className={styles.mobGrayHeader}>
        {!isRejectStatus && (
          <div className={styles.mobBackRow}>
            <button
              type="button"
              className={styles.mobBackBtn}
              onClick={goBack}
              aria-label="Go back"
            >
              <MobBackChevron />
            </button>
          </div>
        )}
        <div className={styles.mobTitleBlock}>
          <div className={styles.mobTitleRow}>
            <p className={styles.mobTitle}>Add Nominee</p>
            <button
              type="button"
              className={styles.needHelpChip}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>
          <p className={styles.mobSubtitle}>
            You can add up to 3 nominees for your demat account.
          </p>
        </div>
      </div>

      <div className={styles.mobContentCard} data-lenis-prevent>
        {view === "summary" ? (
          <>
            {nominees.map((n, i) => (
              <div key={i} className={styles.mobSummaryItem}>
                <div className={styles.summaryName}>
                  <p className={styles.name}>
                    {nomineeFullName(n) || `Nominee ${i + 1}`}
                  </p>
                  <p className={styles.allocation}>
                    (Allocation - {n.allocation}%)
                  </p>
                </div>
                <div className={styles.summaryActions}>
                  <button
                    type="button"
                    aria-label={`Edit nominee ${i + 1}`}
                    onClick={() => editNominee(i)}
                  >
                    <PencilIcon />
                  </button>
                  <button
                    type="button"
                    aria-label={`Delete nominee ${i + 1}`}
                    onClick={() => removeNominee(i)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </div>
            ))}
            {nominees.length < 3 && (
              <button
                type="button"
                className={styles.addAnotherLink}
                onClick={startAddAnother}
              >
                <PlusIcon />
                <span>Add Another Nominee</span>
              </button>
            )}
          </>
        ) : (
          <>
            {showCountHeader && (
              <div className={styles.countHeader}>
                <h6>
                  You have added {nominees.length} nominee
                  {nominees.length > 1 ? "s" : ""}
                </h6>
                <div className={styles.countHeaderDivider} />
                <div className={styles.nomineeBadgeRow}>
                  <p>{nextNomineeLabel}</p>
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={removeCurrent}
                    aria-label="Discard this nominee"
                  >
                    <MinusCircleIcon />
                  </button>
                </div>
              </div>
            )}
            {!showCountHeader && (
              <p className={styles.nomineeTitle}>Nominee 1</p>
            )}

            <div className={styles.mobField}>
              <label className={styles.mobLabel}>First Name</label>
              <input
                className={`${styles.mobInput} ${errCls("firstName", true)}`}
                placeholder="Enter first name"
                value={current.firstName}
                maxLength={50}
                onChange={(e) =>
                  updateCurrent(
                    "firstName",
                    e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                  )
                }
              />
              {errMsg("firstName")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Middle Name (Optional)</label>
              <input
                className={`${styles.mobInput} ${errCls("middleName", true)}`}
                placeholder="Enter middle name"
                value={current.middleName}
                onChange={(e) =>
                  updateCurrent(
                    "middleName",
                    e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                  )
                }
              />
              {errMsg("middleName")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Last Name</label>
              <input
                className={`${styles.mobInput} ${errCls("lastName", true)}`}
                placeholder="Enter last name"
                value={current.lastName}
                onChange={(e) =>
                  updateCurrent(
                    "lastName",
                    e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                  )
                }
              />
              {errMsg("lastName")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Relationship</label>
              <select
                className={`${styles.mobSelect} ${errCls("relationship", true)}`}
                value={current.relationship}
                onChange={(e) => updateCurrent("relationship", e.target.value)}
              >
                <option value="">Select</option>
                {RELATIONSHIP_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {errMsg("relationship")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Allocation</label>
              <input
                type="number"
                min={1}
                max={100}
                className={`${styles.mobInput} ${errCls("allocation", true)}`}
                value={current.allocation}
                onChange={(e) =>
                  updateCurrent(
                    "allocation",
                    e.target.value.replace(/[^0-9]/g, ""),
                  )
                }
              />
              {errMsg("allocation")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Mobile Number</label>
              <input
                className={`${styles.mobInput} ${errCls("mobile", true)}`}
                placeholder="Enter Mobile Number"
                maxLength={10}
                value={current.mobile}
                onChange={(e) =>
                  updateCurrent("mobile", sanitizeMobile(e.target.value))
                }
              />
              {errMsg("mobile")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Email ID</label>
              <input
                type="email"
                className={`${styles.mobInput} ${errCls("email", true)}`}
                placeholder="Enter Email ID"
                value={current.email}
                onChange={(e) => updateCurrent("email", e.target.value)}
              />
              {errMsg("email")}
            </div>
            <div className={styles.mobField}>
              <label htmlFor="mob-nom-dob" className={styles.mobLabel}>
                Date of Birth
              </label>
              <DateField
                inputId="mob-nom-dob"
                value={strToDate(current.dob)}
                onChange={(d) => updateCurrent("dob", dateToStr(d))}
                dateFormat="dd/mm/yy"
                placeholder="DD/MM/YYYY"
                showIcon
                iconPos="right"
                touchUI
                panelClassName="p-prime-cal-sm"
                className={`p-prime-cal${errors.dob ? " p-prime-cal-error" : ""}`}
              />
              {errMsg("dob")}
            </div>

            {checkboxGroup}

            {current.sameAsApplicant ? (
              <div className={styles.addressPreview}>
                <p>{applicantAddress}</p>
              </div>
            ) : (
              <>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Address Line 1</label>
                  <input
                    className={`${styles.mobInput} ${errCls("addressLine1", true)}`}
                    placeholder="Enter address line 1"
                    value={current.addressLine1}
                    onChange={(e) =>
                      updateCurrent("addressLine1", e.target.value)
                    }
                  />
                  {errMsg("addressLine1")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Address Line 2</label>
                  <input
                    className={`${styles.mobInput} ${errCls("addressLine2", true)}`}
                    placeholder="Enter address line 2"
                    value={current.addressLine2}
                    onChange={(e) =>
                      updateCurrent("addressLine2", e.target.value)
                    }
                  />
                  {errMsg("addressLine2")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Address Line 3</label>
                  <input
                    className={`${styles.mobInput} ${errCls("addressLine3", true)}`}
                    placeholder="Address line 3"
                    value={current.addressLine3}
                    onChange={(e) =>
                      updateCurrent("addressLine3", e.target.value)
                    }
                  />
                  {errMsg("addressLine3")}
                </div>
                <div className={styles.mobFieldRow}>
                  <div className={styles.mobField}>
                    <label className={styles.mobLabel}>City</label>
                    <input
                      className={`${styles.mobInput} ${errCls("city", true)}`}
                      placeholder="Enter city"
                      value={current.city}
                      onChange={(e) => updateCurrent("city", e.target.value)}
                    />
                    {errMsg("city")}
                  </div>
                  <div className={styles.mobField}>
                    <label className={styles.mobLabel}>State</label>
                    <input
                      className={`${styles.mobInput} ${errCls("state", true)}`}
                      placeholder="Enter state"
                      value={current.state}
                      onChange={(e) => updateCurrent("state", e.target.value)}
                    />
                    {errMsg("state")}
                  </div>
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Country</label>
                  <select
                    className={`${styles.mobSelect} ${errCls("country", true)}`}
                    value={current.country}
                    onChange={(e) => updateCurrent("country", e.target.value)}
                  >
                    <option value="">Select country</option>
                    {COUNTRY_OPTIONS.map((c) => (
                      <option key={c.iso2} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {errMsg("country")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Pincode</label>
                  <input
                    className={`${styles.mobInput} ${errCls("pincode", true)}`}
                    placeholder="Enter pincode"
                    maxLength={6}
                    value={current.pincode}
                    onChange={(e) =>
                      updateCurrent(
                        "pincode",
                        e.target.value.replace(/[^0-9]/g, ""),
                      )
                    }
                  />
                  {errMsg("pincode")}
                </div>
              </>
            )}

            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Document Type</label>
              <select
                className={`${styles.mobSelect} ${errCls("documentType", true)}`}
                value={current.documentType}
                onChange={(e) => changeDocumentType(e.target.value)}
              >
                <option value="">Select</option>
                {DOCUMENT_TYPE_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
              {errMsg("documentType")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Document Number</label>
              <input
                className={`${styles.mobInput} ${errCls("documentNumber", true)}`}
                placeholder={
                  current.documentType === "Aadhaar"
                    ? "Last 4 digits of Aadhaar"
                    : "Enter number"
                }
                inputMode={
                  current.documentType === "Aadhaar" ? "numeric" : "text"
                }
                maxLength={current.documentType === "Aadhaar" ? 4 : undefined}
                value={current.documentNumber}
                onChange={(e) =>
                  updateCurrent(
                    "documentNumber",
                    sanitizeDocumentNumber(e.target.value),
                  )
                }
              />
              {errMsg("documentNumber")}
            </div>

            {radioGroup}
            {errMsg("printPreference")}
          </>
        )}
      </div>

      <div className={styles.mobBtnBar}>
        <button
          type="button"
          className={styles.mobBtnFilled}
          disabled={view === "form" && !current.firstName.trim()}
          onClick={view === "form" ? saveCurrentNominee : proceed}
        >
          {view === "form" ? "Add Nominee" : "Proceed"}
        </button>
      </div>
    </section>
  );
}
