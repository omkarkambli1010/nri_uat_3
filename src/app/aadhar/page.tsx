import { Suspense } from 'react';
import AdhaarCopy from '@/components/adhaar-copy/AdhaarCopy';

export default function AadharPage() {
  return (
    <Suspense fallback={null}>
      <AdhaarCopy />
    </Suspense>
  );
}
