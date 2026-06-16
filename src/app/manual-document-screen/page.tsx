import { Suspense } from 'react';
import ManualDocumentScreen from '@/components/manual-document-screen/ManualDocumentScreen';

// Route: /manual-document-screen — intro screen for the semi-digital (manual)
// document-upload journey (Figma 0:122674 desktop / 0:123006 mobile).
// "Start Uploading" begins the document sequence at the first item (Passport).

export default function ManualDocumentScreenPage() {
  return (
    <Suspense fallback={null}>
      <ManualDocumentScreen />
    </Suspense>
  );
}
