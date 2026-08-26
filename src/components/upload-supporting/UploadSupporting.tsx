'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import navigationService from '@/services/navigation.service';
import { UploadDocumentModal, type UploadedDocument } from './UploadDocumentModal';
import { UploadSupportingIllustration } from './UploadSupportingIllustration';
import styles from './upload-supporting.module.scss';
import secureSessionService from '@/services/secure-session.service';

// UploadSupporting — Pick a supporting KYC document (Aadhaar / PAN / Driving
// License / Passport) and upload it for re-verification.
// Figma desktop empty: 0:89042, mobile empty: 0:90004.
// Empty state: illustration + radio list + "Upload" CTA.
// After picking + cropping the doc, page switches to a verify state with
// preview + Reupload / Proceed.

interface VerifyFile {
  name: string;
  blob: Blob;
  objectUrl: string;
  type: string;
  size: number;
}

interface DocOption {
  id: string;
  label: string;
}

const DOCUMENTS: DocOption[] = [
  { id: 'aadhaarCard',    label: 'Aadhaar card' },
  { id: 'panCard',        label: 'PAN Card' },
  { id: 'drivingLicense', label: 'Driving license' },
  { id: 'passport',       label: 'Passport' },
];

const DESKTOP_MQ = '(min-width: 992px)';

function BackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12H19" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12L11 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 12L11 6" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MobBackChevron() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 6L9 12L15 18" stroke="#2b2b2b" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.5 5.5L6.7 10.3a1.5 1.5 0 0 0 2.1 2.1l5-5a3 3 0 0 0-4.2-4.2l-5.3 5.3a4.5 4.5 0 0 0 6.4 6.4l4.6-4.6"
        stroke="#280071"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallXIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M2 2L8 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 2L2 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function UploadSupporting() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [verifyFile, setVerifyFile] = useState<VerifyFile | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  // Revoke objectURLs when the verify file is replaced or component unmounts.
  useEffect(() => {
    const url = verifyFile?.objectUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [verifyFile]);

  const selectedDoc = DOCUMENTS.find((d) => d.id === selectedDocId);

  const onUploadClick = () => {
    if (!selectedDocId) {
      toast.warning('Please select a document type first.');
      return;
    }
    setShowUploadModal(true);
  };

  const onModalUploaded = (file: UploadedDocument) => {
    setVerifyFile({
      name: file.name,
      blob: file.blob,
      objectUrl: file.objectUrl,
      type: file.type,
      size: file.size,
    });
    setShowUploadModal(false);
  };

  const onReupload = () => {
    setVerifyFile(null);
    setShowUploadModal(true);
  };

  const removeVerifyFile = () => {
    setVerifyFile(null);
  };

  const goBack = () => {
    if (verifyFile) {
      setVerifyFile(null);
      return;
    }
    showSpinner();
    setTimeout(() => {
      router.push('/uploadSignature');
      hideSpinner();
    }, 200);
  };

  const proceed = async () => {
    if (!verifyFile) {
      toast.warning('Please upload a document.');
      return;
    }
    if (!selectedDocId) {
      toast.warning('Please select a document type.');
      return;
    }

    showSpinner();
    let base64: string;
    try {
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(verifyFile.blob);
      });
    } catch {
      hideSpinner();
      toast.error('Could not read the document. Please try again.');
      return;
    }

    secureSessionService.setItem(
      'supportingDocument',
      JSON.stringify({
        docType: selectedDocId,
        docLabel: selectedDoc?.label || '',
        fileName: verifyFile.name,
        fileType: verifyFile.type,
        fileSize: verifyFile.size,
        base64String: base64,
      }),
    );

    setTimeout(() => {
      router.push('/addNominee-landing');
      hideSpinner();
    }, 200);
  };

  const canUpload = !!selectedDocId;

  // ── Reusable blocks ────────────────────────────────────────────────────────
  const optionRow = (doc: DocOption) => {
    const selected = selectedDocId === doc.id;
    return (
      <button
        key={doc.id}
        type="button"
        className={styles.optionRow}
        onClick={() => setSelectedDocId(doc.id)}
        aria-pressed={selected}
      >
        <span
          className={`${styles.radioOuter} ${selected ? styles.radioOuterSelected : ''}`}
          aria-hidden="true"
        >
          {selected && <span className={styles.radioDot} />}
        </span>
        <span className={`${styles.optionLabel} ${selected ? styles.optionLabelSelected : ''}`}>
          {doc.label}
        </span>
      </button>
    );
  };

  const filePill = verifyFile && (
    <div className={styles.filePill}>
      <div className={styles.filePillMeta}>
        <PaperclipIcon />
        <span className={styles.filePillName} title={verifyFile.name}>{verifyFile.name}</span>
      </div>
      <button
        type="button"
        className={styles.filePillRemove}
        onClick={removeVerifyFile}
        aria-label="Remove file"
      >
        <SmallXIcon />
      </button>
    </div>
  );

  const previewBox = verifyFile && (
    <div className={styles.previewBox}>
      {verifyFile.type === 'application/pdf' ? (
        <p className={styles.pdfText}>PDF preview not available — {verifyFile.name}</p>
      ) : (
        <img src={verifyFile.objectUrl} alt="Uploaded document" className={styles.previewImg} />
      )}
    </div>
  );

  const uploadModal = (
    <UploadDocumentModal
      open={showUploadModal}
      isDesktop={!!isDesktop}
      docLabel={selectedDoc?.label || 'Document'}
      onClose={() => setShowUploadModal(false)}
      onUploaded={onModalUploaded}
    />
  );

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="Upload Supporting Document"
        style={{ background: '#f8f8f8', minHeight: 'calc(100vh - 90px)' }}
      />
    );
  }

  // ── Desktop ────────────────────────────────────────────────────────────────
  if (isDesktop) {
    const title = verifyFile
      ? `Verify your ${selectedDoc?.label ?? 'document'}`
      : 'Upload Supporting Document';
    const subtitle = verifyFile
      ? 'Make sure the document is clear and readable before submitting.'
      : 'Upload any one of the below mentioned document';

    return (
      <section
        className="pan_details_form"
        aria-label="Upload Supporting Document"
        style={{ background: '#f8f8f8', minHeight: 'calc(100vh - 90px)', padding: 0 }}
      >
        {uploadModal}
        <div className={styles.deskCard}>
          <div className={styles.deskHeader}>
            <button type="button" className={styles.backBtn} onClick={goBack} aria-label="Go back">
              <BackArrow />
            </button>
            <div className={styles.deskHeaderText}>
              <h5>{title}</h5>
              <p>{subtitle}</p>
            </div>
          </div>

          {verifyFile ? (
            <>
              <div className={styles.deskBody}>
                <div className={styles.verifyBody}>
                  {filePill}
                  {previewBox}
                </div>
              </div>
              <div className={styles.deskBtnRowDual}>
                <button type="button" className={styles.btnOutline} onClick={onReupload}>
                  Reupload
                </button>
                <button type="button" className={styles.btnFilled} onClick={proceed}>
                  Proceed
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.deskBody}>
                <div className={styles.deskTwoCol}>
                  <div className={styles.illustrationCol}>
                    <UploadSupportingIllustration />
                  </div>
                  <div className={styles.optionsCol}>
                    <p className={styles.lead}>
                      Kindly upload any one valid document that matches the selfie taken during the journey
                    </p>
                    <div className={styles.optionsList} role="radiogroup" aria-label="Document type">
                      {DOCUMENTS.map(optionRow)}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.deskBtnRow}>
                <button
                  type="button"
                  className={styles.btnFilled}
                  disabled={!canUpload}
                  onClick={onUploadClick}
                >
                  {selectedDoc ? `Upload ${selectedDoc.label}` : 'Upload'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    );
  }

  // ── Mobile ─────────────────────────────────────────────────────────────────
  const mobTitle = verifyFile
    ? `Verify your ${selectedDoc?.label ?? 'document'}`
    : 'Upload Supporting Document';
  const mobSubtitle = verifyFile
    ? 'Make sure the document is clear and readable.'
    : 'Upload any one of the below mentioned document';

  return (
    <section
      className="pan_details_form"
      aria-label="Upload Supporting Document"
      style={{
        background: '#f8f8f8',
        minHeight: 'calc(100vh - 90px)',
        padding: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {uploadModal}
      <div className={styles.mobGrayHeader}>
        <div className={styles.mobBackRow}>
          <button
            type="button"
            className={styles.mobBackBtn}
            onClick={goBack}
            aria-label="Go back"
          >
            <MobBackChevron />
          </button>
        </div>
        <div className={styles.mobTitleBlock}>
          <p className={styles.mobTitle}>{mobTitle}</p>
          <p className={styles.mobSubtitle}>{mobSubtitle}</p>
        </div>
      </div>

      <div className={styles.mobContentCard}>
        {verifyFile ? (
          <div className={styles.verifyBodyMob}>
            {filePill}
            {previewBox}
            <div className={styles.mobInfoBlock}>
              <p className={styles.mobInfoLine}>Files supported: JPG, PNG & PDF</p>
              <p className={styles.mobInfoLine}>Maximum size less than 4 MB</p>
              <p className={styles.mobInfoLine}>
                Please ensure that you don&apos;t upload password protected documents
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className={styles.mobIllustration}>
              <UploadSupportingIllustration />
            </div>
            <div className={styles.mobOptionsBlock}>
              <p className={styles.mobLead}>
                Kindly upload any one valid document that matches the selfie taken during the journey
              </p>
              <div className={styles.optionsList} role="radiogroup" aria-label="Document type">
                {DOCUMENTS.map(optionRow)}
              </div>
            </div>
          </>
        )}
      </div>

      <div className={verifyFile ? styles.mobBtnBarStack : styles.mobBtnBar}>
        {verifyFile ? (
          <>
            <button type="button" className={styles.mobBtnFilled} onClick={proceed}>
              Proceed
            </button>
            <button type="button" className={styles.mobBtnOutline} onClick={onReupload}>
              Re-upload
            </button>
          </>
        ) : (
          <button
            type="button"
            className={styles.mobBtnFilled}
            disabled={!canUpload}
            onClick={onUploadClick}
          >
            {selectedDoc ? `Upload ${selectedDoc.label}` : 'Upload'}
          </button>
        )}
      </div>
    </section>
  );
}
