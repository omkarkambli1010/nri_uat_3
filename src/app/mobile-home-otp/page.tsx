import MobileHomeOtpScreen from '@/components/mobile-home-otp-screen/MobileHomeOtpScreen';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Mobile OTP Verification | SBI Securities',
  description:
    'Enter the one-time password sent to your mobile number to verify it with SBI Securities.',
  alternates: { canonical: canonicalUrl('mobile-home-otp') },
};

export default function MobileHomeOtpPage() {
  return <MobileHomeOtpScreen />;
}
