import { Suspense } from 'react';
import EmailHomePage from '@/components/email-home-page/EmailHomePage';

export default function EmailHomeTextPage() {
  return (
    <Suspense fallback={null}>
      <EmailHomePage />
    </Suspense>
  );
}
