'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import styles from './aadhaar-upload.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';
import { useSessionValue } from '@/hooks/useSessionValue';

// AadhaarUploadAll — all-in-one Aadhaar Front + Back upload (passport-upload
// style). Reached from /aadhar. Two FileUploadCard sections, each wired to the
// real uploadDocument/upload API via `uploadFn`. Both sides must upload
// successfully before Proceed advances the workflow (navigateToNextStep).

// ── Upload constraints ──────────────────────────────────────────────────────
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5 MB. Please upload a smaller file.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

const getFormNumber = () =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsDataURL(file);
  });

// Builds an uploadFn for FileUploadCard that posts the picked (cropped) file to
// the real upload API. Rejecting the promise marks the card's upload as failed.
const makeUploadFn =
  (docType: 'AADHARFRONT' | 'AADHARBACK') =>
  async (file: File, onProgress: (p: number) => void) => {
    onProgress(10);
    const base64 = await fileToBase64(file);
    onProgress(45);
    const reqData = {
      formNumber: getFormNumber(),
      flag: 'docBase64String',
      docType,
      base64String: base64,
    };
    const response = await apiService.postRequest('api/v1/uploadDocument/upload', reqData);
    if (response?.status !== true) {
      throw new Error(response?.message || 'Upload failed');
    }
    onProgress(100);
  };

const uploadFront = makeUploadFn('AADHARFRONT');
const uploadBack = makeUploadFn('AADHARBACK');

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function AadhaarUploadAll() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [frontFiles, setFrontFiles] = useState<UploadedFile[]>([]);
  const [backFiles,  setBackFiles]  = useState<UploadedFile[]>([]);

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, [router, hideSpinner]);

  const frontUploaded = frontFiles.some((f) => f.status === 'success');
  const backUploaded  = backFiles.some((f) => f.status === 'success');

  const isDisabled = !frontUploaded || !backUploaded;

  const handleBack = () => {
    showSpinner();
    setTimeout(() => { router.push('/aadhar'); hideSpinner(); }, 200);
  };

  // Both sides already uploaded via their own uploadFn — Proceed advances the
  // workflow. The additional document is optional and never blocks Proceed.
  const handleProceed = () => {
    if (isDisabled) return;
    showSpinner();
    setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
  };

  const showBack = rejectStatus !== 'R';

  const frontSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Aadhaar (Front)</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadFront}
        onFilesChange={setFrontFiles}
      />
    </div>
  );

  const backSection = (
    <div className={styles.section}>
      <p className={styles.sectionTitle}>Upload Aadhaar (Back)</p>
      <FileUploadCard
        acceptedTypes={ACCEPTED_TYPES}
        maxSize={MAX_SIZE}
        acceptedLabel={ACCEPTED_LABEL}
        sizeErrorMessage={SIZE_ERR}
        typeErrorMessage={TYPE_ERR}
        cropImages
        uploadFn={uploadBack}
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

  return (
    <>
      {/* ═══ MOBILE LAYOUT ════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload Aadhaar">

        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            {showBack && (
              <div className={styles.mobileTopRow}>
                <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                  <IconBackArrow />
                </button>
              </div>
            )}
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload Aadhaar</h1>
              <p className={styles.mobileSubtitle}>
                Upload the front &amp; back side of your Aadhaar card.
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
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            Proceed
          </LoadingButton>
        </div>

      </div>

      {/* ═══ DESKTOP LAYOUT ═══════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload Aadhaar">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            {showBack && (
              <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            )}
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload Aadhaar</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload the front &amp; back side of your Aadhaar card.
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
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                Proceed
              </LoadingButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
 