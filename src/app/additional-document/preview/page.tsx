
import { Suspense } from 'react';
import AdditionalDocumentPreview from '@/components/additional-document/AdditionalDocumentPreview';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Additional Document Preview | SBI Securities',
  description:
    'Review the additional supporting document you uploaded before submitting it to SBI Securities.',
  alternates: { canonical: canonicalUrl('additional-document/preview') },
};

export default function AdditionalDocumentPreviewPage() {
  return (
    <Suspense fallback={null}>
      <AdditionalDocumentPreview />
    </Suspense>
  );
}
