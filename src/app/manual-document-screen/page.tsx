import { Suspense } from 'react';
import ManualDocumentScreen from '@/components/manual-document-screen/ManualDocumentScreen';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Upload Documents | SBI Securities',
  description:
    'Upload the supporting documents required to complete your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('manual-document-screen') },
};


export default function ManualDocumentScreenPage() {
  return (
    <Suspense fallback={null}>
      <ManualDocumentScreen />
    </Suspense>
  );
}
