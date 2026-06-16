import { Suspense } from 'react';
import EmailHomeScreen from '@/components/email-home-screen/EmailHomeScreen';

export default function EmailPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomeScreen />
    </Suspense>
  );
}
