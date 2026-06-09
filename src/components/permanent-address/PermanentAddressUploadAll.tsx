'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import styles from './permanent-address.module.scss';

// PermanentAddressUploadAll — all-in-one address-proof upload (passport style).
// Reached from /permanentAddress (the Address Proof Type landing page). Two
// inline FileUploadCard sections (Front + Back); both required before Proceed
// advances to the next route. Replaces the old step-1 + upload-modal flow.
// Route: /permanentAddress/upload

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function PermanentAddressUploadAll() {
  const router = useRouter();

  // proofType is chosen on the landing screen and stashed in sessionStorage.
  const [proofType, setProofType] = useState('Driving License');
  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles,  setBackFiles]  = useState<UploadedFile[]>([]);

  useEffect(() => {
    const saved = sessionStorage.getItem('pa_proofType');
    if (saved) setProofType(saved);
  }, []);

  const frontUploaded = frontFiles.some((f) => f.status === 'success');
  const backUploaded  = backFiles.some((f) => f.status === 'success');
  // Additional document is optional — Proceed only needs front + back.
  const isDisabled = !frontUploaded || !backUploaded;

  const handleBack = () => router.push('/permanentAddress');
  const handleProceed = () => {
    if (isDisabled) return;
    router.push('/next-route');
  };

  const frontSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload {proofType} Front</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setFrontFiles}
      />
    </div>
  );

  const backSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload {proofType} Back</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        onFilesChange={setBackFiles}
      />
    </div>
  );

  // ── Additional document — optional, inline (mirrors the Visa layout) ─────────
  const additionalSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Additional Document</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
      />
    </div>
  );

  // ── MOBILE ───────────────────────────────────────────────────────────────
  const mobileLayout = (
    <div className={styles.mobilePage}>
      <div className={styles.mobileHeader}>
        <div className={styles.mobileHeaderInner}>
          <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
            <BackArrow />
          </button>
          <div className={styles.mobileTitleBlock}>
            <h1 className={styles.mobileTitle}>Upload {proofType}</h1>
            <p className={styles.mobileSubtitle}>
              Upload the front &amp; back of your {proofType} for address verification.
            </p>
          </div>
        </div>
      </div>

      <div className={styles.mobileCard}>
        {frontSection}
        {backSection}
        {additionalSection}
      </div>

      <div className={styles.mobileProceedArea}>
        <button
          type="button"
          className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ''}`}
          onClick={handleProceed}
          disabled={isDisabled}
          aria-disabled={isDisabled}
        >
          Proceed
        </button>
      </div>
    </div>
  );

  // ── DESKTOP ──────────────────────────────────────────────────────────────
  const desktopLayout = (
    <div className={styles.desktopPage}>
      <div className={styles.desktopCard}>
        <div className={styles.desktopCardHeader}>
          <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
            <BackArrow />
          </button>
          <div className={styles.desktopTitleBlock}>
            <h1 className={styles.desktopCardTitle}>Upload {proofType}</h1>
            <p className={styles.desktopCardSubtitle}>
              Upload the front &amp; back of your {proofType} for address verification.
            </p>
          </div>
        </div>

        <div className={styles.desktopCardBody}>
          <div className={styles.desktopContentArea}>
            {frontSection}
            {backSection}
            {additionalSection}
          </div>

          <div className={styles.desktopProceedWrapper}>
            <button
              type="button"
              className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.proceedBtnDisabled}` : ''}`}
              onClick={handleProceed}
              disabled={isDisabled}
              aria-disabled={isDisabled}
            >
              Proceed
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileLayout}
      {desktopLayout}
    </>
  );
}
