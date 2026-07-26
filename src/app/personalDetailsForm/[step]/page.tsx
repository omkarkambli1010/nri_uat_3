import { Suspense } from 'react';
import MaritalStatus from '@/components/marital-status/MaritalStatus'
import PersonalDetailsForm from '@/components/personal-details-form/PersonalDetailsForm';
import TradingExp from '@/components/trading-exp/TradingExp';
import AnnualIncome from '@/components/annual-income/AnnualIncome';
import OccupDetails from '@/components/occup-details/OccupDetails';
import FatherSpouseName from '@/components/father-spouse-name/FatherSpouseName';

// Dynamic step routing for /personalDetailsForm/[step]
// Step 1: Marital Status, 2: Trading Exp, 3: Annual Income, 4: Occupation, 5: Father/Spouse Name
// Step 6 (Link Bank Account) was merged into /manual-bankdetails.

interface Props {
  params: Promise<{ step: string }>;
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
