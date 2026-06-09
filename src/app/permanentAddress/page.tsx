import { Suspense } from 'react';
import PermanentAddressSelect from '@/components/permanent-address/PermanentAddressSelect';

// Route: /permanentAddress
// Screen 1 — Select Address Proof Type + Upload Front modal
// Figma: Onboarding-Mob-PermanentAddress-Noselection-Upload (0:44186)
//        Onboarding-Web-PermanentAddress-Noselection-Upload (0:43680, 0:43914)

export default function PermanentAddressPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddressSelect />
    </Suspense>
  );
}
