"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import SignaturePad from "signature_pad";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import {
  SignatureUploadModal,
  type UploadedSignature,
} from "./SignatureUploadModal";
import { signatureStore, type PendingSignature } from "./signatureStore";
import styles from "./upload-signature.module.scss";
import blobService from "@/services/blob.service";

type VerifyFile = PendingSignature;

function BackArrow() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 12L11 6"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MobBackChevron() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 6L9 12L15 18"
        stroke="#2b2b2b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EraseIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8.5 1.5L10.5 3.5L4.5 9.5L2 9.5L2 7L8.5 1.5Z"
        stroke="#280071"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M1 11H11"
        stroke="#280071"
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

function TickIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="9" fill="#22c55e" />
      <path
        d="M6 10.5L9 13.5L14 7.5"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SmallXIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 2L8 8"
        stroke="#666"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8 2L2 8"
        stroke="#666"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const DESKTOP_MQ = "(min-width: 992px)";

// Drawn-signature export tuning: whitespace kept around the ink (CSS px) and
// the cap on device-pixel scaling so high-DPI screens don't bloat the file.
const SIGN_TRIM_PADDING = 12;
const SIGN_MAX_EXPORT_RATIO = 2;

// Backend signature pixel-dimension limit ("Maximum: 2000 x 1000"). Uploaded
// photos (esp. from phone cameras) routinely exceed this, so every image blob
// is downscaled to fit before upload.
const SIGN_MAX_UPLOAD_WIDTH = 2000;
const SIGN_MAX_UPLOAD_HEIGHT = 1000;

// Downscale an image blob so neither dimension exceeds the backend limit,
// preserving aspect ratio (and the alpha channel, for drawn PNGs). Non-image
// blobs (e.g. PDF) and already-small images are returned unchanged.
const fitImageToSignatureLimit = (blob: Blob): Promise<Blob> =>
  new Promise((resolve) => {
    if (!blob.type.startsWith("image/")) {
      resolve(blob);
      return;
    }

    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      const scale = Math.min(
        1,
        SIGN_MAX_UPLOAD_WIDTH / w,
        SIGN_MAX_UPLOAD_HEIGHT / h,
      );

      // Already within limits (or dimensions unreadable) — send as-is.
      if (!Number.isFinite(scale) || scale >= 1) {
        URL.revokeObjectURL(url);
        resolve(blob);
        return;
      }

      const outW = Math.max(1, Math.floor(w * scale));
      const outH = Math.max(1, Math.floor(h * scale));
      const out = document.createElement("canvas");
      out.width = outW;
      out.height = outH;

      const ctx = out.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(blob);
        return;
      }

      ctx.drawImage(img, 0, 0, outW, outH);
      // Keep JPEG as JPEG (white-background photos); everything else as PNG so
      // a drawn signature's transparency survives.
      const type = blob.type === "image/jpeg" ? "image/jpeg" : "image/png";
      out.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          resolve(b ?? blob);
        },
        type,
        type === "image/jpeg" ? 0.92 : undefined,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };

    img.src = url;
  });

export default function UploadSignature() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const padRef = useRef<SignaturePad | null>(null);

  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const [isRejectStatus, setIsRejectStatus] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [verifyFile, setVerifyFile] = useState<VerifyFile | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_MQ);
    const update = () => setIsDesktop(mq.matches);

    update();
    mq.addEventListener("change", update);

    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setIsRejectStatus(sessionStorage.getItem("RejectStatus") === "R");
    navigationService.setRouter(router, hideSpinner);
  }, [router, hideSpinner]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const pad = padRef.current;

    if (!canvas || !pad) return;

    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const { width, height } = canvas.getBoundingClientRect();

    if (!width || !height) return;

    const data = pad.toData();

    canvas.width = width * ratio;
    canvas.height = height * ratio;

    const ctx = canvas.getContext("2d");
    ctx?.scale(ratio, ratio);

    pad.clear();

    if (data.length) {
      pad.fromData(data);
    }
  }, []);

  useEffect(() => {
    if (isDesktop === null || verifyFile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      penColor: "#222222",
      backgroundColor: "rgba(255,255,255,0)",
      minWidth: 1.2,
      maxWidth: 2.5,
    });

    padRef.current = pad;

    pad.addEventListener("endStroke", () => {
      setHasInk(!pad.isEmpty());
    });

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      pad.off();
      padRef.current = null;
    };
  }, [isDesktop, verifyFile, resizeCanvas]);

  useEffect(() => {
    const staged = signatureStore.take();

    if (staged) {
      setVerifyFile(staged);
    }
  }, []);

  const ownedUrlRef = useRef<string>("");

  useEffect(() => {
    if (verifyFile && verifyFile.objectUrl !== ownedUrlRef.current) {
      const previousUrl = ownedUrlRef.current;
      ownedUrlRef.current = verifyFile.objectUrl;

      blobService.revokePreviewUrl(previousUrl);
    } else if (!verifyFile && ownedUrlRef.current) {
      blobService.revokePreviewUrl(ownedUrlRef.current);
      ownedUrlRef.current = "";
    }
  }, [verifyFile]);

  useEffect(() => {
    return () => {
      blobService.revokePreviewUrl(ownedUrlRef.current);
    };
  }, []);

  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (autoOpenedRef.current) return;
    if (isDesktop === null) return;
    if (searchParams?.get("mode") !== "upload") return;
    if (verifyFile) return;

    autoOpenedRef.current = true;
    setShowUploadModal(true);
  }, [searchParams, isDesktop, verifyFile]);

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  };

  const goBack = () => {
    showSpinner();

    setTimeout(() => {
      if (verifyFile) {
        setVerifyFile(null);
        hideSpinner();
      } else {
        router.push("/uploadSignatureinfo");
        hideSpinner();
      }
    }, 200);
  };

  const erase = () => {
    padRef.current?.clear();
    setHasInk(false);
  };

  const onUploadClick = () => {
    setShowUploadModal(true);
  };

  const onModalUploaded = (file: UploadedSignature) => {
    if (!blobService.isFileSizeValid(file.blob, 5)) {
      toast.error("Signature file size should be less than 5 MB.");
      blobService.revokePreviewUrl(file.objectUrl);
      return;
    }

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
    sessionStorage.removeItem("SignatureVerified");
    setShowUploadModal(true);
  };

  const removeVerifyFile = () => {
    setVerifyFile(null);
    sessionStorage.removeItem("SignatureVerified");
  };

  // Export the drawn signature as a tightly-cropped, transparent PNG (the
  // backend requires a transparent background). Exporting the full canvas
  // instead produced multi-MB files even for a single dot, because the bitmap
  // is sized at devicePixelRatio (e.g. 630x292 CSS px becomes ~1890x876 on a
  // 3x display) and the whole transparent area gets serialized. Trimming to
  // the ink bounds and capping the export scale keeps it to a few KB.
  const getDrawnSignatureBlob = (): Promise<Blob | null> => {
    const canvas = canvasRef.current;
    const pad = padRef.current;

    if (!canvas || !pad || pad.isEmpty()) {
      return Promise.resolve(null);
    }

    const ratio = Math.max(window.devicePixelRatio || 1, 1);

    // toData() returns points in CSS coordinates; device px = css * ratio.
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const group of pad.toData()) {
      for (const point of group.points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
    }

    const exportRegion = (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      outW: number,
      outH: number,
    ): Promise<Blob | null> => {
      const out = document.createElement("canvas");
      out.width = Math.max(1, Math.round(outW));
      out.height = Math.max(1, Math.round(outH));

      const ctx = out.getContext("2d");
      if (!ctx) return Promise.resolve(null);

      // No background fill — keep the canvas transparent so the exported PNG
      // preserves an alpha channel (backend requirement).
      ctx.drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);

      return new Promise((resolve) =>
        out.toBlob((blob) => resolve(blob), "image/png"),
      );
    };

    // No usable bounds (shouldn't happen when not empty) — fall back to the
    // whole canvas so we still produce something.
    if (!Number.isFinite(minX)) {
      return exportRegion(
        0,
        0,
        canvas.width,
        canvas.height,
        canvas.width / ratio,
        canvas.height / ratio,
      );
    }

    const cssW = canvas.width / ratio;
    const cssH = canvas.height / ratio;

    const left = Math.max(0, minX - SIGN_TRIM_PADDING);
    const top = Math.max(0, minY - SIGN_TRIM_PADDING);
    const right = Math.min(cssW, maxX + SIGN_TRIM_PADDING);
    const bottom = Math.min(cssH, maxY + SIGN_TRIM_PADDING);

    const outRatio = Math.min(ratio, SIGN_MAX_EXPORT_RATIO);

    return exportRegion(
      left * ratio,
      top * ratio,
      (right - left) * ratio,
      (bottom - top) * ratio,
      (right - left) * outRatio,
      (bottom - top) * outRatio,
    );
  };

  const getSignatureBlob = async (): Promise<Blob | null> => {
    if (verifyFile) {
      if (verifyFile.blob && verifyFile.blob.size > 0) {
        return fitImageToSignatureLimit(verifyFile.blob);
      }

      return null;
    }

    const drawn = await getDrawnSignatureBlob();
    return drawn ? fitImageToSignatureLimit(drawn) : null;
  };

  const proceed = async () => {
    const blob = await getSignatureBlob();

    if (!blob || blob.size === 0) {
      toast.warning("Please draw or upload your signature.");
      return;
    }

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const documentId =
      sessionStorage.getItem("SignatureDocumentId") ||
      sessionStorage.getItem("DocumentId") ||
      "3fa85f64-5717-4562-b3fc-2c963f66afa6";

    if (!documentId) {
      toast.error("Document Id not found");
      return;
    }

    if (!blobService.isFileSizeValid(blob, 5)) {
      toast.error("Signature file size should be less than 5 MB.");
      return;
    }

    const source: "draw" | "upload" = verifyFile ? "upload" : "draw";
    const captureMethod: "Draw" | "Upload" = verifyFile ? "Upload" : "Draw";

    const fileType =
      verifyFile?.type && verifyFile.type.trim() !== ""
        ? verifyFile.type
        : blob.type && blob.type.trim() !== ""
          ? blob.type
          : "image/png";

    const extension = blobService.getExtensionFromMimeType(fileType);

    const fileName =
      verifyFile?.name && verifyFile.name.trim() !== ""
        ? verifyFile.name
        : blobService.generateFileName(`signature-${applicationId}`, extension);

    const signatureFile = await blobService.blobToFile(
      blob,
      fileName,
      fileType,
    );

    const localPreviewUrl =
      verifyFile?.objectUrl || blobService.fileToPreviewUrl(signatureFile);

    signatureStore.set({
      name: fileName,
      blob,
      objectUrl: localPreviewUrl,
      type: fileType,
      size: blob.size,
    });

    if (verifyFile) {
      ownedUrlRef.current = "";
    }

    showSpinner();

    try {
      const response = await apiService.verifyNriSignature(
        {
          file: signatureFile,
          applicationId,
          captureMethod,
          documentId,
          idempotencyKey: "",
        },
        hideSpinner,
      );

      console.log("Signature Verify Response:", response);

      sessionStorage.setItem("SignatureVerified", "Yes");
      sessionStorage.setItem("signatureSource", source);
      sessionStorage.setItem("signatureName", fileName);
      sessionStorage.setItem("signatureType", fileType);

      toast.success("Signature uploaded successfully!");

      let route = "";

      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Selfie Route Error:", error);
      }

      if (route) {
        router.push(`/${route}`);
        return;
      } else {
        toast.error("Next Route Not provided", {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    } catch (error: any) {
      const errorData = error?.response?.data;

      console.log("Signature Verify Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const canProceed = hasInk;

  const padBlock = (wrapClass: string, boxClass: string) => (
    <div className={wrapClass}>
      <div className={boxClass}>
        <canvas ref={canvasRef} className={styles.padCanvas} />
      </div>

      <button
        type="button"
        className={styles.eraseChip}
        onClick={erase}
        disabled={!canProceed}
        aria-label="Erase signature"
      >
        <span>Erase</span>
        <EraseIcon />
      </button>
    </div>
  );

  const filePill = (showTick: boolean) =>
    verifyFile && (
      <div className={styles.filePill}>
        <div className={styles.filePillMeta}>
          <PaperclipIcon />

          <span className={styles.filePillName} title={verifyFile.name}>
            {verifyFile.name}
          </span>

          {showTick && <TickIcon />}
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
      {verifyFile.type === "application/pdf" ? (
        <p className={styles.pdfText}>
          PDF preview not available — {verifyFile.name}
        </p>
      ) : (
        <img
          src={verifyFile.objectUrl}
          alt="Uploaded signature"
          className={styles.previewImg}
          onError={() => {
            console.log("Signature preview failed:", verifyFile.objectUrl);
          }}
        />
      )}
    </div>
  );

  const uploadModal = (
    <SignatureUploadModal
      open={showUploadModal}
      isDesktop={!!isDesktop}
      onClose={() => setShowUploadModal(false)}
      onUploaded={onModalUploaded}
    />
  );

  if (isDesktop === null) {
    return (
      <section
        className="pan_details_form"
        aria-label="Draw or Upload Signature"
        style={{ background: "#f8f8f8", minHeight: "calc(100vh - 90px)" }}
      />
    );
  }

  if (isDesktop) {
    const title = verifyFile
      ? "Verify your Signature"
      : "Draw/Upload Signature";

    const subtitle = verifyFile
      ? "Upload a clear image of Signature."
      : "Please sign below. Dots, lines or random shapes won’t be accepted.";

    return (
      <section
        className="pan_details_form"
        aria-label={
          verifyFile ? "Verify Signature" : "Draw or Upload Signature"
        }
        style={{
          background: "#f8f8f8",
          minHeight: "calc(100vh - 90px)",
          padding: 0,
        }}
      >
        {uploadModal}

        <div className={styles.deskCard}>
          <div className={styles.deskHeader}>
            {!isRejectStatus && (
              <button
                type="button"
                className={styles.backBtn}
                onClick={goBack}
                aria-label="Go back"
              >
                <BackArrow />
              </button>
            )}

            <div className={styles.deskHeaderText}>
              <div className={styles.deskTitleRow}>
                <h5>{title}</h5>

                {!verifyFile && (
                  <button
                    type="button"
                    className={styles.needHelpChip}
                    onClick={openFaq}
                  >
                    Need Help?
                  </button>
                )}
              </div>

              <p>{subtitle}</p>
            </div>
          </div>

          <div className={styles.deskBody}>
            {verifyFile ? (
              <div className={styles.verifyBody}>
                {filePill(false)}
                {previewBox}
              </div>
            ) : (
              padBlock(styles.padWrap, styles.padBox)
            )}
          </div>

          <div className={styles.deskBtnFooter}>
            <div className={styles.deskBtnRow}>
              <button
                type="button"
                className={styles.btnOutline}
                onClick={verifyFile ? onReupload : onUploadClick}
              >
                {verifyFile ? "Reupload" : "Upload Signature"}
              </button>

              <button
                type="button"
                className={styles.btnFilled}
                disabled={!verifyFile && !canProceed}
                onClick={proceed}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const mobTitle = verifyFile
    ? "Verify your Signature"
    : "Draw/Upload Signature";

  const mobSubtitle = verifyFile
    ? "Upload a clear image of your Signature."
    : "Please sign below. Dots, lines or random shapes won’t be accepted.";

  return (
    <section
      className="pan_details_form"
      aria-label={verifyFile ? "Verify Signature" : "Draw or Upload Signature"}
      style={{
        background: "#f8f8f8",
        minHeight: "calc(100vh - 90px)",
        padding: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {uploadModal}

      <div className={styles.mobGrayHeader}>
        {!isRejectStatus && (
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
        )}

        <div className={styles.mobTitleBlock}>
          <div className={styles.mobTitleRow}>
            <p className={styles.mobTitle}>{mobTitle}</p>

            {!verifyFile && (
              <button
                type="button"
                className={styles.needHelpChip}
                onClick={openFaq}
              >
                Need Help?
              </button>
            )}
          </div>

          <p className={styles.mobSubtitle}>{mobSubtitle}</p>
        </div>
      </div>

      <div className={styles.mobContentCard}>
        {verifyFile ? (
          <div className={styles.verifyBodyMob}>
            {filePill(true)}
            {previewBox}

            <div className={styles.mobInfoBlock}>
              <p className={styles.mobInfoLine}>
                Files supported: JPG, PNG & PDF
              </p>

              <p className={styles.mobInfoLine}>Maximum size less than 5 MB</p>

              <p className={styles.mobInfoLine}>
                Please ensure that you don&apos;t upload password protected
                documents
              </p>
            </div>
          </div>
        ) : (
          padBlock(styles.mobPadWrap, styles.mobPadBox)
        )}
      </div>

      <div className={verifyFile ? styles.mobBtnBarStack : styles.mobBtnBar}>
        {verifyFile ? (
          <>
            <button
              type="button"
              className={styles.mobBtnFilled}
              onClick={proceed}
            >
              Proceed
            </button>

            <button
              type="button"
              className={styles.mobBtnOutline}
              onClick={onReupload}
            >
              Re-upload
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={styles.mobBtnOutline}
              onClick={onUploadClick}
            >
              Upload Signature
            </button>

            <button
              type="button"
              className={styles.mobBtnFilled}
              disabled={!canProceed}
              onClick={proceed}
            >
              Proceed
            </button>
          </>
        )}
      </div>
    </section>
  );
}
