'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import styles from './nominee-optout.module.scss';
import { publicPath } from "@/utils/publicPath";

// NomineeOptout — Confirmation screen for nominee opt-out
// Equivalent to Angular NomineeOptoutComponent

export default function NomineeOptout() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const [agreed, setAgreed] = useState(false);

  const confirmOptOut = async () => {
    if (!agreed) {
      toast.warning('Please check the checkbox to confirm opt-out.', { position: 'bottom-center', autoClose: 2000 });
      return;
    }
    showSpinner();
    const reqData = {
      FormNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
      flag: 'nomineeoptout',
      nominees: [],
    };
    try {
      const response = await apiService.postRequestNominee('api/v1/nomineeservice/savenominee', reqData, hideSpinner);
      if (response?.status === true) {
        toast.success('Nominee opt-out confirmed.', { position: 'bottom-center', autoClose: 2000 });
        setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
      } else {
        toast.error(response?.message || 'Error confirming opt-out.', { position: 'bottom-center', autoClose: 3000 });
        hideSpinner();
      }
    } catch { hideSpinner(); }
  };

  const backToNominee = () => {
    showSpinner();
    setTimeout(() => { router.push('/nominee'); hideSpinner(); }, 200);
  };

  return (
    <section aria-label="Nominee Opt-Out Confirmation" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <div onClick={backToNominee} style={{ cursor: 'pointer' }}>
                  <img src={publicPath("/assets/images/diy/ChevronLeft.png")} alt="" aria-hidden="true" /> Back
                </div>
                <div className="d-flex flex-column align-items-start gap-2">
                  <h5>Nominee Opt-Out</h5>
                </div>
              </div>
            </div>
            <div className="col-lg-12 col-md-12 col-12 desktop_css">
              <div className="d-flex align-items-start gap-2">
                <div onClick={backToNominee} style={{ cursor: 'pointer' }}>
                  <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <g clipPath="url(#clip0_optout)">
                      <path d="M5 12.5H19" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12.5L11 18.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M5 12.5L11 6.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <defs><clipPath id="clip0_optout"><rect width="24" height="24" fill="white" transform="translate(0 0.5)" /></clipPath></defs>
                  </svg>
                </div>
                <h5>Nominee Opt-Out</h5>
              </div>
            </div>
            <hr className="desktop_css" />

            <div className="mobile_section">
              <div className="review_section mb-4">
                <p style={{ fontSize: 14 }}>
                  By opting out, you confirm that you do not wish to nominate any person for your Demat account at this time.
                  You may add a nominee later by visiting your account settings.
                </p>
              </div>

              <div className="form-check mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="confirmOptOut"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="confirmOptOut" style={{ fontSize: 14 }}>
                  I confirm that I do not wish to add a nominee to my Demat account.
                </label>
              </div>
            </div>

            <div className="stickybtn_desk desktop_css">
              <button className="btn btn_cls" disabled={!agreed} onClick={confirmOptOut}>Confirm Opt-Out</button>
            </div>
          </div>
          <div className="stickybtn mobile_css">
            <button className="btn btn_cls" disabled={!agreed} onClick={confirmOptOut}>Confirm Opt-Out</button>
          </div>
        </div>
      </div>
    </section>
  );
}
