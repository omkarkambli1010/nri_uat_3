import { Suspense } from 'react';
import UploadSignature from '@/components/upload-signature/UploadSignature';
import SemiDigitalGuard from '@/components/guards/SemiDigitalGuard';

export default function UploadSignaturePage() {
  return (
    <Suspense fallback={null}>
      <SemiDigitalGuard>
        <UploadSignature />
      </SemiDigitalGuard>
    </Suspense>
  );
}
