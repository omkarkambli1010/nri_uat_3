import { Suspense } from 'react';
import Declaration from '@/components/declaration/Declaration';
import PlanPreference from '@/components/plan-preference/PlanPreference';
import SegmentPreference from '@/components/segment-preference/SegmentPreference';

// Dynamic step routing for /planprocess/[step]
// Step 1: Declaration, Step 2: Plan Preference, Step 3: Segment Preference

interface Props {
  params: Promise<{ step: string }>;
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
