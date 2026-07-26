import { Suspense } from 'react';
import OciUpload from '@/components/oci/OciUpload';

// Route: /oci — merged screen: Document Type + Card No. details plus the
// Front/Back OCI/PIO uploads, submitted together via poi-oci/upload.

export default function OciPage() {
  return (
    <Suspense fallback={null}>
      <OciUpload />
    </Suspense>
  );
}
