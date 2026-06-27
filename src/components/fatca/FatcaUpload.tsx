'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileUploadCard } from '@/components/file-upload/FileUploadCard';
import type { UploadedFile } from '@/components/file-upload/fileUpload.types';
import apiService from '@/services/api.service';
import { toast } from '@/services/toast.service';
import { DOCUMENT_TYPES } from '@/constants/document-types';
import { environment } from '@/environments/environment';
import styles from '@/components/oci/oci.module.scss';
import LoadingButton from '@/components/ui/LoadingButton';
import { useCountries } from '@/components/country-select/useCountries';
import { useSpinner } from '@/components/spinner/Spinner';

// FatcaUpload — /fatca/upload
// One upload section per TIN entry captured on /fatca. Each section has three
// image slots (all documentType=FatcaTinProof); each slot uploads immediately
// on selection and holds its own documentId. Proceed advances once every slot
// of every section has uploaded successfully.

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024;
const ACCEPTED_LABEL = 'PDF, JPG, JPEG, HEIC & PNG';
const SIZE_ERR = 'File size exceeds 5MB. Please upload PDF, JPG, JPEG, HEIC, PNG only.';
const TYPE_ERR = 'Unsupported file type. Please upload PDF, JPG, JPEG, HEIC, PNG only.';

// Number of image slots per TIN section.
const SLOTS = 3;

const getApplicationId = (): string =>
  typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

// Fetch a saved document URL into a real File + preview so it can be shown in
// the dropzone. S3 presigned URLs aren't CORS-enabled, so fetch via the
// same-origin proxy route (basePath-aware). Returns null on failure.
const buildInitialFile = async (url: string): Promise<UploadedFile | null> => {
  try {
    const proxied = `${environment.basePath || ''}/api/file-proxy?url=${encodeURIComponent(url)}`;
    const resp = await fetch(proxied);
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const isPdf = /\.pdf(\?|$)/i.test(url) || blob.type === 'application/pdf';
    const type = blob.type || (isPdf ? 'application/pdf' : 'image/jpeg');
    const ext = isPdf ? 'pdf' : (type.split('/')[1] || 'jpg');
    const file = new File([blob], `tin-document.${ext}`, { type });
    return {
      id: `saved-${url.slice(-24)}`,
      file,
      status: 'success',
      progress: 100,
      previewUrl: URL.createObjectURL(file),
    };
  } catch {
    return null;
  }
};

// Pull a document's presigned URL out of a documents[] entry across key casings.
const pickUrl = (doc: Record<string, unknown>): string => {
  const v = doc.presignedUrl ?? doc.preSignedUrl ?? doc.url;
  return v == null ? '' : String(v);
};

// uiMetadata JSON string → next route (e.g. '{"route":"addNominee"}' → '/addNominee').
const routeFromUiMetadata = (uiMetadata: unknown): string | null => {
  try {
    const ui = typeof uiMetadata === 'string' ? JSON.parse(uiMetadata) : uiMetadata;
    const route = (ui as Record<string, unknown> | null)?.route;
    return route ? `/${String(route).replace(/^\//, '')}` : null;
  } catch {
    return null;
  }
};

type TinEntry = { taxResidence: string; tinIssuingCountry: string; tinNumber: string };

function IconBackArrow() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M19 12H5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 19L5 12L12 5" stroke="#2B2B2B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FatcaUpload() {
  const router = useRouter();

  // Country Master (API) — used to resolve a dropdown country name back to its
  // ISO-2 code for residency.countryCode.
  const { countries } = useCountries();
  const nameToIso2 = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of countries) map[c.name] = c.iso2.toUpperCase();
    return map;
  }, [countries]);

  const [tins, setTins] = useState<TinEntry[]>([]);
  // docIds[entryIndex][slotIndex] — the uploaded documentId for each image slot.
  const [docIds, setDocIds] = useState<string[][]>([]);
  // initialFiles[entryIndex][slotIndex] — previously-uploaded TIN proof seeded
  // into the matching slot so it renders in the dropzone preview.
  const [initialFiles, setInitialFiles] = useState<(UploadedFile | null)[][]>([]);
  // slotReady[entry][slot] — whether a slot currently holds a successful file,
  // whether freshly uploaded OR seeded from the saved stagewise preview. The
  // Proceed gate uses this (not docIds) so an already-bound saved image counts,
  // even though stagewise documents carry no documentId.
  const [slotReady, setSlotReady] = useState<boolean[][]>([]);
  const [submitting, setSubmitting] = useState(false);

  // The prefill (fetch workflow + fetch saved previews) is async; until it has
  // fully applied we must not render the upload cards, otherwise an upload made
  // mid-prefill gets clobbered when the seeded previews/ids land. Gate the cards
  // (and show the global loader) on this flag.
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [prefillDone, setPrefillDone] = useState(false);

  // Load the TIN entries captured on /fatca, and prefill the previously-saved
  // TIN proof document ids + previews from the FATCA stage (POST …/get/workflow/
  // stagewisedate { stagename: "FATCA" }). The sessionStorage entries (fresh from
  // /fatca) take precedence; on a direct revisit (no sessionStorage) the saved
  // tax residencies are used instead. Redirect back only if neither has any.
  useEffect(() => {
    let alive = true;

    let loaded: TinEntry[] = [];
    try { loaded = JSON.parse(sessionStorage.getItem('fatca_tins') ?? '[]'); } catch { loaded = []; }
    if (!Array.isArray(loaded)) loaded = [];

    // Per-slot document ids persisted on upload (fatca_docids[entry][slot]). This
    // is the only record of WHICH slot each image went into — the API's
    // documents[] is slot-less — so it drives both the submit and which slot each
    // saved preview is bound back to.
    let storedDocIds: string[][] = [];
    try { storedDocIds = JSON.parse(sessionStorage.getItem('fatca_docids') ?? '[]'); } catch { storedDocIds = []; }
    if (!Array.isArray(storedDocIds)) storedDocIds = [];

    (async () => {
      const str = (v: unknown): string => (v == null ? '' : String(v));

      let residencies: Record<string, unknown>[] = [];
      let documents: Record<string, unknown>[] = [];
      const applicationId = getApplicationId();
      if (applicationId) {
        try {
          const res = await apiService.getFatcaWorkflow(applicationId);
          const d = res?.data as Record<string, unknown> | undefined;
          residencies = Array.isArray(d?.taxResidencies)
            ? (d!.taxResidencies as Record<string, unknown>[])
            : [];
          documents = Array.isArray(res?.documents)
            ? (res.documents as Record<string, unknown>[])
            : [];
        } catch {
          // Non-fatal — fall back to sessionStorage only.
        }
      }
      if (!alive) return;

      // Saved residencies → TIN entries (used when sessionStorage is empty).
      const serverTins: TinEntry[] = residencies.map((r) => ({
        taxResidence: str(r.countryofTaxResidence ?? r.countryOfTaxResidence ?? r.taxResidence),
        tinIssuingCountry: str(r.tinIssuingCountry),
        tinNumber: str(r.tin ?? r.tinNumber),
      }));

      const tinsToUse = loaded.length > 0 ? loaded : serverTins;
      if (tinsToUse.length === 0) {
        toast.error('FATCA details are missing. Please re-enter them.');
        router.push('/fatca');
        return;
      }
      setTins(tinsToUse);

      // Per-slot document ids. Prefer the sessionStorage record (it knows the
      // exact slot of every upload from this session); fall back to the saved
      // residencies by index (tin-matched) when sessionStorage has none.
      const ids: string[][] = tinsToUse.map((t, i) => {
        const stored = Array.isArray(storedDocIds[i]) ? storedDocIds[i] : null;
        if (stored && stored.some(Boolean)) {
          return [str(stored[0]), str(stored[1]), str(stored[2])];
        }
        const r = residencies[i];
        if (!r) return Array<string>(SLOTS).fill('');
        const serverTin = str(r.tin ?? r.tinNumber);
        if (serverTin && t.tinNumber && serverTin.toUpperCase() !== t.tinNumber.toUpperCase()) {
          return Array<string>(SLOTS).fill('');
        }
        return [
          str(r.tinProofDocumentId),
          str(r.tinProofDocumentId2),
          str(r.tinProofDocumentId3),
        ];
      });

      // The API's documents[] are slot-less FatcaTinProof URLs, so assign them to
      // the FILLED slots (those with a doc id, in slot order) — an image uploaded
      // to Image 3 binds back to Image 3, not collapsed into Image 1.
      const urls = documents
        .filter((doc) => str(doc.documentType).toLowerCase() === 'fatcatinproof')
        .map(pickUrl)
        .filter(Boolean);
      let u = 0;
      const pendingGrid: (string | null)[][] = ids.map((row) =>
        row.map((id) => (id && u < urls.length ? urls[u++] : null)),
      );
      // A slot keeps its saved id only where a matching preview was seeded, so the
      // success state and the id stay in sync (and the empty-card onFilesChange
      // doesn't wipe an id that has no preview).
      const finalIds = ids.map((row, i) => row.map((id, j) => (pendingGrid[i][j] ? id : '')));

      const fileGrid = await Promise.all(
        pendingGrid.map((row) =>
          Promise.all(row.map((url) => (url ? buildInitialFile(url) : Promise.resolve(null)))),
        ),
      );
      if (!alive) return;
      // Apply previews + ids together, then reveal the cards. Because the cards
      // are gated on prefillDone they mount exactly once with this seeded state,
      // so a user upload can never be clobbered by a late-resolving prefill.
      setInitialFiles(fileGrid);
      setDocIds(finalIds);
      // Seed readiness from the bound previews so the mandatory Image 1 counts
      // immediately; the cards keep this in sync via makeFilesChange.
      setSlotReady(fileGrid.map((row) => row.map((cell) => !!cell)));
      setPrefillDone(true);
    })();

    return () => {
      alive = false;
    };
  }, [router]);

  // Show the global loader on mount; hide it once the prefill has applied so the
  // upload cards are revealed already bound.
  useEffect(() => {
    showSpinner();
    return () => hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prefillDone) hideSpinner();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillDone]);

  // Persist the per-slot doc ids so a revisit can restore which image went into
  // which slot (the API documents[] is slot-less) and the submit always has them.
  useEffect(() => {
    if (!prefillDone) return;
    try { sessionStorage.setItem('fatca_docids', JSON.stringify(docIds)); } catch { /* ignore */ }
  }, [docIds, prefillDone]);

  const setSlotDoc = (entry: number, slot: number, id: string) =>
    setDocIds((prev) =>
      prev.map((row, i) => (i === entry ? row.map((d, j) => (j === slot ? id : d)) : row)));

  // Builds the upload handler for a given entry/slot. The file uploads to
  // documents/upload?documentType=FatcaTinProof; its documentId is stored.
  const makeUploadFn =
    (entry: number, slot: number) =>
    async (file: File, onProgress: (p: number) => void): Promise<void> => {
      const applicationId = getApplicationId();
      if (!applicationId) {
        toast.error('Your session has expired, please start again.');
        throw new Error('Missing application ID');
      }

      onProgress(10);

      const res = await apiService.uploadNriDocument({
        applicationId,
        documentType: DOCUMENT_TYPES.FATCA_TIN_PROOF,
        file,
      });

      if (!res?.status || !res?.documentId) {
        throw new Error('TIN document upload failed.');
      }

      setSlotDoc(entry, slot, res.documentId);
      onProgress(100);
    };

  // Track a slot's readiness, and clear its documentId when its file is removed /
  // not successfully uploaded.
  const makeFilesChange = (entry: number, slot: number) => (next: UploadedFile[]) => {
    const ok = next.some((f) => f.status === 'success');
    setSlotReady((prev) =>
      prev[entry] === undefined
        ? prev
        : prev.map((row, i) => (i === entry ? row.map((v, j) => (j === slot ? ok : v)) : row)),
    );
    if (!ok) setSlotDoc(entry, slot, '');
  };

  // Only Image 1 (the first slot) of each TIN section is mandatory; Images 2 & 3
  // are optional. Proceed enables once every section's first image is present —
  // either freshly uploaded or already bound from the saved stagewise preview.
  const allUploaded =
    tins.length > 0 &&
    slotReady.length === tins.length &&
    slotReady.every((row) => Boolean(row[0]));

  const handleBack = () => router.push('/fatca');

  // Submit the FATCA details — one residency per TIN entry, each carrying its
  // three uploaded image documentIds — then route per the response's uiMetadata.
  const handleProceed = async () => {
    if (!allUploaded || submitting) return;

    const applicationId = getApplicationId();
    if (!applicationId) {
      toast.error('Your session has expired, please start again.');
      return;
    }

    // Source the Tax Residency & TIN Details and their per-slot doc ids from
    // sessionStorage (the durable copy that survives a refresh on this page);
    // fall back to React state if anything is missing.
    let meta: { countryOfBirth?: string; citizenship?: string } = {};
    try { meta = JSON.parse(sessionStorage.getItem('fatca_meta') ?? '{}'); } catch { meta = {}; }

    let savedTins: TinEntry[] = tins;
    try {
      const t = JSON.parse(sessionStorage.getItem('fatca_tins') ?? 'null');
      if (Array.isArray(t) && t.length > 0) savedTins = t;
    } catch { /* keep state */ }

    let savedDocIds: string[][] = docIds;
    try {
      const d = JSON.parse(sessionStorage.getItem('fatca_docids') ?? 'null');
      if (Array.isArray(d) && d.length > 0) savedDocIds = d;
    } catch { /* keep state */ }

    const residencies = savedTins.map((t, i) => {
      const row = Array.isArray(savedDocIds[i]) ? savedDocIds[i] : [];
      return {
        countryCode: nameToIso2[t.taxResidence] ?? t.taxResidence,
        tin: t.tinNumber,
        // Empty image slots must be null, NOT "": these are GUID fields and the
        // API rejects "" (binding fails and the whole residency is dropped, so
        // taxResidencies persists empty). Same rule as Visa's document ids.
        tinProofDocumentId:  row[0] || null,
        tinProofDocumentId2: row[1] || null,
        tinProofDocumentId3: row[2] || null,
        countryofTaxResidence: t.taxResidence,
        tinIssuingCountry: t.tinIssuingCountry,
      };
    });

    setSubmitting(true);
    try {
      const res = await apiService.submitFatca(applicationId, {
        // POST /fatca expects the array under "residencies" and citizenship as
        // "Citizenship" (per the backend contract); other keys won't bind.
        residencies,
        // US person when the Citizenship selection is United States.
        usCitizen: (meta.citizenship ?? '') === 'United States',
        countryOfBirth: (meta.countryOfBirth ?? '').toUpperCase(),
        idempotencyKey: '',
        Citizenship: meta.citizenship ?? '',
      });
      router.push(routeFromUiMetadata(res?.uiMetadata) ?? '/esign');
    } catch {
      // apiService.handleError already surfaced the backend message.
    } finally {
      setSubmitting(false);
    }
  };

  const uploadSections = !prefillDone ? null : (
    <>
      {tins.map((t, entry) => (
        <div key={entry} className={styles.section}>
          <p className={styles.sectionTitle}>TIN {entry + 1} — TIN Document Images</p>
          <p className={styles.sectionSubtitle}>
            {t.taxResidence} · Issued by {t.tinIssuingCountry}
          </p>
          {Array.from({ length: SLOTS }, (_, slot) => {
            const seeded = initialFiles[entry]?.[slot] ?? null;
            return (
              <FileUploadCard
                key={`${slot}-${seeded?.id ?? 'empty'}`}
                initialFiles={seeded ? [seeded] : undefined}
                title={slot === 0 ? "Image 1" : `Image ${slot + 1} (Optional)`}
                acceptedTypes={ACCEPTED_TYPES}
                maxSize={MAX_SIZE}
                acceptedLabel={ACCEPTED_LABEL}
                sizeErrorMessage={SIZE_ERR}
                typeErrorMessage={TYPE_ERR}
                cropImages
                uploadFn={makeUploadFn(entry, slot)}
                onFilesChange={makeFilesChange(entry, slot)}
              />
            );
          })}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* ═══ MOBILE ════════════════════════════════════════════════════════════ */}
      <div className={styles.mobilePage} aria-label="Upload FATCA TIN Document">
        <div className={styles.mobileHeader}>
          <div className={styles.mobileHeaderInner}>
            <div className={styles.mobileTopRow}>
              <button type="button" className={styles.mobileBackBtn} onClick={handleBack} aria-label="Go back">
                <IconBackArrow />
              </button>
            </div>
            <div className={styles.mobileTitleBlock}>
              <h1 className={styles.mobileTitle}>Upload TIN Document</h1>
              <p className={styles.mobileSubtitle}>
                Upload images of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.mobileCard}>
          {uploadSections}
        </div>

        <div className={styles.mobileProceedArea}>
          <LoadingButton
            type="button"
            className={`${styles.mobileProceedBtn}${!allUploaded || submitting ? ` ${styles.mobileProceedBtnDisabled}` : ''}`}
            onClick={handleProceed}
            disabled={!allUploaded || submitting}
            aria-disabled={!allUploaded || submitting}
          >
            {submitting ? 'Submitting' : 'Proceed'}
          </LoadingButton>
        </div>
      </div>

      {/* ═══ DESKTOP ═══════════════════════════════════════════════════════════ */}
      <div className={styles.desktopPage} aria-label="Upload FATCA TIN Document">
        <div className={styles.desktopCard}>
          <div className={styles.desktopCardHeader}>
            <button type="button" className={styles.desktopBackBtn} onClick={handleBack} aria-label="Go back">
              <IconBackArrow />
            </button>
            <div className={styles.desktopTitleBlock}>
              <h1 className={styles.desktopCardTitle}>Upload TIN Document</h1>
              <p className={styles.desktopCardSubtitle}>
                Upload images of your Tax Identification Number (TIN) document.
              </p>
            </div>
          </div>

          <div className={styles.desktopCardBody}>
            <div className={styles.desktopContentArea}>
              {uploadSections}
            </div>

            <div className={styles.desktopProceedWrapper}>
              <LoadingButton
                type="button"
                className={`${styles.desktopProceedBtn}${!allUploaded || submitting ? ` ${styles.desktopProceedBtnDisabled}` : ''}`}
                onClick={handleProceed}
                disabled={!allUploaded || submitting}
                aria-disabled={!allUploaded || submitting}
              >
                {submitting ? 'Submitting' : 'Proceed'}
              </LoadingButton>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
