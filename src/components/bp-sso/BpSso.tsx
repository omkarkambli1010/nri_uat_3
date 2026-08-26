'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DateField from '@/components/date-field/DateField';
import { toast } from '@/services/toast.service';
import { useSpinner } from '@/components/spinner/Spinner';
import apiService from '@/services/api.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './bp-sso.module.scss';
import secureSessionService from '@/services/secure-session.service';

// Convert 'YYYY-MM-DD' string → Date | null  (for Calendar value prop)
const strToDate = (s: string): Date | null => (s ? new Date(s) : null);

// Convert Date | null → 'YYYY-MM-DD' string  (for state / API)
const dateToStr = (d: Date | null | undefined): string => {
  if (!d) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export default function BpSso() {
  const router = useRouter();
  const params = useParams();
  const { hide: hideSpinner } = useSpinner();

  const [pan, setPan] = useState('');
  const [dob, setDob] = useState('');
  const [panError, setPanError] = useState('');
  const [dobError, setDobError] = useState('');
  const [formNumber, setFormNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Branch Partner SSO | SBI Securities';
    const fn = params?.formNumber as string;
    setFormNumber(fn ?? '');
  }, [params]);

  const validatePan = (value: string) => {
    if (!value) return 'PAN is required';
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(value.toUpperCase())) return 'Enter a valid PAN (e.g., ABCDE1234F)';
    return '';
  };

  const validateDob = (value: string) => {
    if (!value) return 'Date of Birth is required';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const panErr = validatePan(pan);
    const dobErr = validateDob(dob);
    setPanError(panErr);
    setDobError(dobErr);
    if (panErr || dobErr) return;

    // In-button loader drives feedback here (no full-screen overlay).
    setSubmitting(true);
    try {
      const response = await apiService.postRequest('api/v1/bp/sso/verify', {
        PAN: pan.toUpperCase(),
        DOB: dob,
        FormNumber: formNumber,
        flag: 'BPSSOVerify',
      }, hideSpinner);

      if (response?.status === true) {
        const data = response.data;
        secureSessionService.setItem('FormNumber', data?.FormNumber ?? formNumber);
        secureSessionService.setItem('clientid', data?.ClientId ?? '');
        secureSessionService.setItem('token', data?.Token ?? '');
        router.push(data?.NextRoute ?? '/home');
      } else {
        toast.error(response?.message ?? 'Verification failed. Please try again.', {
          position: 'bottom-center',
          autoClose: 3500,
        });
      }
    } catch {
      // error handled by apiService
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section aria-label="Branch Partner SSO" className={`pan_details_form ${styles.bpSsoPage}`}>
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <h5>Branch Partner Verification</h5>
              </div>
            </div>
            <div className="col-lg-12 col-md-12 col-12 desktop_css">
              <h5>Branch Partner Verification</h5>
              <p>Please verify your identity to proceed</p>
            </div>
            <hr className="desktop_css" />

            <form onSubmit={handleSubmit} noValidate>
              <div className={styles.formGroup}>
                <label htmlFor="bpPan" className={styles.label}>
                  PAN Number <span className={styles.required}>*</span>
                </label>
                <input
                  id="bpPan"
                  type="text"
                  maxLength={10}
                  value={pan}
                  onChange={(e) => {
                    setPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setPanError('');
                  }}
                  placeholder="Enter PAN (e.g., ABCDE1234F)"
                  className={`${styles.input} ${panError ? styles.inputError : ''}`}
                />
                {panError && <p className={styles.errorText}>{panError}</p>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="bpDob" className={styles.label}>
                  Date of Birth <span className={styles.required}>*</span>
                </label>
                <DateField
                  inputId="bpDob"
                  value={strToDate(dob)}
                  onChange={(d) => { setDob(dateToStr(d)); setDobError(''); }}
                  dateFormat="dd/mm/yy"
                  placeholder="DD/MM/YYYY"
                  showIcon
                  iconPos="right"
                  className={`p-prime-cal p-prime-cal-h48${dobError ? ' p-prime-cal-error' : ''}`}
                />
                {dobError && <p className={styles.errorText}>{dobError}</p>}
              </div>

              <div className={styles.proceedBtn}>
                <LoadingButton type="submit" loading={submitting} className="btn btn_cls">
                  Verify &amp; Proceed
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
 