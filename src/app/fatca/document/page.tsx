import { Suspense } from 'react';
import FatcaDocument from '@/components/fatca/FatcaDocument';

// Route: /fatca/document
// Figma: Onboarding-Mob-Document-OCIfront-Uploaded (0:47385)

export default function FatcaDocumentPage() {
  return (
    <Suspense fallback={null}>
      <FatcaDocument />
    </Suspense>
  );
}
