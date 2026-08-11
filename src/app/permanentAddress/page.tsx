import { Suspense } from 'react';
import PermanentAddress from '@/components/permanent-address/PermanentAddress';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Permanent Address | SBI Securities',
  description:
    'Enter your permanent address for your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('permanentAddress') },
};

// Route: /permanentAddress
// Enter Permanent Address — manual form (mirrors /foreignAddress).

export default function PermanentAddressPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddress />
    </Suspense>
  );
}
