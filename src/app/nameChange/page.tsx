import { Suspense } from 'react';
import NameChange from '@/components/name-change/NameChange';

export default function NameChangePage() {
  return (
    <Suspense fallback={null}>
      <NameChange />
    </Suspense>
  );
}
