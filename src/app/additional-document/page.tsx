// Route: /additional-document
// Direct-URL fallback — AdditionalDocument is normally rendered as a modal
// overlay inside FatcaDocument or OciBack, not as a standalone page.
// The AdditionalDocumentFallback wrapper makes it accessible via direct URL.
//
// Kept as a server component so it can export `metadata`; the router-driven
// wrapper it renders carries its own 'use client'.

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
