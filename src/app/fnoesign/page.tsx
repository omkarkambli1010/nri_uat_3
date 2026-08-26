import Fnoesign from '@/components/fnoesign/Fnoesign';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'F&O E-Sign | SBI Securities',
  description:
    'Digitally sign the Futures & Options segment activation request for your SBI Securities account.',
  alternates: { canonical: canonicalUrl('fnoesign') },
};

export default function FnoesignPage() {
  return <Fnoesign />;
}
