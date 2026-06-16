'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './upload-pan.module.scss';
import { publicPath } from "@/utils/publicPath";
import { useSessionValue } from '@/hooks/useSessionValue';
// UploadPan — Upload PAN card image when name mismatch detected
// Equivalent to Angular UploadPanComponent

export default function UploadPan() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();
  const pathname = usePathname();
  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [isProceedDisabled, setIsProceedDisabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rejectStatus = useSessionValue('RejectStatus');

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
    getPanData();
  }, []);

  const getPanData = async () => {
    showSpinner();
    const reqData = {
      flag: 'PANUPLOAD',
      formnumber: typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') : '',
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

  const uploadPan = async () => {
    if (!imageBase64 && !imagePreview) {
      toast.warning('Please upload a PAN card image.', { position: 'bottom-center', autoClose: 2000 });
      return;
    }
    showSpinner();
    const reqData = {
      formNumber: typeof window !== 'undefined' ? sessionStorage.getItem('ApplicationId') : '',
      flag: 'docBase64String',
      docType: 'PAN',
      base64String: imageBase64 || imagePreview,
    };
    try {
      const response = await apiService.postRequest('api/v1/uploadDocument/upload', reqData, hideSpinner);
      if (response?.status === true) {
        toast.success('PAN uploaded successfully!', { position: 'bottom-center', autoClose: 2000 });
        setTimeout(() => { navigationService.navigateToNextStep(); hideSpinner(); }, 200);
      } else {
        toast.error(response?.message || 'Upload failed', { position: 'bottom-center', autoClose: 3000 });
        hideSpinner();
      }
    } catch { hideSpinner(); }
  };

  const openFaq = () => {
    router.push(`/faq?from=${pathname}`);
  }

  return (
    <section aria-label="Upload PAN Card" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <div className="mobile_header_padding">
                  <div className="help_faq_css">
                    <div className="d-flex flex-column gap-2">
                      <h5>Upload PAN Card</h5>
                    </div>
                    <div>
                      <div className="help_btn" onClick={openFaq} style={{ cursor: 'pointer' }}>Need Help?</div>
                    </div>
                  </div>
                  <p className="sub_title">Upload a clear image of your PAN card</p>
                </div>
              </div>
            </div>

            <form aria-label="Upload PAN Card Form" method="post">
              <div>
                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <div className="mobile_header_padding">
                    <div className="help_faq_css">
                      <div className="heading">
                        <h5>Upload PAN Card</h5>
                        <p className="sub_title">Upload a clear image of your PAN card</p>
                      </div>
                      <div>
                        <div className="help_btn" onClick={openFaq} style={{ cursor: 'pointer' }}>Need Help?</div>
                      </div>
                    </div>
                  </div>
                </div>
                <hr className="desktop_css" />

                <div className="upload_section">
                  <div
                    className="upload_box"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ cursor: 'pointer', border: '2px dashed #ccc', borderRadius: 8, padding: 24, textAlign: 'center' }}
                  >
                    {imagePreview ? (
                      <img src={imagePreview} alt="PAN card preview" style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8 }} />
                    ) : (
                      <div>
                        <img src={publicPath("/assets/images/diy/upload-icon.png")} alt="Upload" />
                        <p>Click to upload your PAN card</p>
                        <p style={{ fontSize: 12, color: '#999' }}>Supported formats: JPG, PNG, PDF</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,application/pdf"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              <div className="stickybtn_desk desktop_css">
                <LoadingButton className="btn btn_cls" disabled={isProceedDisabled} onClick={uploadPan}>Proceed</LoadingButton>
              </div>
            </form>
          </div>
          <div className="stickybtn mobile_css">
            <LoadingButton className="btn btn_cls" disabled={isProceedDisabled} onClick={uploadPan}>Proceed</LoadingButton>
          </div>
        </div>
      </div>
    </section>
  );
}
