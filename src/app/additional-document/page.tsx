
import { Suspense } from 'react';
import type { Metadata } from 'next';
import AdditionalDocumentFallback from '@/components/additional-document/AdditionalDocumentFallback';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Additional Document | SBI Securities',
  description:
    'Upload any additional supporting document requested for your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('additional-document') },
};

export default function AdditionalDocumentPage() {
  return (
    <Suspense fallback={null}>
      <AdditionalDocumentFallback />
    </Suspense>
  );
}
