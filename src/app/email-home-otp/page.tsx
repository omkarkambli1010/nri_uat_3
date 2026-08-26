import { Suspense } from 'react';
import EmailHomeOtpScreen from '@/components/email-home-otp-screen/EmailHomeOtpScreen';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Email OTP Verification | SBI Securities',
  description:
    'Enter the one-time password sent to your email to verify it with SBI Securities.',
  alternates: { canonical: canonicalUrl('email-home-otp') },
};

export default function EmailHomeOtpPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomeOtpScreen />
    </Suspense>
  );
}
