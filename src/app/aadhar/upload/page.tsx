import { Suspense } from 'react';
import AadhaarUploadAll from '@/components/upload-aadhaar/AadhaarUploadAll';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Upload Aadhaar | SBI Securities',
  description:
    'Upload the front and back of your Aadhaar card to complete KYC for your SBI Securities NRI account.',
  alternates: { canonical: canonicalUrl('aadhar/upload') },
};

// Route: /aadhar/upload — all-in-one Aadhaar Front + Back upload (passport style).
// Reached from /aadhar. Replaces the old /aadhaar-front + /aadhaar-back pages.

export default function AadhaarUploadPage() {
  return (
    <Suspense fallback={null}>
      <AadhaarUploadAll />
    </Suspense>
  );
}
