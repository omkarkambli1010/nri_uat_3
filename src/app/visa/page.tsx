import { Suspense } from 'react';
import VisaEntry from '@/components/visa/VisaEntry';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Visa Details | SBI Securities',
  description:
    'Provide your visa details to complete your NRI Demat & Trading Account application with SBI Securities.',
  alternates: { canonical: canonicalUrl('visa') },
};

// Route: /visa — merged screen (Figma 0:119049 / 0:119133): visa expiry +
// Front/Back/Additional uploads, submitted together via POST /visa.

export default function VisaPage() {
  return (
    <Suspense fallback={null}>
      <VisaEntry />
    </Suspense>
  );
}
