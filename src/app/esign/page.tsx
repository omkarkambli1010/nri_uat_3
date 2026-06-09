import Esign from '@/components/esign/Esign';
import SemiDigitalGuard from '@/components/guards/SemiDigitalGuard';

export const metadata = { title: 'E-Sign | SBI Securities' };

export default function EsignPage() {
  return (
    <SemiDigitalGuard>
      <Esign />
    </SemiDigitalGuard>
  );
}
