'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import styles from './manual-document-screen.module.scss';
import { publicPath } from "@/utils/publicPath";

// ManualDocumentScreen — intro for the semi-digital document-upload journey.
// Figma: 0:122674 (desktop) / 0:123006 (mobile). Shows the required-documents
// checklist; "Start Uploading" enters the upload sequence at the first item.

// Checklist order mirrors the Figma list (Passport first).
const REQUIRED_DOCUMENTS = [
  'Passport - Indian or Foreign',
  'OCI/PIO',
  'Foreign Address Proof',
  'Permanent Address Proof',
  'Visa',
  'FATCA',
];

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ManualDocumentScreen() {
  const router = useRouter();

  const handleBack = () => router.push('/uploadSignature');

  // Enter the document-upload sequence at the passport details step.
  const handleStartUploading = () => router.push('/passportUpload/details');

  // Shared checklist block (illustration sized by the wrapping layout).
  const checklist = (
    <div className={styles.checklist}>
      <div className={styles.checklistHeading}>
        <p className={styles.checklistTitle}>Required Documentation Checklist</p>
        <p className={styles.checklistSubtitle}>
          Please ensure the following documents are prepared and ready for upload:
        </p>
      </div>
      <ol className={styles.checklistList}>
        {REQUIRED_DOCUMENTS.map((doc) => (
          <li key={doc}>{doc}</li>
        ))}
      </ol>
    </div>
  );

  return (
    <>
      {/* ═══ MOBILE LAYOUT ════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload the below documents">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload the below documents</h1>
              <p className={styles.mobileSubtitle}>
                Enter your details according to the selected document and upload the required documents.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          <div className={styles.illustrationMobile}>
            <Image
              src={publicPath("/assets/images/diy/upload-docs-illustration.png")}
              alt="Upload documents illustration"
              width={210}
              height={160}
              draggable={false}
            />
          </div>
          {checklist}
        </div>

        <div className={styles.mobileButtonArea}>
          <button type="button" className={styles.mobileStartBtn} onClick={handleStartUploading}>
            Start Uploading
          </button>
        </div>
      </div>

      {/* ═══ DESKTOP LAYOUT ═══════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload the below documents">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload the below documents</h1>
              <p className={styles.desktopCardSubtitle}>
                Enter your details according to the selected document and upload the required documents.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentRow}>
              <div className={styles.illustrationDesktop}>
                <Image
                  src={publicPath("/assets/images/diy/upload-docs-illustration.png")}
                  alt="Upload documents illustration"
                  width={267}
                  height={200}
                  draggable={false}
                />
              </div>
              {checklist}
            </div>

            <div className={styles.desktopButtonWrapper}>
              <button type="button" className={styles.desktopStartBtn} onClick={handleStartUploading}>
                Start Uploading
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
