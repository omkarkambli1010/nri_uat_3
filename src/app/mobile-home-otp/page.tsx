import MobileHomeOtpScreen from '@/components/mobile-home-otp-screen/MobileHomeOtpScreen';

// /mobile-home-otp route — equivalent to Angular { path: 'mobile-home-otp', component: MobileHomeOtpScreenComponent }
export const metadata = {
  title: 'Mobile OTP Verification | SBI Securities',
};

export default function MobileHomeOtpPage() {
  return <MobileHomeOtpScreen />;
}
