"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import LoadingButton from "@/components/ui/LoadingButton";
import styles from "./reverse-penny-drop.module.scss";
import { publicPath } from "@/utils/publicPath";
import { useSessionValue } from "@/hooks/useSessionValue";
import { buttonKeyProps } from "@/utils/a11y";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import secureSessionService from "@/services/secure-session.service";
// ReversePennyDrop — Bank account verification via UPI (reverse penny drop)
// Equivalent to Angular ReversePennyDropComponent (multi-step)
// Step 1: Mobile → choose UPI app, Desktop → scan QR code
// Step 2: Confirmation of verified bank account details
// Step 3: Verification failed

export default function ReversePennyDrop() {
  const router = useRouter();
  const params = useParams();
  const formNumber = params?.formNumber as string;
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [revPennyDropFormOne, setRevPennyDropFormOne] = useState(false);
  const [revPennyDropFormTwo, setRevPennyDropFormTwo] = useState(false);
  const [revPennyDropFormThree, setRevPennyDropFormThree] = useState(false);

  const [indianUPIBanksList, setIndianUPIBanksList] = useState<any[]>([]);
  const [selectedUPIBank, setSelectedUPIBank] = useState<any>(null);
  const [upiURL, setUpiURL] = useState("");
  const [upiPayLink, setUpiPayLink] = useState("");
  const [requestID, setRequestID] = useState("");

  const [enteredIFSCNumber, setEnteredIFSCNumber] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [rpdData, setRpdData] = useState("");

  const [hideCTAbtn, setHideCTAbtn] = useState(false);
  const [showLimitmsg, setShowLimitmsg] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [timeOutStatus, setTimeOutStatus] = useState(false);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const mismatchDialogRef = useFocusTrap<HTMLDivElement>(
    showMismatchModal,
    () => setShowMismatchModal(false),
  );

  const rejectStatus = useSessionValue("RejectStatus");
  const isIos =
    typeof window !== "undefined" ? secureSessionService.getItem("isIos") : null;

  const rpdWebHookIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const apiStartRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(180);
  const apiExecStartRef = useRef<number>(1);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setIsMobile(mobile);
    setFormVisibility(formNumber);

    return () => {
      if (rpdWebHookIntervalRef.current)
        clearInterval(rpdWebHookIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [formNumber]);

  const setFormVisibility = (step: string) => {
    setRevPennyDropFormOne(false);
    setRevPennyDropFormTwo(false);
    setRevPennyDropFormThree(false);
    if (step === "1") {
      setRevPennyDropFormOne(true);
      getUPIMasterDetails();
    } else if (step === "2") {
      setRevPennyDropFormTwo(true);
      getPennyDropFormTwo();
    } else if (step === "3") {
      setRevPennyDropFormThree(true);
    }
  };

  const getPennyDropFormTwo = async () => {
    showSpinner();
    if (rpdWebHookIntervalRef.current)
      clearInterval(rpdWebHookIntervalRef.current);
    const reqData = {
      flag: "Bank",
      formnumber:
        typeof window !== "undefined"
          ? secureSessionService.getItem("FormNumber")
          : "",
      Mode: "RPD",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/WorkflowDetails/getworkflowdata",
        reqData,
        hideSpinner,
      );
      if (
        response?.status === true &&
        response?.message === "Data found" &&
        response?.data?.[0]
      ) {
        const d = response.data[0];
        setEnteredIFSCNumber(d.acc_holder_ifsc || "");
        setAccountNumber(d.acc_number || "");
        setRpdData(d.bankname_address || "");
        if (rejectStatus !== "R") {
          if (typeof window !== "undefined")
            secureSessionService.setItem("mode", "RevPennyDrop");
        }
      }
      hideSpinner();
    } catch {
      hideSpinner();
    }
  };

  const filterUPIOptions = (upiList: any[]): any[] => {
    if (isIos === "true") {
      return upiList.filter((bank) => bank.UpiName !== "Others");
    }
    return upiList;
  };

  const getUPIMasterDetails = async () => {
    showSpinner();
    const reqData = {
      flag: "GetUPIMasterdetls",
      formNumber:
        typeof window !== "undefined"
          ? secureSessionService.getItem("FormNumber")
          : "",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/BankDetails/CreateRPDService",
        reqData,
        hideSpinner,
      );
      if (
        response?.status === true &&
        response?.message !== "Bank Account Already Verified" &&
        response?.message !== "Reverse Penny Drop Limit Exceeded"
      ) {
        const filtered = filterUPIOptions(response.data || []);
        setIndianUPIBanksList(filtered);
        if (filtered.length > 0) setRequestID(filtered[0].requestId || "");
        setShowLimitmsg(false);
        setHideCTAbtn(false);

        const isMobileDevice = /iPhone|iPad|iPod|Android/i.test(
          navigator.userAgent,
        );
        if (!isMobileDevice) {
          // Desktop: use "Others" UPI link for QR code
          const othersBank = (response.data || []).find(
            (b: any) => b.UpiName === "Others",
          );
          if (othersBank) {
            setUpiPayLink(othersBank.upiLink || "");
            apiStartRef.current = Date.now();
            rpdWebHookIntervalRef.current = setInterval(() => {
              getVerifyBankDetailsStatus("desktop");
            }, 5000);
            startCountdown();
          }
        }
        hideSpinner();
      } else if (response?.message === "Reverse Penny Drop Limit Exceeded") {
        setShowLimitmsg(true);
        setHideCTAbtn(true);
        hideSpinner();
      } else if (response?.message === "Bank Account Already Verified") {
        setShowLimitmsg(false);
        setHideCTAbtn(false);
        toast.success(response.message, {
          position: "bottom-center",
          autoClose: 2500,
        });
        setTimeout(() => {
          setTimeout(() => {
            router.push("/home");
          }, 200);
          hideSpinner();
        }, 200);
      } else {
        setShowLimitmsg(false);
        setHideCTAbtn(false);
        toast.success(response?.message || "", {
          position: "bottom-center",
          autoClose: 4000,
        });
        hideSpinner();
      }
    } catch {
      hideSpinner();
    }
  };

  const selectUPIBank = (data: any) => {
    if (!data?.UpiName || !data?.upiLink) {
      toast.warning("Please select a valid UPI bank option.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      return;
    }
    setSelectedUPIBank(data);
    setUpiURL(data.upiLink);
    if (typeof window !== "undefined")
      secureSessionService.setItem("selectedUPIBank", data.UpiName.replace(/"/g, ""));
  };

  const launchUPILink = (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      showSpinner();
      const a = document.createElement("a");
      a.href = url;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => {
        resolve(true);
      }, 3000);
    });
  };

  const sendVerifyBank = async () => {
    showSpinner();
    if (!selectedUPIBank?.UpiName || !selectedUPIBank?.upiLink) {
      toast.warning("Please select a valid UPI bank option.", {
        position: "bottom-center",
        autoClose: 2000,
      });
      hideSpinner();
      return;
    }
    const currentUpiURL = upiURL;
    if (currentUpiURL) {
      try {
        await launchUPILink(currentUpiURL);
        apiStartRef.current = Date.now();
        rpdWebHookIntervalRef.current = setInterval(() => {
          getVerifyBankDetailsStatus("mobile");
        }, 5000);
      } catch {
        showSpinnerWithFallback();
      }
    } else {
      showSpinnerWithFallback();
    }
  };

  const getVerifyBankDetailsStatus = async (flag: string) => {
    if (apiExecStartRef.current !== 1) return;
    apiExecStartRef.current = 0;
    const reqData = {
      flag: "getrpdewebhookdetls",
      formNumber:
        typeof window !== "undefined"
          ? secureSessionService.getItem("FormNumber")
          : "",
      request_id: requestID,
    };
    if (flag !== "desktop") showSpinner();
    try {
      const response = await apiService.postRequest(
        "api/v1/BankDetails/getwehbookrpdDetails",
        reqData,
        hideSpinner,
      );
      const apitimeOut = flag !== "desktop" ? 1000 * 60 : 3000 * 60;
      if (response?.status === true) {
        const d = response.data?.[0];
        if (response.message !== "Name Mismatch-MiddleRange") {
          if (rpdWebHookIntervalRef.current)
            clearInterval(rpdWebHookIntervalRef.current);
          if (typeof window !== "undefined")
            secureSessionService.setItem("mode", "RevPennyDrop");
          setEnteredIFSCNumber(d?.acc_holder_ifsc || "");
          setAccountNumber(d?.acc_number || "");
          setRpdData(d?.bankname_address || "");
          if (typeof window !== "undefined")
            secureSessionService.setItem("TriggerEvent", "N");
          setTimeout(() => {
            setTimeout(() => {
              router.push("/home");
            }, 200);
            hideSpinner();
          }, 200);
        } else {
          if (rpdWebHookIntervalRef.current)
            clearInterval(rpdWebHookIntervalRef.current);
          if (typeof window !== "undefined")
            secureSessionService.setItem("mode", "RevPennyDrop");
          setEnteredIFSCNumber(d?.acc_holder_ifsc || "");
          setAccountNumber(d?.acc_number || "");
          setRpdData(d?.bankname_address || "");
          if (typeof window !== "undefined")
            secureSessionService.setItem("TriggerEvent", "N");
          hideSpinner();
          setShowMismatchModal(true);
        }
      } else if (response?.message === "Name Mismatch") {
        if (rpdWebHookIntervalRef.current)
          clearInterval(rpdWebHookIntervalRef.current);
        toast.error(
          "Oops! This bank account seems to belonging to someone else as per bank record. Please change the bank details to continue.",
          { position: "bottom-center", autoClose: 5000 },
        );
        getUPIMasterDetails();
        hideSpinner();
      } else if (
        response?.message ===
        "This bank account is already exist. Kindly use different Bank account"
      ) {
        if (rpdWebHookIntervalRef.current)
          clearInterval(rpdWebHookIntervalRef.current);
        toast.error(response.message, {
          position: "bottom-center",
          autoClose: 5000,
        });
        getUPIMasterDetails();
        hideSpinner();
      } else {
        const timeElapsed = Date.now() - apiStartRef.current;
        if (timeElapsed > apitimeOut) {
          if (rpdWebHookIntervalRef.current)
            clearInterval(rpdWebHookIntervalRef.current);
          toast.error(
            "Oops! We could not verify the bank account linked with your UPI ID. Please retry again or enter details manually to verify your bank account",
            { position: "bottom-center", autoClose: 3000 },
          );
          getUPIMasterDetails();
          hideSpinner();
        }
      }
    } catch {
      hideSpinner();
    }
    apiExecStartRef.current = 1;
  };

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    remainingTimeRef.current = 180;
    countdownRef.current = setInterval(() => {
      remainingTimeRef.current--;
      setMinutes(Math.floor(remainingTimeRef.current / 60));
      setSeconds(remainingTimeRef.current % 60);
      if (remainingTimeRef.current <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
        setTimeOutStatus(true);
      }
    }, 1000);
  };

  const showSpinnerWithFallback = () => {
    showSpinner();
    setTimeout(() => {
      setRevPennyDropFormOne(true);
      hideSpinner();
    }, 1000);
  };

  const redirecttoPennyDrop = () => {
    showSpinner();
    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    setTimeout(() => {
      setTimeout(() => {
        router.push("/home");
      }, 200);
      hideSpinner();
    }, 200);
  };

  const redirectPlanSelection = () => {
    showSpinner();
    document.querySelectorAll(".modal-backdrop").forEach((el) => el.remove());
    setShowMismatchModal(false);
    if (rejectStatus !== "R") {
      setTimeout(() => {
        router.push("/planprocess/1");
        hideSpinner();
      }, 200);
    } else {
      setTimeout(() => {
        navigationService.navigateToNextStep();
      }, 200);
    }
  };

  const backToOne = async () => {
    showSpinner();
    if (rpdWebHookIntervalRef.current)
      clearInterval(rpdWebHookIntervalRef.current);
    const reqData = {
      flag: "changebankflag",
      formNumber:
        typeof window !== "undefined"
          ? secureSessionService.getItem("FormNumber")
          : "",
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/BankDetails/Chosebankaccount",
        reqData,
        hideSpinner,
      );
      if (response?.status === true) {
        if (typeof window !== "undefined") secureSessionService.removeItem("mode");
        setTimeout(() => {
          setTimeout(() => {
            router.push("/home");
          }, 200);
        }, 200);
      } else {
        toast.error(response?.message || "Error", {
          position: "bottom-center",
          autoClose: 4000,
        });
        hideSpinner();
      }
    } catch {
      hideSpinner();
    }
  };

  const backToPersonalSix = () => {
    if (rpdWebHookIntervalRef.current)
      clearInterval(rpdWebHookIntervalRef.current);
    showSpinner();
    setTimeout(() => {
      router.push("/manual-bankdetails");
      hideSpinner();
    }, 200);
  };

  const backToPersonalFive = () => {
    if (rpdWebHookIntervalRef.current)
      clearInterval(rpdWebHookIntervalRef.current);
    showSpinner();
    setTimeout(() => {
      router.push("/personalDetailsForm/5");
      hideSpinner();
    }, 200);
  };

  const padTwo = (n: number) => String(n).padStart(2, "0");

  return (
    <>
      {/* Form 1 — Mobile: Choose UPI App */}
      {revPennyDropFormOne && isMobile && (
        <section
          aria-label="Choose Payment Method"
          className="pan_details_form"
        >
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <div className="mobile_css">
                  <div className="back_cls">
                    <div
                      aria-label="Go back"
                      style={{ cursor: "pointer" }}
                      {...buttonKeyProps(backToPersonalSix)}
                    >
                      <img
                        src={publicPath("/assets/images/diy/ChevronLeft.png")}
                        alt=""
                        aria-hidden="true"
                      />{" "}
                      Back
                    </div>
                    <div className="mobile_header_padding">
                      <div className="help_faq_css">
                        <div className="d-flex gap-2">
                          <div className="d-flex flex-column gap-2">
                            <h5>Choose Payment method</h5>
                          </div>
                        </div>
                      </div>
                      <p className="sub_title">Select your preferred UPI app</p>
                    </div>
                  </div>
                </div>

                <form aria-label="Choose UPI Payment Method" method="post">
                  <div>
                    <div className="col-lg-12 col-md-12 col-12 desktop_css">
                      <div className="d-flex align-items-start gap-2">
                        <div
                          aria-label="Go back"
                          style={{ cursor: "pointer" }}
                          {...buttonKeyProps(backToPersonalSix)}
                        >
                          <span aria-hidden="true">
                            <svg
                              width="24"
                              height="25"
                              viewBox="0 0 24 25"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <g clipPath="url(#clip0_rpd1)">
                                <path
                                  d="M5 12.5H19"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 12.5L11 18.5"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 12.5L11 6.5"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </g>
                              <defs>
                                <clipPath id="clip0_rpd1">
                                  <rect
                                    width="24"
                                    height="24"
                                    fill="white"
                                    transform="translate(0 0.5)"
                                  />
                                </clipPath>
                              </defs>
                            </svg>
                          </span>
                        </div>
                        <div className="d-flex flex-column align-items-start gap-2">
                          <h5>Choose Payment method</h5>
                          <p className="sub_title">
                            Select your preferred UPI app
                          </p>
                        </div>
                      </div>
                    </div>
                    <hr className="desktop_css" />
                  </div>

                  {indianUPIBanksList.map((data: any, i: number) => (
                    <div key={i} className="col-lg-12">
                      <div
                        className="square-box p-4"
                        aria-pressed={
                          selectedUPIBank === data ? "true" : "false"
                        }
                        aria-label={`Select ${data.UpiName} as your UPI app`}
                        style={{ cursor: "pointer" }}
                        {...buttonKeyProps(() => selectUPIBank(data))}
                      >
                        <div className="pan_details_align">
                          <input
                            type="radio"
                            name="radio-button"
                            className="radio-button"
                            checked={selectedUPIBank === data}
                            readOnly
                            aria-hidden="true"
                            tabIndex={-1}
                          />
                          <div className="upload_css">
                            <p className="d-flex align-items-center gap-2">
                              <img
                                className="logo_img"
                                src={data.UpiLogo}
                                alt={`${data.UpiName} logo`}
                              />
                              {data.UpiName}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="sbi_note">
                    {!showLimitmsg ? (
                      <p>
                        <strong>
                          ₹1 will be debited from your account to verify bank
                          details. It will be refunded within 3 working days.
                        </strong>
                      </p>
                    ) : (
                      <p>
                        <strong>
                          Oops, maximum limit of attempt to verify bank details
                          using UPI is exhausted. Please enter details manually.
                        </strong>
                      </p>
                    )}
                  </div>

                  <div className="btn_align stickybtn_desk desktop_css">
                    {!hideCTAbtn ? (
                      <LoadingButton
                        className="btn btn_cls"
                        onClick={sendVerifyBank}
                      >
                        Send ₹1 to verify bank
                      </LoadingButton>
                    ) : (
                      <LoadingButton
                        className="btn btn_cls"
                        onClick={redirecttoPennyDrop}
                      >
                        Proceed to enter details manually
                      </LoadingButton>
                    )}
                  </div>
                </form>
              </div>

              <div className="btn_align stickybtn mobile_css">
                {!hideCTAbtn ? (
                  <LoadingButton
                    className="btn btn_cls"
                    onClick={sendVerifyBank}
                  >
                    Send ₹1 to verify bank
                  </LoadingButton>
                ) : (
                  <LoadingButton
                    className="btn btn_cls"
                    onClick={redirecttoPennyDrop}
                  >
                    Proceed to enter details manually
                  </LoadingButton>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Form 1 — Desktop: QR Code */}
      {revPennyDropFormOne && !isMobile && (
        <section
          aria-label="Verify Bank Account — Desktop QR"
          className="pan_details_form"
        >
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-md-10 col-12 m-auto">
                <form
                  aria-label="Verify Bank Account via QR Code"
                  method="post"
                >
                  <div className="mobile_header_padding">
                    <div className="help_faq_css">
                      <div className="d-flex gap-2">
                        <div
                          aria-label="Go back"
                          style={{ cursor: "pointer" }}
                          {...buttonKeyProps(backToPersonalSix)}
                        >
                          <span aria-hidden="true">
                            <svg
                              width="24"
                              height="25"
                              viewBox="0 0 24 25"
                              fill="none"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <g clipPath="url(#clip0_rpd2)">
                                <path
                                  d="M5 12.5H19"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 12.5L11 18.5"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <path
                                  d="M5 12.5L11 6.5"
                                  stroke="black"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </g>
                              <defs>
                                <clipPath id="clip0_rpd2">
                                  <rect
                                    width="24"
                                    height="24"
                                    fill="white"
                                    transform="translate(0 0.5)"
                                  />
                                </clipPath>
                              </defs>
                            </svg>
                          </span>
                        </div>
                        <div className="heading">
                          <h5>Verify your bank account</h5>
                          <p className="sub_title">
                            Scan the below QR code using any UPI app to verify
                            your bank account with us
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <hr className="desktop_css" />
                  <div className="qr_css">
                    {upiPayLink && (
                      <div
                        role="img"
                        aria-label="UPI QR code to verify your bank account. Scan using any UPI app."
                      >
                        {/* QR code rendered as text fallback — install qrcode.react for actual QR */}
                        <div
                          style={{
                            width: 300,
                            height: 300,
                            border: "1px solid #ccc",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            wordBreak: "break-all",
                            padding: 8,
                            fontSize: 10,
                          }}
                        >
                          {upiPayLink}
                        </div>
                        {!timeOutStatus && (
                          <p aria-live="polite" aria-atomic="true">
                            {minutes}:{padTwo(seconds)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="sbi_note">
                    {!showLimitmsg ? (
                      <p>
                        <strong>
                          ₹1 will be debited from your account to verify bank
                          details. It will be refunded within 3 working days.
                        </strong>
                      </p>
                    ) : (
                      <p>
                        <strong>
                          Oops, maximum limit of attempt to verify bank details
                          using UPI is exhausted. Please enter details manually.
                        </strong>
                      </p>
                    )}
                  </div>
                  <div className="qr_info">
                    <p>
                      Use your bank account details, which matches the name on
                      your PAN CARD
                    </p>
                  </div>
                  <div className="btn_align stickybtn_desk desktop_css">
                    {hideCTAbtn && (
                      <LoadingButton
                        className="btn btn_cls"
                        onClick={redirecttoPennyDrop}
                      >
                        Proceed to enter details manually
                      </LoadingButton>
                    )}
                  </div>
                </form>
                <div className="btn_align stickybtn mobile_css">
                  {!hideCTAbtn ? (
                    <LoadingButton
                      className="btn btn_cls"
                      onClick={sendVerifyBank}
                    >
                      Send ₹1 to verify bank
                    </LoadingButton>
                  ) : (
                    <LoadingButton
                      className="btn btn_cls"
                      onClick={redirecttoPennyDrop}
                    >
                      Proceed to enter details manually
                    </LoadingButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Form 2: Confirmation */}
      {revPennyDropFormTwo && (
        <section
          aria-label="Bank Account Confirmed"
          className="pan_details_form"
        >
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <div className="mobile_css">
                  <div className="back_cls">
                    {rejectStatus !== "R" && (
                      <div
                        aria-label="Go back"
                        style={{ cursor: "pointer" }}
                        {...buttonKeyProps(backToPersonalFive)}
                      >
                        <img
                          src={publicPath("/assets/images/diy/ChevronLeft.png")}
                          alt=""
                          aria-hidden="true"
                        />{" "}
                        Back
                      </div>
                    )}
                    <div className="d-flex flex-column align-items-start gap-2">
                      <h5>Choose Payment method</h5>
                      <p className="sub_title">Select your preferred UPI app</p>
                    </div>
                  </div>
                </div>

                <form aria-label="Bank Account Confirmation" method="post">
                  <div className="div">
                    <div className="col-lg-12 col-md-12 col-12 desktop_css">
                      <div className="d-flex align-items-start gap-2">
                        {rejectStatus !== "R" && (
                          <div
                            aria-label="Go back"
                            style={{ cursor: "pointer" }}
                            {...buttonKeyProps(backToPersonalFive)}
                          >
                            <span aria-hidden="true">
                              <svg
                                width="24"
                                height="25"
                                viewBox="0 0 24 25"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <g clipPath="url(#clip0_rpd3)">
                                  <path
                                    d="M5 12.5H19"
                                    stroke="black"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M5 12.5L11 18.5"
                                    stroke="black"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  <path
                                    d="M5 12.5L11 6.5"
                                    stroke="black"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                </g>
                                <defs>
                                  <clipPath id="clip0_rpd3">
                                    <rect
                                      width="24"
                                      height="24"
                                      fill="white"
                                      transform="translate(0 0.5)"
                                    />
                                  </clipPath>
                                </defs>
                              </svg>
                            </span>
                          </div>
                        )}
                        <div className="d-flex flex-column align-items-start gap-2">
                          <h5>Choose Payment method</h5>
                          <p className="sub_title">
                            Select your preferred UPI app
                          </p>
                        </div>
                      </div>
                    </div>
                    <hr className="desktop_css" />
                    <div className="text-center">
                      <img
                        className="m-auto"
                        src={publicPath(
                          "/assets/images/diy/successful-tick.png",
                        )}
                        alt="Bank account verified successfully"
                      />
                    </div>
                    <div className="pan_confirmation">
                      <p>
                        Account No:{" "}
                        <span className="fw-semibold">{accountNumber}</span>
                      </p>
                      <p>
                        IFSC Code:{" "}
                        <span className="fw-semibold">{enteredIFSCNumber}</span>
                      </p>
                      <div className="mt-4">
                        <p>
                          Bank Name & Address:{" "}
                          <span className="fw-semibold">{rpdData}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="btn_align stickybtn_desk desktop_css">
                    <LoadingButton
                      className="btn btn_cls_outline"
                      onClick={backToOne}
                    >
                      Choose another account
                    </LoadingButton>
                    <LoadingButton
                      className="btn btn_cls"
                      onClick={redirectPlanSelection}
                    >
                      Proceed
                    </LoadingButton>
                  </div>
                </form>
              </div>
              <div className="btn_align stickybtn mobile_css">
                <LoadingButton
                  className="btn btn_cls_outline"
                  onClick={backToOne}
                >
                  Choose another account
                </LoadingButton>
                <LoadingButton
                  className="btn btn_cls"
                  onClick={redirectPlanSelection}
                >
                  Proceed
                </LoadingButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Form 3: Verification Failed */}
      {revPennyDropFormThree && (
        <section aria-label="Verification Failed" className="pan_details_form">
          <div className="container">
            <div className="row">
              <form aria-label="Bank Verification Failed" method="post">
                <div className="text-center">
                  <img
                    className="m-auto"
                    src={publicPath("/assets/images/diy/unsuccessful-tick.png")}
                    alt="Verification unsuccessful"
                  />
                </div>
                <div className="pan_confirmation">
                  <p>
                    We are unable to proceed with the bank details that you have
                    selected.
                  </p>
                </div>
              </form>
              <div className="stickybtn">
                <LoadingButton className="btn btn_cls">Proceed</LoadingButton>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Name Mismatch Modal */}
      {showMismatchModal && (
        <div
          ref={mismatchDialogRef}
          className="modal fade show uploadPan"
          style={{ display: "block" }}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label="Bank account name mismatch"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div
                className="modal-header d-block"
                onClick={() => setShowMismatchModal(false)}
                style={{ cursor: "pointer" }}
              >
                <h1 className="modal-title fs-5" id="mismatchModalLabel"></h1>
                <button
                  type="button"
                  className="btn-horizontal-line"
                  aria-label="Close"
                  onClick={() => setShowMismatchModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="img_preview text-center">
                  <img
                    src={publicPath("/assets/images/diy/invalid-details.png")}
                    alt="Warning: account name mismatch"
                  />
                </div>
                <div className="text-center">
                  <span className="textfont_css">Oops!</span>
                  <br />
                  <span>
                    This bank account seems to belonging to someone else as per
                    bank record. Do you still want to continue?
                  </span>
                </div>
              </div>
              <div className="modal-footer flex-nowrap">
                <LoadingButton
                  type="button"
                  className="btn btn_cls"
                  onClick={() => {
                    setShowMismatchModal(false);
                    hideSpinner();
                  }}
                >
                  No
                </LoadingButton>
                <LoadingButton
                  type="button"
                  className="btn btn_cls"
                  onClick={redirectPlanSelection}
                >
                  Yes
                </LoadingButton>
              </div>
            </div>
          </div>
        </div>
      )}
      {showMismatchModal && <div className="modal-backdrop fade show"></div>}
    </>
  );
}
