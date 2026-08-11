import { Suspense } from 'react';
import UploadSupporting from '@/components/upload-supporting/UploadSupporting';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Supporting Documents | SBI Securities',
  description:
    'Upload the supporting documents needed to verify your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('support-document') },
};

export default function SupportDocumentPage() {
  return (
    <Suspense fallback={null}>
      <UploadSupporting />
    </Suspense>
  );
}
