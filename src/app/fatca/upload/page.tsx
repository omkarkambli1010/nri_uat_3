import { Suspense } from 'react';
import FatcaUpload from '@/components/fatca/FatcaUpload';

// Route: /fatca/upload — one "FATCA TIN Image Upload" section per TIN entered
// on /fatca. Reached from the FATCA details form's "Upload TIN Document" button.

export default function FatcaUploadPage() {
  return (
    <Suspense fallback={null}>
      <FatcaUpload />
    </Suspense>
  );
}
