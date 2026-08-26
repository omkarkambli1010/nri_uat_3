"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import Webcam from "react-webcam";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import navigationService from "@/services/navigation.service";
import styles from "./selfie.module.scss";
import blobService from "@/services/blob.service";
import apiService from "@/services/api.service";
import { publicPath } from "@/utils/publicPath";
import { useSessionValue } from "@/hooks/useSessionValue";
import dynamicBackService from "@/services/back-navigation.service";
import secureSessionService from "@/services/secure-session.service";

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

function LocationModal() {
  return (
    <div className={styles.locationOverlay}>
      <div className={styles.locationModalCard} data-lenis-prevent>
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
              Turn on <strong>Location/Location Services</strong> in your device
              settings.
            </li>
            <li>
              Tap the <strong>lock icon/site info icon</strong> on the left of
              the address bar.
            </li>
            <li>
              Go to <strong>Site Settings/Permissions</strong> and set Location
              permission to <strong>Allow</strong>.
            </li>
            <li>
              Once enabled, tap <strong>Refresh Now</strong> to continue.
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

function CameraModal({ onRefresh }: { onRefresh: () => void }) {
  const [platform, setPlatform] = useState<"web" | "android" | "ios">("web");

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes("android")) {
      setPlatform("android");
    } else if (/iphone|ipad|ipod/.test(userAgent)) {
      setPlatform("ios");
    }
  }, []);

  return (
    <div className={styles.locationOverlay}>
      <div className={styles.locationModalCard} data-lenis-prevent>
        <div className={styles.locationModalTop}>
          <div className={styles.locationIconBox}>
            <img
              src={publicPath("/assets/images/diy/camera_1.png")}
              alt="Enable Camera Permission"
            />
          </div>
          <h2 className={styles.locationModalTitle}>
            Enable Camera Permission
          </h2>
        </div>

        <div className={styles.locationModalBody}>
          <p>Camera access is required to proceed with selfie capture.</p>

          {platform === "web" && (
            <ol>
              <li>
                Tap the <strong>lock icon/site info icon</strong> on the left of
                the address bar.
              </li>
              <li>
                Go to <strong>Site Settings/Permissions</strong>.
              </li>
              <li>
                Set Camera permission to <strong>Allow</strong>.
              </li>
              <li>
                Once enabled, tap <strong>Refresh Now</strong> to continue.
              </li>
            </ol>
          )}

          {platform === "android" && (
            <ol>
              <li>
                Tap the <strong>top-right menu (&#8942;)</strong> or open
                browser settings.
              </li>
              <li>
                Select the <strong>information</strong> option.
              </li>
              <li>
                Set Camera permission to <strong>Allow</strong>.
              </li>
              <li>
                Once enabled, tap <strong>Refresh Now</strong> to continue.
              </li>
            </ol>
          )}

          {platform === "ios" && (
            <ol>
              <li>
                Open <strong>Page Settings</strong> in your browser or the SBI
                Securities App.
              </li>
              <li>
                Set Camera permission to <strong>Allow</strong>.
              </li>
              <li>
                Once enabled, tap <strong>Refresh Now</strong> to continue.
              </li>
            </ol>
          )}
        </div>

        <button
          type="button"
          className={styles.locationRefreshBtn}
          onClick={onRefresh}
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
  const [showCameraModal, setShowCameraModal] = useState(false);

  const [geoLat, setGeoLat] = useState("");
  const [geoLng, setGeoLng] = useState("");
  const [geoAccuracy, setGeoAccuracy] = useState("0");

  const [isSelfieStageDataAvailable, setIsSelfieStageDataAvailable] =
    useState(false);
  const [existingSelfieDocumentId, setExistingSelfieDocumentId] = useState("");

  const webcamRef = useRef<Webcam>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const selfieFileRef = useRef<File | null>(null);

  const [faceAligned, setFaceAligned] = useState(false);

  const rejectStatus = useSessionValue("RejectStatus");

  const handleCameraRefresh = () => {
    showSpinner();

    setTimeout(() => {
      router.push("/CaptureSelfie/1");
      hideSpinner();
    }, 200);
  };

  const decodeHtmlUrl = (url: string) => {
    let decoded = String(url ?? "");

    if (typeof window !== "undefined") {
      for (let i = 0; i < 3; i += 1) {
        const textarea = document.createElement("textarea");
        textarea.innerHTML = decoded;
        decoded = textarea.value;
      }
    }

    return decoded
      .replaceAll("&amp;amp;", "&")
      .replaceAll("&amp;", "&")
      .replaceAll("&#38;", "&");
  };

  useEffect(() => {
    selfieFileRef.current = selfieFile;
  }, [selfieFile]);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, [router, hideSpinner]);

  useEffect(() => {
    if (formNumber === "1") {
      setStep(1);
      return;
    }

    if (formNumber === "2") {
      setStep(2);

      if (!previewUrl && !isSelfieStageDataAvailable) {
        setShowWebcam(true);
      }
    }
  }, [formNumber, previewUrl, isSelfieStageDataAvailable]);

  useEffect(() => {
    if (formNumber !== "2") return;

    let alive = true;

    const getSelfieStageWiseData = async () => {
      const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

      if (!applicationId) {
        hideSpinner();
        return;
      }

      showSpinner();

      try {
        const path = `applications/${applicationId}/get/workflow/stagewisedata`;

        // Do not pass hideSpinner here. The spinner must remain visible until
        // the stage response is bound and the CaptureSelfie/2 page is painted.
        const response = await apiService.postNri(path, {
          stagename: "selfie",
          idempotencyKey: "",
        });

        if (!alive || !response) return;

        const selfieDocument = Array.isArray(response?.documents)
          ? response.documents.find(
              (doc: any) =>
                String(doc?.documentType ?? "").toLowerCase() === "selfie",
            )
          : null;

        const hasSelfieData =
          response?.status === true &&
          Boolean(response?.data) &&
          Object.keys(response.data).length > 0;

        const documentId =
          response?.data?.selfieDocumentId ||
          selfieDocument?.documentID ||
          selfieDocument?.documentId ||
          "";

        const presignedUrl =
          selfieDocument?.presignedUrl ||
          selfieDocument?.preSignedUrl ||
          selfieDocument?.url ||
          "";

        if (hasSelfieData || documentId || presignedUrl) {
          setExistingSelfieDocumentId(documentId);
          setIsSelfieStageDataAvailable(true);

          secureSessionService.setItem("SelfieVerified", "Yes");

          if (documentId) {
            secureSessionService.setItem("SelfieDocumentId", documentId);
          }
        }

        if (presignedUrl && !selfieFileRef.current) {
          const previewSelfieUrl = decodeHtmlUrl(presignedUrl);

          try {
            const resp = await fetch(previewSelfieUrl);

            if (!alive || !resp.ok) {
              console.log("Saved selfie fetch failed status:", resp.status);
              return;
            }

            const blob = await resp.blob();

            if (!alive || blob.size === 0 || selfieFileRef.current) return;

            const fileType = blob.type || "image/jpeg";

            const fileName = blobService.generateFileName(
              `selfie-${applicationId}`,
              "jpg",
            );

            const file = await blobService.blobToFile(blob, fileName, fileType);

            const objectUrl = blobService.fileToPreviewUrl(file);

            setSelfieFile(file);
            setPreviewUrl(objectUrl);
            setShowWebcam(false);
            setIsSelfieStageDataAvailable(true);
          } catch (error) {
            console.log("Saved selfie fetch failed:", error);
          }
        } else if (!selfieFileRef.current && !previewUrl) {
          setShowWebcam(true);
        }
      } catch (error: any) {
        if (!alive) return;

        console.log(
          "Selfie stage wise data error:",
          error?.response?.data || error,
        );

        if (!selfieFileRef.current && !previewUrl) {
          setShowWebcam(true);
        }
      } finally {
        if (alive) {
          requestAnimationFrame(() => {
            if (alive) hideSpinner();
          });
        }
      }
    };

    void getSelfieStageWiseData();

    return () => {
      alive = false;
    };
  }, [formNumber]);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        blobService.revokePreviewUrl(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!showWebcam) {
      setFaceAligned(false);
      return;
    }

    const FaceDetectorCtor =
      typeof window !== "undefined" ? (window as any).FaceDetector : undefined;

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

  const goBack = async () => {
    showSpinner();
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";
    if (step === 1) {
      // setTimeout(() => {
      //   router.push("/planprocess/3");
      //   hideSpinner();
      // }, 200);
      await dynamicBackService("SELFIE", applicationId, {
        push: router.push,

        showSpinner,

        hideSpinner,
      });
    } else {
      setTimeout(() => {
        router.push("/CaptureSelfie/1");
        hideSpinner();
      }, 200);
    }
  };

  const goToCapture = () => {
    showSpinner();

    if (!navigator.geolocation) {
      hideSpinner();
      setShowLocationModal(true);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        secureSessionService.setItem("SelfieGeoLat", String(latitude));
        secureSessionService.setItem("SelfieGeoLng", String(longitude));
        secureSessionService.setItem("SelfieGeoAccuracy", String(accuracy || 0));

        setGeoLat(String(latitude));
        setGeoLng(String(longitude));
        setGeoAccuracy(String(accuracy || 0));

        // Keep the spinner visible. The CaptureSelfie/2 stage-data effect
        // hides it only after the saved selfie/camera state is fully bound.
        router.push("/CaptureSelfie/2");
      },
      (error) => {
        console.log("Location access error:", error);
        hideSpinner();
        setShowLocationModal(true);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      },
    );
  };

  const continueWithMobile = async () => {
    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

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

    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

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

    if (previewUrl.startsWith("blob:")) {
      blobService.revokePreviewUrl(previewUrl);
    }

    const objectUrl = blobService.fileToPreviewUrl(file);

    setSelfieFile(file);
    setPreviewUrl(objectUrl);
    setShowWebcam(false);
    setIsSelfieStageDataAvailable(false);
    setExistingSelfieDocumentId("");
  }, [previewUrl]);

  const retake = () => {
    if (previewUrl.startsWith("blob:")) {
      blobService.revokePreviewUrl(previewUrl);
    }

    setSelfieFile(null);
    setPreviewUrl("");
    setShowWebcam(true);
    setIsSelfieStageDataAvailable(false);
    setExistingSelfieDocumentId("");

    secureSessionService.removeItem("SelfieVerified");
    secureSessionService.removeItem("SelfieDocumentId");
  };

  const uploadSelfie = async () => {
    if (!selfieFile) {
      toast.warning("Please capture a selfie first.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      return;
    }

    const applicationId = secureSessionService.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found");
      return;
    }

    const finalGeoLat = geoLat || secureSessionService.getItem("SelfieGeoLat") || "";
    const finalGeoLng = geoLng || secureSessionService.getItem("SelfieGeoLng") || "";

    const finalGeoAccuracy =
      geoAccuracy || secureSessionService.getItem("SelfieGeoAccuracy") || "0";

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

      secureSessionService.setItem("SelfieVerified", "Yes");

      if (response?.documentId) {
        secureSessionService.setItem("SelfieDocumentId", response.documentId);
      } else if (existingSelfieDocumentId) {
        secureSessionService.setItem("SelfieDocumentId", existingSelfieDocumentId);
      }

      let route = "";

      try {
        const uiMetadata = response?.uiMetadata
          ? JSON.parse(response.uiMetadata)
          : null;

        route = uiMetadata?.route || "";
      } catch (error: any) {
        route = "";
        console.log("Route Error:", error);
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

      console.log("Selfie KYC Verify Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

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
        <div className="mobile_css" style={{ width: "100%" }}>
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
                matches the photo on your Aadhaar or Pan card
              </p>
            </div>
          </div>

          <div className={styles.mobContentCard}>
            <div className={styles.mobIllustration}>
              <img
                src={publicPath("/assets/images/diy/selfie_illustration.png")}
                alt="Selfie guide illustration"
              />
            </div>

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

        {showLocationModal && <LocationModal />}

        <div className="desktop_css">
          <div className={styles.deskCard}>
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
                  matches the photo on your Aadhaar or Pan card
                </p>
              </div>
            </div>

            <div className={styles.deskBody}>
              <div className={styles.twoCol}>
                <div className={styles.illustrationCol}>
                  <img
                    src={publicPath(
                      "/assets/images/diy/selfie_illustration.png",
                    )}
                    alt="Selfie guide illustration"
                  />
                </div>

                <div className={styles.guidelinesCol}>
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

  return (
    <section className="pan_details_form" aria-label="Capture Selfie">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
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
                    className={`${styles.ovalFrame}${
                      faceAligned ? ` ${styles.ovalFrameAligned}` : ""
                    }`}
                  >
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      screenshotQuality={0.85}
                      videoConstraints={{ facingMode: "user" }}
                      className={styles.ovalVideo}
                      onUserMediaError={() => {
                        setShowCameraModal(true);
                      }}
                    />

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
                    showWebcam && faceAligned
                      ? ` ${styles.ovalHintAligned}`
                      : ""
                  }`}
                >
                  {showWebcam
                    ? "Position your face in the circle"
                    : "Selfie captured"}
                </p>

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
            </form>
          </div>
        </div>
      </div>
      {showCameraModal && (
        <CameraModal onRefresh={() => handleCameraRefresh()} />
      )}
    </section>
  );
}
