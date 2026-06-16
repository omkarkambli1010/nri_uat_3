'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './fatca.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// FatcaDetails — FATCA form.
// Top: Country of Birth + Citizenship + Country of Tax Residency (mandatory).
// Repeatable TIN set (1–3): TIN Issuing Country + TIN.
// On Upload, completed TIN sets are persisted so /fatca/upload renders one
// image-upload section each. Validation runs on Upload click with inline
// per-field error messages. FATF-restricted countries are excluded everywhere.

const FATF_RESTRICTED = new Set<string>([
  'North Korea', 'Iran', 'Myanmar', 'Syria', 'Yemen',
]);

const ALL_COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'UAE', 'Germany', 'France', 'Japan',
];

// FATF-restricted countries are excluded from every dropdown.
const COUNTRIES = ALL_COUNTRIES.filter((c) => !FATF_RESTRICTED.has(c));

const MAX_TINS = 3;

// Tax Identification Number — alphanumeric only.
const TIN_RE = /^[A-Za-z0-9]+$/;

type TinEntry = {
  tinIssuingCountry: string;
  tinNumber:         string;
};

type FatcaForm = {
  countryOfBirth: string;
  citizenship:    string;
  taxResidence:   string;
  tins: TinEntry[];
};

type TinErrors = {
  tinIssuingCountry?: string;
  tinNumber?:         string;
};

type FormErrors = {
  countryOfBirth?: string;
  citizenship?:    string;
  taxResidence?:   string;
  tins: TinErrors[];
};

const emptyTin = (): TinEntry => ({ tinIssuingCountry: '', tinNumber: '' });

const initForm = (): FatcaForm => ({
  countryOfBirth: '',
  citizenship:    '',
  taxResidence:   '',
  tins: [emptyTin()],
});

function CaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#666" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 4h11M6 4V2.5h4V4M5 4l.5 9h5L11 4" stroke="#d92d20" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SelectField({
  id, label, value, onChange, groupClass, error,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; groupClass: string; error?: string;
}) {
  return (
    <div className={groupClass}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <div className={styles.fieldSelectWrap}>
        <select
          id={id}
          className={`${styles.fieldSelect}${error ? ` ${styles.fieldInputError}` : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={!!error}
        >
          <option value="" disabled>Select</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className={styles.fieldSelectCaret}><CaretDown /></span>
      </div>
      {error && <p className={styles.fieldError} role="alert">{error}</p>}
    </div>
  );
}

function TinRow({
  index, idPrefix, groupClass,
  country, number, countryError, numberError,
  onCountryChange, onNumberChange,
}: {
  index: number; idPrefix: string; groupClass: string;
  country: string; number: string; countryError?: string; numberError?: string;
  onCountryChange: (v: string) => void;
  onNumberChange:  (v: string) => void;
}) {
  return (
    <div className={styles.tinRow}>
      <SelectField
        id={`${idPrefix}-tinCountry-${index}`}
        label={`TIN Issuing Country ${index + 1}`}
        value={country}
        onChange={onCountryChange}
        groupClass={groupClass}
        error={countryError}
      />
      <div className={groupClass}>
        <label className={styles.fieldLabel} htmlFor={`${idPrefix}-tinNumber-${index}`}>
          TAX Identification Number (TIN) {index + 1}
        </label>
        <input
          id={`${idPrefix}-tinNumber-${index}`}
          type="text"
          className={`${styles.fieldInput}${numberError ? ` ${styles.fieldInputError}` : ''}`}
          placeholder="Enter number"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
          aria-invalid={!!numberError}
        />
        {numberError && <p className={styles.fieldError} role="alert">{numberError}</p>}
      </div>
    </div>
  );
}

export default function FatcaDetails() {
  const router = useRouter();

  const [form, setForm] = useState<FatcaForm>(initForm);
  const [errors, setErrors] = useState<FormErrors>({ tins: [{}] });

  const updateField = (field: 'countryOfBirth' | 'citizenship' | 'taxResidence', value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const updateTin = (index: number, field: keyof TinEntry, value: string) => {
    setForm((prev) => ({
      ...prev,
      tins: prev.tins.map((t, i) => (i === index ? { ...t, [field]: value } : t)),
    }));
    setErrors((prev) => ({
      ...prev,
      tins: prev.tins.map((e, i) => (i === index ? { ...e, [field]: undefined } : e)),
    }));
  };

  const addTin = () =>
    setForm((prev) =>
      prev.tins.length >= MAX_TINS ? prev : { ...prev, tins: [...prev.tins, emptyTin()] });

  const removeTin = (index: number) => {
    setForm((prev) =>
      prev.tins.length <= 1 ? prev : { ...prev, tins: prev.tins.filter((_, i) => i !== index) });
    setErrors({ tins: [] });
  };

  const validate = (): FormErrors => {
    const e: FormErrors = { tins: form.tins.map(() => ({})) };

    if (!form.countryOfBirth || FATF_RESTRICTED.has(form.countryOfBirth)) {
      e.countryOfBirth = 'Please select a valid Country of Birth.';
    }
    if (!form.citizenship || FATF_RESTRICTED.has(form.citizenship)) {
      e.citizenship = 'Please select a valid Citizenship country.';
    }
    if (!form.taxResidence || FATF_RESTRICTED.has(form.taxResidence)) {
      e.taxResidence = 'Please select a valid Country of Tax Residency. Maximum 3 entries allowed.';
    }

    form.tins.forEach((t, i) => {
      if (!t.tinIssuingCountry || FATF_RESTRICTED.has(t.tinIssuingCountry)) {
        e.tins[i].tinIssuingCountry = 'Please select a valid TIN Issue Country.';
      }
      if (!t.tinNumber.trim() || !TIN_RE.test(t.tinNumber.trim())) {
        e.tins[i].tinNumber = 'Please enter a valid Tax Identification Number (alphanumeric).';
      }
    });

    return e;
  };

  const hasErrors = (e: FormErrors): boolean =>
    !!e.countryOfBirth ||
    !!e.citizenship ||
    !!e.taxResidence ||
    e.tins.some((t) => t.tinIssuingCountry || t.tinNumber);

  const handleProceed = () => {
    const errs = validate();
    setErrors(errs);
    if (hasErrors(errs)) return;

    // Persist the TIN sets so /fatca/upload renders one image-upload section each.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fatca_tins', JSON.stringify(form.tins));
      sessionStorage.setItem(
        'fatca_meta',
        JSON.stringify({
          countryOfBirth: form.countryOfBirth,
          citizenship:    form.citizenship,
          taxResidence:   form.taxResidence,
        }),
      );
    }
    router.push('/fatca/upload');
  };

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className={styles.mobileBackBtn} onClick={onClick} aria-label="Go back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );

  // Renders the repeatable TIN list. `groupClass` styles each field for the
  // mobile (stacked) vs desktop (2-col grid via .tinRow) layouts.
  const renderTinList = (idPrefix: 'mob' | 'desk', groupClass: string) => (
    <>
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
            country={tin.tinIssuingCountry}
            number={tin.tinNumber}
            countryError={errors.tins[i]?.tinIssuingCountry}
            numberError={errors.tins[i]?.tinNumber}
            onCountryChange={(v) => updateTin(i, 'tinIssuingCountry', v)}
            onNumberChange={(v)  => updateTin(i, 'tinNumber', v)}
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

  const title    = 'Enter FATCA Details';
  const subtitle = 'Enter your overseas address details manually.';

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <div className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <BackBtn onClick={() => router.back()} />
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>{title}</h1>
              <p className={styles.mobileSubtitle}>{subtitle}</p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <div className={styles.section}>
            <SelectField id="mob-countryOfBirth" label="Country of Birth"        value={form.countryOfBirth} onChange={(v) => updateField('countryOfBirth', v)} groupClass={styles.fieldGroup} error={errors.countryOfBirth} />
            <SelectField id="mob-citizenship"    label="Citizenship"              value={form.citizenship}    onChange={(v) => updateField('citizenship',    v)} groupClass={styles.fieldGroup} error={errors.citizenship} />
            <SelectField id="mob-taxResidence"   label="Country of TAX Residence" value={form.taxResidence}   onChange={(v) => updateField('taxResidence',   v)} groupClass={styles.fieldGroup} error={errors.taxResidence} />

            {renderTinList('mob', styles.fieldGroup)}
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
            <button type="button" className={styles.desktopBackBtn} onClick={() => router.back()} aria-label="Go back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                  <SelectField id="desk-countryOfBirth" label="Country of Birth"        value={form.countryOfBirth} onChange={(v) => updateField('countryOfBirth', v)} groupClass={styles.desktopFieldGroup} error={errors.countryOfBirth} />
                  <SelectField id="desk-citizenship"    label="Citizenship"              value={form.citizenship}    onChange={(v) => updateField('citizenship',    v)} groupClass={styles.desktopFieldGroup} error={errors.citizenship} />
                  <SelectField id="desk-taxResidence"   label="Country of TAX Residence" value={form.taxResidence}   onChange={(v) => updateField('taxResidence',   v)} groupClass={styles.desktopFieldGroupFull} error={errors.taxResidence} />
                </div>

                {renderTinList('desk', styles.desktopFieldGroup)}
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
 