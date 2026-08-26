import { Suspense } from 'react';
import EmailHomePage from '@/components/email-home-page/EmailHomePage';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Email Verification | SBI Securities',
  description:
    'Confirm your email address to proceed with your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('email-home-textpage') },
};

export default function EmailHomeTextPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomePage />
    </Suspense>
  );
}
