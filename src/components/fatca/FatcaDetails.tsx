'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './fatca.module.scss';

// FatcaDetails — Single FATCA section.
// Enable rule: at least 1 TIN row fully filled (both country + number).
// Top 3 dropdowns do NOT block the Upload button.

const COUNTRIES = [
  'India', 'United States', 'United Kingdom', 'Canada', 'Australia',
  'Singapore', 'UAE', 'Germany', 'France', 'Japan',
];

type TinEntry = {
  tinIssuingCountry: string;
  tinNumber:         string;
};

type FatcaForm = {
  countryOfBirth: string;
  citizenship:    string;
  taxResidence:   string;
  tin1: TinEntry;
  tin2: TinEntry;
  tin3: TinEntry;
};

const emptyTin  = (): TinEntry => ({ tinIssuingCountry: '', tinNumber: '' });

const initForm = (): FatcaForm => ({
  countryOfBirth: '',
  citizenship:    '',
  taxResidence:   '',
  tin1: emptyTin(),
  tin2: emptyTin(),
  tin3: emptyTin(),
});

function CaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#666" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SelectField({
  id, label, value, onChange, groupClass,
}: {
  id: string; label: string; value: string;
  onChange: (v: string) => void; groupClass: string;
}) {
  return (
    <div className={groupClass}>
      <label className={styles.fieldLabel} htmlFor={id}>{label}</label>
      <div className={styles.fieldSelectWrap}>
        <select
          id={id}
          className={styles.fieldSelect}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>Select</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className={styles.fieldSelectCaret}><CaretDown /></span>
      </div>
    </div>
  );
}

function TinRow({
  index, idPrefix, groupClass,
  country, number,
  onCountryChange, onNumberChange,
}: {
  index: number; idPrefix: string; groupClass: string;
  country: string; number: string;
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
      />
      <div className={groupClass}>
        <label className={styles.fieldLabel} htmlFor={`${idPrefix}-tinNumber-${index}`}>
          TAX Identification Number (TIN) {index + 1}
        </label>
        <input
          id={`${idPrefix}-tinNumber-${index}`}
          type="text"
          className={styles.fieldInput}
          placeholder="Enter number"
          value={number}
          onChange={(e) => onNumberChange(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
        />
      </div>
    </div>
  );
}

export default function FatcaDetails() {
  const router = useRouter();

  const [form, setForm] = useState<FatcaForm>(initForm);

  const updateField = (field: keyof Omit<FatcaForm, 'tin1' | 'tin2' | 'tin3'>, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const updateTin = (key: 'tin1' | 'tin2' | 'tin3', field: keyof TinEntry, value: string) =>
    setForm((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const tinComplete = (t: TinEntry) =>
    t.tinIssuingCountry.trim() !== '' && t.tinNumber.trim() !== '';

  // Button enabled when at least 1 TIN row is fully filled
  const canUpload =
    tinComplete(form.tin1) ||
    tinComplete(form.tin2) ||
    tinComplete(form.tin3);

  const handleProceed = () => {
    if (canUpload) router.push('/fatca/upload');
  };

  const BackBtn = ({ onClick }: { onClick: () => void }) => (
    <button type="button" className={styles.mobileBackBtn} onClick={onClick} aria-label="Go back">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
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
            <SelectField id="mob-countryOfBirth" label="Country of Birth"        value={form.countryOfBirth} onChange={(v) => updateField('countryOfBirth', v)} groupClass={styles.fieldGroup} />
            <SelectField id="mob-citizenship"    label="Citizenship"              value={form.citizenship}    onChange={(v) => updateField('citizenship',    v)} groupClass={styles.fieldGroup} />
            <SelectField id="mob-taxResidence"   label="Country of TAX Residence" value={form.taxResidence}   onChange={(v) => updateField('taxResidence',   v)} groupClass={styles.fieldGroup} />

            <TinRow index={0} idPrefix="mob" groupClass={styles.fieldGroup}
              country={form.tin1.tinIssuingCountry} number={form.tin1.tinNumber}
              onCountryChange={(v) => updateTin('tin1', 'tinIssuingCountry', v)}
              onNumberChange={(v)  => updateTin('tin1', 'tinNumber', v)} />

            <TinRow index={1} idPrefix="mob" groupClass={styles.fieldGroup}
              country={form.tin2.tinIssuingCountry} number={form.tin2.tinNumber}
              onCountryChange={(v) => updateTin('tin2', 'tinIssuingCountry', v)}
              onNumberChange={(v)  => updateTin('tin2', 'tinNumber', v)} />

            <TinRow index={2} idPrefix="mob" groupClass={styles.fieldGroup}
              country={form.tin3.tinIssuingCountry} number={form.tin3.tinNumber}
              onCountryChange={(v) => updateTin('tin3', 'tinIssuingCountry', v)}
              onNumberChange={(v)  => updateTin('tin3', 'tinNumber', v)} />
          </div>
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${!canUpload ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={!canUpload}
          >
            Upload TIN Document
          </button>
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
                  <SelectField id="desk-countryOfBirth" label="Country of Birth"        value={form.countryOfBirth} onChange={(v) => updateField('countryOfBirth', v)} groupClass={styles.desktopFieldGroup} />
                  <SelectField id="desk-citizenship"    label="Citizenship"              value={form.citizenship}    onChange={(v) => updateField('citizenship',    v)} groupClass={styles.desktopFieldGroup} />
                  <SelectField id="desk-taxResidence"   label="Country of TAX Residence" value={form.taxResidence}   onChange={(v) => updateField('taxResidence',   v)} groupClass={styles.desktopFieldGroupFull} />
                </div>

                <TinRow index={0} idPrefix="desk" groupClass={styles.desktopFieldGroup}
                  country={form.tin1.tinIssuingCountry} number={form.tin1.tinNumber}
                  onCountryChange={(v) => updateTin('tin1', 'tinIssuingCountry', v)}
                  onNumberChange={(v)  => updateTin('tin1', 'tinNumber', v)} />

                <TinRow index={1} idPrefix="desk" groupClass={styles.desktopFieldGroup}
                  country={form.tin2.tinIssuingCountry} number={form.tin2.tinNumber}
                  onCountryChange={(v) => updateTin('tin2', 'tinIssuingCountry', v)}
                  onNumberChange={(v)  => updateTin('tin2', 'tinNumber', v)} />

                <TinRow index={2} idPrefix="desk" groupClass={styles.desktopFieldGroup}
                  country={form.tin3.tinIssuingCountry} number={form.tin3.tinNumber}
                  onCountryChange={(v) => updateTin('tin3', 'tinIssuingCountry', v)}
                  onNumberChange={(v)  => updateTin('tin3', 'tinNumber', v)} />
              </div>
            </div>

            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${!canUpload ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={!canUpload}
              >
                Upload TIN Document
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
