"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import styles from './plan-preference.module.scss';
import { publicPath } from "@/utils/publicPath";
import apiService from "@/services/api.service";
import { toast } from "@/services/toast.service";
import { Splide, SplideSlide } from "@splidejs/react-splide";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ApiPlan {
  id: string;
  name: string;
  description: string;
  feeInPaise: number;   // raw value from API — displayed as-is, no conversion
  depository: 'NSDL' | 'CDSL';
  journeyType: string;
  isCurrent: boolean;
  version: number;
}

type BenefitKind = "solid" | "carry" | "open";

interface StaticPlanData {
  icon: string;
  feeLabel: string;
  brokerageMain: string;
  brokerageNote: string;
  mobilePriceGst: string;
  innerGap: number;
  actionsGap: number;
  benefits: { type: BenefitKind; text: string; sub?: string }[];
  equity: { val: string; lbl: string }[];
  derivatives: { val: string; lbl: string }[];
}

// ─── Static display data keyed by plan name keyword ──────────────────────────

const STATIC_BY_KEY: Record<string, StaticPlanData> = {
  basic: {
    icon: publicPath('/assets/plan-icons/plan-icon-basic.svg'),
    feeLabel: 'Account Opening Fees',
    brokerageMain: '₹20',
    brokerageNote: '*On Equity Intraday Trades',
    mobilePriceGst: '',
    innerGap: 45,
    actionsGap: 12,
    benefits: [
      { type: 'solid', text: '0.50% on Delivery Trade' },
      { type: 'solid', text: '₹50/Lot on Options' },
      { type: 'open',  text: '0.50% on E-Margin', sub: '*0% interest for 23 trading days' },
    ],
    equity: [
      { val: '₹20/order', lbl: 'on Intraday' },
      { val: '0.50%',     lbl: 'on Delivery' },
      { val: '₹20/order', lbl: 'on ETF' },
      { val: '0.50%',     lbl: 'on E-Margin' },
    ],
    derivatives: [
      { val: '₹20/order', lbl: 'on Intraday' },
      { val: '₹50/Lot',   lbl: 'on Options' },
      { val: '0.05%',     lbl: 'on Futures' },
    ],
  },
  premium: {
    icon: publicPath('/assets/plan-icons/plan-icon-premium.svg'),
    feeLabel: 'One-time Account Opening Fees',
    brokerageMain: 'Zero',
    brokerageNote: '*Till 75 Lacs Delivery Trade Value',
    mobilePriceGst: '+ GST',
    innerGap: 24,
    actionsGap: 12,
    benefits: [
      { type: 'solid', text: '₹20 on Equity Intraday' },
      { type: 'solid', text: '0.20% on Equity Delivery' },
      { type: 'carry', text: '₹20/Order on Carry Forward Options' },
      { type: 'open',  text: '0.40% on E-Margin', sub: '*0% interest for 23 trading days' },
    ],
    equity: [
      { val: '₹20/order', lbl: 'on Intraday' },
      { val: '0.10%',     lbl: 'on Delivery*' },
      { val: '₹0',        lbl: 'on ETF' },
      { val: '0.40%',     lbl: 'on E-Margin' },
    ],
    derivatives: [
      { val: "₹20/order", lbl: "on Intraday" },
      { val: "₹20/order", lbl: "on Options" },
      { val: "₹20/order", lbl: "on Futures" },
    ],
  },
  default: {
    icon: publicPath('/assets/plan-icons/plan-icon-special.svg'),
    feeLabel: 'One-time Account Opening Fees',
    brokerageMain: 'Zero',
    brokerageNote: '*On all Intraday Trades',
    mobilePriceGst: '+ GST',
    innerGap: 42,
    actionsGap: 16,
    benefits: [
      { type: 'solid', text: '0.20% on Equity Delivery' },
      { type: 'carry', text: '₹20/Order on Carry Forward Options' },
      { type: 'open',  text: '0.50% on E-Margin', sub: '*0% interest for 23 trading days' },
    ],
    equity: [
      { val: '₹0',    lbl: 'on Intraday' },
      { val: '0.20%', lbl: 'on Delivery' },
      { val: '₹0',    lbl: 'on ETF' },
      { val: '0.50%', lbl: 'on E-Margin' },
    ],
    derivatives: [
      { val: '₹0',        lbl: 'on Intraday' },
      { val: '₹20/order', lbl: 'on Options' },
      { val: '₹20/order', lbl: 'on Futures' },
    ],
  },
};

const getStaticData = (planName: string): StaticPlanData => {
  const lower = planName.toLowerCase();
  if (lower.includes('basic'))   return STATIC_BY_KEY.basic;
  if (lower.includes('premium')) return STATIC_BY_KEY.premium;
  return STATIC_BY_KEY.default;
};

const routeFromUiMetadata = (uiMetadata: string | undefined): string | null => {
  try {
    const meta = JSON.parse(uiMetadata ?? '{}');
    return meta?.route ? `/${String(meta.route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const BackArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M5 12H19" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 18" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 6"  stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PdfIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="1" width="9" height="12" rx="1" stroke="#280071" strokeWidth="1.2" />
    <path d="M9 1v4h4" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M9 1l4 4"  stroke="#280071" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M5 7.5h6M5 9.5h4" stroke="#280071" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

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

function DesktopBenefitItem({ type, text, sub }: { type: BenefitKind; text: string; sub?: string }) {
  if (type === 'carry') {
    return (
      <div className={styles.dBenefitCarry}>
        <img
          src={publicPath("/assets/plan-icons/done-carry.svg")}
          alt=""
          className={styles.dBenefitCarryIcon}
          width={12}
          height={12}
        />
        <div className={styles.dBenefitCarryText}>
          <p>{"₹20/Order on Carry Forward "}</p>
          <p>Options</p>
        </div>
      </div>
    );
  }
  if (type === "open") {
    return (
      <div className={`${styles.dBenefitItem} ${styles.dBenefitItemTop}`}>
        <div className={styles.dBenefitOpenWrap}>
          <img
            src={publicPath("/assets/plan-icons/done-open.svg")}
            alt=""
            width={10}
            height={10}
          />
        </div>
        <div className={styles.dBenefitTextMulti}>
          <span>{text}</span>
          {sub && <span className={styles.dBenefitSub}>{sub}</span>}
        </div>
      </div>
    );
  }
  return (
    <div className={styles.dBenefitItem}>
      <div className={styles.dBenefitIconWrap}>
        <img
          src={publicPath("/assets/plan-icons/done-solid.svg")}
          alt=""
          width={12}
          height={12}
        />
      </div>
      <span className={styles.dBenefitText}>{text}</span>
    </div>
  );
}

// ─── Shared benefit item used inside the mobile single-plan card ──────────────

function MobileBenefitItem({ type, text, sub }: { type: BenefitKind; text: string; sub?: string }) {
  return (
    <div className={styles.slideBenefitItem}>
      <img
        src={publicPath(
          type === 'carry' ? '/assets/plan-icons/done-carry.svg'
          : type === 'open'  ? '/assets/plan-icons/done-open.svg'
          : '/assets/plan-icons/done-solid.svg'
        )}
        alt=""
        width={12}
        height={12}
        style={{ flexShrink: 0, marginTop: 3 }}
      />
      <div>
        <p>{text}</p>
        {sub && <span className={styles.subLine}>{sub}</span>}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PlanPreference() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [apiPlans, setApiPlans]         = useState<ApiPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError]     = useState<string | null>(null);

  const [selectedIndex, setSelectedIndex]     = useState<number | null>(null);
  const [isProceeding, setIsProceeding]       = useState(false);
  const [proceedingIndex, setProceedingIndex] = useState<number | null>(null);
  const [proceedError, setProceedError]       = useState<string | null>(null);

  const [showKnowMore, setShowKnowMore]   = useState(false);
  const [knowMoreIndex, setKnowMoreIndex] = useState(0);

  const rejectStatus  = typeof window !== 'undefined' ? sessionStorage.getItem('RejectStatus') : null;
  // Mobile layout selection by plan count:
  //   1 plan      → single full-detail card (no carousel)
  //   2–3 plans   → tab strip + comparison table
  //   4+ plans    → swipeable carousel of plan cards
  const isSinglePlan  = apiPlans.length === 1;
  const isCarousel    = apiPlans.length > 3;

  useEffect(() => {
    void fetchPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPlans = async () => {
    const applicationId = sessionStorage.getItem('ApplicationId') ?? '';
    const journeyType   = sessionStorage.getItem('accountType') === 'semi-digital'
      ? 'NriSemiDigital' : 'NroDigital';
    const depository    = (sessionStorage.getItem('depository') as 'NSDL' | 'CDSL') ?? 'NSDL';

    if (!applicationId) {
      setPlansError('Session expired. Please start again.');
      setPlansLoading(false);
      return;
    }

    setPlansLoading(true);
    setPlansError(null);
    showSpinner();

    try {
      const plans: ApiPlan[] = await apiService.getPlans(applicationId, journeyType, depository);
      if (Array.isArray(plans) && plans.length > 0) {
        const sorted = [...plans].sort((a, b) => a.feeInPaise - b.feeInPaise);
        setApiPlans(sorted);
        const stored      = sessionStorage.getItem('selectedPlan');
        const restoredIdx = stored !== null ? parseInt(stored, 10) : 0;
        setSelectedIndex(Math.min(restoredIdx, sorted.length - 1));
      } else {
        setPlansError('No plans available at the moment.');
      }
    } catch {
      setPlansError('Failed to load plans. Please try again.');
    } finally {
      setPlansLoading(false);
      hideSpinner();
    }
  };

  const proceedWithPlan = async (idx: number) => {
    const plan = apiPlans[idx];
    if (!plan) return;

    const applicationId = sessionStorage.getItem('ApplicationId') ?? '';
    if (!applicationId) { setProceedError('Session expired. Please start again.'); return; }

    setIsProceeding(true);
    setProceedingIndex(idx);
    setProceedError(null);
    showSpinner();

    try {
      const response = await apiService.selectPlan(applicationId, {
        planId:     plan.id,
        depository: plan.depository,
      });
      sessionStorage.setItem('selectedPlan', String(idx));
      sessionStorage.setItem('planId',       plan.id);
      sessionStorage.setItem('depository',   plan.depository);
      const route = routeFromUiMetadata(response?.uiMetadata) ?? '/CaptureSelfie/1';
      router.push(route);
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail  ||
        err?.response?.data?.message ||
        err?.response?.data?.title   ||
        'Something went wrong. Please try again.';
      setProceedError(msg);
    } finally {
      setIsProceeding(false);
      setProceedingIndex(null);
      hideSpinner();
    }
  };

  const backToDeclaration = () => router.push('/planprocess/1');
  const openKnowMore = (index: number) => { setKnowMoreIndex(index); setShowKnowMore(true); };

  const kmPlan   = apiPlans[knowMoreIndex];
  const kmStatic = kmPlan ? getStaticData(kmPlan.name) : STATIC_BY_KEY.default;
  const kmName   = kmPlan?.name ?? '';

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
        <button type="button" onClick={fetchPlans}>Retry</button>
      </div>
    );
  }

  const middleIndex = Math.floor(apiPlans.length / 2);

  // Full plan card used by the mobile carousel (4+ plans). Reuses the existing
  // slide-card styles; tap selects, Proceed submits, Know More opens the modal.
  const renderCarouselCard = (plan: ApiPlan, i: number) => {
    const s                = getStaticData(plan.name);
    const isSelected       = selectedIndex === i;
    const isThisProceeding = isProceeding && proceedingIndex === i;
    return (
      <div
        className={[
          styles.slideCard,
          isSelected ? styles.slideCardHighlighted : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setSelectedIndex(i)}
      >
        <div className={styles.slideIconRow}>
          <img src={s.icon} alt={plan.name} width={28} height={28} />
          <p className={styles.slidePlanName}>{plan.name}</p>
        </div>

        <div className={styles.slidePriceRow}>
          <div className={styles.slidePriceAmount}>
            <span className={styles.slidePriceValue}>{plan.feeInPaise === 0 ? '0' : plan.feeInPaise}</span>
            <span className={styles.slidePriceGst}>Excl. GST</span>
          </div>
          <p className={styles.slideFeeLabel}>{s.feeLabel}</p>
        </div>

        <div className={styles.slideDivider} />

        <div className={styles.slideBrokerageBlock}>
          <p>
            <span className={styles.brokerageMain}>{s.brokerageMain}</span>
            <span className={styles.brokerageLabel}> Brokerage</span>
          </p>
          <span className={styles.brokerageNote}>{s.brokerageNote}</span>
        </div>

        <div className={styles.slideDivider} />

        <div className={styles.slideBenefits}>
          <p className={styles.slideBenefitsTitle}>Lifetime Benefits Include:</p>
          {s.benefits.map((b, bi) => (
            <MobileBenefitItem key={bi} type={b.type} text={b.text} sub={b.sub} />
          ))}
        </div>

        <div className={styles.slideActions}>
          <button
            type="button"
            className={styles.slideProceedBtn}
            disabled={isProceeding}
            onClick={(e) => { e.stopPropagation(); setSelectedIndex(i); proceedWithPlan(i); }}
          >
            {isThisProceeding ? 'Processing…' : 'Proceed'}
          </button>
          <button
            type="button"
            className={styles.slideKnowMore}
            onClick={(e) => { e.stopPropagation(); openKnowMore(i); }}
          >
            Know More
          </button>
        </div>
      </div>
    );
  };

  // Desktop plan card. Rendered in a centered flex row for ≤3 plans, or inside
  // a Splide carousel for 4+ plans.
  const renderDesktopCard = (plan: ApiPlan, i: number) => {
    const s                = getStaticData(plan.name);
    const isSelected       = selectedIndex === i;
    const isThisProceeding = isProceeding && proceedingIndex === i;
    return (
      <div
        key={plan.id}
        className={[
          styles.dCard,
          isSelected ? styles.dCardSelected : '',
        ].filter(Boolean).join(' ')}
        onClick={() => setSelectedIndex(i)}
        style={{ cursor: "pointer" }}
      >
        <div className={styles.dCardInner} style={{ gap: s.innerGap }}>
          <div className={styles.dCardTop}>
            <div className={styles.dPlanHeader}>
              <div className={styles.dTitleRow}>
                <img src={s.icon} alt="" width={31} height={31} className={styles.dPlanIcon} />
                <span className={styles.dPlanName}>{plan.name}</span>
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
              </div>
              {/* Raw feeInPaise — no conversion */}
              <div className={styles.dPriceSection}>
                <div className={styles.dPriceRow}>
                  <div className={styles.dPriceAmount}>
                    <span className={styles.dPriceRupee}>₹</span>
                    <span className={styles.dPriceNumber}>
                      {plan.feeInPaise === 0 ? '0' : plan.feeInPaise}
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
                <p>
                  <strong className={styles.dBrokerageHL}>{s.brokerageMain}</strong>
                  <span className={styles.dBrokerageBody}>{" Brokerage"}</span>
                </p>
                <p>
                  <span className={styles.dBrokerageNote}>{s.brokerageNote}</span>
                </p>
              </div>
              <div className={styles.dDivider} />
            </div>

            <div className={styles.dBenefitsSection}>
              <span className={styles.dBenefitsTitle}>Lifetime Benefits Include:</span>
              {s.benefits.map((b, bi) => (
                <DesktopBenefitItem key={bi} type={b.type} text={b.text} sub={b.sub} />
              ))}
            </div>
          </div>

          <div className={styles.dCardActions} style={{ gap: s.actionsGap }}>
            <button
              type="button"
              className={styles.dProceedBtn}
              disabled={isProceeding}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndex(i);
                proceedWithPlan(i);
              }}
            >
              {isThisProceeding ? 'Processing…' : 'Proceed'}
            </button>
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
              onClick={backToDeclaration}
              aria-label="Back"
            >
              <BackArrow />
            </button>
          )}
          <div className={styles.mobileHeaderInfo}>
            <div className={styles.mobileHeaderTop}>
              <p className={styles.mobileTitle}>Plan Selection</p>
              <button className={styles.dpTariffBtn} type="button">
                <PdfIcon />
                DP Tariff
              </button>
            </div>
            <p className={styles.mobileSubtitle}>
              Select a plan that works best for your investment and trading needs
            </p>
          </div>
        </div>

        <div className={styles.mobilePlanCard}>

          {/* ── SINGLE PLAN: show a full detail card + Proceed button ────────── */}
          {isSinglePlan && (() => {
            const plan = apiPlans[0];
            const s    = getStaticData(plan.name);
            const isThisProceeding = isProceeding && proceedingIndex === 0;
            return (
              <div className={styles.singlePlanWrap}>
                <div className={styles.singlePlanCard}>
                  {/* Header row: icon + name */}
                  <div className={styles.slideIconRow}>
                    <img src={s.icon} alt={plan.name} width={28} height={28} />
                    <p className={styles.slidePlanName}>{plan.name}</p>
                  </div>

                  {/* Price */}
                  <div className={styles.slidePriceRow}>
                    <div className={styles.slidePriceAmount}>
                      <span className={styles.slidePriceValue}>{plan.feeInPaise === 0 ? '0' : plan.feeInPaise}</span>
                      <span className={styles.slidePriceGst}>Excl. GST</span>
                    </div>
                    <p className={styles.slideFeeLabel}>{s.feeLabel}</p>
                  </div>

                  <div className={styles.slideDivider} />

                  {/* Brokerage */}
                  <div className={styles.slideBrokerageBlock}>
                    <p>
                      <span className={styles.brokerageMain}>{s.brokerageMain}</span>
                      <span className={styles.brokerageLabel}> Brokerage</span>
                    </p>
                    <span className={styles.brokerageNote}>{s.brokerageNote}</span>
                  </div>

                  <div className={styles.slideDivider} />

                  {/* Benefits */}
                  <div className={styles.slideBenefits}>
                    <p className={styles.slideBenefitsTitle}>Lifetime Benefits Include:</p>
                    {s.benefits.map((b, bi) => (
                      <MobileBenefitItem key={bi} type={b.type} text={b.text} sub={b.sub} />
                    ))}
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
                <button
                  type="button"
                  className={styles.singlePlanProceedBtn}
                  disabled={isProceeding}
                  onClick={() => proceedWithPlan(0)}
                >
                  {isThisProceeding ? 'Processing…' : 'Proceed'}
                </button>

                {proceedError && (
                  <p style={{ color: '#d32f2f', fontSize: 13, textAlign: 'center' }}>
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
                <Splide
                  options={{
                    perPage: 1,
                    arrows: false,
                    pagination: true,
                    rewind: false,
                    gap: '12px',
                    padding: { right: '40px' },
                    start: selectedIndex ?? 0,
                  }}
                  aria-label="Plan options"
                >
                  {apiPlans.map((plan, i) => (
                    <SplideSlide key={plan.id}>
                      {renderCarouselCard(plan, i)}
                    </SplideSlide>
                  ))}
                </Splide>
              </div>

              {proceedError && (
                <p style={{ color: '#d32f2f', fontSize: 13, textAlign: 'center', marginTop: 8, padding: '0 16px' }}>
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
                  const s                = getStaticData(plan.name);
                  const isMiddle         = i === middleIndex;
                  const isSelected       = selectedIndex === i;
                  const isThisProceeding = isProceeding && proceedingIndex === i;
                  return (
                    <div
                      key={plan.id}
                      className={[
                        styles.mobilePlanTab,
                        isMiddle && !isSelected ? styles.mobilePlanTabMiddle : '',
                        isSelected ? styles.mobilePlanTabSelected : '',
                      ].filter(Boolean).join(' ')}
                    >
                      <img src={s.icon} alt={plan.name} className={styles.tabIcon} />
                      <div className={styles.tabNamePrice}>
                        <p className={styles.tabName}>{plan.name}</p>
                        <div>
                          <p className={styles.tabPrice}>
                            {plan.feeInPaise === 0
                              ? 'ZERO'
                              : <>
                                  ₹{plan.feeInPaise}
                                  {s.mobilePriceGst && (
                                    <span className={styles.tabPriceGst}> {s.mobilePriceGst}</span>
                                  )}
                                </>
                            }
                          </p>
                          <p className={styles.tabPriceSub}>
                            {plan.feeInPaise === 0 ? 'Zero fees' : 'One-time fees'}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={[
                          styles.tabSelectBtn,
                          isSelected ? styles.tabSelectBtnSelected : '',
                        ].filter(Boolean).join(' ')}
                        disabled={isProceeding}
                        onClick={() => isSelected ? proceedWithPlan(i) : setSelectedIndex(i)}
                      >
                        {isThisProceeding ? 'Processing…' : isSelected ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className={styles.comparisonBanner}>
                <p><strong>ZERO</strong> Interest for 23 trading days for Margin Trading</p>
                <p>and <strong>FREE</strong> AMC for 1 year</p>
              </div>

              <div className={styles.comparisonScrollArea}>
                <div className={styles.comparisonSectionHeader}><p>Equity</p></div>
                <div className={styles.comparisonDataRow}>
                  {apiPlans.map((plan, i) => {
                    const s = getStaticData(plan.name);
                    return (
                      <div key={plan.id} className={[
                        styles.comparisonCol,
                        selectedIndex === i ? styles.comparisonColSelected : '',
                        i === middleIndex   ? styles.comparisonColMiddle   : '',
                      ].filter(Boolean).join(' ')}>
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

                <div className={styles.comparisonSectionHeader}><p>Derivatives (F&amp;O)</p></div>
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
                </div>

                <p className={styles.comparisonFootnote}>
                  *Zero Brokerage on Delivery till 75 lakh Delivery Trade Volume for Premium Plan
                </p>
              </div>

              {proceedError && (
                <p style={{ color: '#d32f2f', fontSize: 13, textAlign: 'center', marginTop: 8, padding: '0 16px' }}>
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
                  onClick={backToDeclaration}
                  aria-label="Back"
                >
                  <BackArrow />
                </button>
              )}
              <div>
                <p className={styles.desktopCardTitle}>Plan Selection</p>
                <p className={styles.desktopCardSubtitle}>
                  Basis your trading preferences, we recommend the below plans.<br />
                  Select 1 of these {apiPlans.length} plans to begin your investment journey.
                </p>
              </div>
            </div>
            <button className={styles.dpTariffBtn} type="button">
              <PdfIcon />
              DP Tariff
            </button>
          </div>

          <div className={styles.desktopCardBody}>
            {isCarousel ? (
              <div className={styles.dCarouselWrapper}>
                <Splide
                  options={{
                    autoWidth: true,
                    perMove: 1,
                    gap: '24px',
                    arrows: true,
                    pagination: true,
                    drag: true,
                    focus: 'center',
                    trimSpace: 'move',
                  }}
                  aria-label="Plan options"
                >
                  {apiPlans.map((plan, i) => (
                    <SplideSlide key={plan.id}>
                      {renderDesktopCard(plan, i)}
                    </SplideSlide>
                  ))}
                </Splide>
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
          className={styles.modalOverlay}
          onClick={() => setShowKnowMore(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${kmName} plan details`}
        >
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
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
                  <p className={styles.modalColumnHeader}>Equity</p>
                  <div className={styles.modalList}>
                    {kmStatic.equity.map((item, fi) => (
                      <div key={fi}>
                        <div className={styles.modalListItem}>
                          <ModalDoneIcon />
                          <p>
                            <strong>{item.val}</strong> {item.lbl}
                          </p>
                        </div>
                        {fi < kmStatic.equity.length - 1 && <div className={styles.modalItemDivider} />}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ flex: 1 }}>
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
                </div>
              </div>
              <div className={styles.modalListMobile}>
                {[...kmStatic.equity, ...kmStatic.derivatives].map((item, fi) => (
                  <div key={fi}>
                    <div className={styles.modalListItem}>
                      <ModalDoneIcon size={16} />
                      <p><strong>{item.val}</strong> {item.lbl}</p>
                    </div>
                  </div>
                ))}
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
