'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import styles from './rpd.module.scss';
import { publicPath } from "@/utils/publicPath";
// Rpd — Desktop QR code variant of Reverse Penny Drop
// Equivalent to Angular RpdComponent
// Shows UPI QR code, polls for payment status, navigates to reversePennyDrop/2 on success

const PLACEHOLDER_UPI_LINK = 'upi://pay?pa=sample@upi&pn=Sample%20Bank&tn=Verify%20Account&am=1.00';

export default function Rpd() {
  const router = useRouter();
  const params = useParams();
  const formNumber = params?.formNumber as string;
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [upiPayLink, setUpiPayLink] = useState('');
  const [enteredIFSCNumber, setEnteredIFSCNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [rpdData, setRpdData] = useState('');
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [showMismatchModal, setShowMismatchModal] = useState(false);

  const rejectStatus = typeof window !== 'undefined' ? sessionStorage.getItem('RejectStatus') : null;

  const rpdWebHookIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const apiStartRef = useRef<number>(0);
  const remainingTimeRef = useRef<number>(15);
  const requestIDRef = useRef<string>('');
  const apiExecStartRef = useRef<number>(1);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    getUPIMasterDetails();
    return () => {
      if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const getUPIMasterDetails = async () => {
    showSpinner();
    const reqData = {
      flag: 'GetUPIMasterdetls',
      formNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
    };
    try {
      const response = await apiService.postRequest('api/v1/BankDetails/CreateRPDService', reqData, hideSpinner);
      if (
        response?.status === true &&
        response?.message !== 'Bank Account Already Verified' &&
        response?.message !== 'Reverse Penny Drop Limit Exceeded'
      ) {
        const upiList: any[] = response.data || [];
        if (upiList.length > 0) requestIDRef.current = upiList[0].requestId || '';
        const othersBank = upiList.find((b: any) => b.UpiName === 'Others');
        if (othersBank) {
          setUpiPayLink(othersBank.upiLink || '');
          apiStartRef.current = Date.now();
          rpdWebHookIntervalRef.current = setInterval(() => {
            getVerifyBankDetailsStatus('desktop');
          }, 5000);
          startCountdown();
        }
        hideSpinner();
      } else if (response?.message === 'Bank Account Already Verified') {
        toast.success(response.message, { position: 'bottom-center', autoClose: 2500 });
        setTimeout(() => { router.push('/'); hideSpinner(); }, 200);
      } else {
        toast.success(response?.message || '', { position: 'bottom-center', autoClose: 4000 });
        hideSpinner();
      }
    } catch { hideSpinner(); }
  };

  const startCountdown = () => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    remainingTimeRef.current = 15 * 60; // 15 minutes in seconds
    countdownRef.current = setInterval(() => {
      remainingTimeRef.current--;
      setMinutes(Math.floor(remainingTimeRef.current / 60));
      setSeconds(remainingTimeRef.current % 60);
      if (remainingTimeRef.current <= 0) {
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }, 1000);
  };

  const getVerifyBankDetailsStatus = async (flag: string) => {
    if (apiExecStartRef.current !== 1) return;
    apiExecStartRef.current = 0;
    const reqData = {
      flag: 'getrpdewebhookdetls',
      formNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
      request_id: requestIDRef.current,
    };
    try {
      const response = await apiService.postRequest('api/v1/BankDetails/getwehbookrpdDetails', reqData, hideSpinner);
      const apitimeOut = flag !== 'desktop' ? 1000 * 60 : 3000 * 60;
      if (response?.status === true) {
        const d = response.data?.[0];
        if (response.message !== 'Name Mismatch-MiddleRange') {
          if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
          if (typeof window !== 'undefined') sessionStorage.setItem('mode', 'RevPennyDrop');
          setEnteredIFSCNumber(d?.acc_holder_ifsc || '');
          setAccountNumber(d?.acc_number || '');
          setRpdData(d?.bankname_address || '');
          setTimeout(() => { router.push('/'); hideSpinner(); }, 200);
        } else {
          if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
          if (typeof window !== 'undefined') sessionStorage.setItem('mode', 'RevPennyDrop');
          setEnteredIFSCNumber(d?.acc_holder_ifsc || '');
          setAccountNumber(d?.acc_number || '');
          setRpdData(d?.bankname_address || '');
          hideSpinner();
          setShowMismatchModal(true);
        }
      } else if (response?.message === 'Name Mismatch') {
        if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
        toast.error('Oops! This bank account seems to belonging to someone else as per bank record. Please change the bank details to continue.', { position: 'bottom-center', autoClose: 5000 });
        hideSpinner();
      } else {
        const timeElapsed = Date.now() - apiStartRef.current;
        if (timeElapsed > apitimeOut) {
          if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
          toast.error('Please Try Again', { position: 'bottom-center', autoClose: 3000 });
          hideSpinner();
        }
      }
    } catch { hideSpinner(); }
    apiExecStartRef.current = 1;
  };

  const redirectPlanSelection = () => {
    setShowMismatchModal(false);
    showSpinner();
    if (rejectStatus !== 'R') {
      setTimeout(() => { router.push('/planprocess/1'); hideSpinner(); }, 200);
    } else {
      setTimeout(() => { navigationService.navigateToNextStep(); }, 200);
    }
  };

  const backToSix = () => {
    if (rpdWebHookIntervalRef.current) clearInterval(rpdWebHookIntervalRef.current);
    showSpinner();
    setTimeout(() => { router.push('/personalDetailsForm/6'); hideSpinner(); }, 200);
  };

  const padTwo = (n: number) => String(n).padStart(2, '0');
  const displayUpiPayLink = upiPayLink || PLACEHOLDER_UPI_LINK;
  const displayMinutes = upiPayLink ? minutes : 15;
  const displaySeconds = upiPayLink ? seconds : 0;

  return (
    <>
      <section aria-label="Verify Bank Account via UPI QR Code" className="pan_details_form">
        <div className="container">
          <div className="row">
            <div className="col-lg-10 col-md-10 col-12 m-auto">
              <form aria-label="UPI QR Verification Form" method="post">
                <div className="d-flex align-items-start gap-2">
                  {rejectStatus !== 'R' && (
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={backToSix}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') backToSix(); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <span>
                        <svg width="24" height="25" viewBox="0 0 24 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <g clipPath="url(#clip0_rpd_qr)">
                            <path d="M5 12.5H19" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 12.5L11 18.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M5 12.5L11 6.5" stroke="black" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </g>
                          <defs><clipPath id="clip0_rpd_qr"><rect width="24" height="24" fill="white" transform="translate(0 0.5)" /></clipPath></defs>
                        </svg>
                      </span>
                    </div>
                  )}
                  <div>
                    <h5>Verify your bank account</h5>
                    <p className="sub_title">Scan the below QR code using any UPI app to verify your bank account with us</p>
                  </div>
                </div>
                <hr className="desktop_css" />
                <div className="qr_css">
                  <div role="img" aria-label="UPI QR code to verify your bank account">
                    <div style={{ width: 300, height: 300, border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', wordBreak: 'break-all', padding: 8, fontSize: 10 }}>
                      {displayUpiPayLink}
                    </div>
                  </div>
                  <p>{displayMinutes}:{padTwo(displaySeconds)}</p>
                  {!upiPayLink && (
                    <p style={{ marginTop: 12, color: '#555', fontSize: 13 }}>
                      Sample UPI QR code shown for layout completeness. Replace with live UPI QR code once dynamic data is available.
                    </p>
                  )}
                </div>
                <div className="qr_info">
                  <p>Use your bank account details, which matches the name on your PAN CARD</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Name Mismatch Modal */}
      {showMismatchModal && (
        <div className="modal fade show uploadPan" style={{ display: 'block' }} tabIndex={-1} aria-modal="true" aria-labelledby="rpdMismatchLabel">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header d-block" onClick={() => setShowMismatchModal(false)} style={{ cursor: 'pointer' }}>
                <h1 className="modal-title fs-5" id="rpdMismatchLabel"></h1>
                <button type="button" className="btn-horizontal-line" aria-label="Close" onClick={() => setShowMismatchModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="img_preview text-center">
                  <img src={publicPath("/assets/images/diy/invalid-details.png")} alt="Warning: account name mismatch" />
                </div>
                <div className="text-center">
                  <span className="textfont_css">Oops!</span><br />
                  <span>This bank account seems to belonging to someone else as per bank record. Do you still want to continue?</span>
                </div>
              </div>
              <div className="modal-footer flex-nowrap">
                <button type="button" className="btn btn_cls" onClick={() => { setShowMismatchModal(false); hideSpinner(); }}>No</button>
                <button type="button" className="btn btn_cls" onClick={redirectPlanSelection}>Yes</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showMismatchModal && <div className="modal-backdrop fade show"></div>}
    </>
  );
}
