'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './fnoesign.module.scss';
import { publicPath } from "@/utils/publicPath";

export default function Fnoesign() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [esignUrl, setEsignUrl] = useState('');
  const [showIframe, setShowIframe] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [formNumber, setFormNumber] = useState('');

  useEffect(() => {
    document.title = 'FNO E-Sign | SBI Securities';
    const fn = sessionStorage.getItem('ApplicationId') ?? '';
    setFormNumber(fn);
    getFnoEsignData(fn);
  }, []);

  const getFnoEsignData = async (fn: string) => {
    if (!fn) {
      setErrorMsg('Form number not found. Please restart the process.');
      return;
    }
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/masters/get', {
        flag: 'GetFnoEsignPDF',
        FormNumber: fn,
      }, hideSpinner);

      if (response?.status === true && response?.data?.EsignURL) {
        setEsignUrl(response.data.EsignURL);
        setShowIframe(true);
      } else {
        setErrorMsg(response?.message ?? 'Unable to load FNO e-sign document. Please try again.');
      }
    } catch {
      setErrorMsg('An error occurred while loading the FNO e-sign document.');
    } finally {
      hideSpinner();
    }
  };

  const handleIframeMessage = (event: MessageEvent) => {
    if (event.data?.status === 'success') {
      router.push('/fno-thankyou');
    } else if (event.data?.status === 'failure') {
      setErrorMsg('FNO e-sign failed. Please try again.');
      setShowIframe(false);
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleIframeMessage);
    return () => window.removeEventListener('message', handleIframeMessage);
  }, []);

  return (
    <section aria-label="FNO E-Sign Document" className={`pan_details_form ${styles.fnoesignPage}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            {/* Mobile header */}
            <div className="mobile_css">
              <div className="back_cls">
                <h5>FNO E-Sign</h5>
              </div>
            </div>

            {/* Desktop header */}
            <div className="col-lg-12 col-md-12 col-12 desktop_css">
              <div className="d-flex flex-column align-items-start gap-2">
                <h5>FNO E-Sign</h5>
                <p>Please sign your FNO application digitally</p>
              </div>
            </div>

            <hr className="desktop_css" />

            {/* Error state */}
            {errorMsg && (
              <div className={styles.errorState}>
                <Image
                  src={publicPath("/assets/images/diy/invalid_icon.png")}
                  alt="Error"
                  width={80}
                  height={80}
                />
                <p className="mt-3">{errorMsg}</p>
                <LoadingButton
                  type="button"
                  className="btn btn_cls mt-3"
                  onClick={() => getFnoEsignData(formNumber)}
                >
                  Retry
                </LoadingButton>
              </div>
            )}

            {/* E-sign iframe */}
            {showIframe && esignUrl && (
              <div className={styles.iframeContainer}>
                <iframe
                  src={esignUrl}
                  title="FNO E-Sign Document"
                  className={styles.esignFrame}
                  allow="camera; microphone"
                />
              </div>
            )}

            {!showIframe && !errorMsg && (
              <div className={styles.loadingState}>
                <p>Loading FNO e-sign document...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
 