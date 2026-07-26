"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSpinner } from "@/components/spinner/Spinner";
import { toast } from "@/services/toast.service";
import apiService from "@/services/api.service";
import navigationService from "@/services/navigation.service";
import LoadingButton from "@/components/ui/LoadingButton";
import styles from "./penny-drop.module.scss";
import { publicPath } from "@/utils/publicPath";
import { useSessionValue } from "@/hooks/useSessionValue";
import { buttonKeyProps } from "@/utils/a11y";

// PennyDrop — Bank account verification via IFSC + account number
// Equivalent to Angular PennyDropComponent (multi-step form)

export default function PennyDrop() {
  const router = useRouter();
  const params = useParams();
  const formNumber = params?.formNumber as string;
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [pennyDropFormOne, setPennyDropFormOne] = useState(false);
  const [pennyDropFormTwo, setPennyDropFormTwo] = useState(false);
  const [filteredBanks, setFilteredBanks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBankName, setSelectedBankName] = useState("");
  const [selectedBankLogo, setSelectedBankLogo] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [reenteredAccountNumber, setReenteredAccountNumber] = useState("");
  const [enteredIFSCNumber, setEnteredIFSCNumber] = useState("");
  const [isBankAccountForm, setIsBankAccountForm] = useState(true);
  const [allBanks, setAllBanks] = useState<any[]>([]);

  const rejectStatus = useSessionValue("RejectStatus");
  const utmSource =
    typeof window !== "undefined"
      ? sessionStorage.getItem("UTMSOURCE") || "NA"
      : "NA";

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    setFormVisibility(formNumber);
  }, [formNumber]);

  const setFormVisibility = (step: string) => {
    setPennyDropFormOne(false);
    setPennyDropFormTwo(false);
    if (step === "1") {
      setPennyDropFormOne(true);
      getBanksList();
    } else if (step === "2") {
      setPennyDropFormTwo(true);
    }
  };

  const getBanksList = async () => {
    showSpinner();
    try {
      const response = await apiService.postRequest(
        "api/v1/masters/get",
        { flag: "BankList" },
        hideSpinner,
      );
      if (response?.status === true && response?.data) {
        setAllBanks(response.data || []);
        setFilteredBanks((response.data || []).slice(0, 4));
      }
    } catch {
      hideSpinner();
    }
  };

  const filterBanks = (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredBanks(allBanks.slice(0, 4));
    } else {
      const filtered = allBanks.filter((b: any) =>
        b.BankName?.toLowerCase().includes(query.toLowerCase()),
      );
      setFilteredBanks(filtered);
    }
  };

  const redirectToFillDetails = (bank: any) => {
    setSelectedBankName(bank.BankName);
    setSelectedBankLogo(bank.BankLogo);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("selectedBankName", bank.BankName);
      sessionStorage.setItem("selectedBankLogo", bank.BankLogo);
      sessionStorage.setItem("selectedBankPrefix", bank.BankPrefix || "");
    }
    setTimeout(() => {
      router.push("/home");
    }, 200);
  };

  const validateAccountForm = () => {
    const valid =
      enteredIFSCNumber.length >= 11 &&
      accountNumber.length >= 9 &&
      accountNumber === reenteredAccountNumber;
    setIsBankAccountForm(!valid);
  };

  const BackToSix = () => {
    showSpinner();
    setTimeout(() => {
      router.push("/manual-bankdetails");
      hideSpinner();
    }, 200);
  };

  const BackToPennyDropOne = () => {
    setTimeout(() => {
      router.push("/home");
    }, 200);
  };

  const verifyBank = async () => {
    showSpinner();
    const reqData = {
      flag: "pennydrop",
      AccountNumber: accountNumber,
      IFSCCode: enteredIFSCNumber,
      FormNumber:
        typeof window !== "undefined"
          ? sessionStorage.getItem("FormNumber")
          : "",
      utm_source: utmSource,
    };
    try {
      const response = await apiService.postRequest(
        "api/v1/bankVerification/verify",
        reqData,
        hideSpinner,
      );
      if (response?.status === true) {
        toast.success("Bank account verified successfully!", {
          position: "bottom-center",
          autoClose: 2000,
        });
        setTimeout(() => {
          router.push("/planprocess/1");
          hideSpinner();
        }, 200);
      } else {
        toast.error(response?.message || "Bank verification failed", {
          position: "bottom-center",
          autoClose: 3000,
        });
        hideSpinner();
      }
    } catch {
      hideSpinner();
    }
  };

  return (
    <>
      {/* Form 1: Choose Bank */}
      {pennyDropFormOne && (
        <section aria-label="Choose Bank Account" className="pan_details_form">
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <div className="mobile_css">
                  <div className="back_cls">
                    <div
                      aria-label="Go back"
                      style={{ cursor: "pointer" }}
                      {...buttonKeyProps(BackToSix)}
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
                            <h5>Choose Bank Account</h5>
                          </div>
                        </div>
                      </div>
                      <p className="sub_title">
                        Make your fund transfer easy by just verifying your
                        Account!
                      </p>
                    </div>
                  </div>
                </div>

                <form method="post" aria-label="Penny Drop Page">
                  <div>
                    <div className="col-lg-12 col-md-12 col-12 desktop_css">
                      <div className="mobile_header_padding">
                        <div className="help_faq_css">
                          <div className="d-flex gap-2">
                            <div
                              aria-label="Go back"
                              style={{ cursor: "pointer" }}
                              {...buttonKeyProps(BackToSix)}
                            >
                              <span aria-hidden="true">
                                <svg
                                  width="24"
                                  height="25"
                                  viewBox="0 0 24 25"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <g clipPath="url(#clip0_pd1)">
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
                                    <clipPath id="clip0_pd1">
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
                              <h5>Choose Bank Account</h5>
                              <p className="sub_title">
                                Make your fund transfer easy by just verifying
                                your Account!
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <hr className="desktop_css" />
                    <div className="search_box">
                      <div>
                        <h6>Search Bank Name</h6>
                      </div>
                      <div>
                        <input
                          type="text"
                          className="form-control bank_search"
                          aria-label="Search Bank Name"
                          name="searchBank"
                          placeholder="Enter bank name"
                          value={searchQuery}
                          onChange={(e) => filterBanks(e.target.value)}
                        />
                      </div>
                    </div>
                    <h5 className="my-3">Popular Banks</h5>
                    {filteredBanks.length > 0 && (
                      <div className="bank_scroll row">
                        {filteredBanks
                          .slice(0, 4)
                          .map((bank: any, i: number) => (
                            <div key={i} className="col-md-6 col-12">
                              <div
                                className="bank_box"
                                aria-label={`Select ${bank.BankName}`}
                                style={{ cursor: "pointer" }}
                                {...buttonKeyProps(() => redirectToFillDetails(bank))}
                              >
                                <img src={bank.BankLogo} alt="" aria-hidden="true" />
                                <p>{bank.BankName}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                    {filteredBanks.length === 0 && searchQuery && (
                      <div className="bank_box">
                        <p>
                          Oops! We could not find the entered bank. Please check
                          the bank name once again.
                        </p>
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Form 2: Enter Bank Details */}
      {pennyDropFormTwo && (
        <section
          aria-label="Enter Bank Account Details"
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
                      {...buttonKeyProps(BackToPennyDropOne)}
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
                            <h5>Enter your Bank Account details</h5>
                          </div>
                        </div>
                      </div>
                      <p className="sub_title">
                        We need these details only to verify that this Bank
                        Account belongs to you
                      </p>
                    </div>
                  </div>
                </div>

                <form
                  aria-label="Enter Bank Account Details Form"
                  method="post"
                >
                  <div className="div">
                    <div className="col-lg-12 col-md-12 col-12 desktop_css">
                      <div className="mobile_header_padding">
                        <div className="help_faq_css">
                          <div className="d-flex gap-2">
                            <div
                              aria-label="Go back"
                              style={{ cursor: "pointer" }}
                              {...buttonKeyProps(BackToPennyDropOne)}
                            >
                              <span aria-hidden="true">
                                <svg
                                  width="24"
                                  height="25"
                                  viewBox="0 0 24 25"
                                  fill="none"
                                  xmlns="http://www.w3.org/2000/svg"
                                >
                                  <g clipPath="url(#clip0_pd2)">
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
                                    <clipPath id="clip0_pd2">
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
                              <h5>Enter your Bank Account details</h5>
                              <p className="sub_title">
                                We need these details only to verify that this
                                Bank Account belongs to you
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <hr className="desktop_css" />
                    <div className="bank_column">
                      <div>
                        {selectedBankName && selectedBankLogo && (
                          <div className="col-md-12 col-12">
                            <div className="bank_box highlight">
                              <img
                                src={selectedBankLogo}
                                alt="Selected Bank Logo"
                              />
                              <p>{selectedBankName}</p>
                            </div>
                          </div>
                        )}
                        <div className="col-lg-12 col-md-12 col-12">
                          <div className="bank_field">
                            <div>
                              <label htmlFor="ifsccode" className="form-label">
                                Enter IFSC Code *
                              </label>
                            </div>
                            <div>
                              <input
                                type="text"
                                className="form-control"
                                id="ifsccode"
                                name="ifsccode"
                                placeholder="Enter IFSC Code"
                                maxLength={11}
                                value={enteredIFSCNumber}
                                onChange={(e) => {
                                  setEnteredIFSCNumber(
                                    e.target.value.toUpperCase(),
                                  );
                                  validateAccountForm();
                                }}
                                onPaste={(e) => e.preventDefault()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-12 col-md-12 col-12">
                          <div className="bank_field">
                            <div>
                              <label htmlFor="accountNo" className="form-label">
                                Enter your Account no. *
                              </label>
                            </div>
                            <div>
                              <input
                                type="password"
                                className="form-control"
                                id="accountNo"
                                name="accountNo"
                                inputMode="numeric"
                                maxLength={25}
                                value={accountNumber}
                                onChange={(e) => {
                                  setAccountNumber(
                                    e.target.value.replace(/\D/g, ""),
                                  );
                                  validateAccountForm();
                                }}
                                onPaste={(e) => e.preventDefault()}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="col-lg-12 col-md-12 col-12">
                          <div className="bank_field">
                            <div>
                              <label
                                htmlFor="renteraccountNo"
                                className="form-label"
                              >
                                Re-enter your Account no. *
                              </label>
                            </div>
                            <div>
                              <input
                                type="text"
                                className="form-control"
                                id="renteraccountNo"
                                name="renteraccountNo"
                                inputMode="numeric"
                                maxLength={25}
                                value={reenteredAccountNumber}
                                onChange={(e) => {
                                  setReenteredAccountNumber(
                                    e.target.value.replace(/\D/g, ""),
                                  );
                                  validateAccountForm();
                                }}
                                onPaste={(e) => e.preventDefault()}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="stickybtn_desk desktop_css">
                        <LoadingButton
                          aria-disabled={isBankAccountForm}
                          disabled={isBankAccountForm}
                          onClick={verifyBank}
                          className="btn btn_cls"
                        >
                          Verify
                        </LoadingButton>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
              <div className="stickybtn mobile_css">
                <LoadingButton
                  aria-disabled={isBankAccountForm}
                  disabled={isBankAccountForm}
                  onClick={verifyBank}
                  className="btn btn_cls"
                >
                  Verify
                </LoadingButton>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
