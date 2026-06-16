'use client';

// Route: /additional-document
// Direct-URL fallback — AdditionalDocument is normally rendered as a modal
// overlay inside FatcaDocument or OciBack, not as a standalone page.
// This wrapper makes it accessible via direct URL by rendering it over
// a blank page with router.back() as the close handler.

import { useRouter } from 'next/navigation';
import { Suspense } from 'react';
import AdditionalDocument from '@/components/additional-document/AdditionalDocument';

function AdditionalDocumentFallback() {
  const router = useRouter();
  return (
    <AdditionalDocument
      onClose={() => router.back()}
      onProceed={() => router.push('/additional-document/preview')}
      onSkip={() => router.push('/esign')}
    />
  );
}

export default function AdditionalDocumentPage() {
  return (
    <Suspense fallback={null}>
      <AdditionalDocumentFallback />
    </Suspense>
  );
}
