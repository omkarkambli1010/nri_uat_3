import { Suspense } from 'react';
import FatcaUpload from '@/components/fatca/FatcaUpload';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'FATCA Document Upload | SBI Securities',
  description:
    'Upload your FATCA declaration document to complete this step of your SBI Securities NRI application.',
  alternates: { canonical: canonicalUrl('fatca/upload') },
};

export default function FatcaUploadPage() {
  return (
    <Suspense fallback={null}>
      <FatcaUpload />
    </Suspense>
  );
}
