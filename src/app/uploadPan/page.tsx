import { Suspense } from 'react';
import UploadPan from '@/components/upload-pan/UploadPan';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Upload PAN | SBI Securities',
  description:
    'Upload your PAN card to complete KYC for your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('uploadPan') },
};

export default function UploadPanPage() {
  return (
    <Suspense fallback={null}>
      <UploadPan />
    </Suspense>
  );
}
