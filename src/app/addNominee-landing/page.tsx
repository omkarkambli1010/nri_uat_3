import { Suspense } from 'react';
import AddNomineeLanding from '@/components/addNominee-landing/AddNomineeLanding';

export default function AddNomineeLandingPage() {
  return (
    <Suspense fallback={null}>
      <AddNomineeLanding />
    </Suspense>
  );
}
