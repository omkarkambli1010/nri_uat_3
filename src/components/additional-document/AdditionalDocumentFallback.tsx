'use client';

// Direct-URL fallback wrapper for /additional-document.
//
// AdditionalDocument is normally rendered as a modal overlay inside
// FatcaDocument or OciBack, not as a standalone page. This wrapper renders it
// over a blank page with router.back() as the close handler.
//
// It lives here rather than inside the route file so that
// src/app/additional-document/page.tsx can stay a server component and export
// `metadata` — a "use client" page cannot.

import { useRouter } from 'next/navigation';
import AdditionalDocument from '@/components/additional-document/AdditionalDocument';

export default function AdditionalDocumentFallback() {
  const router = useRouter();
  return (
    <AdditionalDocument
      onClose={() => router.back()}
      onProceed={() => router.push('/additional-document/preview')}
      onSkip={() => router.push('/esign')}
    />
  );
}
