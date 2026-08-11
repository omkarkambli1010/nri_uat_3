import { Suspense } from 'react';
import type { Metadata } from 'next';
import FaqNeedHelp from '@/components/faq-need-help/FaqNeedHelp';
import { canonicalUrl, isIndexableEnvironment } from '@/lib/seo';

// Second of the two public pages — see the note in /home/page.tsx.
export const metadata: Metadata = {
  title: 'FAQ & Help | SBI Securities',
  description:
    'Answers to common questions about opening an NRI Demat & Trading Account with SBI Securities — eligibility, documents, charges and account activation.',
  alternates: { canonical: canonicalUrl('faq') },
  robots: isIndexableEnvironment
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      }
    : { index: false, follow: false },
};

export default function FaqPage() {
  return (
    <Suspense fallback={null}>
      <FaqNeedHelp />
    </Suspense>
  );
}
