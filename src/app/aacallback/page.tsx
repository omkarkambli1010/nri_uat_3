import { Suspense } from 'react';
import AggregatorCallback from '@/components/aggregator-callback/AggregatorCallback';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Account Aggregator Callback | SBI Securities',
  description:
    'Return step from the Account Aggregator consent flow while opening your NRI Demat & Trading Account with SBI Securities.',
  alternates: { canonical: canonicalUrl('aacallback') },
};

export default function AacallbackPage() {
  return (
    <Suspense fallback={null}>
      <AggregatorCallback />
    </Suspense>
  );
}
