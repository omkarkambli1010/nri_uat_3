"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import styles from "./father-spouse-name.module.scss";
import LoadingButton from '@/components/ui/LoadingButton';
import { useSessionValue } from '@/hooks/useSessionValue';

// FatherSpouseName — step 5: Father/Spouse Name (KYC)
// Equivalent to Angular FatherSpouseNameComponent

export default function FatherSpouseName() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [fatherName, setFatherName] = useState("");
  const [isPersonalForm, setIsPersonalForm] = useState(true);
  const [showEmptyWarning, setShowEmptyWarning] = useState(false);
  const [fatherNameSpecial, setFatherNameSpecial] = useState(false);
  const [fatherNameDigit, setFatherNameDigit] = useState(false);
  const [fatherNameSpace, setFatherNameSpace] = useState(false);
  const [guid, setGuid] = useState("");

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    getFatherSpouseData();
  }, []);


  // ─── Fetch saved PERSONAL workflow data on mount ───────────────────────
  // Pre-fills Father/Spouse Name if already saved (e.g. navigating back,
  // or resuming a saved application).
  const getFatherSpouseData = async () => {
    const applicationId =
      typeof window !== "undefined"
        ? sessionStorage.getItem("ApplicationId")
        : null;

    if (!applicationId) return;

    showSpinner();

    try {
      const response = await apiService.getPersonalDetailsWorkflow(
        applicationId,
        hideSpinner,
      );
      console.log("Father Spouse Workflow Response:", response);

      const savedFatherName = response?.data?.fatherName ?? "";

      if (savedFatherName) {
        setFatherName(savedFatherName);
        setIsPersonalForm(false);
      }
    } catch (error: any) {
      const errorData = error?.response?.data;
      console.log("Father Spouse Workflow Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const updateFatherName = (value: string, flag: string) => {
    let trimmedValue = value.trim().replace(/\s{2,}/g, " ");
    const specialCharRegex = /[!@#$%^&*()\-+={}[\]:;"'<>,.?\/|\\]/;
    const hasSpecialChar = specialCharRegex.test(trimmedValue);
    const hasDigit = /\d/.test(trimmedValue);
    const hasMultipleSpaces = /\s{2,}/.test(trimmedValue);

    setFatherNameSpecial(hasSpecialChar);
    setFatherNameDigit(hasDigit);
    setFatherNameSpace(hasMultipleSpaces);

    if (
      trimmedValue.length > 0 &&
      !hasMultipleSpaces &&
      !hasSpecialChar &&
      !hasDigit
    ) {
      if (flag === "fout") setFatherName(value.toUpperCase());
      setIsPersonalForm(false);
      setShowEmptyWarning(false);
    } else {
      if (flag === "fout") setShowEmptyWarning(trimmedValue === "");
      setIsPersonalForm(true);
    }
  };

  const checkInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (/^\s/.test(value)) value = value.trimStart();
    value = value.replace(/\s{2,}/g, " ");
    value = value.replace(/[^a-zA-Z\s]/g, "").toUpperCase();
    setFatherName(value);
    updateFatherName(value, "change");
  };

  const onKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const regExp = /^[a-zA-Z\s]*$/;
    if (!regExp.test(e.key)) e.preventDefault();
  };

  const PersonalDetailsave = async () => {
    if (!fatherName.trim()) {
      setShowEmptyWarning(true);
      toast.error("Please enter Father/Spouse Name", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    const applicationId = sessionStorage.getItem("ApplicationId") ?? "";

    if (!applicationId) {
      toast.error("Application Id not found", {
        position: "bottom-center",
        autoClose: 3000,
      });
      return;
    }

    const reqData = {
      fatherName: fatherName.trim(),
      stageCodes: "PERSONAL_DETAILS5",
      idempotencyKey: "",
    };

    showSpinner();

    try {
      const response = await apiService.postNri(
        `applications/${applicationId}/personal-details`,
        reqData,
        hideSpinner,
      );

      console.log("Father Name Save Response:", response);

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

      console.log("Father Name Save Error:", errorData);
    } finally {
      hideSpinner();
    }
  };

  const BackToFour = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/personalDetailsForm/4");
      hideSpinner();
    }, 200);
  };

  const hasInputError =
    showEmptyWarning || fatherNameSpecial || fatherNameDigit || fatherNameSpace;

  return (
    <section
      aria-label="KYC Details — Father or Spouse Name"
      className="pan_details_form"
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            {/* Mobile: back button + title on gray background — matches Declaration (planprocess/1) mobile pattern */}
            <div className="mobile_css">
              <div className="back_cls">
                {rejectStatus !== "R" && (
                  <button
                    type="button"
                    className="figma-card-back"
                    onClick={BackToFour}
                    aria-label="Go back"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 12H19"
                        stroke="#222"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 12L11 18"
                        stroke="#222"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M5 12L11 6"
                        stroke="#222"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                )}
                {rejectStatus === "R" && <div className="back_cls2" />}
                <div>
                  <h5>Details required to finish KYC</h5>
                  <p className="sub_title">It&apos;s a mandatory requirement</p>
                </div>
              </div>
            </div>

            <div className="figma-card">
              {/* Card header — desktop only (mobile uses back_cls above) */}
              <div className="figma-card-header desktop_css">
                <div className="figma-card-title-row">
                  {rejectStatus !== "R" && (
                    <button
                      type="button"
                      className="figma-card-back"
                      onClick={BackToFour}
                      aria-label="Go back"
                    >
                      <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5 12H19"
                          stroke="#222"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 12L11 18"
                          stroke="#222"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M5 12L11 6"
                          stroke="#222"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  )}
                  <div className="figma-card-title-text">
                    <h5>Details required to finish KYC</h5>
                    <p>It&apos;s a mandatory requirement</p>
                  </div>
                </div>
              </div>

              {/* Card body — fields only */}
              <form aria-label="Father or Spouse Name Form" method="post">
                <div className={styles.cardBody}>
                  <div className={styles.cardContent}>
                    {/* Field row: label + input */}
                    <div className={styles.fieldRow}>
                      <label htmlFor="Father" className={styles.fieldLabel}>
                        Father/Spouse Name
                      </label>
                      <div className={styles.fieldInputWrapper}>
                        <input
                          type="text"
                          id="Father"
                          className={`${styles.fieldInput}${hasInputError ? ` ${styles.inputError}` : ""}`}
                          aria-label="Enter Father or Spouse Name"
                          aria-required="true"
                          name="Father"
                          placeholder="Enter Father/Spouse Name"
                          value={fatherName}
                          onChange={checkInput}
                          onBlur={() => updateFatherName(fatherName, "fout")}
                          onPaste={(e) => e.preventDefault()}
                          maxLength={100}
                          onKeyPress={onKeyPress}
                        />
                        {showEmptyWarning && (
                          <span className="red_warning">
                            *Please enter Father/Spouse Name
                          </span>
                        )}
                        {fatherNameSpecial && (
                          <span className="red_warning">
                            *Special character not allowed
                          </span>
                        )}
                        {fatherNameDigit && (
                          <span className="red_warning">
                            *Digit not allowed
                          </span>
                        )}
                        {fatherNameSpace && (
                          <span className="red_warning">
                            *Blank space not allowed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Desktop: Proceed button inside card (pinned to bottom via justify-between) */}
                  <div
                    className={`${styles.proceedRow} ${styles.desktopProceed}`}
                  >
                    <LoadingButton
                      type="button"
                      className={styles.proceedBtn}
                      disabled={isPersonalForm}
                      aria-disabled={isPersonalForm}
                      onClick={PersonalDetailsave}
                    >
                      Proceed
                    </LoadingButton>
                  </div>
                </div>
              </form>
            </div>

          </div>

          {/* Mobile: Proceed pinned to the bottom of the gray background —
              matches Figma (node 0:57726) and the shared .stickybtn pattern
              used by the other KYC steps. Sibling of the column so it spans
              the full width and sits at the bottom rather than under the card. */}
          <div className="stickybtn mobile_css">
            <LoadingButton
              className="btn btn_cls"
              disabled={isPersonalForm}
              onClick={PersonalDetailsave}
            >
              Proceed
            </LoadingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
