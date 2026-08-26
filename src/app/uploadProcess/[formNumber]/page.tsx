import { Suspense } from 'react';
import type { Metadata } from 'next';
import UploadProcess from '@/components/upload-process/UploadProcess';
import { canonicalUrl } from '@/lib/seo';

interface Props {
  params: Promise<{ formNumber: string }>;
}

// Dynamic route, so the canonical is resolved per form number rather than
// hardcoded. Noindex is inherited from the root layout.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { formNumber } = await params;
  return {
    title: 'Document Upload | SBI Securities',
    description:
      'Upload the documents required to complete your NRI Demat & Trading Account application with SBI Securities.',
    alternates: { canonical: canonicalUrl(`uploadProcess/${formNumber}`) },
  };
}

export default function UploadProcessPage() {
  return (
    <Suspense fallback={null}>
      <UploadProcess />
    </Suspense>
  );
}
