import { Suspense } from 'react';
import PermanentAddressUpload from '@/components/permanent-address/PermanentAddressUpload';

// Route: /permanentAddress/upload — Front + Back + Additional document upload for
// the permanent address proof (layout mirrors /foreignAddress/upload). Reached
// from /permanentAddress.

export default function PermanentAddressUploadPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddressUpload />
    </Suspense>
  );
}
