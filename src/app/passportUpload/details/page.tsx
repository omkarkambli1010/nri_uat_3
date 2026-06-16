import { Suspense } from 'react';
import PassportDetails from '@/components/passport-upload/PassportDetails';

// Route: /passportUpload/details
// Figma: Onboarding / Passport — Passport Type Selection (node 0:35835)

export default function PassportDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PassportDetails />
    </Suspense>
  );
}
