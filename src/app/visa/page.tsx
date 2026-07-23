import { Suspense } from 'react';
import VisaEntry from '@/components/visa/VisaEntry';

// Route: /visa — merged screen (Figma 0:119049 / 0:119133): visa expiry +
// Front/Back/Additional uploads, submitted together via POST /visa.

export default function VisaPage() {
  return (
    <Suspense fallback={null}>
      <VisaEntry />
    </Suspense>
  );
}
