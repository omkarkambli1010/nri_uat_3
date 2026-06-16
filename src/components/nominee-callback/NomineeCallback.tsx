'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import styles from './nominee-callback.module.scss';

// NomineeCallback — Handles callback after nominee e-sign or external verification
// Equivalent to Angular NomineeCallbackComponent

export default function NomineeCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    handleCallback();
  }, []);

  const handleCallback = async () => {
    showSpinner();
    const status = searchParams.get('status') || searchParams.get('Status') || '';
    const formNumber = typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') : '';

    try {
      const reqData = {
        flag: 'nomineeCallbackStatus',
        FormNumber: formNumber,
        status,
      };
      const response = await apiService.postRequestNominee('api/v1/nomineeservice/callback', reqData, hideSpinner);
      if (response?.status === true) {
        toast.success('Nominee details confirmed!', { position: 'bottom-center', autoClose: 2000 });
        setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
      } else {
        toast.error(response?.message || 'Nominee callback failed.', { position: 'bottom-center', autoClose: 3000 });
        hideSpinner();
      }
    } catch { hideSpinner(); }
  };

  return (
    <section aria-label="Processing nominee callback" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 col-12 m-auto text-center" style={{ paddingTop: '10vh' }}>
            <p>Please wait while we verify your nominee details...</p>
          </div>
        </div>
      </div>
    </section>
  );
}
