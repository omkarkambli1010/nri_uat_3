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

// AdhaarCopy — Aadhaar DigiLocker verification result screen
// Figma: 8TizndCcBb3VyE5CIJBEZe
//   Desktop node 0-25166 · Mobile node 0-25394
//
// Flow:
//   1. Page loads — parse URL params (code, state, hmac, error).
//   2. If `code` present → call digilockerCallback API.
//   3. On callback success (status true) → call getDigilockerWorkflow and bind
//      the returned data (DOB, address, masked Aadhaar) to the screen.
//      Store callback response in sessionStorage for Continue routing.
//   4. On callback failure / no code → fall through to legacy fetchAadhaarData.
//   5. Continue button → read stored callback uiMetadata route and navigate.

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Extract the next route from a callback / workflow response uiMetadata field.
// uiMetadata is a JSON string e.g. "{\"route\": \"personalDetailsForm/1\"}".
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

// First non-empty value across candidate keys (API field names aren't pinned).
const pickField = (o: Record<string, unknown> | undefined, ...keys: string[]): string => {
  if (!o) return '';
  for (const k of keys) {
    const v = o[k];
    if (v != null && v !== '') return String(v);
  }
  return '';
};

// Normalise an Aadhaar value to the masked "XXXXXXXX1234" display form.
const maskAadhaar = (v: string): string => {
  if (!v) return '';
  if (/[xX*]/.test(v)) return v.replace(/\*/g, 'X');
  const digits = v.replace(/\D/g, '');
  if (!digits) return v;
  return `XXXXXXXX${digits.slice(-4)}`;
};

// Build a single-line address from the DigiLocker workflow data response.
// Response fields: line1, line2, line3, city, state, pincode, country.
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdhaarCopy() {
  const router = useRouter();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [dob, setDob] = useState('');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [maskedNumber, setMaskedNumber] = useState('');

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);

    // Read applicationId once — needed by both callback and workflow calls.
    const applicationId = sessionStorage.getItem('ApplicationId') ?? '';

    // Parse all DigiLocker redirect params from the URL in one place.
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code') ?? '';
    const state = params.get('state') ?? '';
    const hmac = params.get('hmac') ?? '';
    const error = params.get('error') ?? '';

    // Persist raw callback params for debugging / retry.
    sessionStorage.setItem('digilockerCallback', JSON.stringify({ code, state, hmac, error }));
    if (code) sessionStorage.setItem('digilocker_code', code);
    if (state) sessionStorage.setItem('digilocker_state', state);

    void initAadhaar(applicationId, code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Entry point on page load ──────────────────────────────────────────────
  const initAadhaar = async (applicationId: string, code: string) => {
    if (code && applicationId) {
      const handled = await handleDigilockerCallback(applicationId, code);
      if (handled) return; // workflow data already bound — nothing more to do
    }
    // No code / missing applicationId / callback failed → legacy fallback.
    await fetchAadhaarData();
  };

  // ── Step 1: DigiLocker OAuth callback ─────────────────────────────────────
  // Calls GET /api/v1/digilocker/callback?applicationId=...&code=...
  // On status true → calls getDigilockerWorkflow to bind screen data.
  // Returns true when the workflow data has been bound (screen stays visible).
  // Returns false to signal the caller should fall back to fetchAadhaarData.
  const handleDigilockerCallback = async (
    applicationId: string,
    code: string,
  ): Promise<boolean> => {
    showSpinner();
    try {
      const callbackRes = await apiService.digilockerCallback(applicationId, code);

      // Persist full callback response — Continue button uses its uiMetadata route.
      sessionStorage.setItem('digilockerCallbackResult', JSON.stringify(callbackRes ?? {}));

      if (callbackRes?.status === true) {
        // ── Step 2: fetch DigiLocker workflow details and bind to screen ──
        await fetchDigilockerWorkflow(applicationId);
        return true;
      }

      // Callback returned status false — fall through to legacy data fetch.
      return false;
    } catch {
      // apiService.handleError already surfaced the backend message.
      return false;
    } finally {
      hideSpinner();
    }
  };

  // ── Step 2: Get workflow stage data and bind to UI ─────────────────────────
  // POST /api/v1/applications/{id}/get/workflow/stagewisedate
  // body: { stagename: "DIGILOCKER", idempotencyKey: null }
  // Response.data fields used:
  //   dateOfBirth  → DOB row
  //   line1/line2/line3/city/state/pincode/country → Address row
  //   proofNumber  → last 4 digits of Aadhaar for masked display
  const fetchDigilockerWorkflow = async (applicationId: string) => {
    try {
      const res = await apiService.getDigilockerWorkflow(applicationId);

      if (res?.status === true && res?.data) {
        const d = res.data as Record<string, unknown>;

        // DOB — response field: dateOfBirth (ISO string e.g. "1994-12-19")
        setDob(pickField(d, 'dateOfBirth', 'DateOfBirth', 'dob', 'DOB'));

        // Address — concatenate line1/2/3, city, state, pincode, country
        setAddress(buildAddress(d));

        // Name — not in the current response payload but picked if present
        setName(pickField(d, 'name', 'Name', 'CustomerName', 'NameAsPerAadhaar', 'fullName'));

        // Masked Aadhaar — proofNumber holds last 4 digits per the response
        setMaskedNumber(
          maskAadhaar(
            pickField(d, 'proofNumber', 'MaskedAadhaar', 'MaskedAadhaarNumber', 'AadhaarNumber'),
          ),
        );
      }
    } catch {
      // Non-fatal — screen shows dashes for missing fields.
    }
  };

  // ── Fallback: legacy Aadhaar details fetch (no DigiLocker code in URL) ─────
  const fetchAadhaarData = async () => {
    showSpinner();
    const reqData = {
      flag: 'AadhaarDetails',
      formnumber: sessionStorage.getItem('ApplicationId') ?? '',
    };
    try {
      const response = await apiService.postRequest(
        'api/v1/WorkflowDetails/getworkflowdata',
        reqData,
        hideSpinner,
      );
      if (response?.status === true && response?.data?.length) {
        const d = response.data[0] as Record<string, unknown>;
        setDob(pickField(d, 'DOB', 'DateOfBirth', 'dob'));
        setAddress(pickField(d, 'Address', 'address'));
        setName(pickField(d, 'Name', 'CustomerName', 'NameAsPerAadhaar', 'NameAsPerPan', 'name', 'fullName'));
        setMaskedNumber(
          maskAadhaar(
            pickField(d, 'MaskedAadhaar', 'MaskedAadhaarNumber', 'AadhaarNumber', 'AadhaarNo', 'aadhaarNumber', 'UID'),
          ),
        );
      }
    } catch {
      // error already handled by apiService
    } finally {
      hideSpinner();
    }
  };

  // ── Navigation helpers ────────────────────────────────────────────────────

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  }

  const goBack = () => {
    showSpinner();
    setTimeout(() => { router.back(); hideSpinner(); }, 200);
  };

  // Continue — reads the stored callback response uiMetadata and routes accordingly.
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
        <div className={styles.aadhaarPhoto} aria-hidden="true">
          <PersonIcon />
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
          <div className={styles.mobileTopRow}>
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
          </div>

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
            {rejectStatus !== 'R' ? (
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
            )}

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
