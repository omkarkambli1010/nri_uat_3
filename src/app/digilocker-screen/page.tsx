import DigilockerScreen from '@/components/digilocker-screen/DigilockerScreen';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

// /digilocker-screen route — equivalent to Angular { path: 'digilocker-screen', component: DigilockerScreenComponent }
export const metadata: Metadata = {
  title: 'DigiLocker Verification | SBI Securities',
  description:
    'Fetch your KYC documents securely through DigiLocker to continue your SBI Securities NRI account opening.',
  alternates: { canonical: canonicalUrl('digilocker-screen') },
};

export default function DigilockerScreenPage() {
  return <DigilockerScreen />;
}
