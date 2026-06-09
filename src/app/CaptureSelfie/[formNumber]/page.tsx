import { Suspense } from 'react';
import Selfie from '@/components/selfie/Selfie';
import SemiDigitalGuard from '@/components/guards/SemiDigitalGuard';

export default function CaptureSelfie() {
  return (
    <Suspense fallback={null}>
      <SemiDigitalGuard>
        <Selfie />
      </SemiDigitalGuard>
    </Suspense>
  );
}
