import { Suspense } from 'react';
import OciUpload from '@/components/oci/OciUpload';

// Route: /oci
// Figma: Onboarding-Mob-OCI/PIO-Upload (0:38489 / 0:38815)
//        Onboarding-Web-OCI/PIO-Upload (0:38576 / 0:38902)

export default function OciPage() {
  return (
    <Suspense fallback={null}>
      <OciUpload />
    </Suspense>
  );
}
