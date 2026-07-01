"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Webcam from "react-webcam";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import navigationService from "@/services/navigation.service";
import { buildFaqUrl } from "@/lib/faq-link";
import LoadingButton from "@/components/ui/LoadingButton";
import styles from "./selfie.module.scss";
import blobService from "@/services/blob.service";
import apiService from "@/services/api.service";
import { publicPath } from "@/utils/publicPath";
import { useSessionValue } from '@/hooks/useSessionValue';

const DOS = [
  {
    img: publicPath("/assets/images/diy/good_lightening_icon.png"),
    label: "Good lighting",
  },
  {
    img: publicPath("/assets/images/diy/white_bg_icon.png"),
    label: "White background",
  },
  {
    img: publicPath("/assets/images/diy/align_face_icon.png"),
    label: "Align face in the centre",
  },
];

const DONTS = [
  {
    img: publicPath("/assets/images/diy/no_blurry_pic.png"),
    label: "No blurry photo",
  },
  { img: publicPath("/assets/images/diy/no_cap_icon.png"), label: "No cap" },
  {
    img: publicPath("/assets/images/diy/no_eyewear_icon.png"),
    label: "No eyewear",
  },
];

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

function ArrowRight() {
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
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 6L19 12L13 18"
        stroke="#280071"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LocationPinIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M16 3C11.03 3 7 7.03 7 12c0 7.25 9 17 9 17s9-9.75 9-17c0-4.97-4.03-9-9-9zm0 12a3 3 0 1 1 0-6 3 3 0 0 1 0 6z"
        fill="#280071"
      />
    </svg>
  );
}

function LocationModal({ onClose }: { onClose: () => void }) {
  return (
    <div className={styles.locationOverlay} onClick={onClose}>
      <div
        className={styles.locationModalCard}
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className={styles.locationModalTop}>
          <div className={styles.locationIconBox}>
            <LocationPinIcon />
          </div>
          <h2 className={styles.locationModalTitle}>
            Enable Location Permission
          </h2>
        </div>
        <div className={styles.locationModalBody}>
          <p>Location access is required to proceed with selfie capture.</p>
          <ol>
            <li>
              Tap the <strong>lock icon/site info icon</strong> on the left of
              the address bar.
            </li>
            <li>
              Go to <strong>Site Settings/Permissions</strong>.
            </li>
            <li>
              Set Location permission to <strong>Allow</strong>.
            </li>
            <li>
              Once enabled, tap <strong>Refresh Now</strong> to continue
            </li>
          </ol>
        </div>
        <button
          type="button"
          className={styles.locationRefreshBtn}
          onClick={() => window.location.reload()}
        >
          Refresh Now
        </button>
      </div>
    </div>
  );
}

function BadgeDo() {
  return (
    <span className={styles.badgeDo} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill="#22c55e" />
        <path
          d="M4.5 8l2.5 2.5 4.5-5"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function BadgeDont() {
  return (
    <span className={styles.badgeDont} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="8" fill="#ef4444" />
        <path
          d="M5 5l6 6M11 5l-6 6"
          stroke="#fff"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

// Draw a rounded outline around the detected face on the overlay canvas. Green
// when the face is properly settled, amber while it still needs adjusting.
function drawFaceBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  aligned: boolean,
) {
  const r = Math.min(w, h) * 0.22;
  ctx.strokeStyle = aligned ? "#22c55e" : "#f59e0b";
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.shadowColor = aligned ? "rgba(34,197,94,0.6)" : "transparent";
  ctx.shadowBlur = aligned ? 12 : 0;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.stroke();
}

export default function Selfie() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const formNumber = params?.formNumber as string;
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

 const openFaq = () => {
  router.push(`/faq?from=${pathname}`);
};

  const [step, setStep] = useState<1 | 2>(1);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [showWebcam, setShowWebcam] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoAccuracy, setGeoAccuracy] = useState("0");

  const webcamRef = useRef<Webcam>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  // True while a face is detected AND well-centred/sized inside the oval. Drives
  // the green outline + hint so the user knows their face is properly settled.
  const [faceAligned, setFaceAligned] = useState(false);

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);

    if (formNumber === "1") {
      setStep(1);
    } else if (formNumber === "2") {
      setStep(2);
      setShowWebcam(true);
    }
  }, [formNumber]);

  useEffect(() => {
    return () => {
      blobService.revokePreviewUrl(previewUrl);
    };
  }, [previewUrl]);

  // Live face detection — draws a green outline over the webcam when the user's
  // face is properly centred inside the oval. Uses the browser's native
  // FaceDetector API; where it isn't available (Firefox/Safari) the overlay is
  // simply skipped and capture still works.
  useEffect(() => {
    if (!showWebcam) {
      setFaceAligned(false);
      return;
    }

    const FaceDetectorCtor =
      typeof window !== "undefined"
        ? (window as any).FaceDetector
        : undefined;
    if (!FaceDetectorCtor) return;

    const detector = new FaceDetectorCtor({
      maxDetectedFaces: 1,
      fastMode: true,
    });

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped) return;

      const video = webcamRef.current?.video ?? null;
      const canvas = overlayRef.current;
      const ctx = canvas?.getContext("2d");

      if (video && canvas && ctx && video.readyState === 4) {
        const { clientWidth: cw, clientHeight: ch } = canvas;
        if (canvas.width !== cw) canvas.width = cw;
        if (canvas.height !== ch) canvas.height = ch;
        ctx.clearRect(0, 0, cw, ch);

        try {
          const faces = await detector.detect(video);
          if (!stopped && faces.length > 0) {
            const box = faces[0].boundingBox;
            const vw = video.videoWidth || cw;
            const vh = video.videoHeight || ch;
            const scale = Math.max(cw / vw, ch / vh);
            const offX = (cw - vw * scale) / 2;
            const offY = (ch - vh * scale) / 2;
            const x = box.x * scale + offX;
            const y = box.y * scale + offY;
            const w = box.width * scale;
            const h = box.height * scale;

            const faceCx = x + w / 2;
            const faceCy = y + h / 2;
            const centred =
              Math.abs(faceCx - cw / 2) < cw * 0.18 &&
              Math.abs(faceCy - ch / 2) < ch * 0.18;
            const sized = w > cw * 0.4 && w < cw * 0.95;
            const aligned = centred && sized;

            setFaceAligned(aligned);
            drawFaceBox(ctx, x, y, w, h, aligned);
          } else if (!stopped) {
            setFaceAligned(false);
          }
        } catch {
          // detect() can throw before the stream is fully ready — ignore.
        }
      }

      timer = setTimeout(tick, 180);
    };

    tick();

    return () => {
      stopped = true;
      clearTimeout(timer);
      setFaceAligned(false);
    };
  }, [showWebcam]);

  const goBack = () => {
    showSpinner();

    if (step === 1) {
      setTimeout(() => {
        router.push("/planprocess/3");
        hideSpinner();
      }, 200);
    } else {
      setTimeout(() => {
        router.push("/CaptureSelfie/1");
        hideSpinner();
      }, 200);
    }
  };

  const goToCapture = () => {
    if (!navigator.geolocation) {
      setShowLocationModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        sessionStorage.setItem("SelfieGeoLat", String(latitude));
        sessionStorage.setItem("SelfieGeoLng", String(longitude));
        sessionStorage.setItem("SelfieGeoAccuracy", String(accuracy || 0));

        setGeoLat(String(latitude));
        setGeoLng(String(longitude));
        setGeoAccuracy(String(accuracy || 0));

        router.push("/CaptureSelfie/2");
      },
      () => setShowLocationModal(true),
      { timeout: 5000 },
    );
  };

  const continueWithMobile = async () => {
    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";
    if (!applicationId) {
      toast.error("Your session has expired, please start again.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    showSpinner();
    try {
      const response = await apiService.sendResumeLink(
        applicationId,
        hideSpinner,
      );

      // Surface the backend message (e.g. "Link has been sent.") in a toast.
      if (response?.status) {
        toast.success(response?.message ?? "Link has been sent.", {
          position: "bottom-center",
          autoClose: 3000,
        });
      } else if (response?.message) {
        toast.error(response.message, {
          position: "bottom-center",
          autoClose: 3000,
        });
      }
    } catch (error: any) {
      // apiService.handleError already surfaced the backend message in a toast.
      console.log("Resume link send error:", error?.response?.data);
    } finally {
      hideSpinner();
    }
  };

  const capture = useCallback(async () => {
    const screenshot = webcamRef.current?.getScreenshot();

    if (!screenshot) {
      toast.error("Unable to capture selfie. Please try again.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    const fileName = blobService.generateFileName(
      `selfie-${applicationId}`,
      "jpg",
    );

    const file = await blobService.dataUrlToFile(screenshot, fileName);

    if (!blobService.isFileSizeValid(file, 10)) {
      toast.error("Selfie file size should be less than 10 MB.", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    blobService.revokePreviewUrl(previewUrl);

    const objectUrl = blobService.fileToPreviewUrl(file);

    setSelfieFile(file);
    setPreviewUrl(objectUrl);
    setShowWebcam(false);
  }, [previewUrl]);

  const retake = () => {
    blobService.revokePreviewUrl(previewUrl);

    setSelfieFile(null);
    setPreviewUrl("");
    setShowWebcam(true);

    sessionStorage.removeItem("SelfieVerified");
    sessionStorage.removeItem("SelfieDocumentId");
  };

  const uploadSelfie = async () => {
    
    if (!selfieFile) {
      toast.warning("Please capture a selfie first.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      return;
    }

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const finalGeoLat = geoLat || sessionStorage.getItem("SelfieGeoLat") || "";

    const finalGeoLng = geoLng || sessionStorage.getItem("SelfieGeoLng") || "";

    const finalGeoAccuracy =
      geoAccuracy || sessionStorage.getItem("SelfieGeoAccuracy") || "0";

    if (!finalGeoLat || !finalGeoLng) {
      toast.error(
        "Location details not found. Please allow location and capture again.",
        {
          position: "bottom-center",
          autoClose: 3000,
        },
      );
      return;
    }

    showSpinner();

    try {
      const response = await apiService.verifyNriKycSelfie(
        {
          file: selfieFile,
          applicationId,
          geoLat: finalGeoLat,
          geoLng: finalGeoLng,
          geoAccuracy: finalGeoAccuracy,
        },
        hideSpinner,
      );

      console.log("Selfie KYC Verify Response:", response);

      sessionStorage.setItem("SelfieVerified", "Yes");

      if (response?.documentId) {
        sessionStorage.setItem("SelfieDocumentId", response.documentId);
      }

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

      // if (rejectStatus !== "R") {
      //   router.push("/uploadSignatureinfo");
      // } else {
      //   navigationService.navigateToNextStep();
      // }
    } catch (error: any) {
      const errorData = error?.response?.data;

      console.log("Selfie KYC Verify Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  // ── Step 1: Prep / Guidelines ───────────────────────────────────────────────
  if (step === 1) {
    return (
      <section
        className="pan_details_form"
        aria-label="Take a Selfie — Preparation"
        style={{
          background: "#f8f8f8",
          minHeight: "calc(100vh - 90px)",
          padding: "0",
        }}
      >
        {/* ══════════════════════════════════════════════════════════
            MOBILE LAYOUT
            ══════════════════════════════════════════════════════════ */}
        <div className="mobile_css" style={{ width: "100%" }}>
          {/* Gray header */}
          <div className={styles.mobGrayHeader}>
            <div className={styles.mobBackRow}>
              {rejectStatus !== "R" && (
                <button
                  type="button"
                  className={styles.mobBackBtn}
                  onClick={goBack}
                  aria-label="Go back"
                >
                  <svg
                    width="8"
                    height="15"
                    viewBox="0 0 8 15"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M7 1L1 7.5L7 14"
                      stroke="#666666"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              )}
            </div>
            <div className={styles.mobTitleBlock}>
              <div className={styles.mobTitleRow}>
                <p className={styles.mobTitle}>Get set for a quick selfie</p>
                <button
                  type="button"
                  className={styles.needHelpChip}
                  onClick={openFaq}
                >
                  Need Help?
                </button>
              </div>
              <p className={styles.mobSubtitle}>
                Take a clear picture and upload it. Please ensure your selfie
                matches the photo on your Aadhar or Pan card
              </p>
            </div>
          </div>

          {/* White content card */}
          <div className={styles.mobContentCard}>
            {/* Illustration */}
            <div className={styles.mobIllustration}>
              <img
                src={publicPath("/assets/images/diy/selfie_illustration.png")}
                alt="Selfie guide illustration"
              />
            </div>

            {/* Do's */}
            <div className={styles.mobGuideSection}>
              <p className={styles.mobGuideTitle}>Do&apos;s</p>
              <div className={styles.mobGuideItemRow}>
                {DOS.map((d) => (
                  <div key={d.label} className={styles.mobGuideItem}>
                    <div className={styles.iconWrap}>
                      <img src={d.img} alt={d.label} />
                      <BadgeDo />
                    </div>
                    <p>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Don'ts */}
            <div className={styles.mobGuideSection}>
              <p className={styles.mobGuideTitle}>Dont&apos;s</p>
              <div className={styles.mobGuideItemRow}>
                {DONTS.map((d) => (
                  <div key={d.label} className={styles.mobGuideItem}>
                    <div className={styles.iconWrap}>
                      <img src={d.img} alt={d.label} />
                      <BadgeDont />
                    </div>
                    <p>{d.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sticky capture button */}
          <div className={styles.mobBtnBar}>
            <button
              type="button"
              className={styles.mobCaptureBtn}
              onClick={goToCapture}
            >
              Capture Now
            </button>
          </div>
        </div>

        {showLocationModal && (
          <LocationModal onClose={() => setShowLocationModal(false)} />
        )}

        {/* ══════════════════════════════════════════════════════════
            DESKTOP LAYOUT
            ══════════════════════════════════════════════════════════ */}
        <div className="desktop_css">
          <div className={styles.deskCard}>
            {/* Header */}
            <div className={styles.deskHeader}>
              {rejectStatus !== "R" && (
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
                  <h5>Get set for a quick selfie</h5>
                  <button
                    type="button"
                    className={styles.needHelpChip}
                    onClick={openFaq}
                  >
                    Need Help?
                  </button>
                </div>
                <p>
                  Take a clear picture and upload it. Please ensure your selfie
                  matches the photo on your Aadhar or Pan card
                </p>
              </div>
            </div>

            {/* Body */}
            <div className={styles.deskBody}>
              {/* Two-column: illustration + guidelines */}
              <div className={styles.twoCol}>
                {/* Left: illustration */}
                <div className={styles.illustrationCol}>
                  <img
                    src={publicPath(
                      "/assets/images/diy/selfie_illustration.png",
                    )}
                    alt="Selfie guide illustration"
                  />
                </div>

                {/* Right: guidelines */}
                <div className={styles.guidelinesCol}>
                  {/* Do's */}
                  <div className={styles.guideSection}>
                    <p className={styles.guideTitle}>Do&apos;s</p>
                    <div className={styles.guideItemRow}>
                      {DOS.map((d) => (
                        <div key={d.label} className={styles.guideItem}>
                          <div className={styles.iconWrap}>
                            <img src={d.img} alt={d.label} />
                            <BadgeDo />
                          </div>
                          <p>{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dont's */}
                  <div className={styles.guideSection}>
                    <p className={styles.guideTitle}>Dont&apos;s</p>
                    <div className={styles.guideItemRow}>
                      {DONTS.map((d) => (
                        <div key={d.label} className={styles.guideItem}>
                          <div className={styles.iconWrap}>
                            <img src={d.img} alt={d.label} />
                            <BadgeDont />
                          </div>
                          <p>{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* "No webcam" banner — clickable, leads to mobile flow */}
              <button
                type="button"
                className={styles.noWebcamBanner}
                onClick={continueWithMobile}
              >
                <p>
                  No webcam? No problem, <strong>Continue with mobile</strong>
                </p>
                <div className={styles.bannerArrow}>
                  <ArrowRight />
                </div>
              </button>

              {/* Single "Capture Now" button */}
              <div className={styles.deskBtnRow}>
                <button
                  type="button"
                  className={styles.captureNowBtn}
                  onClick={goToCapture}
                >
                  Capture Now
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ── Step 2: Webcam capture ──────────────────────────────────────────────────
  return (
    <section className="pan_details_form" aria-label="Capture Selfie">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            {/* Mobile */}
            <div className="mobile_css">
              <div className="back_cls">
                <button
                  type="button"
                  onClick={goBack}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <img
                    src={publicPath("/assets/images/diy/ChevronLeft.png")}
                    alt=""
                    aria-hidden="true"
                    style={{ width: 15 }}
                  />{" "}
                  Back
                </button>
                <div className="mobile_header_padding">
                  <h5>Capture your selfie</h5>
                  <p className="sub_title">
                    Position your face in the circle and tap capture.
                  </p>
                </div>
              </div>
            </div>

            <form method="post">
              <div className="col-lg-12 col-md-12 col-12 desktop_css">
                <div className="mobile_header_padding">
                  <div className="help_faq_css">
                    <div className="d-flex gap-2">
                      <button
                        type="button"
                        className="sp-back-btn"
                        onClick={goBack}
                        aria-label="Go back"
                      >
                        <BackArrow />
                      </button>
                      <div className="heading">
                        <h5>Capture your selfie</h5>
                        <p className="sub_title">
                          Position your face in the circle and click capture.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <hr className="desktop_css" />

              <div className={styles.cameraWrap}>
                {showWebcam && (
                  <div
                    className={`${styles.ovalFrame}${faceAligned ? ` ${styles.ovalFrameAligned}` : ""}`}
                  >
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.85}
                      videoConstraints={{ facingMode: "user" }}
                      className={styles.ovalVideo}
                      onUserMediaError={() => {
                        toast.error(
                          "Camera access denied. Please enable camera permissions.",
                          {
                            position: "bottom-center",
                            autoClose: 3000,
                          },
                        );
                        router.push("/CaptureSelfie/1");
                      }}
                    />
                    {/* Green face-detection outline drawn over the live video. */}
                    <canvas ref={overlayRef} className={styles.faceOverlay} />
                  </div>
                )}

                {previewUrl && !showWebcam && (
                  <img
                    src={previewUrl}
                    alt="Captured selfie"
                    className={styles.previewImg}
                    onError={() => {
                      console.log("Selfie preview failed:", previewUrl);
                    }}
                  />
                )}

                <p
                  className={`${styles.ovalHint}${
                    showWebcam && faceAligned ? ` ${styles.ovalHintAligned}` : ""
                  }`}
                >
                  {showWebcam
                    ? "Position your face in the circle"
                    : "Selfie captured"}
                </p>

                {/* Capture button (camera icon) — shown while the webcam is live. */}
                {showWebcam && (
                  <button
                    type="button"
                    className={styles.captureBtn}
                    onClick={capture}
                    aria-label="Capture selfie"
                  >
                    <img
                      src={publicPath("/assets/images/diy/camera-icon.png")}
                      alt=""
                      aria-hidden="true"
                    />
                  </button>
                )}

                {/* Retake / Upload — single shared row, works on mobile + desktop. */}
                {!showWebcam && previewUrl && (
                  <div className={styles.captureActions}>
                    <button
                      type="button"
                      className={styles.retakeBtn}
                      onClick={retake}
                    >
                      Retake
                    </button>
                    <button
                      type="button"
                      className={styles.uploadBtn}
                      onClick={uploadSelfie}
                    >
                      Upload
                    </button>
                  </div>
                )}
              </div>

              {/* <div
                className="stickybtn_desk desktop_css"
                style={{ marginTop: 24 }}
              >
                {!showWebcam && previewUrl && (
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      maxWidth: 400,
                      margin: "0 auto",
                    }}
                  >
                    <LoadingButton
                      type="button"
                      className="btn btn_cls_outline"
                      onClick={retake}
                      style={{ flex: 1 }}
                    >
                      Retake
                    </LoadingButton>
                    <LoadingButton
                      type="button"
                      className="btn btn_cls"
                      onClick={uploadSelfie}
                      style={{ flex: 1 }}
                    >
                      Upload
                    </LoadingButton>
                  </div>
                )}
              </div> */}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
