'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './fatca.module.scss';
import FatcaUploadSheet from './FatcaUploadSheet';
import AdditionalDocument from '@/components/additional-document/AdditionalDocument';
import { fatcaStore, type FatcaFile } from './fatcaStore';
import LoadingButton from '@/components/ui/LoadingButton';

// FatcaDocument — Screen 2: uploaded TIN document preview
//        Route: /fatca/document
// Reads the cropped/uploaded file from fatcaStore. A hard reload empties the
// store, so we bounce back to the FATCA form.

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconFile() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4 1.5h5L13 5.5V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1Z" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M9 1.5V6h4" stroke="#280071" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function IconCloseChip() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M7.5 2.5L2.5 7.5M2.5 2.5L7.5 7.5" stroke="#2b2b2b" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function FileChip({ filename, onRemove }: { filename: string; onRemove: () => void }) {
  return (
    <div className={styles.fileChip}>
      <IconFile />
      <span className={styles.fileChipName}>{filename}</span>
      <button type="button" className={styles.fileChipRemove} onClick={onRemove} aria-label="Re-upload TIN document">
        <IconCloseChip />
      </button>
    </div>
  );
}

export default function FatcaDocument() {
  const router = useRouter();
  const [file, setFile] = useState<FatcaFile | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [showAdditional, setShowAdditional] = useState(false);

  // Hard reload empties the store — bounce back to the FATCA form.
  useEffect(() => {
    const f = fatcaStore.get();
    if (!f) {
      router.replace('/fatca');
      return;
    }
    setFile(f);
  }, [router]);

  const title    = 'Upload TIN Document';
  const subtitle = 'We need your Aadhaar image, since Digilocker service is down.';

  const handleReupload = () => setShowSheet(true);

  // Re-upload refreshes the preview in place with the newly stored file.
  const handleSheetProceed = () => {
    setFile(fatcaStore.get());
    setShowSheet(false);
  };

  if (!file) return null;

  const previewContent =
    file.type === 'application/pdf' ? (
      <p className={styles.pdfPreviewNote}>PDF uploaded — preview not available</p>
    ) : (
      <img src={file.objectUrl} alt="TIN document preview" className={styles.previewImg} />
    );

  // ── Mobile layout ──────────────────────────────────────────────────────────
  const mobileView = (
    <div className={styles.mobilePage}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderInner}>
          <div className={styles.mobileTopRow}>
            <button type="button" className={styles.mobileBackBtn} onClick={() => router.back()} aria-label="Go back">
              <IconBackArrow />
            </button>
          </div>
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>{title}</h1>
            <p className={styles.mobileSubtitle}>{subtitle}</p>
          </div>
        </div>
      </div>

      <div className={styles.mobileCardUpload}>
        <FileChip filename={file.name} onRemove={handleReupload} />
        <div className={styles.previewZone}>{previewContent}</div>
      </div>

      <div className={styles.mobileDoubleButtonArea}>
        <LoadingButton type="button" className={styles.mobileProceedBtn} onClick={() => setShowAdditional(true)}>
          Upload Additional Document
        </LoadingButton>
        <button type="button" className={styles.mobileOutlineBtn} onClick={handleReupload}>
          Re-upload
        </button>
      </div>
    </div>
  );

  // ── Desktop layout ─────────────────────────────────────────────────────────
  const desktopView = (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        <div className={styles.desktopCardHeader}>
          <button type="button" className={styles.desktopBackBtn} onClick={() => router.back()} aria-label="Go back">
            <IconBackArrow />
          </button>
          <div className={styles.desktopTitleBlock}>
            <h1 className={styles.desktopCardTitle}>{title}</h1>
            <p className={styles.desktopCardSubtitle}>{subtitle}</p>
          </div>
        </div>

        <div className={styles.desktopCardBody}>
          <div className={styles.desktopUploadPreviewRow}>
            <FileChip filename={file.name} onRemove={handleReupload} />
            <div className={styles.previewZone}>{previewContent}</div>
          </div>

          <div className={styles.desktopDoubleButtonWrapper}>
            <LoadingButton type="button" className={styles.desktopProceedBtn} onClick={() => setShowAdditional(true)}>
              Upload Additional Document
            </LoadingButton>
            <button type="button" className={styles.desktopOutlineBtn} onClick={handleReupload}>
              Re-upload
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileView}
      {desktopView}

      {showSheet && (
        <FatcaUploadSheet
          onClose={() => setShowSheet(false)}
          onProceed={handleSheetProceed}
        />
      )}

      {showAdditional && (
        <AdditionalDocument
          onClose={() => setShowAdditional(false)}
          onProceed={() => router.push('/additional-document/preview')}
          onSkip={() => router.push('/esign')}
        />
      )}
    </>
  );
}
