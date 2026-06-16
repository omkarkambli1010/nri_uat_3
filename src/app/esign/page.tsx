import Esign from '@/components/esign/Esign';
import SemiDigitalGuard from '@/components/guards/SemiDigitalGuard';
import { Suspense } from 'react';

export const metadata = { title: 'E-Sign | SBI Securities' };

export default function EsignPage() {
  return (
    <Suspense fallback={null}>
      <Esign />
    </Suspense>
  );
}
