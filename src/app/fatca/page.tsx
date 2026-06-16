import { Suspense } from 'react';
import FatcaDetails from '@/components/fatca/FatcaDetails';

// Route: /fatca
// Figma: Onboarding-Mob-FATCAdetail (0:48387)

export default function FatcaPage() {
  return (
    <Suspense fallback={null}>
      <FatcaDetails />
    </Suspense>
  );
}
