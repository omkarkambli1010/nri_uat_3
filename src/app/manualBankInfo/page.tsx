import { Suspense } from 'react';
import ManualBankInfo from '@/components/manual-bankinfo/ManualBankInfo';

export default function ManualBankInfoPage() {
  return (
    <Suspense fallback={null}>
      <ManualBankInfo />
    </Suspense>
  );
}
