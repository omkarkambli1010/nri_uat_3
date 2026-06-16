import { Suspense } from 'react';
import EmailHomePage from '@/components/email-home-page/EmailHomePage';

export const metadata = {
  title: 'Email ID Verification | SBI Securities',
};

export default function EmailHomePageRoute() {
  return (
    <Suspense fallback={null}>
      <EmailHomePage />
    </Suspense>
  );
}
