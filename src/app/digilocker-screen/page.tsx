import DigilockerScreen from '@/components/digilocker-screen/DigilockerScreen';

// /digilocker-screen route — equivalent to Angular { path: 'digilocker-screen', component: DigilockerScreenComponent }
export const metadata = {
  title: 'Digilocker Screen - Onboarding DIY PWA | SBI Securities',
};

export default function DigilockerScreenPage() {
  return <DigilockerScreen />;
}
