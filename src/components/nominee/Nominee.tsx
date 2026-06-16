'use client';

import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import styles from './nominee.module.scss';
import { publicPath } from "@/utils/publicPath";
// Nominee — Nominee option selection screen (add or opt-out)
// Equivalent to Angular NomineeComponent

export default function Nominee() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const formNumber = typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') ?? '' : '';

  const goToAddNominee = () => {
    showSpinner();
    setTimeout(() => { router.push(`/addNominee/${formNumber}`); hideSpinner(); }, 200);
  };

  const goToOptOut = () => {
    showSpinner();
    setTimeout(() => { router.push('/nominee-optout'); hideSpinner(); }, 200);
  };

  return (
    <section aria-label="Nominee Options" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <div className="d-flex flex-column align-items-start gap-2">
                  <h5>Nominee Details</h5>
                  <p className="sub_title">Would you like to add a nominee to your account?</p>
                </div>
              </div>
            </div>
            <div className="col-lg-12 col-md-12 col-12 desktop_css">
              <div className="d-flex flex-column align-items-start gap-2">
                <h5>Nominee Details</h5>
                <p className="sub_title">Would you like to add a nominee to your account?</p>
              </div>
            </div>
            <hr className="desktop_css" />

            <div className="mobile_section">
              <div className="group_btn">
                <div
                  className="square-box p-3"
                  onClick={goToAddNominee}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToAddNominee(); }}
                >
                  <div className="pan_details_align">
                    <img src={publicPath("/assets/images/diy/nominee-icon.png")} alt="" width={40} aria-hidden="true" />
                    <div className="upload_css">
                      <h5>Add Nominee</h5>
                      <p className="sub_title">Add up to 3 nominees for your Demat account</p>
                    </div>
                  </div>
                </div>

                <div
                  className="square-box p-3"
                  onClick={goToOptOut}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') goToOptOut(); }}
                >
                  <div className="pan_details_align">
                    <img src={publicPath("/assets/images/diy/addressprooficon-1.png")} alt="" width={40} aria-hidden="true" />
                    <div className="upload_css">
                      <h5>Skip / Opt-Out</h5>
                      <p className="sub_title">Continue without adding a nominee</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
