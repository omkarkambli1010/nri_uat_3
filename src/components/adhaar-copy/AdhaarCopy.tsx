'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import styles from './adhaar-copy.module.scss';
import { publicPath } from "@/utils/publicPath";
import LoadingButton from '@/components/ui/LoadingButton';
import { useSessionValue } from '@/hooks/useSessionValue';

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M5 12.5H19" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12.5L11 18.5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12.5L11 6.5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M8 1.33334L2 4.00001V8.00001C2 11.3 4.66667 14.3933 8 15.3333C11.3333 14.3933 14 11.3 14 8.00001V4.00001L8 1.33334Z" stroke="#666666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.33334 8L7.33334 10L10.6667 6.66666" stroke="#666666" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="16" cy="12" r="5" fill="#b5b5bd" />
      <path d="M6 27c0-5.523 4.477-9 10-9s10 3.477 10 9" fill="#b5b5bd" />
    </svg>
  );
}

const routeFromUiMetadata = (res: unknown): string | null => {
  const meta = (res ?? {}) as Record<string, unknown>;
  try {
    const ui = typeof meta.uiMetadata === 'string'
      ? JSON.parse(meta.uiMetadata)
      : meta.uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, '')}` : null;
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

const maskAadhaar = (v: string): string => {
  if (!v) return '';
  if (/[xX*]/.test(v)) return v.replace(/\*/g, 'X');
  const digits = v.replace(/\D/g, '');
  if (!digits) return v;
  return `XXXXXXXX${digits.slice(-4)}`;
};

const aadhaarPhotoUrl = (res: Record<string, unknown>): string => {
  const docs = Array.isArray(res.documents)
    ? (res.documents as Record<string, unknown>[])
    : [];
  const photo = docs.find(
    (doc) => String(doc?.documentType ?? '').toLowerCase() === 'aadhaarphoto',
  );
  return pickField(photo, 'presignedUrl', 'preSignedUrl', 'preSignUrl', 'url');
};

const buildAddress = (d: Record<string, unknown>): string => {
  return [
    d.line1,
    // d.line2, 
    // d.line3,
    d.city, d.state, d.pincode, d.country,
  ]
    .map((v) => (v != null && v !== '' ? String(v).trim() : ''))
    .filter(Boolean)
    .join(', ');
};

const clearDigilockerQueryParams = (): void => {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  let changed = false;
  for (const key of ['code', 'state', 'hmac', 'error']) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }
  if (changed) {
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdhaarCopy() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [maskedNumber, setMaskedNumber] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);

    const applicationId = sessionStorage.getItem('ApplicationId') ?? '';

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') ?? '';
    const state = params.get('state') ?? '';
    const hmac = params.get('hmac') ?? '';
    const error = params.get('error') ?? '';

    sessionStorage.setItem('digilockerCallback', JSON.stringify({ code, state, hmac, error }));
    if (code) sessionStorage.setItem('digilocker_code', code);
    if (state) sessionStorage.setItem('digilocker_state', state);
    clearDigilockerQueryParams();
    void initAadhaar(applicationId, code);
  }, []);

  const initAadhaar = async (applicationId: string, code: string) => {
    if (code && applicationId) {
      await handleDigilockerCallback(applicationId, code);
    } else {
      await fetchDigilockerStage(applicationId);
    }
  };

  // ── Code present → DigiLocker/callback API ─────────────────────────────────
  const handleDigilockerCallback = async (
    applicationId: string,
    code: string,
  ): Promise<void> => {
    showSpinner();
    try {
      const callbackRes = await apiService.digilockerCallback(applicationId, code);
      sessionStorage.setItem('digilockerCallbackResult', JSON.stringify(callbackRes ?? {}));
      if (callbackRes?.status === true) {
        await bindDigilockerWorkflow(applicationId);
      }
    } catch {
    } finally {
      hideSpinner();
    }
  };

  // ── No code → stagewise DIGILOCKER fetch API ───────────────────────────────
  const fetchDigilockerStage = async (applicationId: string): Promise<void> => {
    showSpinner();
    try {
      await bindDigilockerWorkflow(applicationId);
    } finally {
      hideSpinner();
    }
  };

  const formatGender = (v: string): string => {
    const g = v.trim().toUpperCase();
    if (g === 'M' || g === 'MALE') return 'Male';
    if (g === 'F' || g === 'FEMALE') return 'Female';
    return v ? 'Others' : '';
  };

  const bindDigilockerWorkflow = async (applicationId: string) => {
    try {
      const res = await apiService.getDigilockerWorkflow(applicationId);

      if (res?.status === true && res?.data) {
        const d = res.data as Record<string, unknown>;

        setDob(pickField(d, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB'));
        setAddress(buildAddress(d));
        setName(pickField(d, 'name', 'Name', 'CustomerName', 'NameAsPerAadhaar', 'fullName'));
        setGender(formatGender(pickField(d, 'gender', 'Gender')));
        setMaskedNumber(
          maskAadhaar(
            pickField(d, 'proofNumber', 'MaskedAadhaar', 'MaskedAadhaarNumber', 'AadhaarNumber'),
          ),
        );
        setPhotoUrl(aadhaarPhotoUrl(res));
      }
    } catch {
    }
  };

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  }

  // const goBack = () => {
  //   showSpinner();
  //   setTimeout(() => { router.back(); hideSpinner(); }, 200);
  // };

  const handleContinue = () => {
    showSpinner();
    setTimeout(() => {
      let stored: unknown = null;
      try {
        stored = JSON.parse(sessionStorage.getItem('digilockerCallbackResult') ?? 'null');
      } catch {
        stored = null;
      }
      const route = routeFromUiMetadata(stored) ?? '/personalDetailsForm/1';
      router.push(route);
      hideSpinner();
    }, 200);
  };

  const faqHelpBtn = (stageName: string) => {
    const encodedStageName = btoa(stageName);
    window.location.href = `faq?stageName=${encodeURIComponent(encodedStageName)}`;
  };

  // ── UI fragments ──────────────────────────────────────────────────────────

  const aadhaarCard = (
    <div className={styles.aadhaarCard}>
      <img
        className={styles.aadhaarCardHeaderImg}
        src={publicPath("/assets/images/diy/aadharheaderimg.png")}
        alt=""
        aria-hidden="true"
      />
      <div className={styles.aadhaarCardRow}>
        <div className={styles.aadhaarPhoto}>
          {photoUrl ? (
            <img
              className={styles.aadhaarPhotoImg}
              src={photoUrl}
              alt="Aadhaar photo"
            />
          ) : (
            <PersonIcon />
          )}
        </div>
        <div className={styles.aadhaarInfo}>
          <p className={styles.aadhaarName}>{name || '—'}</p>
          <p className={styles.aadhaarNumber}>{maskedNumber || 'XXXXXXXXXXXX'}</p>
        </div>
      </div>
    </div>
  );

  const infoBox = (
    <div className={styles.infoBox}>
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>Date of Birth:</span>
        <span className={styles.infoValue}>{dob || '—'}</span>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>Gender:</span>
        <span className={styles.infoValue}>{gender || '-'}</span>
      </div>
      <div className={styles.infoRow}>
        <span className={styles.infoLabel}>Address:</span>
        <span className={styles.infoValue}>{address || '—'}</span>
      </div>
    </div>
  );

  return (
    <>
      {/* ── MOBILE (< 768px) ─────────────────────────────────────────────────── */}
      <section aria-label="Aadhaar Verification" className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          {/* <div className={styles.mobileTopRow}>
            {rejectStatus !== 'R' ? (
              <button
                type="button"
                className={styles.mobileBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            ) : (
              <div className={styles.backPlaceholder} aria-hidden="true" />
            )}
          </div> */}

          <div className={styles.mobileTitleRow}>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Verify using Aadhaar with DigiLocker</h1>
              <p className={styles.mobileSubtitle}>
                Enter your Aadhaar and verify using OTP sent to your Aadhaar linked Mobile Number
              </p>
            </div>
            <button
              type="button"
              className={styles.needHelpBtn}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <div className={styles.aadhaarImageWrap}>
            {aadhaarCard}
          </div>
          {infoBox}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={styles.mobileProceedBtn}
            onClick={handleContinue}
          >
            Proceed to Personal Details
          </LoadingButton>
        </div>
      </section>

      {/* ── DESKTOP (≥ 768px) ────────────────────────────────────────────────── */}
      <section aria-label="Aadhaar Verification" className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            {/* {rejectStatus !== 'R' ? (
              <button
                type="button"
                className={styles.desktopBackBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            ) : (
              <div className={styles.backPlaceholder} aria-hidden="true" />
            )} */}

            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Verify using Aadhaar with DigiLocker</h1>
              <p className={styles.desktopCardSubtitle}>
                Enter your Aadhaar and verify using OTP sent to your Aadhaar linked Mobile Number
              </p>
            </div>

            <button
              type="button"
              className={styles.needHelpBtn}
              onClick={openFaq}
            >
              Need Help?
            </button>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.contentTop}>
              <div className={styles.aadhaarImageWrap}>
                {aadhaarCard}
              </div>
              {infoBox}
            </div>

            <div className={styles.contentBottom}>
              <p className={styles.securityText}>
                <ShieldIcon />
                Your PAN details are safe and secure with us.
              </p>
              <LoadingButton
                type="button"
                className={styles.proceedBtn}
                onClick={handleContinue}
              >
                Continue
              </LoadingButton>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
