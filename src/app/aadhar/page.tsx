import { Suspense } from 'react';
import AdhaarCopy from '@/components/adhaar-copy/AdhaarCopy';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Aadhaar Details | SBI Securities',
  description:
    'Provide your Aadhaar details to continue your NRI Demat & Trading Account application with SBI Securities.',
  alternates: { canonical: canonicalUrl('aadhar') },
};

export default function AadharPage() {
  return (
    <Suspense fallback={null}>
      <AdhaarCopy />
    </Suspense>
  );
}
