import { Suspense } from 'react';
import PassportDetails from '@/components/passport-upload/PassportDetails';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Passport Details | SBI Securities',
  description:
    'Enter your passport details for your NRI Demat & Trading Account application with SBI Securities.',
  alternates: { canonical: canonicalUrl('passportUpload/details') },
};

// Route: /passportUpload/details
// Figma: Onboarding / Passport — Passport Type Selection (node 0:35835)

export default function PassportDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PassportDetails />
    </Suspense>
  );
}
