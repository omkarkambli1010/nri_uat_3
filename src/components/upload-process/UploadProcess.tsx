"use client";

import { useState, useEffect } from 'react';
import { useRouter, useParams, usePathname } from 'next/navigation';
import { toast } from '@/services/toast.service';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import DateField from '@/components/date-field/DateField';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import { buildFaqUrl } from '@/lib/faq-link';
import styles from './upload-process.module.scss';
import { publicPath } from "@/utils/publicPath";
import LoadingButton from '@/components/ui/LoadingButton';
import dynamicBackService from '@/services/back-navigation.service';
import secureSessionService from '@/services/secure-session.service';
// Convert 'YYYY-MM-DD' string → Date | null  (for Calendar value prop)
const strToDate = (s: string): Date | null => (s ? new Date(s) : null);

// Convert Date | null → 'YYYY-MM-DD' string  (for state / API)
const dateToStr = (d: Date | null | undefined): string => {
  if (!d) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// PAN positional formatter — mirrors the Angular manual-entry logic:
//   chars 0–4: letters only, 5–8: digits only, char 9: letter only → AAAAA1234A
const formatPan = (raw: string): string => {
  const value = raw.toUpperCase();
  const part1 = value.substring(0, 5).replace(/[^A-Z]/g, "");
  const part2 = value.substring(5, 9).replace(/\D/g, "");
  const part3 = value.substring(9).replace(/[^A-Z]/g, "");
  return part1 + part2 + part3;
};

const PAN_PATTERN = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PAN_SPECIAL_CHARS = /[!@#$%^&*()\-+={}[\]:;"'<>,.?\/|\\]/;

// Switch the on-screen keyboard to match the next PAN character:
//   positions 0–4 → letters, 5–8 → digits, 9 → letter  (mirrors Angular getInputMode)
const getPanInputMode = (value: string): "text" | "numeric" =>
  value.length >= 5 && value.length < 9 ? "numeric" : "text";

// UploadProcess — PAN Manual Entry (Enter PAN Card Details)
// Figma: 1:4282 — form filled state (desktop)
//        1:4567 — form + "Verifying your PAN details" overlay (desktop)
//        1:5501 — mobile verifying bottom sheet
// Route: /uploadProcess/[formNumber]

const ASSET_LOADING = publicPath("/assets/images/diy/loading.gif");

// ── Chevron icon for accordion ────────────────────────────────────────────────
function ChevronSvg({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
        flexShrink: 0,
      }}
    >
      <path
        d="M6 9L12 15L18 9"
        stroke="#280071"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── PAN card front (slide 1) — Figma: image 3215 ─────────────────────────────
function PanCardFront() {
  return (
    <div className={styles.panSlide}>
      <img
        src={publicPath("/Pan_slide_1.png")}
        alt="Sample PAN card front"
        className={styles.panCardImg}
      />
    </div>
  );
}

// ── PAN card back (slide 2) ──────────────────────────────────────────────────
function PanCardBack() {
  return (
    <div className={styles.panSlide}>
      <img
        src={publicPath("/Pan_slide_2.png")}
        alt="Sample PAN card front"
        className={styles.panCardImg}
      />
    </div>
  );
}


// ── PAN card back (slide 3) ──────────────────────────────────────────────────
function PanCardBackThree() {
  return (
    <div className={styles.panSlide}>
      <img
        src={publicPath("/Pan_slide_3.png")}
        alt="Sample PAN card front"
        className={styles.panCardImg}
      />
    </div>
  );
}

// ── PAN carousel (Splide) ────────────────────────────────────────────────────
function PanCardCarousel() {
  return (
    <div className={styles.panCarouselWrap}>
      <Splide
        options={{
          perPage: 1,
          arrows: false,
          pagination: true,
          rewind: true,
          gap: 0,
          padding: 0,
          autoWidth: false,
          trimSpace: true,
        }}
        aria-label="PAN card preview"
        className={styles.panSplide}
      >
        <SplideSlide>
          <PanCardFront />
        </SplideSlide>
        <SplideSlide>
          <PanCardBack />
        </SplideSlide>
        <SplideSlide>
          <PanCardBackThree />
        </SplideSlide>
      </Splide>
    </div>
  );
}

// ── Security banner — Figma 1:64494 ──────────────────────────────────────────
function SecurityBanner() {
  return (
    <div className={styles.securityBanner}>
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M12 2L4 6V12C4 16.42 7.56 20.56 12 22C16.44 20.56 20 16.42 20 12V6L12 2Z"
          fill="#666666"
        />
        <path
          d="M9 12L11 14L15 10"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={styles.securityText}>
        Your PAN details are safe and secure with us.
      </span>
    </div>
  );
}

// ── Verifying overlay content ────────────────────────────────────────────────
function VerifyingContent() {
  return (
    <>
      {/* Figma: loading animation 150×46 */}
      <img
        src={ASSET_LOADING}
        alt=""
        aria-hidden="true"
        className={styles.loadingImg}
      />
      {/* Figma: 20px SemiBold #2b2b2b */}
      <p className={styles.verifyingTitle}>Verifying your PAN details</p>
      {/* Figma: 18px Regular #2b2b2b, line-height 1.5 */}
      <p className={styles.verifyingSubtitle}>
        This usually takes less than a minute.
      </p>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function UploadProcess() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  };

  const [pan, setPan] = useState("");
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  // PAN validations (mirrors Angular: panValidation / fourthCharValidation / specialCharValidation)
  const [panInvalid, setPanInvalid] = useState(false);
  const [panNotPersonal, setPanNotPersonal] = useState(false);
  const [panSpecialChar, setPanSpecialChar] = useState(false);
  const [nameError, setNameError] = useState("");
  const [dobError, setDobError] = useState("");
  const [formNumber, setFormNumber] = useState("");
  const [showVerifying, setShowVerifying] = useState(false);
  const [showSamplePan, setShowSamplePan] = useState(false);

  // DOB picker bounds — disable future dates and anyone under 18 in the
  // calendar (must be a valid past date, 18+). minDate caps at 100 years.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dobMaxDate = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  const dobMinDate = new Date(
    today.getFullYear() - 100,
    today.getMonth(),
    today.getDate(),
  );

  useEffect(() => {
    document.title = "PAN Details | SBI Securities";
    const fn =
      (params?.formNumber as string) ??
      secureSessionService.getItem("FormNumber") ??
      "";
    setFormNumber(fn);
    loadExistingData();
  }, [params]);

  const loadExistingData = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    if (!applicationId) return;

    showSpinner();
    try {
      const response = await apiService.getPanWorkflow(applicationId, hideSpinner);

      if (response?.status === true && response?.data) {
        const data = response.data;
        setPan(data.panNumber?.value ?? "");
        setName(data.itdName ?? "");
        setDob(data.itdDob ?? "");
      }
    } catch {
      /* silent — user can fill manually */
    } finally {
      hideSpinner();
    }
  };

  const panHasError = panInvalid || panNotPersonal || panSpecialChar;

  // Run the three PAN checks (only when we should surface errors — on blur or
  // once the field is full at 10 chars), mirroring the Angular validateInput().
  const runPanValidation = (value: string) => {
    setPanInvalid(!PAN_PATTERN.test(value));
    setPanNotPersonal(value.length >= 4 && value[3] !== "P");
    setPanSpecialChar(PAN_SPECIAL_CHARS.test(value));
  };

  // Positionally format the PAN on every keystroke; surface validation once the
  // field is complete (length 10) or forced (focus-out). Mirrors Angular onInput.
  const handlePanInput = (raw: string, forceShow = false) => {
    const formatted = formatPan(raw);
    setPan(formatted);
    if (forceShow || formatted.length === 10) {
      runPanValidation(formatted);
    }
  };

  const validate = () => {
    let valid = true;
    if (!pan) {
      setPanInvalid(true);
      valid = false;
    } else {
      runPanValidation(pan);
      if (
        !PAN_PATTERN.test(pan) ||
        pan[3] !== "P" ||
        PAN_SPECIAL_CHARS.test(pan)
      ) {
        valid = false;
      }
    }

    if (!name.trim()) {
      setNameError("Name is required");
      valid = false;
    } else {
      setNameError("");
    }

    if (!dob) {
      setDobError("Date of Birth is required");
      valid = false;
    } else {
      setDobError("");
    }

    return valid;
  };

  // const handleSubmit = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   if (!validate()) return;

  //   setShowVerifying(true);

  //   const accountType = secureSessionService.getItem('accountType');
  //   const nextRoute =
  //     accountType === 'digital'      ? '/permanent-address-details' :
  //     accountType === 'semi-digital' ? '/personalDetailsForm/1'     :
  //     '/uploadPan';

  //   setTimeout(() => router.push(nextRoute), 1500);
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const applicationId =
      secureSessionService.getItem("ApplicationId") ??
      "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const reqData = {
      panNumber: pan,
      documentId: null,
      fullName: name,
      dateOfBirth: dob,
      idempotencyKey: "",
    };

    setShowVerifying(true);
    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/pan`,
        reqData,
        hideSpinner,
      );

      hideSpinner();

      if (response?.status === true) {
        let route = "";

        try {
          const uiMetadata = response?.uiMetadata
            ? JSON.parse(response.uiMetadata)
            : null;

          route = uiMetadata?.route || "";
        } catch {
          route = "";
        }

        if (route) {
          router.push(`/${route}`);
        } else {
          toast.error("Next route not provided");
        }
      } else {
        toast.error("PAN verification failed");
      }

      setShowVerifying(false);
    } catch (error: any) {
      console.log(error?.response?.data);
      hideSpinner();
      setShowVerifying(false);
    }
  };

  // const handleBack = () => {
  //   showSpinner();
  //   setTimeout(() => {
  //     router.push("/home");
  //     hideSpinner();
  //   }, 200);
  // };

   const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("PAN_VERIFICATION", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════
          Adapted from 1:5501 + standard project mobile pattern
      ════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Enter PAN Card Details">
        {/* Gray header */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button
              type="button"
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
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
            </button>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Enter PAN Card Details</h1>
              <p className={styles.mobileSubtitle}>
                Enter details exactly as per your PAN
              </p>
            </div>
          </div>
        </div>

        {/* White card */}
        <form onSubmit={handleSubmit} noValidate>
          <div className={styles.mobileCard}>
            {/* PAN No. */}
            <div className={styles.mobileFormField}>
              <label htmlFor="mob-pan" className={styles.mobileLabel}>
                PAN No.
              </label>
              <input
                id="mob-pan"
                type="text"
                inputMode={getPanInputMode(pan)}
                autoCapitalize="characters"
                maxLength={10}
                value={pan}
                onChange={(e) => handlePanInput(e.target.value)}
                onBlur={(e) => handlePanInput(e.target.value, true)}
                onPaste={(e) => e.preventDefault()}
                onKeyDown={(e) => {
                  if (e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) {
                    e.preventDefault();
                  }
                }}
                placeholder="e.g. ABCDE1234F"
                className={`${styles.mobileInput}${panHasError ? ` ${styles.mobileInputError}` : ""}`}
                suppressHydrationWarning
              />
              {panInvalid && (
                <p className={styles.mobileErrorText}>*Please enter a valid PAN</p>
              )}
              {panNotPersonal && (
                <p className={styles.mobileErrorText}>
                  *We accept Personal PanCard Numbers Only
                </p>
              )}
              {panSpecialChar && (
                <p className={styles.mobileErrorText}>
                  *Special Characters are not allow
                </p>
              )}
              <button
                type="button"
                className={styles.accordionToggle}
                onClick={() => setShowSamplePan((v) => !v)}
                aria-expanded={showSamplePan}
                suppressHydrationWarning
              >
                <span className={styles.accordionToggleText}>
                  View sample PAN
                </span>
                <ChevronSvg open={showSamplePan} />
              </button>
              {showSamplePan && <PanCardCarousel />}
            </div>

            {/* Date of Birth */}
            <div className={styles.mobileFormField}>
              <label htmlFor="mob-dob" className={styles.mobileLabel}>Date of Birth</label>
              <DateField
                inputId="mob-dob"
                value={strToDate(dob)}
                onChange={(d) => { setDob(dateToStr(d)); setDobError(''); }}
                autoPad
                onError={(msg) => setDobError(msg ?? '')}
                minDate={dobMinDate}
                maxDate={dobMaxDate}
                dateFormat="dd/mm/yy"
                placeholder="DD/MM/YYYY"
                showIcon
                iconPos="right"
                touchUI
                panelClassName="p-prime-cal-sm"
                className={`p-prime-cal p-prime-cal-h48${dobError ? ' p-prime-cal-error' : ''}`}
              />
              {dobError && <p className={styles.mobileErrorText}>{dobError}</p>}
            </div>

            {/* Full Name */}
            <div className={styles.mobileFormField}>
              <label htmlFor="mob-name" className={styles.mobileLabel}>
                Full Name
              </label>
              <input
                id="mob-name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.toUpperCase());
                  setNameError("");
                }}
                placeholder="Enter name as on PAN"
                className={`${styles.mobileInput}${nameError ? ` ${styles.mobileInputError}` : ""}`}
                suppressHydrationWarning
              />
              {nameError && (
                <p className={styles.mobileErrorText}>{nameError}</p>
              )}
            </div>
          </div>

          {/* Figma 1:64494: security banner above button */}
          <div className={styles.mobileSecurityArea}>
            <SecurityBanner />
          </div>

          {/* Figma: 328×48, bg #280071, 16px SemiBold white */}
          <div className={styles.mobileProceedArea}>
            <LoadingButton type="submit" className={styles.mobileProceedBtn}>
              Verify PAN
            </LoadingButton>
          </div>
        </form>
      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════
          Figma: 1:4282 — Onboarding-Web-PANMANUAL-Verification-Filled (1440×1024)
      ════════════════════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Enter PAN Card Details">
        {/* Figma: w-800, rounded-24, border #d9d9d9, shadow */}
        <div className={styles.desktopCard}>
          {/* Card header */}
          {/* Figma: p-24, flex, gap-8, border-bottom 0.5px #d9d9d9 */}
          <div className={styles.desktopCardHeader}>
            <button
              type="button"
              className={styles.desktopBackBtn}
              onClick={goBack}
              aria-label="Go back"
              suppressHydrationWarning
            >
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
            </button>
            <div className={styles.desktopHeaderContent}>
              {/* Row: title + Need Help? */}
              <div className={styles.desktopHeaderRow}>
                {/* Figma: 18px SemiBold #222 */}
                <h1 className={styles.desktopCardTitle}>
                  Enter PAN Card Details
                </h1>
                {/* Figma: pill badge bg rgba(207,169,255,0.09), border 0.5px #d9d9d9, rounded-25px */}
                <button
                  type="button"
                  className={styles.needHelpBadge}
                  suppressHydrationWarning
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              {/* Figma: 14px Regular #666 */}
              <p className={styles.desktopCardSubtitle}>
                Enter details exactly as per your PAN
              </p>
            </div>
          </div>

          {/* Card body */}
          {/* Figma: p-24, flex col, justify-between, h-581 */}
          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.desktopCardBody}>
              <div className={styles.desktopFieldsArea}>
                {/* ── PAN No. field ── */}
                {/* Figma: label "PAN No." 16px Regular #666; input w-250 h-40 border #d9d9d9 rounded-8 */}
                {/* Top-aligned (not center): the input group also holds the
                    "View sample PAN" accordion, so center alignment shifted the
                    LHS label whenever the sample images expanded/collapsed. */}
                <div className={styles.desktopFormRow}>
                  <label htmlFor="desk-pan" className={styles.desktopLabel}>
                    PAN No.
                  </label>
                  <div className={styles.desktopInputGroup}>
                    <input
                      id="desk-pan"
                      type="text"
                      inputMode={getPanInputMode(pan)}
                      autoCapitalize="characters"
                      maxLength={10}
                      value={pan}
                      onChange={(e) => handlePanInput(e.target.value)}
                      onBlur={(e) => handlePanInput(e.target.value, true)}
                      onPaste={(e) => e.preventDefault()}
                      onKeyDown={(e) => {
                        if (e.key.length === 1 && !/[A-Za-z0-9]/.test(e.key)) {
                          e.preventDefault();
                        }
                      }}
                      placeholder="e.g. ABCDE1234F"
                      className={`${styles.desktopInput}${panHasError ? ` ${styles.desktopInputError}` : ""}`}
                      suppressHydrationWarning
                    />
                    {panInvalid && (
                      <p className={styles.desktopErrorText}>
                        *Please enter a valid PAN
                      </p>
                    )}
                    {panNotPersonal && (
                      <p className={styles.desktopErrorText}>
                        *We accept Personal PanCard Numbers Only
                      </p>
                    )}
                    {panSpecialChar && (
                      <p className={styles.desktopErrorText}>
                        *Special Characters are not allow
                      </p>
                    )}
                    <button
                      type="button"
                      className={styles.accordionToggle}
                      onClick={() => setShowSamplePan((v) => !v)}
                      aria-expanded={showSamplePan}
                      suppressHydrationWarning
                    >
                      <span className={styles.accordionToggleText}>
                        View sample PAN
                      </span>
                      <ChevronSvg open={showSamplePan} />
                    </button>
                    {showSamplePan && <PanCardCarousel />}
                  </div>
                </div>

                {/* ── Date of Birth field ── */}
                {/* DateField — masked DD/MM/YYYY manual entry, icon-only picker, 250px wide */}
                <div className={`${styles.desktopFormRow} ${styles.desktopFormRowCenter}`}>
                  <label htmlFor="desk-dob" className={styles.desktopLabel}>
                    Date of Birth
                  </label>
                  <div className={styles.desktopCalWrap}>
                    <DateField
                      inputId="desk-dob"
                      value={strToDate(dob)}
                      onChange={(d) => { setDob(dateToStr(d)); setDobError(''); }}
                      autoPad
                      onError={(msg) => setDobError(msg ?? '')}
                      minDate={dobMinDate}
                      maxDate={dobMaxDate}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className={`p-prime-cal${dobError ? ' p-prime-cal-error' : ''}`}
                    />
                    {dobError && (
                      <p className={styles.desktopErrorText}>{dobError}</p>
                    )}
                  </div>
                </div>

                {/* ── Full Name field ── */}
                {/* Figma: label w-231 16px Regular #666; input w-250 h-40 */}
                <div
                  className={`${styles.desktopFormRow} ${styles.desktopFormRowCenter}`}
                >
                  <label htmlFor="desk-name" className={styles.desktopLabel}>
                    Full Name
                  </label>
                  <div>
                    <input
                      id="desk-name"
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value.toUpperCase());
                        setNameError("");
                      }}
                      placeholder="Enter name as on PAN"
                      className={`${styles.desktopInput}${nameError ? ` ${styles.desktopInputError}` : ""}`}
                      suppressHydrationWarning
                    />
                    {nameError && (
                      <p className={styles.desktopErrorText}>{nameError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Figma 1:64493: security banner + button, 32px gap */}
              <div className={styles.desktopBottomSection}>
                <SecurityBanner />
                {/* Figma: centered, w-350, h-56, bg #280071, 16px SemiBold white */}
                <div className={styles.desktopProceedWrapper}>
                  <LoadingButton
                    type="submit"
                    className={styles.desktopProceedBtn}
                    suppressHydrationWarning
                  >
                    Verify PAN
                  </LoadingButton>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* ═══ VERIFYING OVERLAY — desktop (Figma 1:4567) ═══════════════════════
          rgba(0,0,0,0.6) full-screen + white centered dialog (500px)
      ════════════════════════════════════════════════════════════════════════ */}
      {showVerifying && (
        // Transient progress overlay, no interactive content — a live status
        // region (not a focus-trapping dialog) so screen readers announce the
        // verifying state without stranding keyboard users (WCAG 4.1.3).
        <div
          className={styles.verifyingOverlay}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Verifying PAN"
        >
          <div className={styles.verifyingDialog}>
            <VerifyingContent />
          </div>
        </div>
      )}

      {/* ═══ VERIFYING SHEET — mobile (Figma 1:5501) ══════════════════════════
          Onboarding-Mob-PANMANUAL-Verification-Drawer
          Bottom sheet: dash handle + loading animation + title + subtitle
      ════════════════════════════════════════════════════════════════════════ */}
      {showVerifying && (
        <div
          className={styles.verifyingSheetOverlay}
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Verifying PAN"
        >
          <div className={styles.verifyingSheet}>
            {/* Figma: dash handle — 100×24px, centered */}
            <button
              type="button"
              className={styles.sheetDashBtn}
              aria-label="Close"
            >
              <div className={styles.sheetDashImg} aria-hidden="true" />
            </button>
            <div className={styles.sheetContent}>
              <VerifyingContent />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
