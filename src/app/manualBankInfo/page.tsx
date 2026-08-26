import { Suspense } from 'react';
import ManualBankInfo from '@/components/manual-bankinfo/ManualBankInfo';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Bank Account Information | SBI Securities',
  description:
    'Review the bank account information linked to your SBI Securities NRI account application.',
  alternates: { canonical: canonicalUrl('manualBankInfo') },
};

export default function ManualBankInfoPage() {
  return (
    <Suspense fallback={null}>
      <ManualBankInfo />
    </Suspense>
  );
}
