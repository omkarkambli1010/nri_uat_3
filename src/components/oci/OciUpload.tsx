'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';
import apiService from '@/services/api.service';

// OciUpload — Screen 1: Document Type + Card No. form
// Figma: Onboarding-Mob-OCI/PIO-Upload (0:38489 empty / 0:38815 filled)
//        Figma: Onboarding-Web-OCI/PIO-Upload (0:38576 / 0:38902)

type DocType = 'OCI' | 'PIO' | '';

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

const DOC_OPTIONS: { value: DocType; label: string }[] = [
  { value: 'OCI', label: 'OCI' },
  { value: 'PIO', label: 'PIO' },
];

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconCaretDown() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 6l4 4 4-4" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function OciUpload() {
  const router = useRouter();
  const [docType, setDocType]   = useState<DocType>('');
  const [cardNo, setCardNo]     = useState('');

  // Saved card number per type, prefilled from the OCI/PIO workflow stages so the
  // dropdown + Card No. restore on revisit and the number swaps with the type.
  const [savedByType, setSavedByType] = useState<Record<string, string>>({});

  // Prefill from the saved OCI/PIO stage. The user could have saved either type,
  // so fetch both and bind whichever has data (most recently updated wins).
  useEffect(() => {
    const applicationId = getApplicationId();
    if (!applicationId) return;

    let alive = true;
    (async () => {
      const [oci, pio] = await Promise.all([
        apiService.getOciPoiWorkflow(applicationId, 'OCI').catch(() => null),
        apiService.getOciPoiWorkflow(applicationId, 'PIO').catch(() => null),
      ]);
      if (!alive) return;

      const candidates: { type: 'OCI' | 'PIO'; cardNumber: string; updatedAt: string }[] = [];
      const grab = (res: any, type: 'OCI' | 'PIO') => {
        const d = res?.data as Record<string, unknown> | undefined;
        if (!d || (d.cardType == null && d.cardNumber == null)) return;
        candidates.push({
          type,
          cardNumber: d.cardNumber == null ? '' : String(d.cardNumber),
          updatedAt: d.updatedAt == null ? '' : String(d.updatedAt),
        });
      };
      grab(oci, 'OCI');
      grab(pio, 'PIO');

      const map: Record<string, string> = {};
      for (const c of candidates) map[c.type] = c.cardNumber;
      setSavedByType(map);

      // Bind whichever type was saved most recently.
      const pick = candidates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      if (pick) {
        setDocType(pick.type);
        setCardNo(pick.cardNumber);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // Switching the type restores that type's saved Card No. (if any).
  const handleDocTypeChange = (value: DocType) => {
    setDocType(value);
    if (value && savedByType[value] != null) setCardNo(savedByType[value]);
  };

  const handleBack = () => router.back();

  // Button label changes dynamically with selection (Figma: "Upload OCI Front")
  const buttonLabel = docType
    ? `Upload ${docType} Front`
    : 'Upload Select Front';

  const isDisabled = docType === '' || cardNo.trim() === '';

  const handleUploadClick = () => {
    if (isDisabled) return;
    // Persist card details so the upload screen can include them in the
    // poi-oci/upload submit.
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oci_cardType', docType);
      sessionStorage.setItem('oci_cardNumber', cardNo.trim());
    }
    router.push('/oci/upload');
  };

  return (
    <>
      {/* ═══ MOBILE ═══════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="OCI or PIO Card">

        {/* Gray header */}
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>OCI or PIO Card</h1>
              <p className={styles.mobileSubtitle}>
                Enter your details manually and upload your OCI/PIO (front and back) for verification.
              </p>
            </div>
          </div>
        </div>

        {/* White card */}
        <div className={styles.mobileCard}>

          {/* Field: Document Type */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-doc-type">Document Type *</label>
            <div className={styles.fieldInputWrap}>
              <select
                id="mob-doc-type"
                className={`${styles.fieldSelect}${docType === '' ? ` ${styles.placeholder}` : ''}`}
                value={docType}
                onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
              >
                <option value="" disabled hidden>Select</option>
                {DOC_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <span className={styles.fieldSelectCaret} aria-hidden="true">
                <IconCaretDown />
              </span>
            </div>
          </div>

          {/* Field: Card No. */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel} htmlFor="mob-card-no">Card No. *</label>
            <input
              id="mob-card-no"
              type="text"
              className={styles.fieldInput}
              placeholder="Enter number"
              value={cardNo}
              onChange={(e) => setCardNo(e.target.value)}
            />
          </div>

        </div>

        {/* Fixed bottom button */}
        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${isDisabled ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleUploadClick}
            disabled={isDisabled}
            aria-disabled={isDisabled}
          >
            {buttonLabel}
          </LoadingButton>
        </div>

      </div>

      {/* ═══ DESKTOP ══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="OCI or PIO Card">
        <div className={styles.desktopCard}>

          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>OCI or PIO Card</h1>
              <p className={styles.desktopCardSubtitle}>
                Enter your details manually and upload your OCI/PIO (front and back) for verification.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              <div className={styles.desktopFieldRow}>

                {/* Field: Document Type */}
                <div className={styles.desktopFieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="desk-doc-type">Document Type *</label>
                  <div className={styles.fieldInputWrap}>
                    <select
                      id="desk-doc-type"
                      className={`${styles.fieldSelect}${docType === '' ? ` ${styles.placeholder}` : ''}`}
                      value={docType}
                      onChange={(e) => handleDocTypeChange(e.target.value as DocType)}
                    >
                      <option value="" disabled hidden>Select</option>
                      {DOC_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                    <span className={styles.fieldSelectCaret} aria-hidden="true">
                      <IconCaretDown />
                    </span>
                  </div>
                </div>

                {/* Field: Card No. */}
                <div className={styles.desktopFieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="desk-card-no">Card No. *</label>
                  <input
                    id="desk-card-no"
                    type="text"
                    className={styles.fieldInput}
                    placeholder="Enter number"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                  />
                </div>

              </div>
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${isDisabled ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleUploadClick}
                disabled={isDisabled}
                aria-disabled={isDisabled}
              >
                {buttonLabel}
              </LoadingButton>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
 