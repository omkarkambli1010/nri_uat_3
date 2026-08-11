import { Suspense } from 'react';
import FatcaDetails from '@/components/fatca/FatcaDetails';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FATCA Details | SBI Securities',
  description:
    'Provide your FATCA and tax residency details as required for your SBI Securities NRI account.',
  alternates: { canonical: canonicalUrl('fatca') },
};

// Route: /fatca
// Figma: Onboarding-Mob-FATCAdetail (0:48387)

export default function FatcaPage() {
  return (
    <Suspense fallback={null}>
      <FatcaDetails />
    </Suspense>
  );
}
