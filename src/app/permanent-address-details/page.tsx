import { Suspense } from 'react';
import PermanentAddressDetails from '@/components/permanent-address-details/PermanentAddressDetails';

export default function PermanentAddressDetailsPage() {
  return (
    <Suspense fallback={null}>
      <PermanentAddressDetails />
    </Suspense>
  );
}
