import Esign from '@/components/esign/Esign';
import SemiDigitalGuard from '@/components/guards/SemiDigitalGuard';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'E-Sign | SBI Securities',
  description:
    'Digitally sign your NRI Demat & Trading Account application with SBI Securities using Aadhaar e-Sign.',
  alternates: { canonical: canonicalUrl('esign') },
};

export default function EsignPage() {
  return (
    <Suspense fallback={null}>
      <Esign />
    </Suspense>
  );
}
