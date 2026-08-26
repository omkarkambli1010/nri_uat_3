import type { Metadata } from 'next';
import { Suspense } from 'react';
import Declaration from '@/components/declaration/Declaration';
import PlanPreference from '@/components/plan-preference/PlanPreference';
import SegmentPreference from '@/components/segment-preference/SegmentPreference';
import { canonicalUrl } from '@/lib/seo';

interface Props {
  params: Promise<{ step: string }>;
}

const STEP_META: Record<string, { title: string; description: string }> = {
  '1': {
    title: 'Declaration',
    description:
      'Review and accept the declarations for your NRI Demat & Trading Account with SBI Securities.',
  },
  '2': {
    title: 'Plan Selection',
    description:
      'Choose the brokerage plan that suits your investment and trading needs with SBI Securities.',
  },
  '3': {
    title: 'Segment Preference',
    description:
      'Select the trading segments to activate on your SBI Securities NRI account.',
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  const meta = STEP_META[step];
  return {
    title: meta ? `${meta.title} | SBI Securities` : 'SBI Securities',
    ...(meta ? { description: meta.description } : {}),
    alternates: { canonical: canonicalUrl(`planprocess/${step}`) },
  };
}

export default async function PlanProcessPage({ params }: Props) {
  const { step } = await params;

  const componentMap: Record<string, React.ReactNode> = {
    '1': <Declaration />,
    '2': <PlanPreference />,
    '3': <SegmentPreference />,
  };

  return (
    <Suspense fallback={null}>
      {componentMap[step] ?? null}
    </Suspense>
  );
}
