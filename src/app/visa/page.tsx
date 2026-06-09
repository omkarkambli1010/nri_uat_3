import { Suspense } from 'react';
import VisaEntry from '@/components/visa/VisaEntry';

// Route: /visa — entry screen (Figma 0:119049 / 0:119133).
// Upload routes to /visa/upload with the picked expiry as a query param.

export default function VisaPage() {
  return (
    <Suspense fallback={null}>
      <VisaEntry />
    </Suspense>
  );
}
