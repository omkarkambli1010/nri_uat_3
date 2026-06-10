'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSpinner } from '@/components/spinner/Spinner';
import { toast } from '@/services/toast.service';
import apiService from '@/services/api.service';
import navigationService from '@/services/navigation.service';
import LoadingButton from '@/components/ui/LoadingButton';
import styles from './upload-additional.module.scss';
import { publicPath } from "@/utils/publicPath";

// UploadAdditional — Upload additional document (income proof, address proof, etc.)
// Equivalent to Angular UploadAdditionalComponent

const DOCUMENT_TYPES = [
  { id: 'passportFront', label: 'Passport (Front)' },
  { id: 'passportBack', label: 'Passport (Back)' },
  { id: 'drivingLicenseFront', label: "Driving Licence (Front)" },
  { id: 'drivingLicenseBack', label: "Driving Licence (Back)" },
  { id: 'voterIdFront', label: 'Voter ID (Front)' },
  { id: 'voterIdBack', label: 'Voter ID (Back)' },
  { id: 'utilityBill', label: 'Utility Bill (Electricity / Water / Gas)' },
  { id: 'rentAgreement', label: 'Rent Agreement' },
];

export default function UploadAdditional() {
  const router = useRouter();
  const { show: showSpinner, hide: hideSpinner } = useSpinner();

  const [imagePreview, setImagePreview] = useState('');
  const [imageBase64, setImageBase64] = useState('');
  const [selectedDocType, setSelectedDocType] = useState('');
  const [isProceedDisabled, setIsProceedDisabled] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    navigationService.setRouter(router, hideSpinner);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setImagePreview(base64);
      setImageBase64(base64);
      setIsProceedDisabled(!selectedDocType);
    };
    reader.readAsDataURL(file);
  };

  const selectDocType = (id: string) => {
    setSelectedDocType(id);
    if (imageBase64) setIsProceedDisabled(false);
  };

  const upload = async () => {
    if (!selectedDocType) {
      toast.warning('Please select a document type.', { position: 'bottom-center', autoClose: 2000 });
      return;
    }
    if (!imageBase64) {
      toast.warning('Please upload a document.', { position: 'bottom-center', autoClose: 2000 });
      return;
    }
    showSpinner();
    const reqData = {
      formNumber: typeof window !== 'undefined' ? sessionStorage.getItem('FormNumber') : '',
      flag: 'docBase64String',
      docType: selectedDocType,
      base64String: imageBase64,
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
    <section aria-label="Upload Additional Document" className="pan_details_form">
      <div className="container">
        <div className="row">
          <div className="col-lg-10 col-12 m-auto">
            <div className="mobile_css">
              <div className="back_cls">
                <div className="d-flex flex-column align-items-start gap-2">
                  <h5>Upload Additional Document</h5>
                  <p className="sub_title">Select and upload any one additional document</p>
                </div>
              </div>
            </div>
            <form aria-label="Upload Additional Document Form" method="post">
              <div>
                <div className="col-lg-12 col-md-12 col-12 desktop_css">
                  <div className="d-flex flex-column align-items-start gap-2">
                    <h5>Upload Additional Document</h5>
                    <p className="sub_title">Select and upload any one additional document</p>
                  </div>
                </div>
                <hr className="desktop_css" />

                <div className="my-3">
                  <label className="form-label fw-semibold">Select Document Type</label>
                  <div className="group_btn mt-2">
                    {DOCUMENT_TYPES.map((doc) => (
                      <div
                        key={doc.id}
                        className="square-box p-3"
                        style={{ cursor: 'pointer' }}
                        onClick={() => selectDocType(doc.id)}
                        role="radio"
                        aria-checked={selectedDocType === doc.id}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') selectDocType(doc.id); }}
                      >
                        <div className="pan_details_align">
                          <input
                            type="radio"
                            name="docType"
                            className="form-check-input"
                            checked={selectedDocType === doc.id}
                            onChange={() => selectDocType(doc.id)}
                          />
                          <label className="upload_css" style={{ cursor: 'pointer' }}>{doc.label}</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className="upload_box mt-3"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ cursor: 'pointer', border: '2px dashed #ccc', borderRadius: 8, padding: 24, textAlign: 'center' }}
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview.startsWith('data:image') ? imagePreview : publicPath('/assets/images/diy/pdf-icon.png')}
                      alt="Document preview"
                      style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8 }}
                    />
                  ) : (
                    <div>
                      <img src={publicPath("/assets/images/diy/upload-icon.png")} alt="Upload" />
                      <p>Click to upload document</p>
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
