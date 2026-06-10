'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdditionalDocument from './AdditionalDocument';
import { additionalDocumentStore, type AdditionalDocumentFile } from './additionalDocumentStore';
import styles from './additional-document.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';

// AdditionalDocumentPreview — dedicated preview screen for the file picked in
// the AdditionalDocument modal. Mirrors OCI/passport preview pages.
//
// - Reads the file from `additionalDocumentStore` on mount; redirects to the
//   OCI back screen if the store is empty (e.g. after a hard reload).
// - Re-Upload opens the AdditionalDocument modal inline. After a successful
//   re-upload the preview refreshes in place and the modal closes.
// - Proceed advances to /esign.

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M13.333 7.333 7.667 13a3 3 0 0 1-4.241-4.243l5.83-5.83a2 2 0 0 1 2.83 2.83L6.4 11.643a1 1 0 0 1-1.414-1.414l5.057-5.057"
        stroke="#280071" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function IconChipClose() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="#2B2B2B" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FileChip({ filename, onRemove }: { filename: string; onRemove: () => void }) {
  return (
    <div className={styles.fileChip}>
      <IconFile />
      <span className={styles.fileChipName}>{filename}</span>
      <button type="button" className={styles.fileChipRemove} onClick={onRemove} aria-label="Remove file">
        <IconChipClose />
      </button>
    </div>
  );
}

export default function AdditionalDocumentPreview() {
  const router = useRouter();
  const [file, setFile] = useState<AdditionalDocumentFile | null>(null);
  const [showSheet, setShowSheet] = useState(false);

  useEffect(() => {
    const f = additionalDocumentStore.get();
    if (!f) {
      router.replace('/oci/upload');
      return;
    }
    setFile(f);
  }, [router]);

  const handleBack = () => router.back();
  const handleReupload = () => setShowSheet(true);
  const handleProceed = () => router.push('/esign');

  if (!file) return null;

  const previewContent =
    file.type === 'application/pdf' ? (
      <p className={styles.pdfPreviewNote}>PDF uploaded — preview not available</p>
    ) : (
      <img src={file.objectUrl} alt="Uploaded additional document" className={styles.previewImg} />
    );

  return (
    <>
      {/* ═══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload Additional Document">

        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload Additional Document</h1>
              <p className={styles.mobileSubtitle}>
                Review your uploaded document before continuing.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCardUpload}>
          <FileChip filename={file.name} onRemove={handleReupload} />
          <div className={styles.previewZone}>{previewContent}</div>
        </div>

        <div className={styles.mobileDoubleButtonArea}>
          <LoadingButton type="button" className={styles.mobileProceedBtn} onClick={handleProceed}>
            Proceed
          </LoadingButton>
          <button type="button" className={styles.mobileOutlineBtn} onClick={handleReupload}>
            Re-Upload
          </button>
        </div>

      </div>

      {/* ═══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload Additional Document">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload Additional Document</h1>
              <p className={styles.desktopCardSubtitle}>
                Review your uploaded document before continuing.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <FileChip filename={file.name} onRemove={handleReupload} />
              <div className={styles.previewZone}>{previewContent}</div>
            </div>

            <div className={styles.desktopDoubleButtonRow}>
              <button type="button" className={styles.desktopOutlineBtn} onClick={handleReupload}>
                Re-Upload
              </button>
              <LoadingButton type="button" className={styles.desktopProceedBtn} onClick={handleProceed}>
                Proceed
              </LoadingButton>
            </div>
          </div>

        </div>
      </div>

      {/* Re-upload sheet — refreshes preview in place on success */}
      {showSheet && (
        <AdditionalDocument
          onClose={() => setShowSheet(false)}
          onProceed={() => {
            setFile(additionalDocumentStore.get());
            setShowSheet(false);
          }}
          onSkip={() => setShowSheet(false)}
        />
      )}
    </>
  );
}
