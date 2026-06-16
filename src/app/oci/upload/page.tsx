import { Suspense } from 'react';
import OciUploadAll from '@/components/oci/OciUploadAll';

// Route: /oci/upload — all-in-one OCI/PIO Front + Back upload (passport style).
// Reached from /oci (the Document Type + Card No. landing page).

export default function OciUploadPage() {
  return (
    <Suspense fallback={null}>
      <OciUploadAll />
    </Suspense>
  );
}
