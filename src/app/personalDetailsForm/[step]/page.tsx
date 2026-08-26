import type { Metadata } from 'next';
import { Suspense } from 'react';
import MaritalStatus from '@/components/marital-status/MaritalStatus'
import PersonalDetailsForm from '@/components/personal-details-form/PersonalDetailsForm';
import TradingExp from '@/components/trading-exp/TradingExp';
import AnnualIncome from '@/components/annual-income/AnnualIncome';
import OccupDetails from '@/components/occup-details/OccupDetails';
import FatherSpouseName from '@/components/father-spouse-name/FatherSpouseName';
import { canonicalUrl } from '@/lib/seo';
interface Props {
  params: Promise<{ step: string }>;
}

const STEP_META: Record<string, { title: string; description: string }> = {
  '0': {
    title: 'Marital Status',
    description:
      'Provide your marital status for your NRI Demat & Trading Account application with SBI Securities.',
  },
  '1': {
    title: 'Personal Details',
    description:
      'Enter your personal details to continue opening your NRI account with SBI Securities.',
  },
  '2': {
    title: 'Trading Experience',
    description:
      'Tell us about your trading experience to complete your SBI Securities NRI account profile.',
  },
  '3': {
    title: 'Annual Income',
    description:
      'Declare your annual income range for your SBI Securities NRI account application.',
  },
  '4': {
    title: 'Occupation Details',
    description:
      'Provide your occupation details for your NRI Demat & Trading Account with SBI Securities.',
  },
  '5': {
    title: 'Father / Spouse Name',
    description:
      "Enter your father's or spouse's name to complete your SBI Securities NRI account application.",
  },
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { step } = await params;
  const meta = STEP_META[step];
  return {
    title: meta ? `${meta.title} | SBI Securities` : 'SBI Securities',
    ...(meta ? { description: meta.description } : {}),
    alternates: { canonical: canonicalUrl(`personalDetailsForm/${step}`) },
  };
}

export default async function PersonalDetailsFormPage({ params }: Props) {
  const { step } = await params;

  const componentMap: Record<string, React.ReactNode> = {
    '0': <MaritalStatus/>,
    '1': <PersonalDetailsForm />,
    '2': <TradingExp />,
    '3': <AnnualIncome />,
    '4': <OccupDetails />,
    '5': <FatherSpouseName />,
  };

  return (
    <Suspense fallback={null}>
      {componentMap[step] ?? null}
    </Suspense>
  );
}
