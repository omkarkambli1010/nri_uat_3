import { Suspense } from 'react';
import ForeignAddressUpload from '@/components/foreign-address/ForeignAddressUpload';

// Route: /foreignAddress/upload — Front + Back + Additional document upload for
// the foreign address proof (layout mirrors /oci/upload). Reached from
// /foreignAddress.

export default function ForeignAddressUploadPage() {
  return (
    <Suspense fallback={null}>
      <ForeignAddressUpload />
    </Suspense>
  );
}
