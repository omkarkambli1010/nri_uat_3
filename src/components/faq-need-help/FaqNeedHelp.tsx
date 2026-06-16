'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { decodeReturnPath } from '@/lib/faq-link';
import styles from './faq-need-help.module.scss';

interface FaqItem {
  question: string;
  answer: string | string[];
  intro?: string;
}

const BackArrow = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M5 12H19" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 18" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M5 12L11 6" stroke="#222" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M22 16.92V19.92C22 20.51 21.51 21 20.92 21H20.5C9.5 21 3 14.5 3 3.5V3.08C3 2.49 3.49 2 4.08 2H7.08C7.67 2 8.16 2.49 8.16 3.08C8.16 4.5 8.33 5.84 8.69 7.13C8.83 7.62 8.69 8.16 8.31 8.54L6.91 9.94C8.27 12.45 10.53 14.71 13.06 16.06L14.46 14.66C14.84 14.28 15.38 14.14 15.87 14.28C17.16 14.64 18.5 14.81 19.92 14.81C20.51 14.81 21 15.3 21 15.89V16.92H22Z"
      stroke="#280071"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const MailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" stroke="#280071" strokeWidth="1.5" />
    <path d="M2 6L12 13L22 6" stroke="#280071" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const renderAnswerBody = (item: FaqItem) => {
  if (Array.isArray(item.answer)) {
    return (
      <div className={styles.faqAnswer}>
        {item.intro && <p className={styles.faqAnswerIntro}>{item.intro}</p>}
        <ul className={styles.faqAnswerList}>
          {item.answer.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <div className={styles.faqAnswer}>
      <p>{item.answer}</p>
    </div>
  );
};

export default function FaqNeedHelp() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stageName, setStageName] = useState('Selfie & Signature');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'FAQ & Need Help | SBI Securities';
    const stage = searchParams.get('stage');
    if (stage) setStageName(stage);
  }, [searchParams]);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const goBack = () => {
    const from = searchParams.get('from');
    if (from) {
      router.push(from);
    } else {
      router.back();
    }
  };

  return (
    <>
      {/* ─────────────── MOBILE ─────────────── */}
      <div className="mobile_css">
        <section className="pan_details_form" aria-labelledby="faq-mob-title">
          <div className="back_cls">
            <button type="button" className="sp-back-btn" onClick={goBack} aria-label="Go back">
              <BackArrow />
            </button>
            <div className="sp-header-text">
              <h5 id="faq-mob-title">Frequently Asked Questions</h5>
            </div>
          </div>

          <div className={styles.faqMobBody}>
            <p className={styles.helpText}>
              1. Need further assistance, feel free to contact our support team at{' '}
              <a href="mailto:NRIDESK.SSL@sbicapsec.com">
                NRIDESK.SSL@sbicapsec.com
              </a>{' '}
              / <a href="tel:+912268567464">+91 2268567464</a>.
            </p>

            <p className={styles.helpText}>
              2. We are available from 9:30 AM to 6:30 PM IST (Monday to Saturday only)
              except 2nd & 4th Saturdays.
            </p>

            <div className={styles.stillNeedHelp}>
              <p className={styles.stillNeedHelpTitle}>Still need help?</p>
              <div className={styles.helpButtonsMob}>
                <a href="mailto:NRIDESK.SSL@sbicapsec.com" className={styles.helpBtnMob}>
                  <MailIcon />
                  <span>Write to Us</span>
                </a>
                <a href="tel:+912268567464" className={styles.helpBtnMob}>
                  <PhoneIcon />
                  <span>Call now</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ─────────────── DESKTOP ─────────────── */}
      <div className="desktop_css">
        <section className="pan_details_form" aria-labelledby="faq-desk-title">
          <div className={styles.deskCard}>
            <div className={styles.deskHeader}>
              <button type="button" className="sp-back-btn" onClick={goBack} aria-label="Go back">
                <BackArrow />
              </button>
              <h5 id="faq-desk-title">Frequently Asked Questions</h5>
            </div>

            <div className={styles.deskBody}>

              <div className={styles.stillNeedHelp}>
                {/* <p className={styles.stillNeedHelpTitle}>Still need help?</p> */}
                <p className={styles.helpText}>
                  1. Need further assistance, feel free to contact our support team at{' '}
                  <a href="mailto:NRIDESK.SSL@sbicapsec.com">
                    NRIDESK.SSL@sbicapsec.com
                  </a>{' '}
                  / <a href="tel:+912268567464">+91 2268567464</a>.
                </p>

                <p className={styles.helpText}>
                  2. We are available from 9:30 AM to 6:30 PM IST (Monday to Saturday only)
                  except 2nd & 4th Saturdays.
                </p>

                <div className={styles.helpCardsDesk}>
                  <a href="tel:+912268567464" className={styles.helpCardDesk}>
                    <PhoneIcon />
                    <div className={styles.helpCardText}>
                      <p className={styles.helpCardLabel}>Call us on</p>
                      <p className={styles.helpCardValue}>+91 2268567464</p>
                    </div>
                  </a>
                  <a href="mailto:NRIDESK.SSL@sbicapsec.com" className={styles.helpCardDesk}>
                    <MailIcon />
                    <div className={styles.helpCardText}>
                      <p className={styles.helpCardLabel}>Write to Us</p>
                      <p className={`${styles.helpCardValue} ${styles.helpCardValueLink}`}>
                        NRIDESK.SSL@sbicapsec.com
                      </p>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
