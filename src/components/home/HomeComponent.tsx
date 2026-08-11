"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Toast } from "primereact/toast";
import { useSpinner } from "@/components/spinner/Spinner";
import { useCountries } from "@/components/country-select/useCountries";
import { dialDigits } from "@/components/country-select/countries";
import CountryCodeSelect from "@/components/country-select/CountryCodeSelect";
import apiService from "@/services/api.service";
import moengagesdkService from "@/services/moengagesdk.service";
import styles from "./home.module.scss";
import { publicPath } from "@/utils/publicPath";
import { APP_VERSION } from "@/lib/version";
import LoadingButton from '@/components/ui/LoadingButton';
import { useFocusTrap } from "@/hooks/useFocusTrap";
import SectionNavigation, {
  type Section,
} from "@/components/SectionNavigation/SectionNavigation";

// Rail entries for the marketing sections below. Each id must match a
// <section id> in the markup; adding a section here adds an indicator.
const HOME_SECTIONS: Section[] = [
  { id: "overview", label: "Overview" },
  { id: "invest-in-india", label: "Invest in India" },
  { id: "why-sbi", label: "Why SBI" },
  { id: "key-features", label: "Key features" },
  { id: "account-info", label: "Account info" },
  { id: "need-help", label: "Need help" },
];

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

  const urlRmCode = searchParams?.get("RMCode") ?? "";
  const urlEmail = (searchParams?.get("Email") ?? "").replace(/%40/gi, "@").trim();
  const urlMobile = (searchParams?.get("Mobile") ?? "").replace(/\D/g, "");
  const urlDialCode = (searchParams?.get("CountryCode") ?? "").replace(/\D/g, "");
  const urlApplicationType = searchParams?.get("ApplicationType") ?? "";
  const urlIsmartId = searchParams?.get("IsmartId") ?? "";
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const { countries: allCountries, selectable: countries } = useCountries();
  const [sendOtp, setSendOtp] = useState({ mobile: "" });
  const [selectedIso2, setSelectedIso2] = useState("");
  const [mobileNational, setMobileNational] = useState("");
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

  const RM_CODE_REGEX = /^[a-zA-Z0-9]{1,15}$/;

  const prefilledRef = useRef(false);
  const toastRef = useRef<Toast>(null);
  const homeRef = useRef<HTMLDivElement>(null);

  const [otpMobile, setOtpMobile] = useState("");
  const [isWrongOTP, setIsWrongOTP] = useState(false);
  const [isRightOTP, setIsRightOTP] = useState(false);

  const [timeLeft, setTimeLeft] = useState(30);
  const [timeroff, setTimeroff] = useState(true);
  const [displayMobile, setDisplayMobile] = useState(30);

  // FATF Modal state
  const [showFatfModal, setShowFatfModal] = useState(false);
  const fatfDialogRef = useFocusTrap<HTMLDivElement>(
    showFatfModal,
    () => setShowFatfModal(false),
  );

  const [activeInfoTab, setActiveInfoTab] = useState(0);

  const FATF_FALLBACK_COUNTRIES = [
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

  const restrictedCountries = allCountries
    .filter((c) => c.status === 'N')
    .map((c) => c.name);
  const fatfCountries = restrictedCountries.length
    ? restrictedCountries
    : FATF_FALLBACK_COUNTRIES;

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
      { threshold: 0.08, rootMargin: "0px" },
    );

    sections.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (urlApplicationType) {
      setAccountType(urlApplicationType === "Digital" ? "digital" : "semi-digital");
    }
    if (urlRmCode) {
      setRmAssisted(true);
      setEmployeeId(urlRmCode);
    }
    if (urlEmail && typeof window !== "undefined") {
      sessionStorage.setItem("email", urlEmail);
    }
  }, []);

  useEffect(() => {
    document.title =
      "Open Demat Account - Free Demat & Trading Account Opening Online | SBI Securities";

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
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const applyPhone = (iso2: string, national: string) => {
    const country = countries.find((c) => c.iso2 === iso2);
    const code = country ? dialDigits(country.dialCode) : "";
    const digits = national.replace(/\D/g, "");
    const fullNumber = code && digits ? `+${code}${digits}` : digits ? digits : "";

    let isValid: boolean;
    if (iso2 === "in") {
      isValid = /^[6-9]\d{9}$/.test(digits);
    } else {
      isValid = !!iso2 && digits.length >= 6 && digits.length <= 15;
    }

    const invalid = digits.length > 0 && !isValid;
    setSendOtp((prev) => ({ ...prev, mobile: fullNumber }));
    setMobileDigitReq(invalid);
    setMobileErrorMsg(
      invalid
        ? iso2
          ? "Invalid mobile number format. Please check and try again"
          : "Please select the country code."
        : "",
    );
    setIsPhoneValid(isValid);
  };
  const resetDownstreamChoices = () => {
    setAccountType("");
    setTermsAccepted(false);
    setRmAssisted(false);
    setEmployeeId("");
    setRmCodeError("");
  };

  const handleCountryChange = (iso2: string) => {
    setSelectedIso2(iso2);
    resetDownstreamChoices();
    applyPhone(iso2, mobileNational);
  };

  const handleMobileChange = (raw: string) => {
    let digits = raw.replace(/\D/g, "");
    if (selectedIso2 === "in") digits = digits.replace(/^[0-5]+/, "");
    setMobileNational(digits);
    resetDownstreamChoices();
    applyPhone(selectedIso2, digits);
  };

  const handleMobileKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key < "0" || e.key > "9") return; // only guard digit keys
    if (selectedIso2 !== "in") return;
    const caret = e.currentTarget.selectionStart ?? 0;
    const digitsBeforeCaret = e.currentTarget.value
      .slice(0, caret)
      .replace(/\D/g, "");
    if (digitsBeforeCaret.length === 0 && e.key >= "0" && e.key <= "5") {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (prefilledRef.current || countries.length === 0) return;
    const fromUrl = urlMobile
      ? urlDialCode
        ? `+${urlDialCode}${urlMobile}`
        : urlMobile
      : null;
    const saved =
      fromUrl ??
      (typeof window !== "undefined" ? sessionStorage.getItem("mobile") : null);
    if (!saved) return;
    prefilledRef.current = true;

    let iso2 = "in";
    let national = saved.replace(/\D/g, "");
    if (saved.startsWith("+")) {
      const digits = saved.slice(1).replace(/\D/g, "");
      let best: typeof countries[number] | undefined;
      let bestLen = 0;
      for (const c of countries) {
        const code = dialDigits(c.dialCode);
        if (code && digits.startsWith(code) && code.length > bestLen) {
          best = c;
          bestLen = code.length;
        }
      }
      if (best) {
        iso2 = best.iso2;
        national = digits.slice(bestLen);
      } else {
        iso2 = "";
        national = digits;
      }
    }

    setSelectedIso2(iso2);
    setMobileNational(national);
    applyPhone(iso2, national);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countries]);

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

    window.sessionStorage.clear();

    // Block proceeding with an RM-assisted journey unless the RM code is valid.
    if (rmAssisted && !RM_CODE_REGEX.test(employeeId)) {
      setRmCodeError("Please enter a valid RM code.");
      return;
    }
    const isSemiDigital = accountType === "semi-digital";
    const selectedCountry = countries.find((c) => c.iso2 === selectedIso2);
    const payload: Record<string, string | null> = {
      mobileNumber: sendOtp.mobile,
      countryCode: selectedCountry?.countryCode ?? "",
      journeyType: isSemiDigital ? "NriSemiDigital" : "NroDigital",
      loginProvider: "Mobile",
      rmCode: rmAssisted && employeeId ? employeeId : urlRmCode || null,
      idempotencyKey: null,
      utmSource: searchParams?.get("utm_source") || "NA",
      utmCampaign: searchParams?.get("utm_campaign") || "NA",
      utmMedium: searchParams?.get("utm_medium") || "NA",
      iSmartId: urlIsmartId || null,
      promocode: searchParams?.get("promo_code") || "NA",
    };
    console.log("Register payload:", payload);
    showSpinner();
    try {
      const response = await apiService.registerUser(payload, hideSpinner);
      if (!response) {
        hideSpinner();
        return;
      }

      if (response.isLeadCompleted === true) {
        hideSpinner();
        toastRef.current?.show({
          severity: "info",
          detail:
            response.completionMessage ||
            "Your application is already completed. No further action is required.",
          life: 5000,
        });
        return;
      }

      sessionStorage.setItem("mobile", sendOtp.mobile);
      sessionStorage.setItem("accountType", accountType);
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

      if (isSemiDigital) {
        if (response.verifiedEmail === true && response.emailAddress) {
          sessionStorage.setItem("email", response.emailAddress);
          const nextRoute = parseRoute(response.uiMetadata);
          if (nextRoute) {
            router.push(`/${nextRoute}`);
          }
        } else {
          const nextRoute = parseRoute(response.uiMetadata);
          if (nextRoute) {
            router.push(`/${nextRoute}`);
          }
        }
        return;
      }

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
      {/* Dark marks: this page is light-themed. */}
      <SectionNavigation
        sections={HOME_SECTIONS}
        tone="onLight"
        ariaLabel="Page sections"
      />

      {/* Banner Section */}
      <section
        id="overview"
        aria-label="Open Demat and Trading Account"
        className={`${styles.banner} banner ${styles.navTarget}`}
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

                  {/* Mobile with country code — list sourced from the Country
                      Master API (no flag icons). */}
                  <div>
                    <div className={styles.phoneRow}>
                      <CountryCodeSelect
                        countries={countries}
                        value={selectedIso2}
                        onChange={handleCountryChange}
                      />
                      <input
                        type="tel"
                        className="form-control otp_field"
                        placeholder="Mobile Number *"
                        aria-label="Mobile Number"
                        aria-required="true"
                        name="MobileNo"
                        inputMode="numeric"
                        value={mobileNational}
                        onChange={(e) => handleMobileChange(e.target.value)}
                        onKeyDown={handleMobileKeyDown}
                        suppressHydrationWarning
                      />
                    </div>
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
                          <small>(Outside India / without Aadhaar)</small>
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
                          Fully-Digital Journey - NRO Account
                          <br />
                          <small>
                            ( Available only in India with Aadhaar e-sign)
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
                              "https://www.sbisecurities.in/fileserver/regulation/nri-terms-and-conditions.html",
                              "_blank",
                              "noopener,noreferrer",
                            );
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              window.open(
                                "https://www.sbisecurities.in/fileserver/regulation/nri-terms-and-conditions.html",
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
                      <div style={{ marginTop: "0.75rem" }}>
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
        id="invest-in-india"
        aria-label="Invest in India from Anywhere in the World"
        className={`${styles.investIntro} ${styles.navTarget}`}
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
        id="why-sbi"
        aria-label="Why Open Demat Account With SBI Securities"
        className={`${styles.whyOpenDemat} ${styles.navTarget}`}
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
        id="key-features"
        aria-label="Key Features of NRI Demat & Trading Account"
        className={`${styles.whyOpenDemat} ${styles.navTarget}`}
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
        id="account-info"
        aria-label="NRI Account Information"
        className={`${styles.infoTabsSection} ${styles.navTarget}`}
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
                    className={`${styles.infoTabBtn} ${activeInfoTab === idx ? styles.infoTabBtnActive : ""
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
      {/* <section
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
      </section> */}

      <Toast ref={toastRef} position="bottom-center" />

      {/* FATF Modal */}
      {showFatfModal && (
        <div
          ref={fatfDialogRef}
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="fatf-modal-title"
          tabIndex={-1}
          onClick={() => setShowFatfModal(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            data-lenis-prevent
          >
            <div className={styles.modalHeader}>
              <h2 id="fatf-modal-title">FATF Countries</h2>
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
                {fatfCountries.map((country, index) => (
                  <li key={index}>{country}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Need Help Section */}
      <section
        id="need-help"
        aria-label="Need Help"
        className={`${styles.needHelpSection} ${styles.navTarget}`}
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
              Copyright © 2026. All rights Reserved. <a href="https://www.sbisecurities.in/">SBICAP Securities Limited</a>&nbsp;
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
