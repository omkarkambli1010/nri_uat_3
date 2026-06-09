'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import { COUNTRIES } from '@/components/country-select/countries';
import { apiService } from '@/services/api.service';
import { toast } from '@/services/toast.service';
import styles from './passport-upload.module.scss';

// PassportUploadAll — all-in-one Passport screen.
// Two sections:
//   • Upload Passport Front — file upload + 7 OCR-style fields with a
//     read-only ↔ edit toggle (pencil / Save).
//   • Upload Passport Back  — file upload only.

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE       = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR       = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR       = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

// ── Validation ──────────────────────────────────────────────────────────────

// Full Name: letters, spaces, hyphens, apostrophes — min 3, max 100 chars.
const NAME_RE = /^[A-Za-z '\-]{3,100}$/;

// Indian Passport: exactly 8 chars — 1 letter followed by 7 digits.
const INDIAN_PASSPORT_RE = /^[A-Z][0-9]{7}$/;

interface PassportDetails {
  fullName:       string;
  dob:            string;
  passportNumber: string;
  issueDate:      string;
  expiryDate:     string;
  nationality:    string;
  gender:         string;
}

type FieldErrors = Partial<Record<keyof PassportDetails, string>>;

function validateDetails(d: PassportDetails, isIndian: boolean): FieldErrors {
  const errs: FieldErrors = {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ── Full Name ──────────────────────────────────────────────────────────────
  if (!d.fullName.trim() || !NAME_RE.test(d.fullName.trim())) {
    errs.fullName = 'Please enter a valid full name (letters only, min 3 characters).';
  }

  // ── Date of Birth ──────────────────────────────────────────────────────────
  if (!d.dob) {
    errs.dob = 'Invalid Date of Birth. Must be a valid past date and age must be at least 18 years.';
  } else {
    const dob = parseDateLocal(d.dob);
    if (!dob || Number.isNaN(dob.getTime())) {
      errs.dob = 'Invalid Date of Birth. Must be a valid past date and age must be at least 18 years.';
    } else if (dob >= today) {
      errs.dob = 'Invalid Date of Birth. Must be a valid past date and age must be at least 18 years.';
    } else {
      const age = (today.getTime() - dob.getTime()) / (365.25 * 24 * 3600 * 1000);
      if (age >= 18) {
        errs.dob = 'Invalid Date of Birth. Must be a valid past date and age must be at least 18 years.';
      }
    }
  }

  // ── Passport Number ────────────────────────────────────────────────────────
  if (!d.passportNumber.trim()) {
    errs.passportNumber = 'Invalid Passport Number. Please follow the correct format.';
  } else if (isIndian && !INDIAN_PASSPORT_RE.test(d.passportNumber.trim())) {
    errs.passportNumber = 'Invalid Passport Number. Please follow the correct format.';
  }

  // ── Issue Date ─────────────────────────────────────────────────────────────
  if (!d.issueDate) {
    errs.issueDate = 'Issue Date must be a valid past date and earlier than Expiry Date.';
  } else {
    const iss = parseDateLocal(d.issueDate);
    if (!iss || Number.isNaN(iss.getTime())) {
      errs.issueDate = 'Issue Date must be a valid past date and earlier than Expiry Date.';
    } else if (iss >= today) {
      errs.issueDate = 'Issue Date must be a valid past date and earlier than Expiry Date.';
    } else if (d.expiryDate) {
      const exp = parseDateLocal(d.expiryDate);
      if (exp && iss >= exp) {
        errs.issueDate = 'Issue Date must be a valid past date and earlier than Expiry Date.';
      }
    }
  }

  // ── Expiry Date ────────────────────────────────────────────────────────────
  if (!d.expiryDate) {
    errs.expiryDate = 'Expiry Date must be valid, later than Issue Date, and within 15 years.';
  } else {
    const exp = parseDateLocal(d.expiryDate);
    if (!exp || Number.isNaN(exp.getTime())) {
      errs.expiryDate = 'Expiry Date must be valid, later than Issue Date, and within 15 years.';
    } else if (exp <= today) {
      errs.expiryDate = 'Expiry Date must be valid, later than Issue Date, and within 15 years.';
    } else if (d.issueDate) {
      const iss = parseDateLocal(d.issueDate);
      if (iss) {
        if (exp <= iss) {
          errs.expiryDate = 'Expiry Date must be valid, later than Issue Date, and within 15 years.';
        } else {
          const maxExpiry = new Date(iss);
          maxExpiry.setFullYear(maxExpiry.getFullYear() + 15);
          if (exp > maxExpiry) {
            errs.expiryDate = 'Expiry Date must be valid, later than Issue Date, and within 15 years.';
          }
        }
      }
    }
  }

  // ── Nationality ────────────────────────────────────────────────────────────
  if (!d.nationality.trim()) {
    errs.nationality = 'Please select a valid nationality from the dropdown.';
  }

  // ── Gender ─────────────────────────────────────────────────────────────────
  if (!d.gender.trim()) {
    errs.gender = 'Please select your gender from the dropdown.';
  }

  return errs;
}

// ── Date helpers ─────────────────────────────────────────────────────────────

const parseDateLocal = (iso: string): Date | null => {
  if (!iso) return null;
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 0, 0, 0, 0);
  return Number.isNaN(d.getTime()) ? null : d;
};

const dateToIso = (d: Date | null | undefined): string => {
  if (!d || Number.isNaN(d.getTime())) return '';
  const y   = d.getFullYear();
  const m   = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const isoToDate = (s: string): Date | null => parseDateLocal(s);

const formatDateForDisplay = (iso: string): string => {
  if (!iso) return '';
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};

const normalizeIso = (s: string): string => {
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const dmy = s.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? '' : dateToIso(d);
};

// Parse uiMetadata JSON string → next route or null.
// e.g. '{"route":"foreignAddress"}' → '/foreignAddress'
const routeFromUiMetadata = (uiMetadata: string | undefined): string | null => {
  try {
    const meta = JSON.parse(uiMetadata ?? '{}');
    return meta?.route ? `/${String(meta.route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

const pickField = (o: Record<string, unknown> | undefined, ...keys: string[]): string => {
  if (!o) return '';
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
};

const resolveCountryName = (raw: string): string => {
  const q = raw.trim().toLowerCase();
  if (!q) return '';
  const exact = COUNTRIES.find((c) => c.name.toLowerCase() === q || c.iso2 === q);
  if (exact) return exact.name;
  const fuzzy = COUNTRIES.find(
    (c) => q.startsWith(c.name.toLowerCase()) || c.name.toLowerCase().startsWith(q),
  );
  return fuzzy ? fuzzy.name : raw;
};

// ── Icons ────────────────────────────────────────────────────────────────────
function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"
        stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      />
      <path d="M15 5l3 3" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <p className={styles.extractedInlineRow}>
      {label}: <span className={styles.extractedInlineValue}>{value || '—'}</span>
    </p>
  );
}

function FieldRow({
  id, label, error, children,
}: {
  id: string; label: string; error?: string; children: ReactNode;
}) {
  return (
    <div className={styles.fieldGroup}>
      <label htmlFor={id} className={styles.fieldRowLabel}>{label}</label>
      <div className={styles.inputCol}>
        {children}
        {error && <p className={styles.fieldError} role="alert">{error}</p>}
      </div>
    </div>
  );
}

export default function PassportUploadAll() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const passportType = searchParams.get('type') ?? 'Indian';
  const isIndian     = passportType === 'Indian';

  const nationalityOptions = isIndian
    ? COUNTRIES
    : COUNTRIES.filter((c) => c.name !== 'India');

  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles,  setBackFiles]  = useState<UploadedFile[]>([]);

  const [fullName,       setFullName]       = useState('');
  const [dob,            setDob]            = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [issueDate,      setIssueDate]      = useState('');
  const [expiryDate,     setExpiryDate]     = useState('');
  const [nationality,    setNationality]    = useState('');
  const [gender,         setGender]         = useState('');

  const [errors,         setErrors]         = useState<FieldErrors>({});
  const [frontEditMode,  setFrontEditMode]  = useState(false);
  const [detailsFetched, setDetailsFetched] = useState(false);
  const [savingDetails,  setSavingDetails]  = useState(false);

  // Stores the uiMetadata route from the most recent upload response.
  // Used by handleProceed to navigate correctly instead of hardcoding '/esign'.
  const [uploadRoute, setUploadRoute] = useState<string | null>(null);

  const applyPassportDetails = (raw: unknown) => {
    const r = (raw ?? {}) as Record<string, unknown>;
    const d = (r.passport ?? r.data ?? r) as Record<string, unknown>;

    const name = pickField(d, 'holderName', 'fullName', 'name');
    const dobV = pickField(d, 'dob', 'dateOfBirth');
    const pno  = pickField(d, 'passportNumber', 'number');
    const iss  = pickField(d, 'issueDate', 'dateOfIssue');
    const exp  = pickField(d, 'expiryDate', 'dateOfExpiry');
    const nat  = pickField(d, 'nationality');
    const gen  = pickField(d, 'gender', 'sex');

    if (name) setFullName(name);
    if (dobV) setDob(normalizeIso(dobV));
    if (pno)  setPassportNumber(pno);
    if (iss)  setIssueDate(normalizeIso(iss));
    if (exp)  setExpiryDate(normalizeIso(exp));
    if (nat)  setNationality(resolveCountryName(nat));
    if (gen)  setGender(gen);
  };

  const makeUploadFn =
    (field: 'FrontFile' | 'BackFile') =>
    async (file: File, onProgress: (p: number) => void) => {
      const applicationId =
        typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';
      if (!applicationId) {
        toast.error('Your session has expired, please start again.');
        throw new Error('Missing application ID');
      }
      if (field === 'FrontFile') {
        setDetailsFetched(false);
        setFrontEditMode(false);
      }

      const res = await apiService.uploadPassportFile(
        applicationId, field, file, passportType, onProgress,
      );
      onProgress(100);

      // Store the uiMetadata route from the upload response so Proceed
      // can navigate to the correct next screen (e.g. foreignAddress).
      // Both FrontFile and BackFile uploads may carry uiMetadata; the last
      // successful upload wins (typically BackFile is uploaded last).
      if (res?.uiMetadata) {
        const route = routeFromUiMetadata(res.uiMetadata);
        if (route) setUploadRoute(route);
      }

      const message = res?.message ?? res?.detail ?? 'Uploaded Successfully!';
      toast.success(message);

      if (field === 'FrontFile') {
        const details = await apiService.getPassport(applicationId);
        applyPassportDetails(details);
        setDetailsFetched(true);
      }
    };

  const fillMockDetails = () => {
    setFullName(v => v || 'Nishit Suresh Shah');
    setDob(v => v || '1986-03-04');
    setPassportNumber(v => v || 'IND121233H');
    setIssueDate(v => v || '2020-03-04');
    setExpiryDate(v => v || '2030-03-04');
    setNationality(v => v || 'India');
    setGender(v => v || 'Male');
  };

  const frontUploaded = frontFiles.some(f => f.status === 'success');
  const backUploaded  = backFiles.some(f => f.status === 'success');

  useEffect(() => { if (frontUploaded) fillMockDetails(); }, [frontUploaded]);
  useEffect(() => { if (backUploaded)  fillMockDetails(); }, [backUploaded]);

  const isDisabled =
    !frontUploaded || !backUploaded ||
    !fullName.trim() || !dob || !passportNumber.trim() ||
    !issueDate || !expiryDate || !nationality.trim() || !gender.trim();

  const onFieldChange = (key: keyof PassportDetails) => {
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleBack = () => router.push('/passportUpload/details');

  // FIX: route via uiMetadata from the upload response.
  // The upload API returns { uiMetadata: '{"route":"foreignAddress"}', ... }
  // which is stored in uploadRoute. Falls back to '/esign' only if the
  // upload never returned a uiMetadata route.
  const handleProceed = () => {
    const current: PassportDetails = {
      fullName, dob, passportNumber, issueDate, expiryDate, nationality, gender,
    };
    const errs = validateDetails(current, isIndian);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted fields and try again');
      return;
    }
    router.push(uploadRoute ?? '/esign');
  };

  const handleFrontEditToggle = async () => {
    if (!frontEditMode) {
      setFrontEditMode(true);
      return;
    }

    const current: PassportDetails = {
      fullName, dob, passportNumber, issueDate, expiryDate, nationality, gender,
    };
    const errs = validateDetails(current, isIndian);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast.error('Please fix the highlighted fields and try again');
      return;
    }

    const applicationId =
      typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    setSavingDetails(true);
    try {
      const res = await apiService.updatePassport(applicationId, {
        holderName: fullName, dob, passportNumber,
        issueDate, expiryDate, nationality, gender,
      });
      // updatePassport may also carry a uiMetadata route — honour it.
      if (res?.uiMetadata) {
        const route = routeFromUiMetadata(res.uiMetadata);
        if (route) setUploadRoute(route);
      }
      toast.success(res?.message ?? 'Details updated successfully');
      setFrontEditMode(false);
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSavingDetails(false);
    }
  };

  const inputCls = (key: keyof PassportDetails) =>
    `${styles.fieldInput}${errors[key] ? ` ${styles.fieldInputError}` : ''}`;

  function SectionHeader({
    title, editing, onToggle, disabled = false, saving = false,
  }: {
    title: string; editing: boolean; onToggle: () => void;
    disabled?: boolean; saving?: boolean;
  }) {
    return (
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>{title}</p>
        <button
          type="button"
          className={styles.editToggleBtn}
          onClick={onToggle}
          disabled={disabled || saving}
          aria-disabled={disabled || saving}
          aria-label={editing ? 'Save details' : 'Edit details'}
          aria-pressed={editing}
          title={disabled ? 'Upload your passport front to edit' : editing ? 'Save' : 'Edit'}
        >
          {editing ? (saving ? 'Saving…' : 'Save') : <IconEdit />}
        </button>
      </div>
    );
  }

  const today         = new Date(); today.setHours(0, 0, 0, 0);
  const issueDateObj  = isoToDate(issueDate);
  const maxExpiryDate = issueDateObj
    ? (() => { const d = new Date(issueDateObj); d.setFullYear(d.getFullYear() + 15); return d; })()
    : undefined;

  const renderEditFields = (idPrefix: 'front' | 'back') => (
    <>
      <FieldRow id={`${idPrefix}-fullName`} label="Full Name" error={errors.fullName}>
        <input
          id={`${idPrefix}-fullName`}
          type="text"
          value={fullName}
          maxLength={100}
          onChange={(e) => {
            const v = e.target.value.replace(/[^A-Za-z '\-]/g, '');
            setFullName(v);
            onFieldChange('fullName');
          }}
          className={inputCls('fullName')}
          aria-invalid={!!errors.fullName}
          autoComplete="name"
          placeholder="Enter full name"
        />
      </FieldRow>

      <FieldRow id={`${idPrefix}-dob`} label="Date of Birth" error={errors.dob}>
        <DateField
          inputId={`${idPrefix}-dob`}
          value={isoToDate(dob)}
          onChange={(d) => {
            if (d !== null) { setDob(dateToIso(d)); onFieldChange('dob'); }
          }}
          dateFormat="dd/mm/yy"
          placeholder="DD/MM/YYYY"
          showIcon
          iconPos="right"
          touchUI
          panelClassName="p-prime-cal-sm"
          maxDate={today}
          className={`p-prime-cal${errors.dob ? ' p-prime-cal-error' : ''}`}
        />
      </FieldRow>

      <FieldRow id={`${idPrefix}-passportNumber`} label="Passport Number" error={errors.passportNumber}>
        <input
          id={`${idPrefix}-passportNumber`}
          type="text"
          maxLength={isIndian ? 8 : 20}
          value={passportNumber}
          onChange={(e) => {
            const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            setPassportNumber(v);
            onFieldChange('passportNumber');
          }}
          className={inputCls('passportNumber')}
          aria-invalid={!!errors.passportNumber}
          placeholder={isIndian ? 'e.g. A1234567' : 'Passport number'}
          autoComplete="off"
        />
      </FieldRow>

      <FieldRow id={`${idPrefix}-issueDate`} label="Issue Date" error={errors.issueDate}>
        <DateField
          inputId={`${idPrefix}-issueDate`}
          value={isoToDate(issueDate)}
          onChange={(d) => {
            if (d !== null) { setIssueDate(dateToIso(d)); onFieldChange('issueDate'); }
          }}
          dateFormat="dd/mm/yy"
          placeholder="DD/MM/YYYY"
          showIcon
          iconPos="right"
          touchUI
          panelClassName="p-prime-cal-sm"
          maxDate={today}
          className={`p-prime-cal${errors.issueDate ? ' p-prime-cal-error' : ''}`}
        />
      </FieldRow>

      <FieldRow id={`${idPrefix}-expiryDate`} label="Expiry Date" error={errors.expiryDate}>
        <DateField
          inputId={`${idPrefix}-expiryDate`}
          value={isoToDate(expiryDate)}
          onChange={(d) => {
            if (d !== null) { setExpiryDate(dateToIso(d)); onFieldChange('expiryDate'); }
          }}
          dateFormat="dd/mm/yy"
          placeholder="DD/MM/YYYY"
          showIcon
          iconPos="right"
          touchUI
          panelClassName="p-prime-cal-sm"
          minDate={issueDateObj ?? undefined}
          maxDate={maxExpiryDate}
          className={`p-prime-cal${errors.expiryDate ? ' p-prime-cal-error' : ''}`}
        />
      </FieldRow>

      <FieldRow id={`${idPrefix}-nationality`} label="Nationality" error={errors.nationality}>
        <select
          id={`${idPrefix}-nationality`}
          value={nationality}
          onChange={(e) => { setNationality(e.target.value); onFieldChange('nationality'); }}
          className={`${styles.fieldSelect}${errors.nationality ? ` ${styles.fieldInputError}` : ''}`}
          aria-invalid={!!errors.nationality}
        >
          <option value="">Select nationality</option>
          {nationalityOptions.map((c) => (
            <option key={c.iso2} value={c.name}>{c.name}</option>
          ))}
        </select>
      </FieldRow>

      <FieldRow id={`${idPrefix}-gender`} label="Gender" error={errors.gender}>
        <select
          id={`${idPrefix}-gender`}
          value={gender}
          onChange={(e) => { setGender(e.target.value); onFieldChange('gender'); }}
          className={`${styles.fieldSelect}${errors.gender ? ` ${styles.fieldInputError}` : ''}`}
          aria-invalid={!!errors.gender}
        >
          <option value="">Select gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>
      </FieldRow>
    </>
  );

  const readOnlyFields = (
    <div className={styles.readOnlyList}>
      <ReadOnlyRow label="Full Name"       value={fullName} />
      <ReadOnlyRow label="Date of Birth"   value={formatDateForDisplay(dob)} />
      <ReadOnlyRow label="Passport Number" value={passportNumber} />
      <ReadOnlyRow label="Issue Date"      value={formatDateForDisplay(issueDate)} />
      <ReadOnlyRow label="Expiry Date"     value={formatDateForDisplay(expiryDate)} />
      <ReadOnlyRow label="Nationality"     value={nationality} />
      <ReadOnlyRow label="Gender"          value={gender} />
    </div>
  );

  const frontSection = (
    <div className={styles.section}>
      <SectionHeader
        title="Upload Passport Front"
        editing={frontEditMode}
        onToggle={handleFrontEditToggle}
        disabled={!detailsFetched}
        saving={savingDetails}
      />
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={makeUploadFn('FrontFile')}
        onFilesChange={setFrontFiles}
      />
      {frontEditMode ? renderEditFields('front') : readOnlyFields}
    </div>
  );

  const backSection = (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionTitle}>Upload Passport Back</p>
      </div>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={makeUploadFn('BackFile')}
        onFilesChange={setBackFiles}
      />
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Passport Details">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Passport Details</h1>
              <p className={styles.mobileSubtitle}>
                Upload your passport (front &amp; back) and confirm the details below.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {frontSection}
          {backSection}
        </div>

        <div className={styles.mobileProceedArea}>
          <button
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            Proceed
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Passport Details">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Passport Details</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload your passport (front &amp; back) and confirm the details below.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopScrollArea}>
              {frontSection}
              {backSection}
            </div>
            <div className={styles.desktopProceedWrapper}>
              <button
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
