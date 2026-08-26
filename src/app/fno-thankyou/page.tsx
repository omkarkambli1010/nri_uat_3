import Fnothankyou from '@/components/fnothankyou/Fnothankyou';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'F&O Activation Submitted | SBI Securities',
  description:
    'Your Futures & Options segment activation request has been submitted to SBI Securities.',
  alternates: { canonical: canonicalUrl('fno-thankyou') },
};

export default function FnoThankyouPage() {
  return <Fnothankyou />;
}
