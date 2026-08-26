import ManualBankDetails from '@/components/manual-bankdetails/ManualBankDetails';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Bank Account Details | SBI Securities',
  description:
    'Link your NRE or NRO bank account to your SBI Securities NRI Demat & Trading Account.',
  alternates: { canonical: canonicalUrl('manual-bankdetails') },
};

export default function ManualBankDetailsPage() {
  return <ManualBankDetails />;
}
