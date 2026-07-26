"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./fatca.module.scss";
import LoadingButton from "@/components/ui/LoadingButton";
import { useCountries } from "@/components/country-select/useCountries";
import apiService from "@/services/api.service";
import dynamicBackService from "@/services/back-navigation.service";
import { useSpinner } from "../spinner/Spinner";

const getApplicationId = (): string =>
  typeof window !== "undefined"
    ? (sessionStorage.getItem("ApplicationId") ?? "")
    : "";

const MAX_TINS = 3;
const TIN_RE = /^[A-Za-z0-9]+$/;

type TinEntry = {
  taxResidence: string;
  tinIssuingCountry: string;
  tinNumber: string;
};

type FatcaForm = {
  countryOfBirth: string;
  citizenship: string;
  tins: TinEntry[];
};

type TinErrors = {
  taxResidence?: string;
  tinIssuingCountry?: string;
  tinNumber?: string;
};

type FormErrors = {
  countryOfBirth?: string;
  citizenship?: string;
  tins: TinErrors[];
};

const emptyTin = (): TinEntry => ({
  taxResidence: "",
  tinIssuingCountry: "",
  tinNumber: "",
});

const initForm = (): FatcaForm => ({
  countryOfBirth: "",
  citizenship: "",
  tins: [emptyTin()],
});

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
        stroke="#666"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5L11 4"
        stroke="#d92d20"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectField({
  id,
  label,
  value,
  onChange,
  groupClass,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  groupClass: string;
  error?: string;
}) {
  const { selectable } = useCountries();
  return (
    <div className={groupClass}>
      <label className={styles.fieldLabel} htmlFor={id}>
        {label}
      </label>
      <div className={styles.fieldSelectWrap}>
        <select
          id={id}
          className={`${styles.fieldSelect}${error ? ` ${styles.fieldInputError}` : ""}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        >
          <option value="" disabled>
            Select
          </option>
          {selectable.map((c) => (
            <option key={c.iso2} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
        <span className={styles.fieldSelectCaret}>
          <CaretDown />
        </span>
      </div>
      {error && (
        <p className={styles.fieldError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function TinRow({
  index,
  idPrefix,
  groupClass,
  fullGroupClass,
  taxResidence,
  country,
  number,
  taxResidenceError,
  countryError,
  numberError,
  onTaxResidenceChange,
  onCountryChange,
  onNumberChange,
}: {
  index: number;
  idPrefix: string;
  groupClass: string;
  fullGroupClass: string;
  taxResidence: string;
  country: string;
  number: string;
  taxResidenceError?: string;
  countryError?: string;
  numberError?: string;
  onTaxResidenceChange: (v: string) => void;
  onCountryChange: (v: string) => void;
  onNumberChange: (v: string) => void;
}) {
  return (
    <div className={styles.tinRow}>
      <SelectField
        id={`${idPrefix}-taxResidence-${index}`}
        label={`Country of TAX Residence ${index + 1} *`}
        value={taxResidence}
        onChange={onTaxResidenceChange}
        groupClass={fullGroupClass}
        error={taxResidenceError}
      />
      <SelectField
        id={`${idPrefix}-tinCountry-${index}`}
        label={`TIN Issuing Country ${index + 1} *`}
        value={country}
        onChange={onCountryChange}
        groupClass={groupClass}
        error={countryError}
      />
      <div className={groupClass}>
        <label
          className={styles.fieldLabel}
          htmlFor={`${idPrefix}-tinNumber-${index}`}
        >
          TAX Identification Number (TIN) {index + 1} *
        </label>
        <input
          id={`${idPrefix}-tinNumber-${index}`}
          type="text"
          className={`${styles.fieldInput}${numberError ? ` ${styles.fieldInputError}` : ""}`}
          placeholder="Enter number"
          value={number}
          onChange={(e) =>
            onNumberChange(
              e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
            )
          }
          aria-invalid={!!numberError}
        />
        {numberError && (
          <p className={styles.fieldError} role="alert">
            {numberError}
          </p>
        )}
      </div>
    </div>
  );
}

export default function FatcaDetails() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [form, setForm] = useState<FatcaForm>(initForm);
  const [errors, setErrors] = useState<FormErrors>({ tins: [{}] });

  const { selectable, loading: countriesLoading } = useCountries();
  const [savedData, setSavedData] = useState<Record<string, unknown> | null>(
    null,
  );
  const prefilledRef = useRef(false);

  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) return;

    let alive = true;
    (async () => {
      try {
        const res = await apiService.getFatcaWorkflow(applicationId);
        const d = res?.data as Record<string, unknown> | undefined;
        if (alive && d) setSavedData(d);
      } catch {
        // Non-fatal — the form just stays empty.
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!savedData || countriesLoading || prefilledRef.current) return;
    prefilledRef.current = true;

    const d = savedData;
    const str = (v: unknown): string => (v == null ? "" : String(v));
    const resolveCountry = (v: string): string => {
      if (!v) return "";
      const needle = v.trim().toLowerCase();
      const hit = selectable.find(
        (c) =>
          c.name.toLowerCase() === needle ||
          c.iso2.toLowerCase() === needle ||
          c.countryCode
            .toLowerCase()
            .split("/")
            .some((part) => part.trim() === needle),
      );
      return hit?.name ?? v;
    };

    // Each saved residency mirrors the submit payload; read defensively across
    // the plausible key casings.
    const rawTins = Array.isArray(d.taxResidencies)
      ? (d.taxResidencies as Record<string, unknown>[])
      : [];
    const tins: TinEntry[] = rawTins.map((r) => ({
      taxResidence: resolveCountry(
        str(
          r.countryofTaxResidence ?? r.countryOfTaxResidence ?? r.taxResidence,
        ),
      ),
      tinIssuingCountry: resolveCountry(str(r.tinIssuingCountry)),
      tinNumber: str(r.tin ?? r.tinNumber),
    }));
    const safeTins = tins.length > 0 ? tins : [emptyTin()];

    setForm({
      countryOfBirth: resolveCountry(str(d.countryOfBirth)),
      citizenship: resolveCountry(str(d.citizenship)),
      tins: safeTins,
    });
    setErrors({ tins: safeTins.map(() => ({})) });
  }, [savedData, countriesLoading, selectable]);

  const updateField = (
    field: "countryOfBirth" | "citizenship",
    value: string,
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateTin = (index: number, field: keyof TinEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      tins: prev.tins.map((t, i) =>
        i === index ? { ...t, [field]: value } : t,
      ),
    }));
    setErrors((prev) => ({
      ...prev,
      tins: prev.tins.map((e, i) =>
        i === index ? { ...e, [field]: undefined } : e,
      ),
    }));
  };

  const addTin = () =>
    setForm((prev) =>
      prev.tins.length >= MAX_TINS
        ? prev
        : { ...prev, tins: [...prev.tins, emptyTin()] },
    );

  const removeTin = (index: number) => {
    setForm((prev) =>
      prev.tins.length <= 1
        ? prev
        : { ...prev, tins: prev.tins.filter((_, i) => i !== index) },
    );
    setErrors({ tins: [] });
  };

  const validate = (): FormErrors => {
    const e: FormErrors = { tins: form.tins.map(() => ({})) };

    if (!form.countryOfBirth) {
      e.countryOfBirth = "Please select a valid Country of Birth.";
    }
    if (!form.citizenship) {
      e.citizenship = "Please select a valid Citizenship country.";
    }

    form.tins.forEach((t, i) => {
      if (!t.taxResidence) {
        e.tins[i].taxResidence =
          "Please select a valid Country of TAX Residence.";
      }
      if (!t.tinIssuingCountry) {
        e.tins[i].tinIssuingCountry =
          "Please select a valid TIN Issue Country.";
      }
      if (!t.tinNumber.trim() || !TIN_RE.test(t.tinNumber.trim())) {
        e.tins[i].tinNumber =
          "Please enter a valid Tax Identification Number (alphanumeric).";
      }
    });

    return e;
  };

  const hasErrors = (e: FormErrors): boolean =>
    !!e.countryOfBirth ||
    !!e.citizenship ||
    e.tins.some((t) => t.taxResidence || t.tinIssuingCountry || t.tinNumber);

  const handleProceed = () => {
    const errs = validate();
    setErrors(errs);
    if (hasErrors(errs)) return;

    if (typeof window !== "undefined") {
      const tinsJson = JSON.stringify(form.tins);
      if (sessionStorage.getItem("fatca_tins") !== tinsJson) {
        sessionStorage.removeItem("fatca_docids");
      }
      sessionStorage.setItem("fatca_tins", tinsJson);
      sessionStorage.setItem(
        "fatca_meta",
        JSON.stringify({
          countryOfBirth: form.countryOfBirth,
          citizenship: form.citizenship,
        }),
      );
    }
    router.push("/fatca/upload");
  };

  const goBack = async () => {
    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    await dynamicBackService("FATCA", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  // const BackBtn = ({ goBack }: { goBack: () => void }) => (
  //   <button
  //     type="button"
  //     className={styles.mobileBackBtn}
  //     onClick={goBack}
  //     aria-label="Go back"
  //   >
  //     <svg
  //       width="24"
  //       height="24"
  //       viewBox="0 0 24 24"
  //       fill="none"
  //       aria-hidden="true"
  //     >
  //       <path
  //         d="M15 18l-6-6 6-6"
  //         stroke="#2b2b2b"
  //         strokeWidth="1.5"
  //         strokeLinecap="round"
  //         strokeLinejoin="round"
  //       />
  //     </svg>
  //   </button>
  // );

  type BackBtnProps = {
    onClick: () => void | Promise<void>;
  };

  const BackBtn = ({ onClick }: BackBtnProps) => {
    return (
      <button
        type="button"
        className={styles.mobileBackBtn}
        onClick={() => void onClick()}
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
    );
  };

  const renderTinList = (
    idPrefix: "mob" | "desk",
    groupClass: string,
    fullGroupClass: string,
  ) => (
    <>
      <div className={styles.tinSectionHeader}>
        <span className={styles.tinSectionTitle}>
          Tax Residency &amp; TIN Details
        </span>
      </div>

      {form.tins.map((tin, i) => (
        <div key={i} className={styles.tinBlock}>
          {form.tins.length > 1 && (
            <div className={styles.tinBlockHeader}>
              <span className={styles.tinBlockLabel}>TIN {i + 1}</span>
              <button
                type="button"
                className={styles.removeTinBtn}
                onClick={() => removeTin(i)}
                aria-label={`Remove TIN ${i + 1}`}
              >
                <IconTrash />
                Remove
              </button>
            </div>
          )}
          <TinRow
            index={i}
            idPrefix={idPrefix}
            groupClass={groupClass}
            fullGroupClass={fullGroupClass}
            taxResidence={tin.taxResidence}
            country={tin.tinIssuingCountry}
            number={tin.tinNumber}
            taxResidenceError={errors.tins[i]?.taxResidence}
            countryError={errors.tins[i]?.tinIssuingCountry}
            numberError={errors.tins[i]?.tinNumber}
            onTaxResidenceChange={(v) => updateTin(i, "taxResidence", v)}
            onCountryChange={(v) => updateTin(i, "tinIssuingCountry", v)}
            onNumberChange={(v) => updateTin(i, "tinNumber", v)}
          />
        </div>
      ))}

      {form.tins.length < MAX_TINS && (
        <button type="button" className={styles.addTinBtn} onClick={addTin}>
          + Add another TIN
        </button>
      )}
    </>
  );

  const title = "Enter FATCA Details";
  const subtitle = "Enter your overseas address details manually.";

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <BackBtn onClick={goBack} />
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>{title}</h1>
              <p className={styles.mobileSubtitle}>{subtitle}</p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <div className={styles.section}>
            <SelectField
              id="mob-countryOfBirth"
              label="Country of Birth *"
              value={form.countryOfBirth}
              onChange={(v) => updateField("countryOfBirth", v)}
              groupClass={styles.fieldGroup}
              error={errors.countryOfBirth}
            />
            <SelectField
              id="mob-citizenship"
              label="Citizenship *"
              value={form.citizenship}
              onChange={(v) => updateField("citizenship", v)}
              groupClass={styles.fieldGroup}
              error={errors.citizenship}
            />

            <p className={styles.cobNote}>
              Note: Country of Birth should be as mentioned on the Passport.
            </p>

            {renderTinList("mob", styles.fieldGroup, styles.fieldGroup)}
          </div>
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={styles.mobileProceedBtn}
            onClick={handleProceed}
          >
            Upload TIN Document
          </LoadingButton>
        </div>
      </div>

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
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
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>{title}</h1>
              <p className={styles.desktopCardSubtitle}>{subtitle}</p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <div className={styles.section}>
                <div className={styles.desktopFieldGrid}>
                  <SelectField
                    id="desk-countryOfBirth"
                    label="Country of Birth *"
                    value={form.countryOfBirth}
                    onChange={(v) => updateField("countryOfBirth", v)}
                    groupClass={styles.desktopFieldGroup}
                    error={errors.countryOfBirth}
                  />
                  <SelectField
                    id="desk-citizenship"
                    label="Citizenship *"
                    value={form.citizenship}
                    onChange={(v) => updateField("citizenship", v)}
                    groupClass={styles.desktopFieldGroup}
                    error={errors.citizenship}
                  />
                </div>

                <p className={styles.cobNote}>
                  Note: Country of Birth should be as mentioned on the Passport.
                </p>

                {renderTinList(
                  "desk",
                  styles.desktopFieldGroup,
                  styles.desktopFieldGroupFull,
                )}
              </div>
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={styles.desktopProceedBtn}
                onClick={handleProceed}
              >
                Upload TIN Document
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
