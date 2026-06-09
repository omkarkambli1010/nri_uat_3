'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import styles from './thankyou.module.scss';
import { publicPath } from "@/utils/publicPath";
// Thankyou component — equivalent to Angular ThankyouComponent
// Shows application submission confirmation

export default function Thankyou() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [personalFormOne, setPersonalFormOne] = useState(true);
  const [personalFormTwo, setPersonalFormTwo] = useState(false);
  const [personalFormNumber, setPersonalFormNumber] = useState('');
  const [isFno, setIsFno] = useState(false);
  const [errorValue, setErrorValue] = useState('');
  const [paidPlanText, setPaidPlanText] = useState([{ Paidplantextshow: '' }]);

  useEffect(() => {
    document.title = 'Thank You | SBI Securities';
    const formNumber = sessionStorage.getItem('applicationNumber') ?? '';
    setPersonalFormNumber(formNumber);
    getThankYouData();
  }, []);

  const getThankYouData = async () => {
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/masters/get', {
        flag: 'GetThankyouDetails',
        FormNumber: sessionStorage.getItem('applicationNumber'),
      }, hideSpinner);

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
        setErrorValue(response?.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      hideSpinner();
    }
  };

  const redirectesign = () => {
    showSpinner();
    router.push('/esign');
  };

  const openAggregatorModal = () => {
    const modal = document.getElementById('AggregatorCall');
    if (modal) {
      const bsModal = (window as any).bootstrap?.Modal?.getOrCreateInstance(modal);
      bsModal?.show();
    }
  };

  return (
    <>
      {/* Success State */}
      {personalFormOne && (
        <section aria-label="Application Submitted — Thank You" className={`pan_details_form ${styles.panDetailsForm}`}>
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">

                {!isFno && (
                  <div className={styles.thankyouCard}>
                    <div className={styles.cardHeader}>
                      <h5>Thank You</h5>
                      <p>You can download or track your application status.</p>
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
                        We are verifying your details.<br />
                        Your application is submitted successfully.
                        {paidPlanText[0]?.Paidplantextshow && (
                          <><br /><br />{paidPlanText[0].Paidplantextshow}</>
                        )}
                        <br /><br />
                        Application No. -{' '}
                        <strong>{personalFormNumber}</strong>
                      </p>
                      <a href="#" className={styles.downloadBtn} aria-label="Download Account Opening Form">
                        <i className="bi bi-download fs-5" aria-hidden="true" />
                        Download Account Opening Form
                      </a>
                      <p className={styles.helpText}>
                        Account will be active within 24-48 hours after successful verification.
                        <br /><br />
                        For help, please{' '}
                        <a href="https://www.sbisecurities.in/contact-us" target="_blank" rel="noreferrer" style={{ color: '#280071', fontWeight: 600, textDecoration: 'underline' }}>
                          Contact Us
                        </a>
                      </p>
                      <a href="#" className={styles.trackLink}>
                        Track your application status
                      </a>
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
                      <h5 style={{ paddingTop: '10px' }}>Thank You</h5>
                      <p className="text-center" style={{ paddingTop: '30px' }}>
                        To activate derivatives segment you are just a few steps away. Click on
                        activate derivatives to proceed.
                      </p>
                    </div>
                    <div className={styles.proceedBtn}>
                      <button className="btn btn_cls" onClick={openAggregatorModal}>
                        Activate Derivative
                      </button>
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
        <section aria-label="Application Error" className={`pan_details_form ${styles.panDetailsForm}`}>
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <h5 className="text-center my-3">Thank you</h5>
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
                <button className="btn btn_cls" onClick={redirectesign}>
                  Back to E-Sign
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
