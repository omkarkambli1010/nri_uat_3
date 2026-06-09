'use client';

// Route: /additional-document/preview
// Dedicated preview screen for the file picked in the AdditionalDocument
// modal. The modal itself never shows the cropped preview anymore — it
// always hands off to this route after a successful upload.

import { Suspense } from 'react';
import AdditionalDocumentPreview from '@/components/additional-document/AdditionalDocumentPreview';

export default function AdditionalDocumentPreviewPage() {
  return (
    <Suspense fallback={null}>
      <AdditionalDocumentPreview />
    </Suspense>
  );
}
