'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { publicPath } from "@/utils/publicPath";
import LoadingButton from '@/components/ui/LoadingButton';

const PLAN_NAMES = ['Basic', 'Special', 'Premium'];
const PLAN_ICONS = [
  publicPath('/assets/plan-icons/plan-icon-basic.svg'),
  publicPath('/assets/plan-icons/plan-icon-special.svg'),
  publicPath('/assets/plan-icons/plan-icon-premium.svg'),
];

const RISK_BULLETS = [
  '9 out of 10 individual traders in equity futures and options segment, incurred net losses',
  'On an average, loss makers registered net trading loss close to Rs. 50,000',
  'Over an above the net trading losses incurred, loss makers expended an additional 28% of net trading losses as transaction cost',
  'Those making net trading profits, incurred between 15% to 50% of such profits as transaction cost',
];

const RISK_SOURCE_TEXT =
  'SEBI Study dated January 25, 2023 on "Analysis of Profit and Loss of Individual Trader dealing in equity Futures and Options (F&O) Segment", where in aggregator level findings are based on annual Profit/Loss incurred by individual trader in equity F&O during FY 2021-22';

const BackArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12H19" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 18" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 6" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckMark = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SegmentCheckbox = ({ checked }: { checked: boolean }) => (
  <div
    className={`sp-checkbox${checked ? ' sp-checkbox--checked' : ''}`}
    role="checkbox"
    aria-checked={checked}
  >
    {checked && <CheckMark />}
  </div>
);

const RiskDisclosure = () => (
  <div className="sp-risk-card">
    <p className="sp-risk-title">Risk disclosure</p>
    <ul className="sp-risk-list">
      {RISK_BULLETS.map((text, i) => (
        <li key={i} className="sp-risk-item">
          <span className="sp-risk-bullet" aria-hidden="true" />
          <p className="sp-risk-text">{text}</p>
        </li>
      ))}
      <li className="sp-risk-source">
        <p className="sp-risk-source-label">Source:</p>
        <p className="sp-risk-text">{RISK_SOURCE_TEXT}</p>
      </li>
    </ul>
  </div>
);

export default function SegmentPreference() {
  const router = useRouter();

  const [selectedIndex, setSelectedIndex] = useState<number>(1);

  useEffect(() => {
    const stored = sessionStorage.getItem('selectedPlan');
    if (stored !== null) setSelectedIndex(parseInt(stored, 10));
  }, []);

  const [equitySelected, setEquitySelected] = useState(false);
  const [derivativesSelected, setDerivativesSelected] = useState(false);

  // const canProceed = equitySelected && derivativesSelected;
  const canProceed = equitySelected;
  const proceedLabel = derivativesSelected ? 'I understand' : 'Proceed';

  const handleProceed = () => router.push('/CaptureSelfie/1');
  const handleBack    = () => router.push('/planprocess/2');

  const planName = PLAN_NAMES[selectedIndex] ?? PLAN_NAMES[1];
  const planIcon = PLAN_ICONS[selectedIndex] ?? PLAN_ICONS[1];

  return (
    <>
      {/* ─────────────── MOBILE ─────────────── */}
      <div className="mobile_css">
        <section className="pan_details_form" aria-labelledby="seg-mob-title">

          {/* Gray header: back icon + title + subtitle */}
          <div className="back_cls">
            <button type="button" className="sp-back-btn" onClick={handleBack} aria-label="Go back">
              <BackArrow />
            </button>
            <div className="sp-header-text">
              <h5 id="seg-mob-title">Segment Preference</h5>
              <p className="sub_title">
                Please select the segments you want to activate under your trading account.
              </p>
            </div>
          </div>

          {/* White content card */}
          <div className="sp-mob-card">

            {/* Plan Selected card */}
            <div className="sp-plan-card">
              <p className="sp-plan-label">Plan Selected</p>
              <div className="sp-plan-row-mob">
                <div className="sp-plan-logo">
                  <img src={planIcon} alt={planName} width={30} height={30} />
                </div>
                <span className="sp-plan-name-mob">{planName}</span>
                <button type="button" className="sp-change-btn" onClick={handleBack}>
                  Change
                </button>
              </div>
            </div>

            {/* Segment row: Equity */}
            <div
              className="sp-seg-row-mob"
              onClick={() => setEquitySelected(v => !v)}
              style={{ cursor: 'pointer' }}
            >
              <SegmentCheckbox checked={equitySelected} />
              <span className="sp-seg-label-mob">Equity &amp; MutualFund</span>
            </div>

            {/* Segment row: Derivatives */}
            {/* <div
              className="sp-seg-row-mob"
              onClick={() => setDerivativesSelected(v => !v)}
              style={{ cursor: 'pointer' }}
            >
              <SegmentCheckbox checked={derivativesSelected} />
              <span className="sp-seg-label-mob">Derivatives</span>
            </div> */}

            {/* Risk disclosure (when Derivatives is selected) */}
            {derivativesSelected && <RiskDisclosure />}
          </div>

          {/* Sticky Proceed button */}
          <div className="stickybtn">
            <LoadingButton
              type="button"
              onClick={handleProceed}
              className="btn btn_cls"
              disabled={!canProceed}
            >
              {proceedLabel}
            </LoadingButton>
          </div>
        </section>
      </div>

      {/* ─────────────── DESKTOP ─────────────── */}
      <div className="desktop_css">
        <section className="pan_details_form" aria-labelledby="seg-desk-title">

          <div className="sp-desk-card">

            {/* Card header */}
            <div className="sp-desk-header">
              <button type="button" className="sp-back-btn" onClick={handleBack} aria-label="Go back">
                <BackArrow />
              </button>
              <div className="sp-header-text">
                <h5 id="seg-desk-title">Segment Preference</h5>
                <p className="sub_title">
                  Please select the segments you want to activate under your trading account.
                </p>
              </div>
            </div>

            {/* Card body */}
            <div className="sp-desk-body">

              <div className="sp-desk-content">

                {/* Plan Selected card */}
                <div className="sp-plan-card">
                  <p className="sp-plan-label">Plan Selected</p>
                  <div className="sp-plan-row-desk">
                    <div className="sp-plan-logo">
                      <img src={planIcon} alt={planName} width={30} height={30} />
                    </div>
                    <div className="sp-plan-name-desk-wrap">
                      <span className="sp-plan-name-desk">{planName}</span>
                      <button type="button" className="sp-change-btn" onClick={handleBack}>
                        Change
                      </button>
                    </div>
                  </div>
                </div>

                {/* Segment rows — borderless on desktop */}
                <div className="sp-seg-list-desk">
                  <div
                    className="sp-seg-row-desk"
                    onClick={() => setEquitySelected(v => !v)}
                    style={{ cursor: 'pointer' }}
                  >
                    <SegmentCheckbox checked={equitySelected} />
                    <span className="sp-seg-label-desk">Equity and Mutual Fund</span>
                  </div>
                  {/* <div
                    className="sp-seg-row-desk"
                    onClick={() => setDerivativesSelected(v => !v)}
                    style={{ cursor: 'pointer' }}
                  >
                    <SegmentCheckbox checked={derivativesSelected} />
                    <span className="sp-seg-label-desk">Derivatives</span>
                  </div> */}
                </div>

                {/* Risk disclosure (when Derivatives is selected) */}
                {/* {derivativesSelected && <RiskDisclosure />} */}
                {/* {<RiskDisclosure />} */}
              </div>

              {/* Proceed button pinned to bottom */}
              <div className="sp-proceed-row">
                <LoadingButton
                  type="button"
                  onClick={handleProceed}
                  className="btn btn_cls sp-proceed-btn"
                  disabled={!canProceed}
                >
                  {proceedLabel}
                </LoadingButton>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
 