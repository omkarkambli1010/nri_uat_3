import { Suspense } from 'react';
import EmailHomeScreen from '@/components/email-home-screen/EmailHomeScreen';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Email Address | SBI Securities',
  description:
    'Enter your email address to begin opening your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('email') },
};

export default function EmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomeScreen />
    </Suspense>
  );
}
