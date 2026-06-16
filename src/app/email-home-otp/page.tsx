import { Suspense } from 'react';
import EmailHomeOtpScreen from '@/components/email-home-otp-screen/EmailHomeOtpScreen';

export default function EmailHomeOtpPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomeOtpScreen />
    </Suspense>
  );
}
