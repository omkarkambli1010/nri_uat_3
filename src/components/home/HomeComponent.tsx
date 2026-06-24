"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import { Toast } from "primereact/toast";
import type { Iti } from "intl-tel-input";
import { useSpinner } from "@/components/spinner/Spinner";
import apiService from "@/services/api.service";
import moengagesdkService from "@/services/moengagesdk.service";
import styles from "./home.module.scss";
import { publicPath } from "@/utils/publicPath";
import { APP_VERSION } from "@/lib/version";
import LoadingButton from '@/components/ui/LoadingButton';

// Home component — equivalent to Angular HomeComponent
// Handles: registration form (mobile), mobile OTP, email OTP, Google OAuth

const WHY_DEMAT_CARDS = [
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/sbi-legacy-2.svg"),
        inset: "0.01% 7.49% 0 7.46%",
      },
    ],
    alt: "SBI's Legacy and Trust",
    title: "Trusted Brand",
    subtitle:
      "Backed by the strength of SBI, India's most trusted and largest public sector bank.",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/community-2.svg"),
        inset: "14.58% 1% 14.56% 0.99%",
      },
    ],
    alt: "Community of 4+ million investors",
    title: "Global Access",
    subtitle:
      "Trade from anywhere in the world with our secure and user-friendly online trading platform.",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/products-2.svg"),
        inset: "0.7% 0.7% 0.68% 0.73%",
      },
    ],
    alt: "Invest in multiple products with a single app",
    title: "Dedicated Support",
    subtitle:
      "Get expert assistance and guidance tailored specifically for NRIs.",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/branches-2.svg"),
        inset: "4.1% 0.83% 4.11% 0.8%",
      },
    ],
    alt: "Wide Network of 80+ Branches across India",
    title: "Competitive Charges",
    subtitle:
      "Transparent and competitive brokerage charges, ensuring value for your investments.",
  },
  {
    imgs: [
      { src: publicPath("/assets/images/why-demat/research-2.svg"), inset: "0 0 0 0.01%" },
    ],
    alt: "Research recommended stocks",
    title: "Multi-Account Integration",
    subtitle:
      "Easily link your NRE/NRO bank accounts for smooth repatriation and fund management.",
  },
];

const NRI_INFO_TABS: {
  label: string;
  intro?: string;
  points: { strong?: string; text?: string; sub?: string[] }[];
}[] = [
  {
    label: "Eligibility Criteria",
    intro: "To open an NRI Demat and Trading Account, you must:",
    points: [
      { text: "You have attained NRI status as per FEMA guidelines." },
      {
        text: "You have an NRE or NRO savings account with State Bank of India (SBI).",
      },
      { text: "You have a valid PAN card and complete KYC documentation." },
    ],
  },
  {
    label: "How to Get Started",
    points: [
      {
        strong: "Fill the Online Form:",
        text: "Start your journey by filling out a simple online application form.",
      },
      {
        strong: "Submit KYC Documents:",
        text: "Upload necessary documents such as passport, proof of NRI status, and bank details.",
      },
      {
        strong: "PIS Permission:",
        text: " Get assistance in obtaining RBI’s PIS approval for trading.",
      },
      {
        strong: "Start Trading:",
        text: "Once your account is activated, you’re ready to trade and invest in the Indian stock markets!",
      },
    ],
  },
  {
    label: "KYC Documents required",
    points: [
      {
        text: "Copy of Valid Passport (with relevant pages showing personal details and validity)",
      },
      {
        text: "Valid visa or Resident / Work permit showing current residential status outside India",
      },
      {
        text: "Proof of Overseas address (Tenancy Contract, Utility bills etc.)",
      },
      { text: "Indian address proof (as applicable)" },
      { text: "Aadhar card (as applicable)" },
      { text: "TIN (Tax Identification Number) Proof of Overseas country" },
      { text: "Latest 3 months' SBI NRE/NRO Bank Account statement" },
      { text: "Two recent passport-sized photographs" },
    ],
  },
  {
    label: "Important Points to Note",
    points: [
      {
        text: "All KYC & Bank documents should be self-attested and notarized by authorized officials.",
      },
      {
        text: "In-person verification with original seen & verified attestation is mandatory on your KYC documents",
      },
      {
        strong: "For Face-to-Face Customers (When in India):",
        text: " KYC documents must be verified in person with the original attestation by State Bank of India (SBI) or SBI Securities Limited (SSL) officials.",
      },
      {
        strong: "For Non-Face-to-Face Customers (When Outside India):",
        text: "KYC documents must be verified in person with the original attestation by any one of the following:",
        sub: [
          "SBI Overseas Branch officials (with their SS number)",
          "Existing bankers",
          "Authorized officials of overseas branches of Scheduled Commercial Banks registered in India",
          "Notary Public, Court, Magistrate, Judge",
          "Indian Embassy/Consulate General in the country where you reside (with relevant details of such officials)",
          "KYC documents in any language other than English or Hindi must be translated into English by a certified translator/interpreter; or an official of the Embassy of the Country where the document is issued.",
        ],
      },
    ],
  },
];

const FOOTER_LINKS = [
  { label: "Investor Charter", href: "https://www.sbisecurities.in/investor-charter" },
  { label: "Investor Awareness", href: "https://www.sbisecurities.in/investor-awareness" },
  { label: "Security tips", href: "https://www.sbisecurities.in/security-tips" },
  { label: "Disclaimer", href: "https://www.sbisecurities.in/disclaimer" },
  {
    label: "Privacy Policy",
    href: "https://www.sbisecurities.in/fileserver/pdf/Privacy-Policy.pdf",
  },
  {
    label: "Cookies Policy",
    href: "https://www.sbisecurities.in/fileserver/pdf/Cookies-Policy.pdf",
  },
  { label: "Terms & Conditions", href: "https://www.sbisecurities.in/terms" },
  { label: "SCORES", href: "https://www.scores.gov.in/scores/Welcome.html" },
  {
    label: "Online Resolution of Disputes (ODR)",
    href: "https://smartodr.in/intermediary/login",
  },
  {
    label: "DND Policy",
    href: "https://www.sbisecurities.in/fileserver/pdf/compliance/DND%20Policy.pdf",
  },
];

export default function HomeComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  // Form state
  const [sendOtp, setSendOtp] = useState({ mobile: "" });
  const [mobileDigitReq, setMobileDigitReq] = useState(false);
  const [mobileErrorMsg, setMobileErrorMsg] = useState(
    "Invalid mobile number format. Please check and try again"
  );
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isDisabledLoginBtn, setIsDisabledLoginBtn] = useState(true);
  const [accountType, setAccountType] = useState<
    "semi-digital" | "digital" | ""
  >("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rmAssisted, setRmAssisted] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [rmCodeError, setRmCodeError] = useState("");

  // RM code rule: alphanumeric, 1–15 characters.
  const RM_CODE_REGEX = /^[a-zA-Z0-9]{1,15}$/;

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const itiRef = useRef<Iti | null>(null);
  const toastRef = useRef<Toast>(null);
  const homeRef = useRef<HTMLDivElement>(null);

  // OTP state — kept for API integration (getMobileOtpVerify / startTimer)
  const [otpMobile, setOtpMobile] = useState("");
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);

  // Timer state — kept for API integration (startTimer)
  const [timeLeft, setTimeLeft] = useState(30);
  const [timeroff, setTimeroff] = useState(true);
  const [displayMobile, setDisplayMobile] = useState(30);

  // FATF Modal state
  const [showFatfModal, setShowFatfModal] = useState(false);

  // NRI info tabs (Eligibility / How to Get Started / KYC / Important Points)
  const [activeInfoTab, setActiveInfoTab] = useState(0);

  const FATF_COUNTRIES = [
    "South Sudan",
    "Netherlands",
    "Algeria",
    "Angola",
    "Bolivia",
    "British Virgin Islands",
    "Bulgaria",
    "Burkina Faso",
    "Myanmar",
    "Cameroon",
    "Democratic Republic of the Congo",
    "Haiti",
    "Iran",
    "Kenya",
    "Laos",
    "Lebanon",
    "Monaco",
    "Mozambique",
    "Namibia",
    "Nepal",
    "Nigeria",
    "Sao Tome and Principe",
    "South Africa",
    "Syria",
    "Venezuela",
    "Vietnam",
    "Yemen",
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientid =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("clientid") ?? "")
      : "";

  // Reveal-on-scroll: fade + slide each section into view as it enters the
  // viewport. The first (banner) section is above the fold, so it animates in
  // on page load. Honours prefers-reduced-motion.
  useEffect(() => {
    const root = homeRef.current;
    if (!root) return;

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>(":scope > section, :scope > footer"),
    );
    if (!sections.length) return;

    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReduced || !("IntersectionObserver" in window)) {
      sections.forEach((el) => el.classList.add(styles.revealVisible));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.revealVisible);
            observer.unobserve(entry.target);
          }
        });
      },
      // No negative bottom margin: thin, bottom-pinned elements (like the
      // version bar) must still reveal once scrolled fully into view.
      { threshold: 0.08, rootMargin: "0px" },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.title =
      "Open Demat Account - Free Demat & Trading Account Opening Online | SBI Securities";

    let mounted = true;
    const cleanupRef = { fn: undefined as (() => void) | undefined };

    // Dynamically import intl-tel-input so it never runs during SSR
    import("intl-tel-input/intlTelInputWithUtils").then(
      ({ default: intlTelInput }) => {
        if (!mounted || !phoneInputRef.current) return;

        const iti = intlTelInput(phoneInputRef.current, {
          // No default country: the selector shows a "Code" placeholder
          // (see home.module.scss) until the user picks a country.
          initialCountry: "",
          separateDialCode: true,
          countrySearch: true,
          // Always use the inline dropdown (anchored below the input) instead of
          // the mobile fullscreen popup, which on iOS/Android zoomed the UI and
          // scrolled the page horizontally.
          useFullscreenPopup: false,
          formatAsYouType: true,
          formatOnDisplay: true,
          excludeCountries: [
            "dz",
            "ao",
            "bo",
            "vg",
            "bg",
            "bf",
            "mm",
            "cm",
            "cg",
            "cd",
            "ht",
            "ir",
            "ke",
            "la",
            "lb",
            "mc",
            "mz",
            "na",
            "np",
            "ng",
            "kp",
            "st",
            "za",
            "ss",
            "vn",
            "ye",
          ],
        });
        itiRef.current = iti;

        // Pre-fill from session
        const savedMobile = sessionStorage.getItem("mobile");
        if (savedMobile) {
          const e164 = savedMobile.startsWith("+")
            ? savedMobile
            : `+91${savedMobile}`;
          iti.setNumber(e164);
          const prefillType = iti.getNumberType();
          const isValid =
            iti.isValidNumberPrecise() === true &&
            (prefillType === "MOBILE" || prefillType === "FIXED_LINE_OR_MOBILE");
          setSendOtp((prev) => ({ ...prev, mobile: e164 }));
          setIsPhoneValid(isValid);
        }

        const handlePhoneChange = () => {
          // India: mobile numbers must start with 6-9. Strip any leading 0-5
          // (e.g. introduced via paste) before reading the value.
          if (
            iti.getSelectedCountryData()?.iso2 === "in" &&
            phoneInputRef.current
          ) {
            const digits = phoneInputRef.current.value.replace(/\D/g, "");
            const cleaned = digits.replace(/^[0-5]+/, "");
            if (cleaned !== digits) {
              iti.setNumber(cleaned ? `+91${cleaned}` : "");
            }
          }

          // BRD: changing the country code or mobile number invalidates the
          // downstream choices. Clear the account type, terms acceptance and RM
          // selection so the user explicitly re-confirms them for the new number.
          // (No-op when nothing was selected — React skips identical state.)
          setAccountType("");
          setTermsAccepted(false);
          setRmAssisted(false);
          setEmployeeId("");
          setRmCodeError("");

          const fullNumber = iti.getNumber();
          const nationalInput = phoneInputRef.current?.value ?? "";
          const hasCountryCode = !!iti.getSelectedCountryData()?.iso2;
          // Accept a number only when it is precisely valid AND a mobile type for
          // the selected country. This catches numbers whose pattern doesn't
          // match the country code — e.g. a UAE number starting with 6, which is
          // a valid fixed-line but not a mobile, so it must be rejected.
          const numberType = iti.getNumberType();
          const isMobileType =
            numberType === "MOBILE" || numberType === "FIXED_LINE_OR_MOBILE";
          const isValid = iti.isValidNumberPrecise() === true && isMobileType;
          const invalid = nationalInput.length > 0 && !isValid;
          setSendOtp((prev) => ({ ...prev, mobile: fullNumber }));
          setMobileDigitReq(invalid);
          // No country code selected yet → guide the user to pick one; otherwise
          // the number doesn't match the selected country's mobile pattern.
          setMobileErrorMsg(
            invalid
              ? hasCountryCode
                ? "Invalid mobile number format. Please check and try again"
                : "Please select the country code."
              : ""
          );
          setIsPhoneValid(isValid);
        };

        // Block typing 0-5 as the first digit of an Indian mobile number.
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key < "0" || e.key > "9") return; // only guard digit keys
          if (iti.getSelectedCountryData()?.iso2 !== "in") return;
          const caret = phoneInputRef.current?.selectionStart ?? 0;
          const digitsBeforeCaret = (phoneInputRef.current?.value ?? "")
            .slice(0, caret)
            .replace(/\D/g, "");
          if (digitsBeforeCaret.length === 0 && e.key >= "0" && e.key <= "5") {
            e.preventDefault();
          }
        };

        const inputEl = phoneInputRef.current;
        inputEl.addEventListener("input", handlePhoneChange);
        inputEl.addEventListener("countrychange", handlePhoneChange);
        inputEl.addEventListener("keydown", handleKeyDown);

        // Prevent page scroll when wheeling inside the country dropdown list
        const countryListEl = inputEl
          .closest(".iti")
          ?.querySelector(".iti__country-list") as HTMLElement | null;
        const stopPageScroll = (e: WheelEvent) => {
          e.preventDefault();
          e.stopPropagation();
          (e.currentTarget as HTMLElement).scrollTop += e.deltaY;
        };
        countryListEl?.addEventListener(
          "wheel",
          stopPageScroll as EventListener,
          { passive: false },
        );

        cleanupRef.fn = () => {
          inputEl.removeEventListener("input", handlePhoneChange);
          inputEl.removeEventListener("countrychange", handlePhoneChange);
          inputEl.removeEventListener("keydown", handleKeyDown);
          countryListEl?.removeEventListener(
            "wheel",
            stopPageScroll as EventListener,
          );
          iti.destroy();
          if (intervalRef.current) clearInterval(intervalRef.current);
        };
      },
    );

    // Handle status query params
    const status = searchParams?.get("status");
    if (status === "exhausted") {
      toastRef.current?.show({
        severity: "warn",
        detail:
          "Your Mobile OTP request limit is exhausted, please retry to log in after 15 minutes",
        life: 5000,
      });
    } else if (status === "internal_server_error") {
      toastRef.current?.show({
        severity: "error",
        detail: "Internal Server Error",
        life: 2000,
      });
    }

    // Handle Google OAuth callback params
    const emailVerified = searchParams?.get("email_verified");
    const emailParam = searchParams?.get("email");
    const emailError = searchParams?.get("Error");

    if (emailParam && emailVerified === "true") {
      moengagesdkService.MoeInit();
      getEmailOtpVerify(false);
    } else if (emailError) {
      moengagesdkService.MoeInit();
      toastRef.current?.show({
        severity: "error",
        detail: "Google Authentication Failed, Please Try Again...",
        life: 5000,
      });
    }

    return () => {
      mounted = false;
      cleanupRef.fn?.();
    };
  }, []);

  // Reactive button enable/disable: phone + account type + terms + (when
  // RM-assisted) a valid RM code.
  useEffect(() => {
    const rmCodeValid = !rmAssisted || RM_CODE_REGEX.test(employeeId);
    setIsDisabledLoginBtn(
      !(isPhoneValid && accountType !== "" && termsAccepted && rmCodeValid),
    );
  }, [isPhoneValid, accountType, termsAccepted, rmAssisted, employeeId]);

  // ===== Mobile OTP =====
  const startTimer = () => {
    setTimeroff(true);
    setTimeLeft(30);
    setDisplayMobile(30);
    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayMobile((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setTimeroff(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // uiMetadata is a JSON string from the register API carrying the next route, e.g.
  // "{\"route\": \"mobile-home-otp\"}". Returns '' if missing/unparseable.
  const parseRoute = (uiMetadata?: string): string => {
    try {
      return JSON.parse(uiMetadata ?? "{}").route ?? "";
    } catch {
      return "";
    }
  };

  const handleGetStarted = async () => {
    // Block proceeding with an RM-assisted journey unless the RM code is valid.
    if (rmAssisted && !RM_CODE_REGEX.test(employeeId)) {
      setRmCodeError("Please enter a valid RM code.");
      return;
    }

    const isSemiDigital = accountType === "semi-digital";

    // emailAddress and rmCode are optional: the backend rejects the literal "NA"
    // (COMMON_002) but accepts null/absent. Email is collected later on the email
    // screen (which re-registers), and rmCode is null unless RM-assisted.
    const payload: Record<string, string | null> = {
      mobileNumber: sendOtp.mobile,
      countryCode:
        itiRef.current?.getSelectedCountryData()?.iso2?.toUpperCase() ?? "",
      journeyType: isSemiDigital ? "NriSemiDigital" : "NroDigital",
      loginProvider: "Mobile",
      rmCode: rmAssisted && employeeId ? employeeId : null,
      UtmSource: searchParams?.get("utm_source") || "NA",
      UtmCampaign: searchParams?.get("utm_campaign") || "NA",
    };

    console.log("Register payload:", payload);

    showSpinner();
    try {
      const response = await apiService.registerUser(payload, hideSpinner);
      if (!response) {
        hideSpinner();
        return;
      }

      sessionStorage.setItem("mobile", sendOtp.mobile);
      sessionStorage.setItem("accountType", accountType);
      // Persist the register payload so the email-home-textpage can re-register
      // with the entered email address (fields like countryCode/rmCode aren't
      // otherwise stored).
      sessionStorage.setItem("registerPayload", JSON.stringify(payload));
      if (response.applicationId) {
        sessionStorage.setItem("ApplicationId", response.applicationId);
      }
      if (response.applicationNumber) {
        sessionStorage.setItem("applicationNumber", response.applicationNumber);
      }
      sessionStorage.setItem(
        "otpChannel",
        sendOtp.mobile.startsWith("+91") ? "sms" : "whatsapp",
      );

      hideSpinner();

      // ── Semi-Digital: bypass uiMetadata routing entirely.
      // If the backend has already verified the email (verifiedEmail === true),
      // store the emailAddress from the response and jump straight to the
      // Email OTP screen. No mobile OTP toast for Semi-Digital.
      if (isSemiDigital) {
        if (response.verifiedEmail === true && response.emailAddress) {
          sessionStorage.setItem("email", response.emailAddress);
          const nextRoute = parseRoute(response.uiMetadata);
          if (nextRoute) {
            router.push(`/${nextRoute}`);
          }
        } else {
          // verifiedEmail is false / absent — fall back to uiMetadata route
          // so the user can enter their email first.
          const nextRoute = parseRoute(response.uiMetadata);
          if (nextRoute) {
            router.push(`/${nextRoute}`);
          }
        }
        return;
      }

      // ── Digital journey: route via uiMetadata as before.
      toastRef.current?.show({
        severity: "success",
        detail: "OTP sent successfully",
        life: 3000,
      });
      const nextRoute = parseRoute(response.uiMetadata);
      if (nextRoute) {
        router.push(`/${nextRoute}`);
      }
    } catch {
      hideSpinner();
    }
  };

  const getMobileOtpVerify = async (isResend: boolean) => {
    showSpinner();
    try {
      const payload = {
        mobile: sendOtp.mobile,
        otp: otpMobile,
        clientid,
      };
      const response = await apiService.postRequest(
        "VerifyMobileOTP",
        payload,
        hideSpinner,
      );
      if (response) {
        setIsRightOTP(true);
        setIsWrongOTP(false);
        sessionStorage.setItem("token", response.token ?? "");
        // Navigate to next step
        const routes: string[] = response.routes ?? [];
        sessionStorage.setItem("allowedRoutes", JSON.stringify(routes));
        router.push(routes[0] ?? "/email");
      } else {
        setIsWrongOTP(true);
        setIsRightOTP(false);
      }
    } catch {
      hideSpinner();
    }
  };

  const getEmailOtpVerify = async (isResend: boolean) => {
    showSpinner();
    try {
      const emailParam = searchParams?.get("email") ?? "";
      const payload = {
        email: emailParam,
        clientid,
      };
      const response = await apiService.postRequest(
        "VerifyEmailOTP",
        payload,
        hideSpinner,
      );
      if (response) {
        sessionStorage.setItem("token", response.token ?? "");
        const routes: string[] = response.routes ?? [];
        sessionStorage.setItem("allowedRoutes", JSON.stringify(routes));
        router.push(routes[0] ?? "/uploadProcess/1");
      }
    } catch {
      hideSpinner();
    }
  };

  return (
    <div className={styles.homeRoot} ref={homeRef}>
      {/* Banner Section */}
      <section
        aria-label="Open Demat and Trading Account"
        className={`${styles.banner} banner`}
      >
        {/* Decorative circles */}
        <div className={styles.decorCirclePink} aria-hidden="true" />
        <div className={styles.decorCircleBlue} aria-hidden="true" />

        <div className="container">
          <div className={`row ${styles.bannerImg}`}>
            {/* Left — headline + phone mockup + floating cards */}
            <div className="col-md-6 col-lg-6 col-12">
              <div className={styles.bannerLeft}>
                <h1 className={styles.bannerHeadline}>
                  Trade Fast,
                  <br />
                  Invest Smarter
                </h1>
                <div className={styles.phoneContainer}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={publicPath("/assets/images/diy/home-phone-mockup.png")}
                    alt="SBI Securities Trading App"
                    className={styles.phoneMockup}
                  />
                  {/* ZERO brokerage card */}
                  <div className={`${styles.floatingCard} ${styles.cardZero}`}>
                    <span className={styles.cardValuePrimary}>ZERO</span>
                    <span className={styles.cardDesc}>
                      Brokerage on Intraday
                    </span>
                  </div>
                  {/* ₹20 per order card */}
                  <div className={`${styles.floatingCard} ${styles.cardRate}`}>
                    <span className={styles.cardValueBlue}>
                      <span className={styles.rupeeSymbol}>₹</span>20
                    </span>
                    <span className={styles.cardDesc}>
                      per order for carry forward trades
                    </span>
                  </div>
                  {/* Free 1st Year AMC card */}
                  <div className={`${styles.floatingCard} ${styles.cardFree}`}>
                    <span className={styles.cardValueRed}>Free</span>
                    <span className={styles.cardDesc}>
                      1<sup>st</sup> Year AMC
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — NRI form card */}
            <div className="col-md-6 col-lg-6 col-12">
              <div className={styles.mobileForm}>
                <form aria-label="Open NRI Account Registration Form">
                  <h1>Open Your NRI Account Now!</h1>

                  {/* Mobile with country code */}
                  <div>
                    <input
                      ref={phoneInputRef}
                      type="tel"
                      className="form-control otp_field"
                      placeholder="Mobile Number *"
                      aria-label="Mobile Number"
                      aria-required="true"
                      name="MobileNo"
                      inputMode="numeric"
                      suppressHydrationWarning
                    />
                    {mobileDigitReq && (
                      <span className="red_warning">*{mobileErrorMsg}</span>
                    )}
                  </div>

                  {/* Account Type */}
                  <div className={styles.accountTypeSection}>
                    <span className={styles.accountTypeLabel}>
                      Choose Account
                      <br />
                      Type :
                    </span>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="accountType"
                          value="semi-digital"
                          checked={accountType === "semi-digital"}
                          onChange={() => setAccountType("semi-digital")}
                        />
                        <span>
                          Semi-Digital Journey - NRE/NRO account{" "}
                          <small>(Outside India / without Aadhar)</small>
                        </span>
                      </label>
                      <label className={styles.radioOption}>
                        <input
                          type="radio"
                          name="accountType"
                          value="digital"
                          checked={accountType === "digital"}
                          onChange={() => setAccountType("digital")}
                        />
                        <span>
                          Digital Journey - NRO Account
                          <br />
                          <small>
                            ( Available only in India with Aadhar e-sign)
                          </small>
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className={styles.btnAlign}>
                    {/* Terms & FATF */}
                    <div className={styles.termsRow}>
                      <input
                        type="checkbox"
                        id="termsCheck"
                        className={styles.termsCheck}
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                      />
                      <label htmlFor="termsCheck" className={styles.termsLabel}>
                        By submitting this, I accept all the{" "}
                        <span
                          role="link"
                          tabIndex={0}
                          className={`${styles.textGradient} ${styles.linkText}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            window.open(
                              "https://www.sbisecurities.in/fileserver/regulation/terms-and-conditions.html",
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              window.open(
                                "https://www.sbisecurities.in/fileserver/regulation/terms-and-conditions.html",
                                "_blank",
                                "noopener,noreferrer",
                              );
                            }
                          }}
                        >
                          Terms &amp; Conditions
                        </span>{" "}
                        &amp; also confirming that I am not resident of{" "}
                        <span
                          role="button"
                          tabIndex={0}
                          className={`${styles.textGradient} ${styles.linkText}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowFatfModal(true);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setShowFatfModal(true);
                            }
                          }}
                          aria-label="View FATF Sanction Countries"
                        >
                          FATF
                        </span>{" "}
                        Sanction Country list.
                      </label>
                    </div>

                    {/* RM */}
                    <div className={styles.termsRow}>
                      <input
                        type="checkbox"
                        id="rmCheck"
                        className={styles.termsCheck}
                        checked={rmAssisted}
                        onChange={(e) => {
                          setRmAssisted(e.target.checked);
                          if (!e.target.checked) {
                            setEmployeeId("");
                            setRmCodeError("");
                          }
                        }}
                      />
                      <label htmlFor="rmCheck" className={styles.termsLabel}>
                        Are you being assisted by a RM?
                      </label>
                    </div>
                    {rmAssisted && (
                      <div>
                        <input
                          type="text"
                          className="form-control otp_field"
                          placeholder="RM Code *"
                          aria-label="RM Code"
                          aria-required="true"
                          inputMode="text"
                          autoCapitalize="characters"
                          value={employeeId}
                          onChange={(e) => {
                            // Allow only alphanumeric, capped at 15 characters.
                            const cleaned = e.target.value
                              .replace(/[^a-zA-Z0-9]/g, "")
                              .slice(0, 15);
                            setEmployeeId(cleaned);
                            if (RM_CODE_REGEX.test(cleaned)) setRmCodeError("");
                          }}
                          onBlur={() => {
                            setRmCodeError(
                              RM_CODE_REGEX.test(employeeId)
                                ? ""
                                : "Please enter a valid RM code.",
                            );
                          }}
                          maxLength={15}
                        />
                        {rmCodeError && (
                          <span className="red_warning">*{rmCodeError}</span>
                        )}
                      </div>
                    )}

                    <LoadingButton
                      type="button"
                      className={`btn ${styles.submitBtn}`}
                      disabled={isDisabledLoginBtn}
                      aria-disabled={isDisabledLoginBtn}
                      onClick={handleGetStarted}
                    >
                      Get Started
                    </LoadingButton>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Invest in India Intro Section */}
      <section
        aria-label="Invest in India from Anywhere in the World"
        className={styles.investIntro}
      >
        <div className="container">
          <div className="row">
            <div className="col-12">
              <h2 className={styles.investIntroHeading}>
                Invest in India from Anywhere in the World
              </h2>
              <p className={styles.investIntroText}>
                SBI Securities offers you a seamless way to invest in the{" "}
                <span className={styles.investIntroHighlight}>Indian</span> stock
                markets, no matter where you are. With our comprehensive{" "}
                <span className={styles.investIntroHighlight}>
                  NRI Demat and Trading
                </span>{" "}
                account, Non-Resident Indians (NRIs) can trade and manage
                investments effortlessly in{" "}
                <span className={styles.investIntroHighlight}>Indian</span>{" "}
                equities, bonds, IPOs and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Open Demat Section */}
      <section
        aria-label="Why Open Demat Account With SBI Securities"
        className={styles.whyOpenDemat}
      >
        <div className="container">
          <div className="row">
            <div className={styles.align}>
              <h2 className="page-heading">
               Why Choose SBI Securities?
              </h2>
              <div className={styles.cardAlign}>
                {WHY_DEMAT_CARDS.map((card) => (
                  <div key={card.title} className={styles.cardCls}>
                    <div className={styles.iconWrapper}>
                      {card.imgs.map((img, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={i}
                          src={img.src}
                          alt={i === 0 ? card.alt : ""}
                          className={styles.iconLayer}
                          style={{ inset: img.inset }}
                          draggable={false}
                        />
                      ))}
                    </div>
                    <h6>{card.title}</h6>
                    <p>{card.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Key Features Section */}
      <section
        aria-label="Key Features of NRI Demat & Trading Account"
        className={styles.whyOpenDemat}
      >
        <div className="container">
          <div className="row">
            <div className={styles.align}>
              <h2 className="page-heading">
                Key Features of NRI Demat & Trading Account
              </h2>
              <div className={styles.cardAlign}>
                {[
                  {
                    src: publicPath("/assets/images/diy/pancardicon.png"),
                    title: "Simple and Fast Account Opening",
                    desc: "Hassle-free online process with minimal documentation.",
                  },
                  {
                    src: publicPath("/assets/images/diy/addressprooficon-1.png"),
                    title: "Multiple Investment Options",
                    desc: "Access a wide range of investment opportunities, including equities, IPOs, mutual funds, ETFs, and bonds.",
                  },
                  {
                    src: publicPath("/assets/images/diy/nominee-icon.png"),
                    title: "Portfolio Investment Scheme (PIS) Compliant",
                    desc: "Invest in Indian markets in full compliance with RBI's Portfolio Investment Scheme (PIS) regulations.",
                  },
                  {
                    src: publicPath("/assets/images/diy/signatureicon-1.png"),
                    title: "Repatriation Benefits",
                    desc: "Conveniently transfer your profits and investments abroad with the NRE account (repatriation basis).",
                  },
                  {
                    src: publicPath("/assets/images/diy/cancelled-cheque.png"),
                    title: "Real-Time Market Access",
                    desc: "Stay updated with real-time stock quotes, charts, and research insights to make informed decisions.",
                  },
                ].map((card) => (
                  <div key={card.title} className={styles.cardCls}>
                    <div>
                      <Image
                        src={card.src}
                        alt={card.title}
                        width={60}
                        height={60}
                        draggable={false}
                      />
                    </div>
                    <div>
                      <h6>{card.title}</h6>
                      <p>{card.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NRI Account Info Tabs Section */}
      <section
        aria-label="NRI Account Information"
        className={styles.infoTabsSection}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h2 className="page-heading text-center">Open Your NRI Demat Account</h2>
            </div>
            <div className="col-lg-12">
              <div
                className={styles.infoTabsNav}
                role="tablist"
                aria-label="NRI account information tabs"
              >
                {NRI_INFO_TABS.map((tab, idx) => (
                  <button
                    key={tab.label}
                    type="button"
                    role="tab"
                    id={`info-tab-${idx}`}
                    aria-selected={activeInfoTab === idx}
                    aria-controls={`info-panel-${idx}`}
                    className={`${styles.infoTabBtn} ${
                      activeInfoTab === idx ? styles.infoTabBtnActive : ""
                    }`}
                    onClick={() => setActiveInfoTab(idx)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              {NRI_INFO_TABS.map((tab, idx) => (
                <div
                  key={tab.label}
                  role="tabpanel"
                  id={`info-panel-${idx}`}
                  aria-labelledby={`info-tab-${idx}`}
                  hidden={activeInfoTab !== idx}
                  className={styles.infoTabPanel}
                >
                  {tab.intro && (
                    <p className={styles.infoTabIntro}>{tab.intro}</p>
                  )}
                  <ul className={styles.infoTabList}>
                    {tab.points.map((point, i) => (
                      <li key={i}>
                        {point.strong && <strong>{point.strong}</strong>}
                        {point.text}
                        {point.sub && (
                          <ul className={styles.infoTabSubList}>
                            {point.sub.map((s, j) => (
                              <li key={j}>{s}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What is Demat Section */}
      <section
        aria-label="What is a Demat Account"
        className={styles.dematSection}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <h2 className="page-heading text-center">What is Demat Account?</h2>
            </div>
            <div>
              <br />
            </div>
            <div>
              <p>
                A Demat account, short for &quot;Dematerialized account,&quot;
                is like a digital vault for your stocks and securities. It holds
                them in electronic form instead of physical certificates. It
                makes buying, selling, and transferring shares easier in the
                stock market, eliminating the need for paperwork.
              </p>
              <p>
                Dematerialisation is the process by which physical certificates
                are converted into electronic balances. That way, you do not
                have to hold physical certificates of shares or bonds, but
                instead hold them just as a credit entry in your demat account
                opened with NSDL or with CDSL.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Toast ref={toastRef} position="bottom-center" />

      {/* FATF Modal */}
      {showFatfModal && (
        <div
          className={styles.modalOverlay}
          onClick={() => setShowFatfModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className={styles.modalHeader}>
              <h2>FATF Countries</h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setShowFatfModal(false)}
                aria-label="Close modal"
              >
                ×
              </button>
            </div>
            <div className={styles.modalBody}>
              <ol className={styles.countriesList}>
                {FATF_COUNTRIES.map((country, index) => (
                  <li key={index}>{country}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Need Help Section */}
      <section
        aria-label="Need Help"
        className={styles.needHelpSection}
      >
        <div className="container">
          {/* <p className={styles.needHelpProceed}>
            Once you have these documents ready, you can proceed with the
            application process.
          </p> */}

          <h2 className={styles.needHelpHeading}>Need Help?</h2>
          <p className={styles.needHelpText}>
            Our dedicated NRI Services team is here to assist you at every step.
            Whether you need help with documentation or have queries about the
            account opening process, we’ve got you covered.
          </p>

          <p className={styles.needHelpTagline}>
            Invest Smart. Invest Globally. Start Your Journey with SBI Securities
            Today
          </p>

          <p className={styles.needHelpContact}>
            <a href="mailto:NRIDESK.SSL@sbicapsec.com">
              E-mail: NRIDESK.SSL@sbicapsec.com
            </a>
            {" | "}
            <a href="tel:+912268567464">Call us: +91 2268567464</a>
          </p>

          <p className={styles.needHelpProducts}>
            Product Offerings: Equity I 54 EC Bonds I IPO I Corporate FDs I
            Insurance I IPO I{" "}
            <a
              href="https://app.sbisecurities.in/loans/car-loan"
              target="_blank"
              rel="noopener noreferrer"
            >
              Car Loan*
            </a>
            I{" "}
            <a
              href="https://app.sbisecurities.in/loans/home-loan"
              target="_blank"
              rel="noopener noreferrer"
            >
              Home Loan*
            </a>
          </p>

          <p className={styles.needHelpDisclaimer}>
            <span>Disclaimer:</span>The NRI Demat and Trading account is subject
            to FEMA and RBI regulations. Please consult your financial advisor
            for personalized advice.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.siteFooter}>
        <div className="container">
          <div className={styles.footerBrand}>
            <h3>SBICAP Securities Limited</h3>
            <p>AMFI Registered Mutual Fund Distributor</p>
            <p>CIN: U65999MH2005PLC155485</p>
          </div>

          <div className={styles.footerDisclaimer}>
            <p>
              Equities: Trading through SBICAP Securities Limited I Website:
              www.sbisecurities.in SEBI Registration No.: Stock Broker:
              INZ000200032 | DP Registration No.: IN-DP-314-2017 | Research
              Analyst : INH000000602 | IRDAI Corporate Agency Reg. No. CA0103;
              AMFI Reg. No. ARN-0011 (Date of initial registration: 19th August
              2005 and valid upto 18th February 2027); PFRDA Reg. No.
              POP26092018. In case of any grievances please write to
              complaints@sbicapsec.com DP related grievance can be sent to:
              dp.grievance@sbicapsec.com | NPS related grievance can be sent to:
              Npsgrievance@sbicapsec.com | Compliance officer - Mr.Srijith
              Menon, email - compliance@sbicapsec.com; Tel No.- 022 - 69316510
            </p>
            <p>
              SBICAP Securities Limited is authorized by the Insurance
              Regulatory and Development Authority of India to act as a
              Corporate Agent from 01- April- 2022 to 31-March 2025 for
              procuring or soliciting insurance business of Life, General and
              Health under license number CA0103, Category: Composite. SBICAP
              Securities Ltd. does not underwrite the risk or act as an insurer.
              The advertisement contains only an indication of the cover
              offered. For more details on risk factors, terms, conditions and
              exclusions, please read the sales brochure carefully before
              concluding a sale. SBI Logo displayed belongs to State Bank of
              India and used by SBICAP Securities Limited under license. Personal
              information as submitted by you will be shared with SBICAP and
              insurer in order to complete your application. By continuing, you
              provide your consent for the above and authorize SBICAP Securities
              representatives to contact you through call, SMS, WhatsApp or
              E-mail for providing assistance towards the application process.
            </p>
            <p>
              BEWARE OF SPURIOUS PHONE CALLS AND FICTITIOUS /FRAUDULENT OFFERS
              IRDAI is not involved in activities like selling insurance
              policies, announcing bonus or investment of premiums. Public
              receiving such phone calls are requested to lodge a police
              complaint. To read more, please click here -{" "}
              <a
                href="https://www.sbisecurities.in/fileserver/pdf/compliance/IRDAI%20Public%20notice.pdf"
                target="_blank"
                rel="noopener noreferrer"
              >
                IRDAI Public Notice
              </a>
            </p>
            <p>
              Copyright © 2026. All rights Reserved. SBICAP Securities Limited.
              Site is best viewed in edge browser, Firefox 38+, Chrome 50+ at
              1366x768 pixel resolution. Windows 10 and above
            </p>
          </div>

          <hr className={styles.footerDivider} />

          <div className={styles.footerLinks}>
            {FOOTER_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      <section className={styles.versionSection}>
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <span>{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
