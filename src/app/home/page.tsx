import { Suspense } from 'react';
import type { Metadata } from 'next';
import HomeComponent from '@/components/home/HomeComponent';
import { canonicalUrl, isIndexableEnvironment } from '@/lib/seo';

// The root layout defaults every route to noindex (this is a KYC funnel). /home
// is one of the two public pages, so it opts back in here — but only on the
// production host, so UAT never competes with prod in the index.
export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl('home') },
  robots: isIndexableEnvironment
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      }
    : { index: false, follow: false },
  openGraph: {
    title: 'Open Demat Account | SBI Securities',
    description:
      'Open a free Demat & Trading Account in minutes with SBI Securities.',
    type: 'website',
    url: canonicalUrl('home'),
  },
};

// /home route — equivalent to Angular { path: 'home', component: HomeComponent }
export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomeComponent />
    </Suspense>
  );
}
