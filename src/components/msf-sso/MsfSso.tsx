'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import styles from './msf-sso.module.scss';

export default function MsfSso() {
  const router = useRouter();
  const params = useParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [statusMsg, setStatusMsg] = useState('Processing your MSF SSO login...');

  useEffect(() => {
    document.title = 'MSF SSO | SBI Securities';
    const refno = params?.refno as string;
    if (refno) {
      handleMsfSso(refno);
    } else {
      setStatusMsg('Invalid reference number. Please try again.');
    }
  }, [params]);

  const handleMsfSso = async (refno: string) => {
    showSpinner();
    try {
      const response = await apiService.postRequestMsf('api/v1/msf/sso', {
        RefNo: refno,
        flag: 'MsfSSO',
      }, hideSpinner);

      if (response?.status === true) {
        const data = response.data;
        sessionStorage.setItem('FormNumber', data?.FormNumber ?? '');
        sessionStorage.setItem('clientid', data?.ClientId ?? '');
        sessionStorage.setItem('token', data?.Token ?? '');

        const nextRoute = data?.NextRoute ?? '/home';
        router.replace(nextRoute);
      } else {
        setStatusMsg(response?.message ?? 'MSF SSO failed. Please try again.');
      }
    } catch {
      setStatusMsg('An error occurred during MSF SSO. Please try again.');
    } finally {
      hideSpinner();
    }
  };

  return (
    <section aria-label="MSF SSO" className={`pan_details_form ${styles.msfSsoPage}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto text-center">
            <div className={styles.loadingWrapper}>
              <div className={styles.spinner} aria-hidden="true" />
              <p className={styles.statusMsg}>{statusMsg}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
