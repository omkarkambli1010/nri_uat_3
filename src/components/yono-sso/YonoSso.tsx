'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import styles from './yono-sso.module.scss';

export default function YonoSso() {
  const router = useRouter();
  const params = useParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [statusMsg, setStatusMsg] = useState('Processing your YONO SSO login...');

  useEffect(() => {
    document.title = 'YONO SSO | SBI Securities';
    const refno = params?.refno as string;
    if (refno) {
      handleYonoSso(refno);
    } else {
      setStatusMsg('Invalid reference number. Please try again.');
    }
  }, [params]);

  const handleYonoSso = async (refno: string) => {
    showSpinner();
    try {
      const response = await apiService.postRequest('api/v1/yono/sso', {
        RefNo: refno,
        flag: 'YonoSSO',
      }, hideSpinner);

      if (response?.status === true) {
        const data = response.data;
        sessionStorage.setItem('FormNumber', data?.FormNumber ?? '');
        sessionStorage.setItem('clientid', data?.ClientId ?? '');
        sessionStorage.setItem('token', data?.Token ?? '');

        const nextRoute = data?.NextRoute ?? '/home';
        router.replace(nextRoute);
      } else {
        setStatusMsg(response?.message ?? 'YONO SSO failed. Please try again.');
      }
    } catch {
      setStatusMsg('An error occurred during YONO SSO. Please try again.');
    } finally {
      hideSpinner();
    }
  };

  return (
    <section aria-label="YONO SSO" className={`pan_details_form ${styles.yonoSsoPage}`}>
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
