/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import DateField from "@/components/date-field/DateField";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService, { CodeDisplayMaster } from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import { useCountries } from "@/components/country-select/useCountries";
import CountryCodeSelect from "@/components/country-select/CountryCodeSelect";
import styles from "./add-nominee.module.scss";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

// AddNominee — multi-state nominee form
// Figma:
//   1. Initial form         (W 0:43193 / M 0:43036)
//   2. Address-not-same     (W 0:42679 / M 0:42516)
//   3. Nominee is Minor     (W 0:42255 / M 0:42090)
//   4. Multi-nominee adding (W 0:41612 / M 0:39685)
//   5. Summary list view    (W 0:44400 / M 0:39858)
//   6. Max reached          (W 0:41850)

const DESKTOP_MQ = "(min-width: 992px)";
// BRD v1.2 removes nominee address capture. Existing code is retained below but disabled.
const SHOW_NOMINEE_ADDRESS = false;

const FALLBACK_RELATIONSHIPS: CodeDisplayMaster[] = [
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "GrandSon",
  "GrandDaughter",
  "Other",
].map((displayName) => ({
  code: displayName.replace(/\s/g, "").toUpperCase(),
  displayName,
}));
const FALLBACK_GUARDIAN_RELATIONSHIPS: CodeDisplayMaster[] = [
  { code: "FATHER", displayName: "Father" },
  { code: "MOTHER", displayName: "Mother" },
  { code: "LEGALGUARDIAN", displayName: "Legal Guardian" },
];
const FALLBACK_PROOFS: CodeDisplayMaster[] = [
  { code: "PASSPORT", displayName: "Passport" },
  { code: "DRIVINGLICENSE", displayName: "Driving License" },
  { code: "AADHAAR", displayName: "Aadhaar" },
];
const normalizeMasterValue = (items: CodeDisplayMaster[], value: string) => {
  const key = value.replace(/\s/g, "").toUpperCase();
  return (
    items.find(
      (x) =>
        x.code.replace(/\s/g, "").toUpperCase() === key ||
        x.displayName.replace(/\s/g, "").toUpperCase() === key,
    )?.code || value
  );
};
// Nominee country dropdown is sourced from the Country Master API; restricted
// (status = 'N') countries are filtered out by useCountries().selectable.

type PrintPref = "Name of the Nominee(s)" | "Nomination: Yes / No" | "";

interface Nominee {
  firstName: string;
  lastName: string;
  relationship: string;
  allocation: string;
  mobile: string;
  mobileCountryIso2: string;
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
  guardianLastName: string;
  guardianMobile: string;
  guardianMobileCountryIso2: string;
  guardianEmail: string;
  guardianDocumentType: string;
  guardianDocumentNumber: string;
  guardianDob: string;
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
  firstName: string;
  lastName: string;
  countryCode: string;
  mobile: string;
  email: string;
  relationship: string;
  proofType?: string;
  proofValue: string;
}

interface ApiNominee {
  firstName: string;
  lastName: string;
  isMinor: boolean;
  dateOfBirth: string;
  countryCode: string;
  mobile: string;
  email: string;
  relationship: string;
  percentageAllocation: number | "";
  proofType?: string;
  proofValue: string;
  nomNamePrint: string;
  guardian?: ApiGuardian;
}

type NullableApiGuardian = {
  [K in keyof ApiGuardian]: ApiGuardian[K] | null;
} & {
  fullName?: string | null;
  dateOfBirth?: string | null;
  pan?: string | null;
};

type NullableApiNominee = {
  [K in keyof ApiNominee]: K extends "guardian"
    ? NullableApiGuardian | null
    : ApiNominee[K] | null;
} & {
  fullName?: string | null;
  addressMode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressLine3?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
};

interface NomineeStageData {
  applicationId: string;
  isNominee: boolean;
  nomineeAdd: string;
  nominees?: NullableApiNominee[] | null;
}

interface NomineeStageResponse {
  status: boolean;
  applicationId: string;
  stagename: string;
  data: NomineeStageData | null;
}

const blankNominee: Nominee = {
  firstName: "",
  lastName: "",
  relationship: "",
  allocation: "100",
  mobile: "",
  mobileCountryIso2: "",
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
  guardianLastName: "",
  guardianMobile: "",
  guardianMobileCountryIso2: "",
  guardianEmail: "",
  guardianDocumentType: "",
  guardianDocumentNumber: "",
  guardianDob: "",
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

const computeAge = (dob: string): number | null => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
};
const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const isPanProof = (proofType: string): boolean => {
  const normalized = proofType.replace(/\s/g, "").toUpperCase();
  return normalized === "PAN" || normalized === "PANCARD";
};
const formatPan = (raw: string): string => {
  const value = raw.toUpperCase();
  const part1 = value.substring(0, 5).replace(/[^A-Z]/g, "");
  const part2 = value.substring(5, 9).replace(/\D/g, "");
  const part3 = value.substring(9, 10).replace(/[^A-Z]/g, "");
  return part1 + part2 + part3;
};
const getPanInputMode = (value: string): "text" | "numeric" =>
  value.length >= 5 && value.length < 9 ? "numeric" : "text";

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
  const nomineeDataLoaded = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const { selectable: COUNTRY_OPTIONS } = useCountries();
  const COUNTRY_CODE_OPTIONS = useMemo(
    () => [
      {
        iso2: "",
        name: "Select",
        countryCode: "",
        teleCode: "",
        dialCode: "",
        status: "Y",
      } as any,
      ...COUNTRY_OPTIONS,
    ],
    [COUNTRY_OPTIONS],
  );
  const resolveCountryIso2 = (
    countryCode: string | null | undefined,
  ): string => {
    if (!countryCode) return "";

    const rawTokens = String(countryCode)
      .trim()
      .split("/")
      .map((token) => token.trim())
      .filter(Boolean);

    const textTokens = new Set(rawTokens.map((token) => token.toUpperCase()));
    const numericTokens = new Set(
      rawTokens.map((token) => token.replace(/\D/g, "")).filter(Boolean),
    );

    const matchedCountry = COUNTRY_OPTIONS.find((country) => {
      const textValues = [
        country.iso2,
        (country as any).iso3,
        (country as any).countryIso3,
        (country as any).alpha2Code,
        (country as any).alpha3Code,
        country.countryCode,
        (country as any).teleCode,
        country.dialCode,
      ]
        .filter((value) => value !== null && value !== undefined)
        .map((value) => String(value).trim().toUpperCase())
        .filter(Boolean);

      const numericValues = textValues
        .map((value) => value.replace(/\D/g, ""))
        .filter(Boolean);

      return (
        textValues.some((value) => textTokens.has(value)) ||
        numericValues.some((value) => numericTokens.has(value))
      );
    });

    return matchedCountry?.iso2?.trim().toLowerCase() || "";
  };

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [view, setView] = useState<"form" | "summary">("form");
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [current, setCurrent] = useState<Nominee>({ ...blankNominee });
  const [nomineeRelationships, setNomineeRelationships] = useState(
    FALLBACK_RELATIONSHIPS,
  );
  const [guardianRelationships, setGuardianRelationships] = useState(
    FALLBACK_GUARDIAN_RELATIONSHIPS,
  );
  const [nomineeProofTypes, setNomineeProofTypes] = useState(FALLBACK_PROOFS);
  const [guardianProofTypes, setGuardianProofTypes] = useState(FALLBACK_PROOFS);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof Nominee, string>>>(
    {},
  );

  // Pulled once on mount — used for "same as applicant" preview pill
  const [applicantAddress, setApplicantAddress] = useState("");

  const mapProofTypeFromApi = (
    proofType: string | null | undefined,
  ): string => {
    return proofType === "DrivingLicense" ? "Driving License" : proofType || "";
  };

  const splitFullName = (fullName: string | null) => {
    const parts = (fullName || "").trim().split(/\s+/).filter(Boolean);

    return {
      firstName: parts[0] || "",
      //middleName: parts.length > 2 ? parts.slice(1, -1).join(" ") : "",
      lastName: parts.length > 1 ? parts[parts.length - 1] : "",
    };
  };

  const mapApiNomineeToForm = (n: NullableApiNominee): Nominee => {
    const splitName = splitFullName(n.fullName || "");
    const name = {
      firstName: n.firstName || splitName.firstName,
      lastName: n.lastName || splitName.lastName,
    };
    const splitGuardian = splitFullName(n.guardian?.fullName || "");
    const guardianName = {
      firstName: n.guardian?.firstName || splitGuardian.firstName,
      lastName: n.guardian?.lastName || splitGuardian.lastName,
    };
    const savedPrintPreference = n.nomNamePrint?.trim() || "";
    const printPreference: PrintPref =
      savedPrintPreference === "Name of the Nominee(s)" ||
      savedPrintPreference.toLowerCase() === "yes"
        ? "Name of the Nominee(s)"
        : savedPrintPreference === "Nomination: Yes / No" ||
            savedPrintPreference.toLowerCase() === "no"
          ? "Nomination: Yes / No"
          : "";

    return {
      ...blankNominee,
      ...name,
      relationship: n.relationship || "",
      allocation:
        n.percentageAllocation == null ? "" : String(n.percentageAllocation),
      mobile: n.mobile || "",
      mobileCountryIso2: resolveCountryIso2(n.countryCode),
      email: n.email || "",
      dob: n.dateOfBirth?.split("T")[0] || "",
      sameAsApplicant: n.addressMode === "SameAsApplicant",
      addressLine1: n.addressLine1 || "",
      addressLine2: n.addressLine2 || "",
      addressLine3: n.addressLine3 || "",
      city: n.city || "",
      state: n.state || "",
      country: n.country || "",
      pincode: n.pincode || "",
      documentType: mapProofTypeFromApi(n.proofType),
      documentNumber: n.proofType ? n.proofValue || "" : "",
      printPreference,
      guardianFirstName: guardianName.firstName,
      guardianLastName: guardianName.lastName,
      guardianMobile: n.guardian?.mobile || "",
      guardianMobileCountryIso2: resolveCountryIso2(n.guardian?.countryCode),
      guardianEmail: n.guardian?.email || "",
      guardianDocumentType: mapProofTypeFromApi(n.guardian?.proofType || null),
      guardianDocumentNumber: n.guardian?.proofType
        ? n.guardian?.proofValue || ""
        : "",
      guardianDob: n.guardian?.dateOfBirth?.split("T")[0] || "",
      guardianRelationship:
        n.guardian?.relationship === "Legal Guardian"
          ? "LegalGuardian"
          : n.guardian?.relationship || "",
    };
  };

  const getApplicationId = () => {
    return typeof window !== "undefined"
      ? secureSessionService.getItem("ApplicationId") || ""
      : "";
  };

  const generateIdempotencyKey = () => {
    return typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  };

  const loadExistingNominees = async () => {
    let nr = FALLBACK_RELATIONSHIPS,
      gr = FALLBACK_GUARDIAN_RELATIONSHIPS,
      np = FALLBACK_PROOFS,
      gp = FALLBACK_PROOFS;
    try {
      const values = await Promise.all([
        apiService.getNomineeRelationshipMaster(),
        apiService.getGuardianRelationshipMaster(),
        apiService.getNomineeProofTypeMaster(),
        apiService.getGuardianProofTypeMaster(),
      ]);
      nr = values[0];
      gr = values[1];
      np = values[2];
      gp = values[3];
      if (nr.length) setNomineeRelationships(nr);
      if (gr.length) setGuardianRelationships(gr);
      if (np.length) setNomineeProofTypes(np);
      if (gp.length) setGuardianProofTypes(gp);
    } catch (error) {
      console.error("Failed to load nominee masters:", error);
    }
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    showSpinner();

    try {
      const response: NomineeStageResponse = await apiService.postNri(
        `applications/${applicationId}/get/workflow/stagewisedata`,
        {
          stagename: "nominee",
          idempotencyKey: "",
        },
        hideSpinner,
      );

      if (!response?.status || !response.data) {
        setNominees([]);
        setCurrent({ ...blankNominee });
        setEditingIndex(null);
        setErrors({});
        setView("form");
        return;
      }

      const stageData = response.data;
      const apiNominees = stageData.nominees || [];

      const hasNominees =
        stageData.isNominee === true &&
        stageData.nomineeAdd?.toLowerCase() === "yes" &&
        apiNominees.length > 0;

      if (!hasNominees) {
        setNominees([]);
        setCurrent({ ...blankNominee });
        setEditingIndex(null);
        setErrors({});
        setView("form");
        return;
      }

      const restoredNominees = apiNominees
        .filter((nominee) =>
          Boolean(
            nominee.fullName?.trim() ||
            nominee.firstName?.trim() ||
            nominee.lastName?.trim(),
          ),
        )
        .slice(0, 3)
        .map(mapApiNomineeToForm)
        .map((x) => ({
          ...x,
          relationship: normalizeMasterValue(nr, x.relationship),
          guardianRelationship: normalizeMasterValue(
            gr,
            x.guardianRelationship,
          ),
          documentType: normalizeMasterValue(np, x.documentType),
          guardianDocumentType: normalizeMasterValue(
            gp,
            x.guardianDocumentType,
          ),
        }));

      const nomineesToRestore =
        restoredNominees.length === 1
          ? [{ ...restoredNominees[0], allocation: "100" }]
          : restoredNominees;
      setNominees(nomineesToRestore);
      setCurrent({ ...blankNominee });
      setEditingIndex(null);
      setErrors({});
      setView(nomineesToRestore.length > 0 ? "summary" : "form");
    } catch (error) {
      console.error("Failed to load nominee details:", error);

      // toast.error("Unable to load nominee details.", {
      //   position: "bottom-center",
      //   autoClose: 3000,
      // });

      setNominees([]);
      setCurrent({ ...blankNominee });
      setEditingIndex(null);
      setErrors({});
      setView("form");
    } finally {
      hideSpinner();
    }
  };

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const guardianMaxDate = new Date();
  guardianMaxDate.setFullYear(guardianMaxDate.getFullYear() - 18);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    setIsRejectStatus(secureSessionService.getItem("RejectStatus") === "R");

    // Country codes are restored through Country Master, so wait until its
    // options are available before loading the saved nominees.
    if (COUNTRY_OPTIONS.length === 0 || nomineeDataLoaded.current) return;

    nomineeDataLoaded.current = true;
    void loadExistingNominees();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [COUNTRY_OPTIONS.length]);

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
  const sanitizeDocumentNumber = (value: string): string => {
    if (!current.documentType) return "";

    if (current.documentType.toUpperCase() === "AADHAAR")
      return value.replace(/[^0-9]/g, "").slice(0, 4);
    if (isPanProof(current.documentType)) return formatPan(value);
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  };

  // Switching document type invalidates any number already typed (a PAN value
  // is not a valid Aadhaar value, etc.) — clear it so stale input can't linger.
  const sanitizeGuardianDocumentNumber = (value: string) => {
    if (current.guardianDocumentType.toUpperCase() === "AADHAAR")
      return value.replace(/[^0-9]/g, "").slice(0, 4);
    if (isPanProof(current.guardianDocumentType)) return formatPan(value);
    return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  };
  const changeDocumentType = (value: string) => {
    updateCurrent("documentType", value);
    updateCurrent("documentNumber", "");
  };

  const changeGuardianDocumentType = (value: string) => {
    updateCurrent("guardianDocumentType", value);
    updateCurrent("guardianDocumentNumber", "");
  };

  // Sanitize the typed mobile number for the currently-selected country.
  //   India → first digit must be 6-9 (strip leading 0-5), max 10 digits.
  //   Other → digits only, max 15 (E.164).
  const sanitizeMobileFor = (value: string, iso2: string): string => {
    const digits = value.replace(/[^0-9]/g, "");

    if (!iso2) {
      return digits.slice(0, 15);
    }

    return iso2 === "in"
      ? digits.replace(/^[0-5]+/, "").slice(0, 10)
      : digits.slice(0, 15);
  };

  const sanitizeMobile = (value: string): string =>
    sanitizeMobileFor(value, current.mobileCountryIso2);

  // Country-code change — re-clamp any already-typed number to the new
  // country's rules in the same update so the two stay consistent.
  const handleMobileCountryChange = (iso2: string) => {
    setCurrent((prev) => ({
      ...prev,
      mobileCountryIso2: iso2,
      mobile: sanitizeMobileFor(prev.mobile, iso2),
    }));

    setErrors((prev) => {
      if (!prev.mobile) return prev;
      const next = { ...prev };
      delete next.mobile;
      return next;
    });
  };

  const handleGuardianMobileCountryChange = (iso2: string) => {
    setCurrent((prev) => ({
      ...prev,
      guardianMobileCountryIso2: iso2,
      guardianMobile: sanitizeMobileFor(prev.guardianMobile, iso2),
    }));

    setErrors((prev) => {
      if (!prev.guardianMobile) return prev;
      const next = { ...prev };
      delete next.guardianMobile;
      return next;
    });
  };
  const isMinor = useMemo(() => {
    const age = computeAge(current.dob);
    return age !== null && age < 18;
  }, [current.dob]);

  const getCountryCode = (iso2: string): string => {
    if (!iso2) return "";

    return (
      COUNTRY_OPTIONS.find(
        (country) => country.iso2.toLowerCase() === iso2.toLowerCase(),
      )?.countryCode || iso2.toUpperCase()
    );
  };

  const nomineeFullName = (n: Nominee) =>
    [n.firstName, n.lastName].filter(Boolean).join(" ").trim();

  // Total allocation across all saved nominees + the current one (excluding the
  // one being edited so it doesn't double-count).
  const totalAllocation = useMemo(() => {
    const others = nominees.reduce((sum, n, i) => {
      if (editingIndex !== null && i === editingIndex) return sum;
      return sum + (Number(n.allocation) || 0);
    }, 0);
    return others + (Number(current.allocation) || 0);
  }, [nominees, current.allocation, editingIndex]);

  const mapProofType = (documentType: string): string => documentType;

  const mapNomineeToApiPayload = (n: Nominee): ApiNominee => {
    const age = computeAge(n.dob);
    const nomineeIsMinor = age !== null && age < 18;

    const apiNominee: ApiNominee = {
      firstName: n.firstName.trim(),
      lastName: n.lastName.trim(),
      isMinor: nomineeIsMinor,
      dateOfBirth: n.dob,
      countryCode: getCountryCode(n.mobileCountryIso2),
      mobile: n.mobile,
      // mobile: n.mobileCountryIso2 ? n.mobile : "",
      email: n.email,
      relationship: n.relationship,
      percentageAllocation:
        n.allocation.trim() === "" ? "" : Number(n.allocation),
      proofValue: n.documentType ? n.documentNumber : "",
      nomNamePrint: n.printPreference || "",
    };

    if (n.documentType) {
      apiNominee.proofType = mapProofType(n.documentType);
    }

    const hasGuardianDetails = [
      n.guardianFirstName,
      n.guardianLastName,
      n.guardianMobile,
      n.guardianEmail,
      n.guardianRelationship,
      n.guardianDocumentType,
      n.guardianDocumentNumber,
    ].some((value) => value.trim() !== "");

    if (nomineeIsMinor && hasGuardianDetails) {
      apiNominee.guardian = {
        firstName: n.guardianFirstName.trim(),
        lastName: n.guardianLastName.trim(),
        countryCode: getCountryCode(n.guardianMobileCountryIso2),
        mobile: n.guardianMobile,
        // mobile: n.guardianMobileCountryIso2 ? n.guardianMobile : "",
        email: n.guardianEmail,
        relationship: n.guardianRelationship,
        proofValue: n.guardianDocumentType ? n.guardianDocumentNumber : "",
      };

      if (n.guardianDocumentType) {
        apiNominee.guardian.proofType = mapProofType(n.guardianDocumentType);
      }
    }

    return apiNominee;
  };

  const allocationPattern = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/;

  const validateAllocations = (items: Nominee[]): Nominee[] => {
    if (items.length === 1) {
      return [{ ...items[0], allocation: "100" }];
    }

    const values = items.map((item) => item.allocation.trim());
    const allBlank = values.every((value) => value === "");
    const allFilled = values.every((value) => value !== "");

    if (allBlank) {
      return items;
    }

    if (!allFilled) {
      throw new Error(
        "Either enter allocation for all nominees or leave all allocations blank.",
      );
    }

    if (values.some((value) => !allocationPattern.test(value) || Number(value) < 0.01 )) {
      throw new Error(
        "Allocation must be between 0.01 and 100 with up to two decimal places.",
      );
    }

    const total = values.reduce(
      (sum, value) => sum + Math.round(Number(value) * 100),
      0,
    );

    if (total !== 10000) {
      throw new Error("Total nominee allocation must equal 100% only.");
    }

    return items;
  };

  const submitNomineeDetails = async () => {
    const applicationId = getApplicationId();

    if (!applicationId) {
      toast.error("Application ID not found.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return null;
    }

    let nomineesForPayload: Nominee[];
    try {
      nomineesForPayload = validateAllocations(nominees);
    } catch (error: any) {
      toast.warning(error?.message || "Invalid nominee allocation.");
      return null;
    }

    const payload = {
      nominees: nomineesForPayload.map(mapNomineeToApiPayload),
      nomineeAdd: "Yes",
      isNominee: true,
      idempotencyKey: "", //generateIdempotencyKey(),
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
    // const mobileRe = /^[6-9]\d{9}$/;
    const alnumRe = /^[A-Za-z0-9]+$/;
    const aadhaarLast4Re = /^\d{4}$/;

    if (!current.firstName.trim())
      e.firstName = "Please enter nominee first name.";
    else if (current.firstName.trim().length > 15)
      e.firstName = "Maximum 15 characters allowed.";
    else if (!nameRe.test(current.firstName.trim()))
      e.firstName = "Only alphabets are allowed.";

    if (!current.lastName.trim())
      e.lastName = "Please enter nominee last name.";
    else if (current.lastName.trim().length > 15)
      e.lastName = "Maximum 15 characters allowed.";
    else if (!nameRe.test(current.lastName.trim()))
      e.lastName = "Only alphabets are allowed.";
    if (!current.relationship)
      e.relationship = "Please select nominee relationship.";

    // if (current.mobile) {
    //   if (current.mobileCountryIso2 === "in" && !mobileRe.test(current.mobile))
    //     e.mobile = "Enter a valid 10-digit mobile number.";
    //   else if (
    //     current.mobileCountryIso2 !== "in" &&
    //     (current.mobile.length < 6 || current.mobile.length > 15)
    //   )
    //     e.mobile = "Enter a valid mobile number.";
    // }
    if (current.email.trim() && !emailRe.test(current.email.trim()))
      e.email = "Enter a valid email address.";

    // DOB is mandatory.
    if (!current.dob) {
      e.dob = "Please select nominee date of birth.";
    }

    if (current.dob) {
      const dob = new Date(current.dob);
      if (Number.isNaN(dob.getTime()) || dob > new Date())
        e.dob = "Please select a valid date of birth.";
    }

    const hasDocType = Boolean(current.documentType);
    const hasDocNo = Boolean(current.documentNumber.trim());
    if (hasDocType !== hasDocNo) {
      if (!hasDocType) e.documentType = "Select proof of identity type.";
      if (!hasDocNo) e.documentNumber = "Enter identity proof number.";
    }
    if (hasDocType && hasDocNo) {
      const value = current.documentNumber.trim().toUpperCase();
      if (
        current.documentType.toUpperCase() === "AADHAAR" &&
        !aadhaarLast4Re.test(value)
      )
        e.documentNumber = "Aadhaar proof number must be exactly 4 digits.";
      else if (isPanProof(current.documentType) && !PAN_PATTERN.test(value))
        e.documentNumber = "Please enter a valid PAN in AAAAA1234A format.";
      else if (isPanProof(current.documentType) && value[3] !== "P")
        e.documentNumber = "Only personal PAN numbers are accepted.";
      else if (
        current.documentType.toUpperCase() !== "AADHAAR" &&
        !isPanProof(current.documentType) &&
        !alnumRe.test(value)
      )
        e.documentNumber = "Enter a valid alphanumeric identity proof number.";
    }
    if (!current.printPreference)
      e.printPreference = "Please select a nominee printing preference.";

    // Guardian fields are optional and apply only when the optional nominee DOB indicates age below 18.
    if (isMinor) {
      if (current.guardianFirstName.trim().length > 15)
        e.guardianFirstName = "Maximum 15 characters allowed.";
      if (current.guardianLastName.trim().length > 15)
        e.guardianLastName = "Maximum 15 characters allowed.";
      if (
        current.guardianFirstName.trim() &&
        !nameRe.test(current.guardianFirstName.trim())
      )
        e.guardianFirstName = "Only alphabets are allowed.";
      if (
        current.guardianLastName.trim() &&
        !nameRe.test(current.guardianLastName.trim())
      )
        e.guardianLastName = "Only alphabets are allowed.";
      // if (current.guardianMobile) {
      //   if (
      //     current.guardianMobileCountryIso2 === "in" &&
      //     !mobileRe.test(current.guardianMobile)
      //   )
      //     e.guardianMobile = "Enter a valid 10-digit guardian mobile number.";
      //   else if (
      //     current.guardianMobileCountryIso2 !== "in" &&
      //     (current.guardianMobile.length < 6 ||
      //       current.guardianMobile.length > 15)
      //   )
      //     e.guardianMobile = "Enter a valid guardian mobile number.";
      // }
      if (
        current.guardianEmail.trim() &&
        !emailRe.test(current.guardianEmail.trim())
      )
        e.guardianEmail = "Enter a valid guardian email address.";
      const hasGuardianDocType = Boolean(current.guardianDocumentType);
      const hasGuardianDocNo = Boolean(current.guardianDocumentNumber.trim());
      if (hasGuardianDocType !== hasGuardianDocNo) {
        if (!hasGuardianDocType)
          e.guardianDocumentType = "Select guardian proof of identity type.";
        if (!hasGuardianDocNo)
          e.guardianDocumentNumber = "Enter guardian identity proof number.";
      }
      if (
        hasGuardianDocType &&
        hasGuardianDocNo &&
        current.guardianDocumentType.toUpperCase() === "AADHAAR" &&
        !aadhaarLast4Re.test(current.guardianDocumentNumber)
      )
        e.guardianDocumentNumber =
          "Guardian Aadhaar proof number must be exactly 4 digits.";
      else if (
        hasGuardianDocType &&
        hasGuardianDocNo &&
        isPanProof(current.guardianDocumentType) &&
        !PAN_PATTERN.test(current.guardianDocumentNumber.toUpperCase())
      )
        e.guardianDocumentNumber =
          "Please enter a valid guardian PAN in AAAAA1234A format.";
      else if (
        hasGuardianDocType &&
        hasGuardianDocNo &&
        isPanProof(current.guardianDocumentType) &&
        current.guardianDocumentNumber.toUpperCase()[3] !== "P"
      )
        e.guardianDocumentNumber =
          "Only personal guardian PAN numbers are accepted.";
    }
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
      const isOnlyNominee =
        (editingIndex === null && next.length === 0) ||
        (editingIndex !== null && next.length === 1);
      const nomineeToSave = isOnlyNominee
        ? { ...current, allocation: "100" }
        : { ...current };
      if (editingIndex !== null) next[editingIndex] = nomineeToSave;
      else next.push(nomineeToSave);
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
    setNominees((prev) => {
      if (prev.length === 1) {
        return prev.map((nominee) => ({
          ...nominee,

          allocation: "",
        }));
      }

      return prev;
    });
    setCurrent({
      ...blankNominee,

      allocation: "",
    });
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
    setNominees((prev) => {
      const remaining = prev.filter((_, i) => i !== index);
      return remaining.length === 1
        ? [{ ...remaining[0], allocation: "100" }]
        : remaining;
    });
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

    try {
      validateAllocations(nominees);
    } catch (error: any) {
      toast.warning(error?.message || "Invalid nominee allocation.");
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

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  };

  // const goBack = () => {
  //   // Always return to the Add Nominee landing screen, regardless of how the
  //   // user arrived here (router.back() could land on an unrelated page).
  //   showSpinner();
  //   setTimeout(() => {
  //     // router.push("/addNominee-landing");
  //     router.push("/visa");
  //     hideSpinner();
  //   }, 200);
  // };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("NOMINEE_DETAILS", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  // ── Shared UI fragments ───────────────────────────────────────────────────

  // const radioGroup = (
  //   <div className={styles.radioGroup}>
  //     <p>
  //       I / We want the details of my / our nominee to be printed in the
  //       statement of holding or statement of account, provided to me/ us by the
  //       DP as follows; (please tick, as appropriate)
  //     </p>
  //     <div
  //       className={styles.radiosRow}
  //       role="radiogroup"
  //       aria-label="Nominee printing preference"
  //     >
  //       {(["Name of the Nominee(S)", "Nomination: Yes /No"] as PrintPref[]).map(
  //         (value) => (
  //           <label key={value}>
  //             <input
  //               type="radio"
  //               name="printPreference"
  //               value={value}
  //               checked={current.printPreference === value}
  //               onChange={() => updateCurrent("printPreference", value)}
  //             />
  //             <span>{value}</span>
  //           </label>
  //         ),
  //       )}
  //     </div>
  //   </div>
  // );
  const radioGroup = (
    <div className={styles.radioGroup}>
      <p>
        I / We want the details of my / our nominee to be printed in the
        statement of holding or statement of account, provided to me/ us by the
        DP as follows; (please select, as appropriate)
      </p>
      <div
        className={styles.radiosRow}
        role="radiogroup"
        aria-label="Nominee printing preference"
      >
        {(
          ["Name of the Nominee(s)", "Nomination: Yes / No"] as PrintPref[]
        ).map((value) => {
          const selected = current.printPreference === value;
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
              <span>{value}</span>
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
                          maxLength={15}
                          onChange={(e) =>
                            updateCurrent(
                              "firstName",
                              e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                            )
                          }
                        />
                        {errMsg("firstName")}
                      </div>
                      {/* <div className={styles.fieldStack}>
                        <input
                          className={`${styles.inputHalf} ${errCls("middleName")}`}
                          placeholder="Middle Name (Optional)"
                          value={current.middleName}
                          maxLength={15}
                          onChange={(e) =>
                            updateCurrent(
                              "middleName",
                              e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                            )
                          }
                        />
                        {errMsg("middleName")}
                      </div> */}
                    </div>
                    {/* <div className={styles.lastNameRow}> */}
                    <div className={styles.fieldStack}>
                      <input
                        className={`${styles.inputHalf} ${errCls("lastName")}`}
                        placeholder="Last Name"
                        value={current.lastName}
                        maxLength={15}
                        onChange={(e) =>
                          updateCurrent(
                            "lastName",
                            e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                          )
                        }
                      />
                      {errMsg("lastName")}
                    </div>
                    {/* </div> */}
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
                        {nomineeRelationships.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.displayName}
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
                        type="text"
                        inputMode="decimal"
                        disabled={
                          (nominees.length === 0 && editingIndex === null) ||
                          (nominees.length === 1 && editingIndex !== null)
                        }
                        className={`${styles.input} ${errCls("allocation")}`}
                        value={current.allocation}
                        onChange={(e) =>
                          updateCurrent(
                            "allocation",
                            /^\d{0,3}(?:\.\d{0,2})?$/.test(e.target.value)
                              ? e.target.value
                              : current.allocation,
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
                      <div className={styles.phoneRow}>
                        <div className={styles.codeSelect}>
                          <CountryCodeSelect
                            countries={COUNTRY_CODE_OPTIONS}
                            value={current.mobileCountryIso2}
                            onChange={handleMobileCountryChange}
                          />
                        </div>
                        <input
                          className={`${styles.input} ${errCls("mobile")}`}
                          placeholder="Enter Mobile Number"
                          inputMode="numeric"
                          maxLength={
                            current.mobileCountryIso2 === "in" ? 10 : 15
                          }
                          value={current.mobile}
                          onChange={(e) =>
                            updateCurrent(
                              "mobile",
                              sanitizeMobile(e.target.value),
                            )
                          }
                        />
                      </div>
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
                          maxDate={new Date()}
                        />
                      </div>
                      {errMsg("dob")}
                    </div>
                  </div>

                  {/* Same as applicant */}
                  {SHOW_NOMINEE_ADDRESS && checkboxGroup}

                  {/* Address — either preview or extra fields */}
                  {SHOW_NOMINEE_ADDRESS &&
                    (current.sameAsApplicant ? (
                      // <div className={styles.addressPreview}>
                      //   <p>{applicantAddress}</p>
                      // </div>
                      ""
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
                          <div
                            className={styles.fieldStack}
                            style={{ flex: "none" }}
                          >
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
                              maxLength={10}
                              value={current.pincode}
                              onChange={(e) =>
                                updateCurrent(
                                  "pincode",
                                  e.target.value.toUpperCase().slice(0, 10),
                                )
                              }
                            />
                            {errMsg("pincode")}
                          </div>
                        </div>
                      </>
                    ))}

                  {/* Guardian (Minor only) */}
                  {isMinor && (
                    <>
                      <p className={styles.nomineeTitle}>Guardian Details</p>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Guardian First Name</p>
                        <div className={styles.fieldStack}>
                          <input
                            className={`${styles.input} ${errCls("guardianFirstName")}`}
                            placeholder="Guardian first name (Optional)"
                            value={current.guardianFirstName}
                            maxLength={15}
                            onChange={(e) =>
                              updateCurrent(
                                "guardianFirstName",
                                e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                              )
                            }
                          />
                          {errMsg("guardianFirstName")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Guardian Last Name</p>
                        <div className={styles.fieldStack}>
                          <input
                            className={`${styles.input} ${errCls("guardianLastName")}`}
                            placeholder="Guardian last name (Optional)"
                            value={current.guardianLastName}
                            maxLength={15}
                            onChange={(e) =>
                              updateCurrent(
                                "guardianLastName",
                                e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                              )
                            }
                          />
                          {errMsg("guardianLastName")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>
                          Guardian Mobile Number
                        </p>
                        <div className={styles.fieldStack}>
                          <div className={styles.phoneRow}>
                            <div className={styles.codeSelect}>
                              <CountryCodeSelect
                                countries={COUNTRY_CODE_OPTIONS}
                                value={current.guardianMobileCountryIso2}
                                onChange={handleGuardianMobileCountryChange}
                              />
                            </div>
                            <input
                              className={`${styles.input} ${errCls("guardianMobile")}`}
                              placeholder="Guardian mobile (Optional)"
                              inputMode="numeric"
                              maxLength={
                                current.guardianMobileCountryIso2 === "in"
                                  ? 10
                                  : 15
                              }
                              value={current.guardianMobile}
                              onChange={(e) =>
                                updateCurrent(
                                  "guardianMobile",
                                  sanitizeMobileFor(
                                    e.target.value,
                                    current.guardianMobileCountryIso2,
                                  ),
                                )
                              }
                            />
                          </div>
                          {errMsg("guardianMobile")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Guardian Email ID</p>
                        <div className={styles.fieldStack}>
                          <input
                            type="email"
                            className={`${styles.input} ${errCls("guardianEmail")}`}
                            placeholder="Guardian email (Optional)"
                            value={current.guardianEmail}
                            onChange={(e) =>
                              updateCurrent("guardianEmail", e.target.value)
                            }
                          />
                          {errMsg("guardianEmail")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>
                          Guardian Proof of Identity
                        </p>
                        <div className={styles.fieldStack}>
                          <select
                            className={`${styles.select} ${errCls("guardianDocumentType")}`}
                            value={current.guardianDocumentType}
                            onChange={(e) =>
                              changeGuardianDocumentType(e.target.value)
                            }
                          >
                            {guardianProofTypes.map((d) => (
                              <option key={d.code} value={d.code}>
                                {d.displayName}
                              </option>
                            ))}
                          </select>
                          {errMsg("guardianDocumentType")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>
                          Guardian Identity Proof No.
                        </p>
                        <div className={styles.fieldStack}>
                          <input
                            className={`${styles.input} ${errCls("guardianDocumentNumber")}`}
                            disabled={!current.guardianDocumentType}
                            placeholder={
                              current.guardianDocumentType.toUpperCase() ===
                              "AADHAAR"
                                ? "Last 4 digits of Aadhaar"
                                : isPanProof(current.guardianDocumentType)
                                  ? "e.g. ABCDE1234F"
                                  : "Identity proof no. (Optional)"
                            }
                            inputMode={
                              current.guardianDocumentType.toUpperCase() ===
                              "AADHAAR"
                                ? "numeric"
                                : isPanProof(current.guardianDocumentType)
                                  ? getPanInputMode(
                                      current.guardianDocumentNumber,
                                    )
                                  : "text"
                            }
                            maxLength={
                              current.guardianDocumentType.toUpperCase() ===
                              "AADHAAR"
                                ? 4
                                : isPanProof(current.guardianDocumentType)
                                  ? 10
                                  : undefined
                            }
                            value={current.guardianDocumentNumber}
                            onChange={(e) =>
                              updateCurrent(
                                "guardianDocumentNumber",
                                sanitizeGuardianDocumentNumber(e.target.value),
                              )
                            }
                          />
                          {errMsg("guardianDocumentNumber")}
                        </div>
                      </div>
                      <div className={styles.row}>
                        <p className={styles.rowLabel}>Guardian Relationship</p>
                        <div className={styles.fieldStack}>
                          <select
                            className={`${styles.select} ${errCls("guardianRelationship")}`}
                            value={current.guardianRelationship}
                            onChange={(e) =>
                              updateCurrent(
                                "guardianRelationship",
                                e.target.value,
                              )
                            }
                          >
                            {guardianRelationships.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.displayName}
                              </option>
                            ))}
                          </select>
                          {errMsg("guardianRelationship")}
                        </div>
                      </div>
                      {false && (
                        <div className={styles.row}>
                          <p className={styles.rowLabel}>Guardian DOB</p>
                          <div className={styles.fieldStack}>
                            <div className={styles.deskCalendarWrap}>
                              <DateField
                                inputId="desk-guardian-dob"
                                value={strToDate(current.guardianDob)}
                                onChange={(d) =>
                                  updateCurrent("guardianDob", dateToStr(d))
                                }
                                dateFormat="dd/mm/yy"
                                placeholder="DD/MM/YYYY"
                                showIcon
                                iconPos="right"
                                touchUI
                                panelClassName="p-prime-cal-sm"
                                className={`p-prime-cal${errors.guardianDob ? " p-prime-cal-error" : ""}`}
                                maxDate={guardianMaxDate}
                                viewDate={
                                  strToDate(current.guardianDob) ||
                                  guardianMaxDate
                                }
                              />
                            </div>
                            {errMsg("guardianDob")}
                          </div>
                        </div>
                      )}
                      {/* <div className={styles.row}>
                        <p className={styles.rowLabel}>Guardian Address</p>
                        <div className={styles.fieldStack}>
                          <input
                            className={`${styles.input} ${errCls("guardianAddressLine1")}`}
                            placeholder="Guardian address"
                            value={current.guardianAddressLine1}
                            onChange={(e) =>
                              updateCurrent(
                                "guardianAddressLine1",
                                e.target.value,
                              )
                            }
                          />
                          {errMsg("guardianAddressLine1")}
                        </div>
                      </div> */}
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
                        {nomineeProofTypes.map((d) => (
                          <option key={d.code} value={d.code}>
                            {d.displayName}
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
                        disabled={!current.documentType}
                        placeholder={
                          current.documentType.toUpperCase() === "AADHAAR"
                            ? "Last 4 digits of Aadhaar"
                            : isPanProof(current.documentType)
                              ? "e.g. ABCDE1234F"
                              : "Enter number"
                        }
                        inputMode={
                          current.documentType.toUpperCase() === "AADHAAR"
                            ? "numeric"
                            : isPanProof(current.documentType)
                              ? getPanInputMode(current.documentNumber)
                              : "text"
                        }
                        maxLength={
                          current.documentType.toUpperCase() === "AADHAAR"
                            ? 4
                            : isPanProof(current.documentType)
                              ? 10
                              : undefined
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
                maxLength={15}
                onChange={(e) =>
                  updateCurrent(
                    "firstName",
                    e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                  )
                }
              />
              {errMsg("firstName")}
            </div>
            {/* <div className={styles.mobField}>
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
            </div> */}
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Last Name</label>
              <input
                className={`${styles.mobInput} ${errCls("lastName", true)}`}
                placeholder="Enter last name"
                value={current.lastName}
                maxLength={15}
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
                {nomineeRelationships.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.displayName}
                  </option>
                ))}
              </select>
              {errMsg("relationship")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Allocation</label>
              <input
                type="text"
                inputMode="decimal"
                disabled={
                  (nominees.length === 0 && editingIndex === null) ||
                  (nominees.length === 1 && editingIndex !== null)
                }
                className={`${styles.mobInput} ${errCls("allocation", true)}`}
                value={current.allocation}
                onChange={(e) =>
                  updateCurrent(
                    "allocation",
                    /^\d{0,3}(?:\.\d{0,2})?$/.test(e.target.value)
                      ? e.target.value
                      : current.allocation,
                  )
                }
              />
              {errMsg("allocation")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Mobile Number</label>
              <div className={styles.mobPhoneRow}>
                <div className={styles.codeSelect}>
                  <CountryCodeSelect
                    countries={COUNTRY_CODE_OPTIONS}
                    value={current.mobileCountryIso2}
                    onChange={handleMobileCountryChange}
                  />
                </div>
                <input
                  className={`${styles.mobInput} ${errCls("mobile", true)}`}
                  placeholder="Enter Mobile Number"
                  inputMode="numeric"
                  maxLength={current.mobileCountryIso2 === "in" ? 10 : 15}
                  value={current.mobile}
                  onChange={(e) =>
                    updateCurrent("mobile", sanitizeMobile(e.target.value))
                  }
                />
              </div>
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
                maxDate={new Date()}
              />
              {errMsg("dob")}
            </div>

            {SHOW_NOMINEE_ADDRESS && checkboxGroup}

            {SHOW_NOMINEE_ADDRESS &&
              (current.sameAsApplicant ? (
                // <div className={styles.addressPreview}>
                //   <p>{applicantAddress}</p>
                // </div>
                ""
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
                      maxLength={10}
                      value={current.pincode}
                      onChange={(e) =>
                        updateCurrent(
                          "pincode",
                          e.target.value.toUpperCase().slice(0, 10),
                        )
                      }
                    />
                    {errMsg("pincode")}
                  </div>
                </>
              ))}

            {isMinor && (
              <>
                <p className={styles.nomineeTitle}>Guardian Details</p>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Guardian First Name</label>
                  <input
                    className={`${styles.mobInput} ${errCls("guardianFirstName", true)}`}
                    placeholder="Guardian first name (Optional)"
                    value={current.guardianFirstName}
                    maxLength={15}
                    onChange={(e) =>
                      updateCurrent(
                        "guardianFirstName",
                        e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                      )
                    }
                  />
                  {errMsg("guardianFirstName")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Guardian Last Name</label>
                  <input
                    className={`${styles.mobInput} ${errCls("guardianLastName", true)}`}
                    placeholder="Guardian last name (Optional)"
                    value={current.guardianLastName}
                    maxLength={15}
                    onChange={(e) =>
                      updateCurrent(
                        "guardianLastName",
                        e.target.value.replace(/[^a-zA-Z\s]/g, ""),
                      )
                    }
                  />
                  {errMsg("guardianLastName")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>
                    Guardian Mobile Number
                  </label>
                  <div className={styles.mobPhoneRow}>
                    <div className={styles.codeSelect}>
                      <CountryCodeSelect
                        countries={COUNTRY_CODE_OPTIONS}
                        value={current.guardianMobileCountryIso2}
                        onChange={handleGuardianMobileCountryChange}
                      />
                    </div>
                    <input
                      className={`${styles.mobInput} ${errCls("guardianMobile", true)}`}
                      placeholder="Guardian mobile (Optional)"
                      inputMode="numeric"
                      maxLength={
                        current.guardianMobileCountryIso2 === "in" ? 10 : 15
                      }
                      value={current.guardianMobile}
                      onChange={(e) =>
                        updateCurrent(
                          "guardianMobile",
                          sanitizeMobileFor(
                            e.target.value,
                            current.guardianMobileCountryIso2,
                          ),
                        )
                      }
                    />
                  </div>
                  {errMsg("guardianMobile")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Guardian Email ID</label>
                  <input
                    type="email"
                    className={`${styles.mobInput} ${errCls("guardianEmail", true)}`}
                    placeholder="Guardian email (Optional)"
                    value={current.guardianEmail}
                    onChange={(e) =>
                      updateCurrent("guardianEmail", e.target.value)
                    }
                  />
                  {errMsg("guardianEmail")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>
                    Guardian Proof of Identity
                  </label>
                  <select
                    className={`${styles.mobSelect} ${errCls("guardianDocumentType", true)}`}
                    value={current.guardianDocumentType}
                    onChange={(e) => changeGuardianDocumentType(e.target.value)}
                  >
                    {guardianProofTypes.map((d) => (
                      <option key={d.code} value={d.code}>
                        {d.displayName}
                      </option>
                    ))}
                  </select>
                  {errMsg("guardianDocumentType")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>
                    Guardian Identity Proof No.
                  </label>
                  <input
                    className={`${styles.mobInput} ${errCls("guardianDocumentNumber", true)}`}
                    disabled={!current.guardianDocumentType}
                    placeholder={
                      current.guardianDocumentType.toUpperCase() === "AADHAAR"
                        ? "Last 4 digits of Aadhaar"
                        : isPanProof(current.guardianDocumentType)
                          ? "e.g. ABCDE1234F"
                          : "Identity proof no. (Optional)"
                    }
                    inputMode={
                      current.guardianDocumentType.toUpperCase() === "AADHAAR"
                        ? "numeric"
                        : isPanProof(current.guardianDocumentType)
                          ? getPanInputMode(current.guardianDocumentNumber)
                          : "text"
                    }
                    maxLength={
                      current.guardianDocumentType.toUpperCase() === "AADHAAR"
                        ? 4
                        : isPanProof(current.guardianDocumentType)
                          ? 10
                          : undefined
                    }
                    value={current.guardianDocumentNumber}
                    onChange={(e) =>
                      updateCurrent(
                        "guardianDocumentNumber",
                        sanitizeGuardianDocumentNumber(e.target.value),
                      )
                    }
                  />
                  {errMsg("guardianDocumentNumber")}
                </div>
                <div className={styles.mobField}>
                  <label className={styles.mobLabel}>
                    Guardian Relationship
                  </label>
                  <select
                    className={`${styles.mobSelect} ${errCls("guardianRelationship", true)}`}
                    value={current.guardianRelationship}
                    onChange={(e) =>
                      updateCurrent("guardianRelationship", e.target.value)
                    }
                  >
                    {guardianRelationships.map((r) => (
                      <option key={r.code} value={r.code}>
                        {r.displayName}
                      </option>
                    ))}
                  </select>
                  {errMsg("guardianRelationship")}
                </div>
                {false && (
                  <div className={styles.mobField}>
                    <p className={styles.rowLabel}>Guardian DOB</p>
                    <DateField
                      inputId="mob-guardian-dob"
                      value={strToDate(current.guardianDob)}
                      onChange={(d) =>
                        updateCurrent("guardianDob", dateToStr(d))
                      }
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className={`p-prime-cal${errors.guardianDob ? " p-prime-cal-error" : ""}`}
                      maxDate={guardianMaxDate}
                      viewDate={
                        strToDate(current.guardianDob) || guardianMaxDate
                      }
                    />
                    {errMsg("guardianDob")}
                  </div>
                )}
                {/* <div className={styles.mobField}>
                  <label className={styles.mobLabel}>Guardian Address</label>
                  <input
                    className={`${styles.mobInput} ${errCls("guardianAddressLine1", true)}`}
                    placeholder="Guardian address"
                    value={current.guardianAddressLine1}
                    onChange={(e) =>
                      updateCurrent("guardianAddressLine1", e.target.value)
                    }
                  />
                  {errMsg("guardianAddressLine1")}
                </div> */}
              </>
            )}

            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Document Type</label>
              <select
                className={`${styles.mobSelect} ${errCls("documentType", true)}`}
                value={current.documentType}
                onChange={(e) => changeDocumentType(e.target.value)}
              >
                {nomineeProofTypes.map((d) => (
                  <option key={d.code} value={d.code}>
                    {d.displayName}
                  </option>
                ))}
              </select>
              {errMsg("documentType")}
            </div>
            <div className={styles.mobField}>
              <label className={styles.mobLabel}>Document Number</label>
              <input
                className={`${styles.mobInput} ${errCls("documentNumber", true)}`}
                disabled={!current.documentType}
                placeholder={
                  current.documentType.toUpperCase() === "AADHAAR"
                    ? "Last 4 digits of Aadhaar"
                    : isPanProof(current.documentType)
                      ? "e.g. ABCDE1234F"
                      : "Enter number"
                }
                inputMode={
                  current.documentType.toUpperCase() === "AADHAAR"
                    ? "numeric"
                    : isPanProof(current.documentType)
                      ? getPanInputMode(current.documentNumber)
                      : "text"
                }
                maxLength={
                  current.documentType.toUpperCase() === "AADHAAR"
                    ? 4
                    : isPanProof(current.documentType)
                      ? 10
                      : undefined
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