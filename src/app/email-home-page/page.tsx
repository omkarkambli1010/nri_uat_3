import { Suspense } from 'react';
import EmailHomePage from '@/components/email-home-page/EmailHomePage';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Email ID Verification | SBI Securities',
  description:
    'Verify your email ID to continue opening your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('email-home-page') },
};

export default function EmailHomePageRoute() {
  return (
    <Suspense fallback={null}>
      <EmailHomePage />
    </Suspense>
  );
}
