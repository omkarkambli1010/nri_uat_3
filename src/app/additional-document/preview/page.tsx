// Route: /additional-document/preview
// Dedicated preview screen for the file picked in the AdditionalDocument
// modal. The modal itself never shows the cropped preview anymore — it
// always hands off to this route after a successful upload.
//
// Kept as a server component so it can export `metadata`; the imported
// AdditionalDocumentPreview carries its own 'use client'.

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
