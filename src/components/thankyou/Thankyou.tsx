"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useSpinner } from "@/components/spinner/Spinner";
import apiService from "@/services/api.service";
import { toast } from "@/services/toast.service";
import LoadingButton from "@/components/ui/LoadingButton";
import styles from "./thankyou.module.scss";
import { publicPath } from "@/utils/publicPath";
import secureSessionService from "@/services/secure-session.service";

// Thankyou component — equivalent to Angular ThankyouComponent
// Shows application submission confirmation

export default function Thankyou() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [personalFormOne, setPersonalFormOne] = useState(false);
  const [personalFormTwo, setPersonalFormTwo] = useState(false);
  const [personalFormNumber, setPersonalFormNumber] = useState("");
  const [isFno, setIsFno] = useState(false);
  const [errorValue, setErrorValue] = useState("");
  const [paidPlanText, setPaidPlanText] = useState([{ Paidplantextshow: "" }]);

  useEffect(() => {
    document.title = "Thank You | SBI Securities";

    const formNumber = secureSessionService.getItem("applicationNumber") ?? "";
    setPersonalFormNumber(formNumber);

    const queryParams = new URLSearchParams(window.location.search);
    const esign = queryParams.get("esign");
    const errorMessage = queryParams.get("error") ?? "";

    if (esign === "n") {
      showSpinner();

      setPersonalFormOne(false);
      setPersonalFormTwo(true);
      setErrorValue(
        errorMessage ||
          "Looks like the e-sign couldn’t be completed. Please try again. Contact us on 022 6854 5555 / 022 4001 4155",
      );

      hideSpinner();
    }
    else
    {
      showSpinner();

      setPersonalFormOne(true);
      setPersonalFormTwo(false);

      hideSpinner()
    }
  }, [showSpinner, hideSpinner]);

  const getThankYouData = async () => {
    showSpinner();

    try {
      const response = await apiService.postRequest(
        "api/v1/masters/get",
        {
          flag: "GetThankyouDetails",
          FormNumber: secureSessionService.getItem("applicationNumber"),
        },
        hideSpinner,
      );

      if (response?.status === true) {
        const data = response.data;

        if (data?.data?.length) {
          setPaidPlanText(data.data);
          setIsFno(data.data[0]?.IsFno === true);
        }

        setPersonalFormOne(true);
        setPersonalFormTwo(false);
      } else {
        setPersonalFormOne(false);
        setPersonalFormTwo(true);
        setErrorValue(
          response?.message ?? "Something went wrong. Please try again.",
        );
      }
    } catch {
      hideSpinner();
    } finally {
      hideSpinner();
    }
  };

  const redirectesign = () => {
    showSpinner();

    setTimeout(() => {
      document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
        if (backdrop instanceof HTMLElement) {
          backdrop.remove();
        }
      });

      router.push("/esign");
      hideSpinner();
    }, 200);
  };

  const openAggregatorModal = () => {
    const modal = document.getElementById("AggregatorCall");

    if (modal) {
      const bsModal = (window as any).bootstrap?.Modal?.getOrCreateInstance(
        modal,
      );
      bsModal?.show();
    }
  };

  const decodeHtmlUrl = (url: string) => {
    if (typeof document === "undefined") return url;

    const textarea = document.createElement("textarea");
    textarea.innerHTML = url;
    return textarea.value;
  };

  const findPresignedUrl = (data: any): string => {
    if (!data) return "";

    if (typeof data === "string") {
      return "";
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const url = findPresignedUrl(item);
        if (url) return url;
      }

      return "";
    }

    if (typeof data === "object") {
      if (typeof data.presignedUrl === "string" && data.presignedUrl.trim()) {
        return data.presignedUrl;
      }

      if (typeof data.preSignedUrl === "string" && data.preSignedUrl.trim()) {
        return data.preSignedUrl;
      }

      if (typeof data.PresignedUrl === "string" && data.PresignedUrl.trim()) {
        return data.PresignedUrl;
      }

      if (typeof data.PresignedURL === "string" && data.PresignedURL.trim()) {
        return data.PresignedURL;
      }

      for (const key of Object.keys(data)) {
        const url = findPresignedUrl(data[key]);
        if (url) return url;
      }
    }

    return "";
  };

  const downloadAccountOpeningForm = async (
    event: React.MouseEvent<HTMLAnchorElement>,
  ) => {
    event.preventDefault();

    const applicationId =
      secureSessionService.getItem("ApplicationId") ||
      secureSessionService.getItem("applicationId") ||
      "";

    if (!applicationId) {
      toast.error("Application ID not found. Please restart the process.");
      return;
    }

    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/get/workflow/stagewisedata`,
        {
          stagename: "thankyou",
          idempotencyKey: "",
        },
        hideSpinner,
        {
          accept: "*/*",
        },
      );

      const presignedUrl = findPresignedUrl(response);

      if (presignedUrl) {
        const finalUrl = decodeHtmlUrl(presignedUrl);
        window.open(finalUrl, "_blank", "noopener,noreferrer");
      } else {
        toast.error(
          "Unable to download Account Opening Form. Please try again.",
        );
      }
    } catch {
      toast.error("An error occurred while downloading Account Opening Form.");
    } finally {
      hideSpinner();
    }
  };

  return (
    <>
      {/* Success State */}
      {personalFormOne && (
        <section
          aria-label="Application Submitted — Thank You"
          className={`pan_details_form ${styles.panDetailsForm}`}
        >
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                {!isFno && (
                  <div className={styles.thankyouCard}>
                    <div className={styles.cardHeader}>
                      <h5>
                        <img
                          src={publicPath("/assets/images/diy/celebration.gif")}
                          alt=""
                          aria-hidden="true"
                          style={{
                            width: 28,
                            height: 28,
                            verticalAlign: "middle",
                            marginRight: 8,
                          }}
                        />
                        Thank You!!!
                      </h5>
                      <p>
                        Your application for an NRO Demat &amp; Trading Account
                        has been successfully submitted.
                      </p>
                    </div>

                    <div className={styles.cardBody}>
                      <div className="text-center mb-3">
                        <Image
                          src={publicPath("/assets/images/diy/CheckCircle.png")}
                          alt="Application submitted successfully"
                          width={48}
                          height={48}
                        />
                      </div>

                      <p className={styles.successMessage}>
                        <img
                          src={publicPath("/assets/images/diy/tick.gif")}
                          alt=""
                          aria-hidden="true"
                          style={{
                            width: 20,
                            height: 20,
                            verticalAlign: "middle",
                            marginRight: 6,
                          }}
                        />
                        If all details are found in order, your account will be
                        activated within 48 hours.
                      </p>

                      <p className={styles.successMessage}>
                        <img
                          src={publicPath("/assets/images/diy/warning.gif")}
                          alt=""
                          aria-hidden="true"
                          style={{
                            width: 20,
                            height: 20,
                            verticalAlign: "middle",
                            marginRight: 6,
                          }}
                        />
                        In case of any discrepancies in the
                        information/documents provided, you will receive a
                        notification for correction.
                      </p>

                      {paidPlanText[0]?.Paidplantextshow && (
                        <p className={styles.successMessage}>
                          {paidPlanText[0].Paidplantextshow}
                        </p>
                      )}

                      <p className={styles.successMessage}>
                        Application No. - <strong>{personalFormNumber}</strong>
                      </p>

                      <p className={styles.successMessage}>
                        <strong>Next Step:</strong> Download the SBI Securities
                        Mobile App and get ready to start your trading journey.
                      </p>

                      <a
                        href="#"
                        className={styles.downloadBtn}
                        aria-label="Download Account Opening Form"
                        onClick={downloadAccountOpeningForm}
                      >
                        <i className="bi bi-download fs-5" aria-hidden="true" />
                        Download Account Opening Form
                      </a>

                      <p className={styles.helpText}>
                        If you have any questions or need further assistance,
                        feel free to contact our support team at{" "}
                        <a
                          href="mailto:NRIDESK.SSL@sbicapsec.com"
                          style={{
                            color: "#280071",
                            fontWeight: 600,
                            textDecoration: "underline",
                          }}
                        >
                          NRIDESK.SSL@sbicapsec.com
                        </a>{" "}
                        /{" "}
                        <a
                          href="tel:+912268567464"
                          style={{ color: "#280071", fontWeight: 600 }}
                        >
                          <strong>+91 2268567464</strong>
                        </a>
                        .
                      </p>

                      <p className={styles.helpText}>
                        We are available from 9:30 AM to 6:30 PM IST (Monday to
                        Saturday only) except 2nd &amp; 4th Saturdays.
                      </p>

                      <p className={styles.helpText}>
                        We&rsquo;re excited to welcome you to SBI Securities and
                        look forward to being your trusted partner in
                        investments.
                      </p>
                    </div>
                  </div>
                )}

                {isFno && (
                  <form aria-label="Thank You Form" method="post">
                    <div className="col-lg-12 col-md-12 col-12 desktop_css">
                      <div className="d-flex flex-column align-items-start gap-2">
                        <h5>Just one last step!</h5>
                        <p>Activate Derivatives</p>
                      </div>
                    </div>

                    <hr className="desktop_css" />

                    <div className="text-center">
                      <Image
                        src={publicPath("/assets/images/diy/CheckCircle.png")}
                        alt="Completed Icon"
                        width={80}
                        height={80}
                      />

                      <h5 style={{ paddingTop: "10px" }}>Thank You</h5>

                      <p className="text-center" style={{ paddingTop: "30px" }}>
                        To activate derivatives segment you are just a few steps
                        away. Click on activate derivatives to proceed.
                      </p>
                    </div>

                    <div className={styles.proceedBtn}>
                      <LoadingButton
                        className="btn btn_cls"
                        onClick={openAggregatorModal}
                      >
                        Activate Derivative
                      </LoadingButton>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {personalFormTwo && (
        <section
          aria-label="Application Error"
          className={`pan_details_form ${styles.panDetailsForm}`}
        >
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                {/* <h5 className="text-center my-3">Thank you</h5> */}

                <form aria-label="Error Form" method="post">
                  <div className="text-center">
                    <Image
                      src={publicPath("/assets/images/diy/invalid_icon.png")}
                      alt="Error Icon"
                      width={80}
                      height={80}
                    />

                    <p className="my-2">{errorValue}</p>
                  </div>
                </form>
              </div>

              <div className={styles.btnAlign}>
                <LoadingButton className="btn btn_cls" onClick={redirectesign}>
                  Back to E-Sign
                </LoadingButton>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
