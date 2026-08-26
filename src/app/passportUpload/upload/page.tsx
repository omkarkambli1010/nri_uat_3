import { Suspense } from 'react';
import PassportUploadAll from '@/components/passport-upload/PassportUploadAll';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Upload Passport | SBI Securities',
  description:
    'Upload the front and back pages of your passport to complete KYC with SBI Securities.',
  alternates: { canonical: canonicalUrl('passportUpload/upload') },
};

// Route: /passportUpload/upload — all-in-one Front + Back upload + details.
// Reached from /passportUpload/details (passes the chosen passport type as
// ?type=<Indian|Foreign Country>).

export default function PassportUploadAllPage() {
  return (
    <Suspense fallback={null}>
      <PassportUploadAll />
    </Suspense>
  );
}
