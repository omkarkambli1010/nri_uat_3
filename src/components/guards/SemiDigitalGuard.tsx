'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import navigationService from '@/services/navigation.service';

// Redirects semi-digital users away from pages they should never visit.
// Used as a wrapper in page.tsx files for /CaptureSelfie, /uploadSignature, /esign.
export default function SemiDigitalGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (sessionStorage.getItem('accountType') !== 'semi-digital') return;

    navigationService.setRouter(router);
    navigationService.navigateToNextStep();
  }, [router]);

  if (typeof window !== 'undefined' && sessionStorage.getItem('accountType') === 'semi-digital') {
    return null;
  }

  return <>{children}</>;
}
