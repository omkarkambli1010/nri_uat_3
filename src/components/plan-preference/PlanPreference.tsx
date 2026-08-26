"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import styles from "./plan-preference.module.scss";
import { publicPath } from "@/utils/publicPath";
import apiService from "@/services/api.service";
import PlanCarousel from "./PlanCarousel";
import LoadingButton from "@/components/ui/LoadingButton";
import { useSessionValue } from "@/hooks/useSessionValue";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiPlan {
  id: string;
  name: string;
  description: string;
  feeInPaise: number; 
  depository: "NSDL" | "CDSL";
  journeyType: string;
  isCurrent: boolean;
  version: number;
  etf?: string;
  schemecharges?: string;
}

type BenefitKind = "solid" | "carry" | "open";

interface StaticPlanData {
  icon: string;
  feeLabel: string;
  brokerageMain: string;
  brokerageNote: string;
  mobilePriceGst: string;
  benefits: { type: BenefitKind; text: string; sub?: string }[];
  equity: { val: string; lbl: string }[];
  derivatives: { val: string; lbl: string }[];
}

const STATIC_BY_KEY: Record<string, StaticPlanData> = {
  basic: {
    icon: publicPath("/assets/plan-icons/plan-icon-basic.svg"),
    feeLabel: "Account Opening Fees",
    brokerageMain: "₹20",
    brokerageNote: "*On Equity Intraday Trades",
    mobilePriceGst: "",
    benefits: [
      { type: "solid", text: "0.50% on Delivery Trade" },
      { type: "solid", text: "₹50/Lot on Options" },
      {
        type: "open",
        text: "0.50% on E-Margin",
        sub: "*0% interest for 23 trading days",
      },
    ],
    equity: [
      { val: "₹20/order", lbl: "on Intraday" },
      { val: "0.50%", lbl: "on Delivery" },
      { val: "₹20/order", lbl: "on ETF" },
      { val: "0.50%", lbl: "on E-Margin" },
    ],
    derivatives: [
      { val: "₹20/order", lbl: "on Intraday" },
      { val: "₹50/Lot", lbl: "on Options" },
      { val: "0.05%", lbl: "on Futures" },
    ],
  },
  premium: {
    icon: publicPath("/assets/plan-icons/plan-icon-premium.svg"),
    feeLabel: "One-time Account Opening Fees",
    brokerageMain: "Zero",
    brokerageNote: "*Till 75 Lacs Delivery Trade Value",
    mobilePriceGst: "+ GST",
    benefits: [
      { type: "solid", text: "₹20 on Equity Intraday" },
      { type: "solid", text: "0.20% on Equity Delivery" },
      { type: "carry", text: "₹20/Order on Carry Forward Options" },
      {
        type: "open",
        text: "0.40% on E-Margin",
        sub: "*0% interest for 23 trading days",
      },
    ],
    equity: [
      { val: "₹20/order", lbl: "on Intraday" },
      { val: "0.10%", lbl: "on Delivery*" },
      { val: "₹0", lbl: "on ETF" },
      { val: "0.40%", lbl: "on E-Margin" },
    ],
    derivatives: [
      { val: "₹20/order", lbl: "on Intraday" },
      { val: "₹20/order", lbl: "on Options" },
      { val: "₹20/order", lbl: "on Futures" },
    ],
  },
  default: {
    icon: publicPath("/assets/plan-icons/plan-icon-special.svg"),
    feeLabel: "One-time Account Opening Fees",
    brokerageMain: "Zero",
    brokerageNote: "*On all Intraday Trades",
    mobilePriceGst: "+ GST",
    benefits: [
      { type: "solid", text: "0.20% on Equity Delivery" },
      { type: "carry", text: "₹20/Order on Carry Forward Options" },
      {
        type: "open",
        text: "0.50% on E-Margin",
        sub: "*0% interest for 23 trading days",
      },
    ],
    equity: [
      { val: "₹0", lbl: "on Intraday" },
      { val: "0.20%", lbl: "on Delivery" },
      { val: "₹0", lbl: "on ETF" },
      { val: "0.50%", lbl: "on E-Margin" },
    ],
    derivatives: [
      { val: "₹0", lbl: "on Intraday" },
      { val: "₹20/order", lbl: "on Options" },
      { val: "₹20/order", lbl: "on Futures" },
    ],
  },
};

const getStaticData = (planName: string): StaticPlanData => {
  const lower = planName.toLowerCase();
  if (lower.includes("basic")) return STATIC_BY_KEY.basic;
  if (lower.includes("premium")) return STATIC_BY_KEY.premium;
  return STATIC_BY_KEY.default;
};

const routeFromUiMetadata = (uiMetadata: string | undefined): string | null => {
  try {
    const meta = JSON.parse(uiMetadata ?? "{}");
    return meta?.route ? `/${String(meta.route).replace(/^\//, "")}` : null;
  } catch {
    return null;
  }
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BackArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M5 12H19"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12L11 18"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5 12L11 6"
      stroke="black"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// PdfIcon removed along with the DP Tariff button (removed per product).
// const PdfIcon = () => (
//   <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
//     <rect x="2" y="1" width="9" height="12" rx="1" stroke="#280071" strokeWidth="1.2" />
//     <path d="M9 1v4h4" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
//     <path d="M9 1l4 4"  stroke="#280071" strokeWidth="1.2" strokeLinecap="round" />
//     <path d="M5 7.5h6M5 9.5h4" stroke="#280071" strokeWidth="1.1" strokeLinecap="round" />
//   </svg>
// );

const ModalDoneIcon = ({ size = 20 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    style={{ flexShrink: 0 }}
  >
    <circle cx="10" cy="10" r="9.5" stroke="#280071" strokeOpacity="0.3" />
    <path
      d="M6 10.5l3 3 5-6"
      stroke="#280071"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanPreference() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [apiPlans, setApiPlans] = useState<ApiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);

  const [depository, setDepository] = useState<"NSDL" | "CDSL">("NSDL");

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isProceeding, setIsProceeding] = useState(false);
  const [proceedingIndex, setProceedingIndex] = useState<number | null>(null);
  const [proceedError, setProceedError] = useState<string | null>(null);

  const [showKnowMore, setShowKnowMore] = useState(false);
  const [knowMoreIndex, setKnowMoreIndex] = useState(0);
  const knowMoreDialogRef = useFocusTrap<HTMLDivElement>(showKnowMore, () =>
    setShowKnowMore(false),
  );

  const rejectStatus = useSessionValue("RejectStatus");
  const isSinglePlan = apiPlans.length === 1;
  const isCarousel = apiPlans.length > 3;

  useEffect(() => {
    const stored =
      secureSessionService.getItem("depository") === "CDSL" ? "CDSL" : "NSDL";
    setDepository(stored);
    void fetchPlans(stored);
  }, []);

  const fetchPlans = async (dep: "NSDL" | "CDSL" = depository) => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    const journeyType =
      secureSessionService.getItem("accountType") === "semi-digital"
        ? "NriSemiDigital"
        : "NroDigital";

    if (!applicationId) {
      setPlansError("Session expired. Please start again.");
      setPlansLoading(false);
      return;
    }

    setPlansLoading(true);
    setPlansError(null);
    showSpinner();

    try {
      const plans: ApiPlan[] = await apiService.getPlans(
        applicationId,
        journeyType,
        dep,
      );
      if (Array.isArray(plans) && plans.length > 0) {
        const sorted = [...plans].sort((a, b) => a.feeInPaise - b.feeInPaise);
        setApiPlans(sorted);

        let selectedIdx: number | null = null;
        try {
          const saved =
            await apiService.getPlanSelectionWorkflow(applicationId);
          const savedPlanId = saved?.data?.planId;
          if (savedPlanId) {
            const matchIdx = sorted.findIndex((p) => p.id === savedPlanId);
            if (matchIdx >= 0) selectedIdx = matchIdx;
          }
        } catch {
        }

        setSelectedIndex(selectedIdx);
      } else {
        setPlansError("No plans available at the moment.");
      }
    } catch {
      setPlansError("Failed to load plans. Please try again.");
    } finally {
      setPlansLoading(false);
      hideSpinner();
    }
  };

  const handleDepositoryChange = (dep: "NSDL" | "CDSL") => {
    if (dep === depository || plansLoading) return;
    setDepository(dep);
    secureSessionService.setItem("depository", dep);
    void fetchPlans(dep);
  };

  const proceedWithPlan = async (idx: number) => {
    const plan = apiPlans[idx];
    if (!plan) return;

    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    if (!applicationId) {
      setProceedError("Session expired. Please start again.");
      return;
    }

    setIsProceeding(true);
    setProceedingIndex(idx);
    setProceedError(null);
    showSpinner();

    try {
      const response = await apiService.selectPlan(applicationId, {
        planId: plan.id,
        depository: plan.depository,
      });
      secureSessionService.setItem("selectedPlan", String(idx));
      secureSessionService.setItem("planId", plan.id);
      secureSessionService.setItem("depository", plan.depository);
      const route =
        routeFromUiMetadata(response?.uiMetadata) ?? "/CaptureSelfie/1";
      router.push(route);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.response?.data?.title ||
        "Something went wrong. Please try again.";
      setProceedError(msg);
    } finally {
      setIsProceeding(false);
      setProceedingIndex(null);
      hideSpinner();
    }
  };

  const goBack = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    await dynamicBackService("PLAN_SELECTION", applicationId, {
      push: router.push,

      showSpinner,

      hideSpinner,
    });
  };

  const openKnowMore = (index: number) => {
    setKnowMoreIndex(index);
    setShowKnowMore(true);
  };

  const kmPlan = apiPlans[knowMoreIndex];
  const kmStatic = kmPlan ? getStaticData(kmPlan.name) : STATIC_BY_KEY.default;
  const kmName = kmPlan?.name ?? "";

  if (plansLoading) {
    return (
      <div className={styles.loadingState} aria-live="polite">
        <p>Loading plans…</p>
      </div>
    );
  }

  if (plansError && apiPlans.length === 0) {
    return (
      <div className={styles.errorState} aria-live="assertive">
        <p>{plansError}</p>
        <button type="button" onClick={() => fetchPlans()}>
          Retry
        </button>
      </div>
    );
  }

  const middleIndex = Math.floor(apiPlans.length / 2);

  const renderDepositoryRadio = (idSuffix: string) => (
    <div className={styles.depositoryGroup}>
      {/* Segment — always selected, not editable */}
      <div className={styles.segmentGroup}>
        <label
          className={`${styles.segmentOption} ${styles.segmentOptionActive}`}
          htmlFor={`segment-equity-mf-${idSuffix}`}
        >
          <input
            id={`segment-equity-mf-${idSuffix}`}
            type="checkbox"
            checked
            disabled
            readOnly
            className={styles.segmentCheckboxInput}
          />
          <span className={styles.segmentLabelText}>
            Equity &amp; Mutual Funds
          </span>
        </label>
      </div>

      <p className={styles.depositoryTitle}>Select Depository:</p>
      <div
        className={styles.depositoryRow}
        role="radiogroup"
        aria-label="Select depository"
      >
        {(["NSDL", "CDSL"] as const).map((dep) => (
          <label
            key={dep}
            className={`${styles.depositoryOption}${depository === dep ? ` ${styles.depositoryOptionActive}` : ""}`}
          >
            <input
              type="radio"
              name={`depository-${idSuffix}`}
              value={dep}
              checked={depository === dep}
              onChange={() => handleDepositoryChange(dep)}
              disabled={plansLoading}
              className={styles.depositoryRadioInput}
            />
            <span className={styles.depositoryLabelText}>{dep}</span>
          </label>
        ))}
      </div>
    </div>
  );

  const renderCarouselCard = (plan: ApiPlan, i: number) => {
    const s = getStaticData(plan.name);
    const isSelected = selectedIndex === i;
    const isThisProceeding = isProceeding && proceedingIndex === i;
    return (
      <div
        className={[
          styles.slideCard,
          isSelected ? styles.slideCardHighlighted : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setSelectedIndex(i)}
      >
        <div className={styles.slideIconRow}>
          <img src={s.icon} alt={plan.name} width={28} height={28} />
          <p className={styles.slidePlanName}>{plan.name}</p>
        </div>

        <div className={styles.slidePriceRow}>
          <div className={styles.slidePriceAmount}>
            <span className={styles.slidePriceValue}>
              {plan.feeInPaise === 0 ? "0" : plan.feeInPaise}
            </span>
            <span className={styles.slidePriceGst}>Excl. GST</span>
          </div>
          <p className={styles.slideFeeLabel}>{s.feeLabel}</p>
        </div>

        <div className={styles.slideDivider} />

        <div className={styles.slideBrokerageBlock}>
          <p className={styles.brokerageDescription}>{plan.description}</p>
        </div>

        <div className={styles.slideActions}>
          <LoadingButton
            type="button"
            className={styles.slideProceedBtn}
            loading={isThisProceeding}
            disabled={isProceeding}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(i);
              proceedWithPlan(i);
            }}
          >
            {isThisProceeding ? "Processing" : "Proceed"}
          </LoadingButton>
          <button
            type="button"
            className={styles.slideKnowMore}
            onClick={(e) => {
              e.stopPropagation();
              openKnowMore(i);
            }}
          >
            Know More
          </button>
        </div>
      </div>
    );
  };

  const renderDesktopCard = (plan: ApiPlan, i: number) => {
    const s = getStaticData(plan.name);
    const isSelected = selectedIndex === i;
    const isThisProceeding = isProceeding && proceedingIndex === i;
    return (
      <div
        key={plan.id}
        className={[styles.dCard, isSelected ? styles.dCardSelected : ""]
          .filter(Boolean)
          .join(" ")}
        onClick={() => setSelectedIndex(i)}
        style={{ cursor: "pointer" }}
      >
        {isSelected && (
          <span className={styles.dSelectedBadge}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              style={{ flexShrink: 0 }}
            >
              <circle cx="8" cy="8" r="7.5" fill="#280071" stroke="#280071" />
              <path
                d="M4.5 8.5L6.5 10.5L11.5 5.5"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Selected
          </span>
        )}
        <div className={styles.dCardInner}>
          <div className={styles.dCardTop}>
            <div className={styles.dPlanHeader}>
              <div className={styles.dTitleRow}>
                <img
                  src={s.icon}
                  alt=""
                  width={31}
                  height={31}
                  className={styles.dPlanIcon}
                />
                <span className={styles.dPlanName}>{plan.name}</span>
              </div>
              {/* Raw feeInPaise — no conversion */}
              <div className={styles.dPriceSection}>
                <div className={styles.dPriceRow}>
                  <div className={styles.dPriceAmount}>
                    <span className={styles.dPriceRupee}>₹</span>
                    <span className={styles.dPriceNumber}>
                      {plan.feeInPaise === 0 ? "0" : plan.feeInPaise}
                    </span>
                  </div>
                  <span className={styles.dPriceGst}>Excl. GST</span>
                </div>
                <span className={styles.dPriceLabel}>{s.feeLabel}</span>
              </div>
            </div>

            <div className={styles.dBrokerageSection}>
              <div className={styles.dDivider} />
              <div className={styles.dBrokerageText}>
                <p className={styles.dBrokerageDescription}>
                  {plan.description}
                </p>
              </div>
              <div className={styles.dDivider} />
            </div>
          </div>

          <div className={styles.dCardActions}>
            <LoadingButton
              type="button"
              className={styles.dProceedBtn}
              loading={isThisProceeding}
              disabled={isProceeding}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(i);
                proceedWithPlan(i);
              }}
            >
              {isThisProceeding ? "Processing" : "Proceed"}
            </LoadingButton>
            <button
              type="button"
              className={styles.dKnowMoreBtn}
              disabled={isProceeding}
              onClick={(e) => {
                e.stopPropagation();
                openKnowMore(i);
              }}
            >
              Know More
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* ── MOBILE ──────────────────────────────────────────────────────────── */}
      <main className={styles.mobilePage}>
        <div className={styles.mobileHeader}>
          {rejectStatus !== "R" && (
            <button
              className={styles.mobileBackBtn}
              onClick={goBack}
              aria-label="Back"
            >
              <BackArrow />
            </button>
          )}
          <div className={styles.mobileHeaderInfo}>
            <div className={styles.mobileHeaderTop}>
              <p className={styles.mobileTitle}>Plan Selection</p>
              {/* DP Tariff button removed per product. */}
            </div>
            <p className={styles.mobileSubtitle}>
              Select a plan that works best for your investment and trading
              needs
            </p>
          </div>
        </div>

        <div className={styles.mobilePlanCard}>
          {renderDepositoryRadio("mob")}

          {/* ── SINGLE PLAN: show a full detail card + Proceed button ────────── */}
          {isSinglePlan &&
            (() => {
              const plan = apiPlans[0];
              const s = getStaticData(plan.name);
              const isThisProceeding = isProceeding && proceedingIndex === 0;
              return (
                <div className={styles.singlePlanWrap}>
                  <div className={styles.singlePlanCard}>
                    {/* Header row: icon + name */}
                    <div className={styles.slideIconRow}>
                      <img
                        src={s.icon}
                        alt={plan.name}
                        width={28}
                        height={28}
                      />
                      <p className={styles.slidePlanName}>{plan.name}</p>
                    </div>

                    {/* Price */}
                    <div className={styles.slidePriceRow}>
                      <div className={styles.slidePriceAmount}>
                        <span className={styles.slidePriceValue}>
                          {plan.feeInPaise === 0 ? "0" : plan.feeInPaise}
                        </span>
                        <span className={styles.slidePriceGst}>Excl. GST</span>
                      </div>
                      <p className={styles.slideFeeLabel}>{s.feeLabel}</p>
                    </div>

                    <div className={styles.slideDivider} />

                    {/* Brokerage */}
                    <div className={styles.slideBrokerageBlock}>
                      <p className={styles.brokerageDescription}>
                        {plan.description}
                      </p>
                    </div>

                    {/* Know More */}
                    <div className={styles.slideActions}>
                      <button
                        type="button"
                        className={styles.slideKnowMore}
                        onClick={() => openKnowMore(0)}
                      >
                        Know More
                      </button>
                    </div>
                  </div>

                  {/* Proceed button */}
                  <LoadingButton
                    type="button"
                    className={styles.singlePlanProceedBtn}
                    loading={isThisProceeding}
                    disabled={isProceeding}
                    onClick={() => proceedWithPlan(0)}
                  >
                    {isThisProceeding ? "Processing" : "Proceed"}
                  </LoadingButton>

                  {proceedError && (
                    <p
                      style={{
                        color: "#d32f2f",
                        fontSize: 13,
                        textAlign: "center",
                      }}
                    >
                      {proceedError}
                    </p>
                  )}
                </div>
              );
            })()}

          {/* ── 4+ PLANS: swipeable carousel of full plan cards ──────────────── */}
          {isCarousel && (
            <>
              <div className={styles.splideWrapper}>
                <PlanCarousel
                  options={{
                    perPage: 1,
                    focus: "center",
                    arrows: false,
                    pagination: true,
                    rewind: false,
                    gap: "12px",
                    padding: { left: "22%", right: "22%" },
                    speed: 300,
                    start: selectedIndex ?? 0,
                  }}
                  ariaLabel="Plan options"
                  items={apiPlans.map((plan, i) => ({
                    id: plan.id,
                    content: renderCarouselCard(plan, i),
                  }))}
                />
              </div>

              {proceedError && (
                <p
                  style={{
                    color: "#d32f2f",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 8,
                    padding: "0 16px",
                  }}
                >
                  {proceedError}
                </p>
              )}
            </>
          )}

          {/* ── 2–3 PLANS: tab strip + comparison table ──────────────────────── */}
          {!isSinglePlan && !isCarousel && (
            <>
              <div className={styles.mobilePlanTabs}>
                {apiPlans.map((plan, i) => {
                  const s = getStaticData(plan.name);
                  const isMiddle = i === middleIndex;
                  const isSelected = selectedIndex === i;
                  const isThisProceeding =
                    isProceeding && proceedingIndex === i;
                  return (
                    <div
                      key={plan.id}
                      className={[
                        styles.mobilePlanTab,
                        isMiddle && !isSelected
                          ? styles.mobilePlanTabMiddle
                          : "",
                        isSelected ? styles.mobilePlanTabSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <img
                        src={s.icon}
                        alt={plan.name}
                        className={styles.tabIcon}
                      />
                      <div className={styles.tabNamePrice}>
                        <p className={styles.tabName}>{plan.name}</p>
                        <div>
                          <p className={styles.tabPrice}>
                            {plan.feeInPaise === 0 ? (
                              "ZERO"
                            ) : (
                              <>
                                ₹{plan.feeInPaise}
                                {s.mobilePriceGst && (
                                  <span className={styles.tabPriceGst}>
                                    {" "}
                                    {s.mobilePriceGst}
                                  </span>
                                )}
                              </>
                            )}
                          </p>
                          <p className={styles.tabPriceSub}>
                            {plan.feeInPaise === 0
                              ? "Zero fees"
                              : "One-time fees"}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={[
                          styles.tabSelectBtn,
                          isSelected ? styles.tabSelectBtnSelected : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={isProceeding}
                        onClick={() =>
                          isSelected ? proceedWithPlan(i) : setSelectedIndex(i)
                        }
                      >
                        {isThisProceeding
                          ? "Processing"
                          : isSelected
                            ? "Selected"
                            : "Select"}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className={styles.comparisonBanner}>
                <p>
                  <strong>ZERO</strong> Interest for 23 trading days for Margin
                  Trading
                </p>
                <p>
                  and <strong>FREE</strong> AMC for 1 year
                </p>
              </div>

              <div className={styles.comparisonScrollArea}>
                <div className={styles.comparisonSectionHeader}>
                  <p>Equity</p>
                </div>
                <div className={styles.comparisonDataRow}>
                  {apiPlans.map((plan, i) => {
                    const s = getStaticData(plan.name);
                    return (
                      <div
                        key={plan.id}
                        className={[
                          styles.comparisonCol,
                          selectedIndex === i
                            ? styles.comparisonColSelected
                            : "",
                          i === middleIndex ? styles.comparisonColMiddle : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {s.equity.map((cell, ci) => (
                          <div key={ci} className={styles.comparisonCell}>
                            <p className={styles.cellVal}>{cell.val}</p>
                            <p className={styles.cellLbl}>{cell.lbl}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                {/* <div className={styles.comparisonSectionHeader}><p>Derivatives (F&amp;O)</p></div>
                <div className={styles.comparisonDataRow}>
                  {apiPlans.map((plan, i) => {
                    const s = getStaticData(plan.name);
                    return (
                      <div key={plan.id} className={[
                        styles.comparisonCol,
                        selectedIndex === i ? styles.comparisonColSelected : '',
                        i === middleIndex   ? styles.comparisonColMiddle   : '',
                      ].filter(Boolean).join(' ')}>
                        {s.derivatives.map((cell, ci) => (
                          <div key={ci} className={styles.comparisonCell}>
                            <p className={styles.cellVal}>{cell.val}</p>
                            <p className={styles.cellLbl}>{cell.lbl}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div> */}

                <p className={styles.comparisonFootnote}>
                  *Zero Brokerage on Delivery till 75 lakh Delivery Trade Volume
                  for Premium Plan
                </p>
              </div>

              {proceedError && (
                <p
                  style={{
                    color: "#d32f2f",
                    fontSize: 13,
                    textAlign: "center",
                    marginTop: 8,
                    padding: "0 16px",
                  }}
                >
                  {proceedError}
                </p>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── DESKTOP ─────────────────────────────────────────────────────────── */}
      <div className={styles.desktopPage}>
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <div className={styles.desktopHeaderLeft}>
              {rejectStatus !== "R" && (
                <button
                  className={styles.desktopBackBtn}
                  onClick={goBack}
                  aria-label="Back"
                >
                  <BackArrow />
                </button>
              )}
              <div>
                <p className={styles.desktopCardTitle}>Plan Selection</p>
                <p className={styles.desktopCardSubtitle}>
                  Basis your trading preferences, we recommend the below plans.
                  <br />
                  Select 1 of these {apiPlans.length} plans to begin your
                  investment journey.
                </p>
              </div>
            </div>
            {/* DP Tariff button removed per product. */}
          </div>

          <div className={styles.desktopCardBody}>
            {renderDepositoryRadio("desk")}

            {isCarousel ? (
              <div className={styles.dCarouselWrapper}>
                <PlanCarousel
                  options={{
                    perPage: 3,
                    perMove: 1,
                    gap: "24px",
                    arrows: false,
                    pagination: true,
                    drag: true,
                    trimSpace: true,
                    rewind: false,
                    speed: 500,
                    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  ariaLabel="Plan options"
                  items={apiPlans.map((plan, i) => ({
                    id: plan.id,
                    content: renderDesktopCard(plan, i),
                  }))}
                />
              </div>
            ) : (
              <div className={styles.dCardsRow}>
                {apiPlans.map((plan, i) => renderDesktopCard(plan, i))}
              </div>
            )}

            {proceedError && (
              <p
                style={{
                  color: "#d32f2f",
                  fontSize: 13,
                  textAlign: "center",
                  marginTop: 12,
                }}
              >
                {proceedError}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── Know More Modal ──────────────────────────────────────────────────── */}
      {showKnowMore && kmPlan && (
        <div
          ref={knowMoreDialogRef}
          className={styles.modalOverlay}
          onClick={() => setShowKnowMore(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${kmName} plan details`}
          tabIndex={-1}
        >
          <div
            className={styles.modalSheet}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalDash} aria-hidden="true" />
            <div className={styles.modalCloseRow}>
              <button
                className={styles.modalCloseBtn}
                onClick={() => setShowKnowMore(false)}
                aria-label="Close"
              >
                <BackArrow />
              </button>
            </div>
            <div className={styles.modalTitleRow}>
              <p className={styles.modalTitle}>{kmName} Plan Details</p>
            </div>
            <div className={styles.modalPlanHeader}>
              <img src={kmStatic.icon} alt="" width={30} height={30} />
              <p>{kmName}</p>
            </div>
            <div className={styles.modalScrollContent}>
              <div className={styles.modalColumnsRow}>
                <div style={{ flex: 1 }}>
                  <p className={styles.modalColumnHeader}>Charges</p>
                  <div className={styles.modalList}>
                    <div className={styles.modalListItem}>
                      <ModalDoneIcon />
                      <p>
                        <strong>ETF:</strong> {kmPlan.etf ?? "-"}
                      </p>
                    </div>
                    <div className={styles.modalItemDivider} />
                    <div className={styles.modalListItem}>
                      <ModalDoneIcon />
                      <p>
                        <strong>Scheme Charges:</strong>{" "}
                        {kmPlan.schemecharges ?? "-"}
                      </p>
                    </div>
                  </div>
                </div>
                {/* <div style={{ flex: 1 }}>
                  <p className={styles.modalColumnHeader}>
                    Derivatives (F&amp;O)
                  </p>
                  <div className={styles.modalList}>
                    {kmStatic.derivatives.map((item, fi) => (
                      <div key={fi}>
                        <div className={styles.modalListItem}>
                          <ModalDoneIcon />
                          <p>
                            <strong>{item.val}</strong> {item.lbl}
                          </p>
                        </div>
                        {fi < kmStatic.derivatives.length - 1 && <div className={styles.modalItemDivider} />}
                      </div>
                    ))}
                  </div>
                </div> */}
              </div>
              <div className={styles.modalListMobile}>
                <div className={styles.modalListItem}>
                  <ModalDoneIcon size={16} />
                  <p>
                    <strong>ETF:</strong> {kmPlan.etf ?? "-"}
                  </p>
                </div>
                <div className={styles.modalListItem}>
                  <ModalDoneIcon size={16} />
                  <p>
                    <strong>Scheme Charges:</strong>{" "}
                    {kmPlan.schemecharges ?? "-"}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              className={styles.modalCloseActionBtn}
              onClick={() => setShowKnowMore(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
