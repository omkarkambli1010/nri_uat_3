import { Suspense } from 'react';
import AggregatorCallback from '@/components/aggregator-callback/AggregatorCallback';

export default function AacallbackPage() {
  return (
    <Suspense fallback={null}>
      <AggregatorCallback />
    </Suspense>
  );
}
