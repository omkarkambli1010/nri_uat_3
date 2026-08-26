'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import moengagesdkService from '@/services/moengagesdk.service';
import secureSessionService from '@/services/secure-session.service';

// AggregatorCallback — Handles SSO callback from third-party aggregators
// Equivalent to Angular AggregatorCallbackComponent

export default function AggregatorCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    showSpinner();
    const token = searchParams.get('token') || searchParams.get('Token') || '';
    const refno = searchParams.get('refno') || searchParams.get('Refno') || '';
    const status = searchParams.get('status') || searchParams.get('Status') || '';

    if (!token && !refno) {
      hideSpinner();
      toast.error('Invalid callback parameters.', { position: 'bottom-center', autoClose: 3000 });
      setTimeout(() => router.push('/home'), 2000);
      return;
    }

    try {
      moengagesdkService.MoeInit();
      const reqData = {
        flag: 'AggregatorCallback',
        token,
        refno,
        status,
      };
      const response = await apiService.postRequest('api/v1/aggregator/callback', reqData, hideSpinner);
      if (response?.status === true) {
        if (response.token) {
          secureSessionService.setItem('token', response.token);
        }
        if (response.FormNumber) {
          secureSessionService.setItem('FormNumber', response.FormNumber);
        }
        if (response.mobile) {
          secureSessionService.setItem('mobile', response.mobile);
        }
        const routes: string[] = response.routes ?? [];
        secureSessionService.setItem('allowedRoutes', JSON.stringify(routes));
        const nextRoute = routes[0] ?? '/home';
        setTimeout(() => { router.push(nextRoute); hideSpinner(); }, 200);
      } else {
        toast.error(response?.message || 'Authentication failed.', { position: 'bottom-center', autoClose: 3000 });
        hideSpinner();
        setTimeout(() => router.push('/home'), 2000);
      }
    } catch {
      hideSpinner();
    }
  };

  return (
    <section aria-label="Processing callback" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-8 col-12 m-auto text-center" style={{ paddingTop: '10vh' }}>
            <p>Please wait while we process your request...</p>
          </div>
        </div>
      </div>
    </section>
  );
}
