import type { Metadata } from 'next';
import BpSso from '@/components/bp-sso/BpSso';
import { canonicalUrl } from '@/lib/seo';

interface Props {
  params: Promise<{ formNumber: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formNumber } = await params;
  return {
    title: 'Branch Partner SSO | SBI Securities',
    description:
      'Branch partner single sign-on for assisted NRI account opening with SBI Securities.',
    alternates: { canonical: canonicalUrl(`bp-sso/${formNumber}`) },
  };
}

export default function BpSsoPage() {
  return <BpSso />;
}
