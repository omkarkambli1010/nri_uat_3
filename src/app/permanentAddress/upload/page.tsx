import { Suspense } from 'react';
import PermanentAddressUploadAll from '@/components/permanent-address/PermanentAddressUploadAll';

// Route: /permanentAddress/upload — all-in-one Front + Back address-proof
// upload (passport style). Reached from /permanentAddress. Replaces the old
// /permanentAddress/step-1 page + upload modal.

export default function PermanentAddressUploadPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddressUploadAll />
    </Suspense>
  );
}
