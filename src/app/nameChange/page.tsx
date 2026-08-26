import { Suspense } from 'react';
import NameChange from '@/components/name-change/NameChange';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Name Change | SBI Securities',
  description:
    'Submit proof for a change of name on your NRI Demat & Trading Account application with SBI Securities.',
  alternates: { canonical: canonicalUrl('nameChange') },
};

export default function NameChangePage() {
  return (
    <Suspense fallback={null}>
      <NameChange />
    </Suspense>
  );
}
