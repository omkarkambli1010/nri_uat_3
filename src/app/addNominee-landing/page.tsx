import { Suspense } from 'react';
import AddNomineeLanding from '@/components/addNominee-landing/AddNomineeLanding';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Nominee Details | SBI Securities',
  description:
    'Add or skip nominees for your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('addNominee-landing') },
};

export default function AddNomineeLandingPage() {
  return (
    <Suspense fallback={null}>
      <AddNomineeLanding />
    </Suspense>
  );
}
