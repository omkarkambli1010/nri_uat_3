import { Suspense } from 'react';
import FatcaDocument from '@/components/fatca/FatcaDocument';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FATCA Document | SBI Securities',
  description:
    'Submit the supporting document for your FATCA declaration with SBI Securities.',
  alternates: { canonical: canonicalUrl('fatca/document') },
};

// Route: /fatca/document
// Figma: Onboarding-Mob-Document-OCIfront-Uploaded (0:47385)

export default function FatcaDocumentPage() {
  return (
    <Suspense fallback={null}>
      <FatcaDocument />
    </Suspense>
  );
}
