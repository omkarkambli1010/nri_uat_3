import { Suspense } from 'react';
import ForeignAddress from '@/components/foreign-address/ForeignAddress';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Foreign Address | SBI Securities',
  description:
    'Enter your overseas correspondence address for your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('foreignAddress') },
};


export default function ForeignAddressPage() {
  return (
    <Suspense fallback={null}>
      <ForeignAddress />
    </Suspense>
  );
}
