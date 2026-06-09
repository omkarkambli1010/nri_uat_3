import { Suspense } from 'react';
import ForeignAddress from '@/components/foreign-address/ForeignAddress';

// Route: /foreignAddress
// Figma: Onboarding / Step 12 / Foreign Address - Manual
//   Mobile:  Onboarding-Mob-Foreignaddress (0:42951)
//   Desktop: Onboarding-Web-Foreignaddress (0:43062)

export default function ForeignAddressPage() {
  return (
    <Suspense fallback={null}>
      <ForeignAddress />
    </Suspense>
  );
}
