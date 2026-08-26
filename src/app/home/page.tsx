import { Suspense } from 'react';
import type { Metadata } from 'next';
import HomeComponent from '@/components/home/HomeComponent';
import { canonicalUrl, isIndexableEnvironment } from '@/lib/seo';

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
