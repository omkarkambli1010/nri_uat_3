import { Suspense } from 'react';
import VisaUpload from '@/components/visa/VisaUpload';

// Route: /visa/upload — all-in-one upload + details (manual-bankdetails
// style). Entered from /visa with ?expiry=<iso> pre-filling the expiry field.

export default function VisaUploadPage() {
  return (
    <Suspense fallback={null}>
      <VisaUpload />
    </Suspense>
  );
}
