'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import aesService from '@/services/aes.service';
import styles from './fnothankyou.module.scss';
import { publicPath } from "@/utils/publicPath";

export default function Fnothankyou() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [personalFormOne, setPersonalFormOne] = useState(true);
  const [personalFormTwo, setPersonalFormTwo] = useState(false);
  const [personalFormNumber, setPersonalFormNumber] = useState('');
  const [errorValue, setErrorValue] = useState('');

  const clientid =
    typeof window !== 'undefined' ? sessionStorage.getItem('clientid') ?? '' : '';

  useEffect(() => {
    document.title = 'FNO Thank You | SBI Securities';
    const formNumber = sessionStorage.getItem('FormNumber') ?? '';
    setPersonalFormNumber(formNumber);
    getFnoThankYouData();
  }, []);

  const getFnoThankYouData = async () => {
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/masters/get', {
        flag: 'GetFnoThankyouDetails',
        FormNumber: sessionStorage.getItem('FormNumber'),
      }, hideSpinner);

      if (response?.status === true) {
        setPersonalFormOne(true);
        setPersonalFormTwo(false);
      } else {
        setPersonalFormOne(false);
        setPersonalFormTwo(true);
        setErrorValue(response?.message ?? 'Something went wrong. Please try again.');
      }
    } catch {
      hideSpinner();
    } finally {
      hideSpinner();
    }
  };

  const redirectEsign = () => {
    showSpinner();
    router.push('/fnoesign');
  };

  return (
    <>
      {/* Success State */}
      {personalFormOne && (
        <section aria-label="FNO Application Submitted — Thank You" className={`pan_details_form ${styles.panDetailsForm}`}>
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <div className="mobile_css">
                  <div className="back_cls">
                    <h5>Thank You</h5>
                  </div>
                </div>

                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <div className="d-flex flex-column align-items-start gap-2">
                    <h5>Thank You</h5>
                  </div>
                </div>

                <hr className="desktop_css" />

                <div className="text-center">
                  <Image
                    src={publicPath("/assets/images/diy/Featured_tick.png")}
                    alt="FNO Verified successfully"
                    width={80}
                    height={80}
                  />
                  <p className="my-2">
                    Your FNO application has been successfully submitted for verification
                  </p>
                  <div className="text-center my-4">
                    <Image
                      src={publicPath("/assets/images/diy/thank-you-screen.png")}
                      alt="FNO Application submitted"
                      width={280}
                      height={200}
                      style={{ width: '100%', maxWidth: 280, height: 'auto' }}
                    />
                    <div className="review_section">
                      <div className="d-flex text-center flex-column gap-1">
                        <h5>Your FNO Application No. is</h5>
                        <h2 className={styles.appNumber}>{personalFormNumber}</h2>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-center">
                  Your FNO account will be activated within 48 hours
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {personalFormTwo && (
        <section aria-label="FNO Application Error" className={`pan_details_form ${styles.panDetailsForm}`}>
          <div className="container">
            <div className="row">
              <div className="col-lg-10 col-12 m-auto">
                <h5 className="text-center my-3">Thank you</h5>
                <div className="text-center">
                  <Image
                    src={publicPath("/assets/images/diy/invalid_icon.png")}
                    alt="Error Icon"
                    width={80}
                    height={80}
                  />
                  <p className="my-2">{errorValue}</p>
                </div>
              </div>
              <div className={styles.btnAlign}>
                <button className="btn btn_cls" onClick={redirectEsign}>
                  Back to FNO E-Sign
                </button>
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
