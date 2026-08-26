import Thankyou from '@/components/thankyou/Thankyou';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Thank You | SBI Securities',
  description:
    'Your NRI Demat & Trading Account application has been submitted to SBI Securities.',
  alternates: { canonical: canonicalUrl('thankyou') },
};

export default function ThankyouPage() {
  return <Thankyou />;
}
