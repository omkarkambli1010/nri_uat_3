import { Suspense } from 'react';
import PermanentAddressDetails from '@/components/permanent-address-details/PermanentAddressDetails';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Permanent Address Details | SBI Securities',
  description:
    'Confirm your permanent address details for your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('permanent-address-details') },
};

export default function PermanentAddressDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddressDetails />
    </Suspense>
  );
}
