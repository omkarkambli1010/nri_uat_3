import { Suspense } from 'react';
import FaqNeedHelp from '@/components/faq-need-help/FaqNeedHelp';

export const metadata = { title: 'FAQ & Help | SBI Securities' };

export default function FaqPage() {
  return (
    <Suspense fallback={null}>
      <FaqNeedHelp />
    </Suspense>
  );
}
