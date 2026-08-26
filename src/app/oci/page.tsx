import { Suspense } from 'react';
import OciUpload from '@/components/oci/OciUpload';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'OCI Card Upload | SBI Securities',
  description:
    'Upload your Overseas Citizen of India card to complete KYC for your SBI Securities NRI account.',
  alternates: { canonical: canonicalUrl('oci') },
};


export default function OciPage() {
  return (
    <Suspense fallback={null}>
      <OciUpload />
    </Suspense>
  );
}
