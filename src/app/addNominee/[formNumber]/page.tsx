import { Suspense } from 'react';
import type { Metadata } from 'next';
import AddNominee from '@/components/add-nominee/AddNominee';
import { canonicalUrl } from '@/lib/seo';

interface Props {
  params: Promise<{ formNumber: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formNumber } = await params;
  return {
    title: 'Add Nominee | SBI Securities',
    description:
      'Add nominees to your NRI Demat & Trading Account with SBI Securities.',
    alternates: { canonical: canonicalUrl(`addNominee/${formNumber}`) },
  };
}

export default function AddNomineePage() {
  return (
    <Suspense fallback={null}>
      <AddNominee />
    </Suspense>
  );
}
