import { Suspense } from 'react';
import PermanentAddress from '@/components/permanent-address/PermanentAddress';

// Route: /permanentAddress
// Enter Permanent Address — manual form (mirrors /foreignAddress).

export default function PermanentAddressPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddress />
    </Suspense>
  );
}
