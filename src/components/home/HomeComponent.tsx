"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Carousel } from "primereact/carousel";
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

const TESTIMONIALS = [
  {
    message:
      "I've been using this platform for several months now and I'm impressed. The interface is user-friendly and makes it easy to keep track of my investments.",
    author: "Rohit Sharma",
  },
  {
    message:
      "I love the variety of investment options available on this platform. I'm able to diversify my portfolio and feel confident that I'm making smart investment decisions.",
    author: "Sayali Prasad",
  },
  {
    message:
      "The app is fantastic and makes it easy to manage my investments on-the-go. I'm able to keep track of my portfolio and make trades quickly and efficiently from my phone.",
    author: "Dorothy D'souza",
  },
];

const VIDEOS = [
  {
    url: "https://www.youtube.com/embed/0cfFB8d_n60?si=Mwd2ApOaaT1SXOhM",
    caption: "Invest to your FULL POTENTIAL with the SBI Securities App!",
  },
  {
    url: "https://www.youtube.com/embed/Rb7IE_P3UcA",
    caption: "Begin your Investment journey with India's trusted Nivesh SAATHI",
  },
];

const RESPONSIVE_VIDEO_OPTIONS = [
  { breakpoint: "1024px", numVisible: 2, numScroll: 1 },
  { breakpoint: "768px", numVisible: 1, numScroll: 1 },
  { breakpoint: "560px", numVisible: 1, numScroll: 1 },
];

const WHY_DEMAT_CARDS = [
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/sbi-legacy-2.svg"),
        inset: "0.01% 7.49% 0 7.46%",
      },
    ],
    alt: "SBI's Legacy and Trust",
    label: "SBI's Legacy and Trust",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/community-2.svg"),
        inset: "14.58% 1% 14.56% 0.99%",
      },
    ],
    alt: "Community of 4+ million investors",
    label: "Community of 4+ million investors",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/products-2.svg"),
        inset: "0.7% 0.7% 0.68% 0.73%",
      },
    ],
    alt: "Invest in multiple products with a single app",
    label: "Invest in multiple products with a single app",
  },
  {
    imgs: [
      {
        src: publicPath("/assets/images/why-demat/branches-2.svg"),
        inset: "4.1% 0.83% 4.11% 0.8%",
      },
    ],
    alt: "Wide Network of 80+ Branches across India",
    label: "Wide Network of 80+ Branches across India",
  },
  {
    imgs: [
      { src: publicPath("/assets/images/why-demat/research-2.svg"), inset: "0 0 0 0.01%" },
    ],
    alt: "Research recommended stocks",
    label: "Research recommended stocks",
  },
];

export default function HomeComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  // Form state
  const [sendOtp, setSendOtp] = useState({ mobile: "" });
  const [mobileDigitReq, setMobileDigitReq] = useState(false);
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [isDisabledLoginBtn, setIsDisabledLoginBtn] = useState(true);
  const [accountType, setAccountType] = useState<
    "semi-digital" | "digital" | ""
  >("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rmAssisted, setRmAssisted] = useState(false);
  const [employeeId, setEmployeeId] = useState("");

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const itiRef = useRef<Iti | null>(null);
  const toastRef = useRef<Toast>(null);

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
    "Algeria",
    "Algeria",
    "Cameroon",
    "Republic of the Congo",
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
    "North Korea",
    "Sao Tome and Principe",
    "South Africa",
    "South Sudan",
    "Vietnam",
    "Yemen",
  ];

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const clientid =
    typeof window !== "undefined"
      ? (sessionStorage.getItem("clientid") ?? "")
      : "";

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
          initialCountry: "in",
          separateDialCode: true,
          countrySearch: true,
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
          const isValid = iti.isValidNumberPrecise() === true;
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

          const fullNumber = iti.getNumber();
          const nationalInput = phoneInputRef.current?.value ?? "";
          const isValid = iti.isValidNumberPrecise() === true;
          setSendOtp((prev) => ({ ...prev, mobile: fullNumber }));
          setMobileDigitReq(nationalInput.length > 0 && !isValid);
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

  // Reactive button enable/disable: phone + account type + terms
  useEffect(() => {
    setIsDisabledLoginBtn(
      !(isPhoneValid && accountType !== "" && termsAccepted),
    );
  }, [isPhoneValid, accountType, termsAccepted]);

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

  const videoTemplate = (item: (typeof VIDEOS)[0]) => (
    <div className={styles.carouselCls}>
      <div className={styles.item}>
        <iframe
          width="560"
          height="245"
          src={item.url}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
        <h6>{item.caption}</h6>
      </div>
    </div>
  );

  return (
    <>
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
                      <span className="red_warning">
                        *Please enter a valid mobile number.
                      </span>
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
                          if (!e.target.checked) setEmployeeId("");
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
                          placeholder="Employee ID *"
                          aria-label="Employee ID"
                          value={employeeId}
                          onChange={(e) => setEmployeeId(e.target.value)}
                          maxLength={20}
                        />
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

      {/* Why Open Demat Section */}
      <section
        aria-label="Why Open Demat Account With SBI Securities"
        className={styles.whyOpenDemat}
      >
        <div className="container">
          <div className="row">
            <div className={styles.align}>
              <h2 className="page-heading">
                Why Open Demat Account With SBI Securities?
              </h2>
              <div className={styles.cardAlign}>
                {WHY_DEMAT_CARDS.map((card) => (
                  <div key={card.label} className={styles.cardCls}>
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
                    <p>{card.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Easy Demat Process Section */}
      <section
        aria-label="Easy Demat Account Opening Process"
        className={styles.ezdemat}
      >
        <div className="container">
          <div className="row">
            <div className={styles.align}>
              <h2>Easy Demat Account Opening Process</h2>
              <div className={styles.cardAlign}>
                {[
                  {
                    src: publicPath("/assets/images/diy/add-user.png"),
                    alt: "Sign Up For SBI Demat Account",
                    label: "Sign Up",
                  },
                  {
                    src: publicPath("/assets/images/diy/verify-bank.png"),
                    alt: "Verify Your Bank Account",
                    label: "Verify Bank A/C",
                  },
                  {
                    src: publicPath("/assets/images/diy/select-plan.png"),
                    alt: "Select Brokerage Plan",
                    label: "Select Plan",
                  },
                  {
                    src: publicPath("/assets/images/diy/upload-doc.png"),
                    alt: "Upload Documents for Demat Account",
                    label: "Upload Documents",
                  },
                  {
                    src: publicPath("/assets/images/diy/esign.png"),
                    alt: "E-sign for your Demat Account",
                    label: "E-Sign",
                  },
                ].reduce<React.ReactNode[]>((acc, card, idx, arr) => {
                  acc.push(
                    <div key={card.label} className={styles.cardCls}>
                      <Image
                        src={card.src}
                        alt={card.alt}
                        width={60}
                        height={60}
                        draggable={false}
                      />
                      <p>{card.label}</p>
                    </div>,
                  );
                  if (idx < arr.length - 1) {
                    acc.push(
                      <div key={`arrow-${idx}`} className={styles.cardClsArrow}>
                        <Image
                          src={publicPath("/assets/images/diy/Line.png")}
                          alt=""
                          width={30}
                          height={10}
                          aria-hidden
                          draggable={false}
                        />
                      </div>,
                    );
                  }
                  return acc;
                }, [])}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Documents Required Section */}
      <section
        aria-label="Documents Required for Demat Account"
        className={styles.whyOpenDemat}
      >
        <div className="container">
          <div className="row">
            <div className={styles.align}>
              <h2 className="page-heading">
                Documents Required to Open a Demat &amp; Trading A/C
              </h2>
              <div className={styles.cardAlign}>
                {[
                  {
                    src: publicPath("/assets/images/diy/pancardicon.png"),
                    alt: "Identity Proof",
                    subheading: "Identity Proof",
                    label: "PAN Card",
                  },
                  {
                    src: publicPath("/assets/images/diy/addressprooficon-1.png"),
                    alt: "Address Proof",
                    subheading: "Address Proof",
                    label: "Aadhar Card",
                  },
                  {
                    src: publicPath("/assets/images/diy/nominee-icon.png"),
                    alt: "Add Nominee",
                    subheading: "Nominee Addition",
                    label: "Nominee's Proof of Identity",
                  },
                  {
                    src: publicPath("/assets/images/diy/signatureicon-1.png"),
                    alt: "Add Your Signature",
                    subheading: "Signature",
                    label: "Sign on a White paper",
                  },
                  {
                    src: publicPath("/assets/images/diy/cancelled-cheque.png"),
                    alt: "Cancelled Cheque",
                    subheading: "Cancelled cheque",
                    label: "Only if bank verification fails",
                  },
                ].map((card) => (
                  <div key={card.subheading} className={styles.cardCls}>
                    <div>
                      <Image
                        src={card.src}
                        alt={card.alt}
                        width={60}
                        height={60}
                        draggable={false}
                      />
                    </div>
                    <div>
                      <h6 className={styles.cardSubheading}>
                        {card.subheading}
                      </h6>
                      <p>{card.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Videos Section */}
      <section
        aria-label="Educational Videos"
        className={styles.benefitsSection}
      >
        <div className="container">
          <div className={styles.trustCss}>
            <h2 className="page-heading">Explore Our Trading Platforms</h2>
            <Carousel
              value={VIDEOS}
              numVisible={2}
              numScroll={1}
              circular={false}
              autoplayInterval={0}
              responsiveOptions={RESPONSIVE_VIDEO_OPTIONS}
              itemTemplate={videoTemplate}
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        aria-label="Customer Testimonials"
        className={styles.trustSection}
      >
        <div className="container">
          <div className="row">
            <div className="col-lg-12 text-center">
              <h2 className={styles.trustHeading}>Trust Aur Growth, Dono</h2>
              <p className={styles.trustSubtitle}>
                India&apos;s trusted investment partner of choice
              </p>
            </div>
            <div className="col-lg-12">
              <Splide
                options={{
                  type: "loop",
                  perPage: 3,
                  perMove: 1,
                  gap: "24px",
                  pagination: false,
                  arrows: true,
                  breakpoints: {
                    1024: { perPage: 2 },
                    767: { perPage: 1 },
                  },
                }}
                className={styles.testimonialSplide}
                aria-label="Customer testimonials"
              >
                {TESTIMONIALS.map((item, idx) => (
                  <SplideSlide key={idx}>
                    <div className={styles.testimonialCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicPath("/assets/images/trust-section/quote-icon.svg")}
                        alt=""
                        className={styles.quoteIcon}
                        draggable={false}
                      />
                      <p className={styles.testimonialText}>{item.message}</p>
                      <span className={styles.testimonialAuthor}>
                        -{item.author}
                      </span>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={publicPath("/assets/images/trust-section/line-divider.svg")}
                        alt=""
                        className={styles.testimonialLine}
                        draggable={false}
                      />
                    </div>
                  </SplideSlide>
                ))}
              </Splide>
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
              <h2 className="page-heading">What is Demat Account?</h2>
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

      {/* FAQ Section */}
      <section
        aria-label="Frequently Asked Questions"
        className={styles.faqSection}
      >
        <div className="container">
          <div className="col-md-12">
            <h2 className="text-center pb-5 page-heading">FAQs</h2>
            <div className="row justify-content-center">
              <div className="col-lg-11">
                <div className="accordion" id="accordionExample">
                  {[
                    {
                      id: "One",
                      question: "Why do I need a Demat account?",
                      answer:
                        "A Demat account is required to hold securities like stocks and bonds in electronic form. It is mandatory for trading in the Indian stock market and eliminates the need for physical certificates, making buying, selling, and transferring shares seamless.",
                    },
                    {
                      id: "Two",
                      question: "Who can open a Demat account?",
                      answer:
                        "Any Indian resident aged 18 years or older can open a Demat account. NRIs can also open one with specific documentation. You need a valid PAN card, Aadhaar card, a linked bank account, and a signature as primary requirements.",
                    },
                    {
                      id: "Three",
                      question: "How do I open a Demat account?",
                      answer:
                        "You can open a Demat account online through SBI Securities in a few easy steps: sign up with your name and mobile number, verify your bank account, select a brokerage plan, upload required documents (PAN, Aadhaar, signature), and complete e-signing. The entire process takes just minutes.",
                    },
                    {
                      id: "Four",
                      question:
                        "What types of securities can I hold in a Demat account?",
                      answer:
                        "A Demat account can hold equities (stocks), bonds, mutual funds, ETFs, government securities, debentures, and other financial instruments. SBI Securities allows you to invest across multiple asset classes through a single account.",
                    },
                  ].map((faq) => (
                    <div
                      key={faq.id}
                      className="accordion-item"
                      itemScope
                      itemProp="mainEntity"
                      itemType="https://schema.org/Question"
                    >
                      <h3 className="accordion-header" id={`heading${faq.id}`}>
                        <button
                          className="accordion-button collapsed"
                          type="button"
                          data-bs-toggle="collapse"
                          data-bs-target={`#collapse${faq.id}`}
                          aria-expanded="false"
                          aria-controls={`collapse${faq.id}`}
                          itemProp="name"
                          suppressHydrationWarning
                        >
                          {faq.question}
                        </button>
                      </h3>
                      <div
                        id={`collapse${faq.id}`}
                        className="accordion-collapse collapse"
                        aria-labelledby={`heading${faq.id}`}
                        data-bs-parent="#accordionExample"
                        itemScope
                        itemProp="acceptedAnswer"
                        itemType="https://schema.org/Answer"
                      >
                        <p className="accordion-body" itemProp="text">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="row">
            <div className="col-12 text-center">
              <span>{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
