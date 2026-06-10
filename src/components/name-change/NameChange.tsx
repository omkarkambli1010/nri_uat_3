'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './name-change.module.scss';
import { useSessionValue } from '@/hooks/useSessionValue';

// NameChange — Upload name change document (gazette/marriage certificate etc.)
// Equivalent to Angular NameChangeComponent

export default function NameChange() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isProceedDisabled, setIsProceedDisabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    getNameChangeData();
  }, []);

  const getNameChangeData = async () => {
    showSpinner();
    const reqData = {
      flag: 'NAMECHANGE',
      formnumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
    };
    try {
      const response = await apiService.postRequest('api/v1/WorkflowDetails/getworkflowdata', reqData, hideSpinner);
      if (response?.status === true && response?.data?.[0]?.Image) {
        setImagePreview(response.data[0].Image);
        setIsProceedDisabled(false);
      }
      hideSpinner();
    } catch { hideSpinner(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      setImageBase64(base64);
      setIsProceedDisabled(false);
    };
    reader.readAsDataURL(file);
  };

  const upload = async () => {
    showSpinner();
    const reqData = {
      formNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
      flag: 'docBase64String',
      docType: 'NAMECHANGE',
      base64String: imageBase64 || imagePreview,
    };
    try {
      const response = await apiService.postRequest('api/v1/uploadDocument/upload', reqData, hideSpinner);
      if (response?.status === true) {
        toast.success('Document uploaded successfully!', { position: 'bottom-center', autoClose: 2000 });
        setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
      } else {
        toast.error(response?.message || 'Upload failed', { position: 'bottom-center', autoClose: 3000 });
        hideSpinner();
      }
    } catch { hideSpinner(); }
  };

  return (
    <section aria-label="Name Change Document" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <div className="d-flex flex-column align-items-start gap-2">
                  <h5>Upload Name Change Proof</h5>
                  <p className="sub_title">Upload gazette notification, marriage certificate or court order</p>
                </div>
              </div>
            </div>
            <form aria-label="Name Change Document Form" method="post">
              <div>
                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <div className="d-flex flex-column align-items-start gap-2">
                    <h5>Upload Name Change Proof</h5>
                    <p className="sub_title">Upload gazette notification, marriage certificate or court order</p>
                  </div>
                </div>
                <hr className="desktop_css" />
                <div
                  className="upload_box"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', border: '2px dashed #ccc', borderRadius: 8, padding: 24, textAlign: 'center' }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Document preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                  ) : (
                    <div>
                      <p>Click to upload name change document</p>
                      <p style={{ fontSize: 12, color: '#999' }}>Supported formats: JPG, PNG, PDF</p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileChange} />
                </div>
              </div>
              <div className="stickybtn_desk desktop_css">
                <LoadingButton className="btn btn_cls" disabled={isProceedDisabled} onClick={upload}>Proceed</LoadingButton>
              </div>
            </form>
          </div>
          <div className="stickybtn mobile_css">
            <LoadingButton className="btn btn_cls" disabled={isProceedDisabled} onClick={upload}>Proceed</LoadingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
