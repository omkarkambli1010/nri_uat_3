import { Suspense } from 'react';
import AddNominee from '@/components/add-nominee/AddNominee';

export default function AddNomineePage() {
  return (
    <Suspense fallback={null}>
      <AddNominee />
    </Suspense>
  );
}
