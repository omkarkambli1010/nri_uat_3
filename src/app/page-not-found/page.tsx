import PageNotFound from '@/components/page-not-found/PageNotFound';
import type { Metadata } from 'next';
import { canonicalUrl } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'Page Not Found | SBI Securities',
  description:
    'The page you are looking for is not available. Return to the SBI Securities NRI account opening journey.',
  alternates: { canonical: canonicalUrl('page-not-found') },
};

export default function PageNotFoundPage() {
  return <PageNotFound />;
}
