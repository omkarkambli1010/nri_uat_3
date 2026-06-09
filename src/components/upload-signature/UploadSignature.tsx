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
    router.push(buildFaqUrl(pathname || "/uploadSignature"));
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
    if (!blobService.isFileSizeValid(file.blob, 4)) {
      toast.error("Signature file size should be less than 4 MB.");
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

  const getSignatureBlob = async (): Promise<Blob | null> => {
    if (verifyFile) {
      if (verifyFile.blob && verifyFile.blob.size > 0) {
        return verifyFile.blob;
      }

      return null;
    }

    const canvas = canvasRef.current;
    const pad = padRef.current;

    if (!canvas || !pad || pad.isEmpty()) {
      return null;
    }

    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
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

    if (!blobService.isFileSizeValid(blob, 4)) {
      toast.error("Signature file size should be less than 4 MB.");
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

              <p className={styles.mobInfoLine}>Maximum size less than 4 MB</p>

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
