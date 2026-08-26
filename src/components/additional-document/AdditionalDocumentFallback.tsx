'use client';


import { useRouter } from 'next/navigation';
import AdditionalDocument from '@/components/additional-document/AdditionalDocument';

export default function AdditionalDocumentFallback() {
  const router = useRouter();
  return (
    <AdditionalDocument
      onClose={() => router.back()}
      onProceed={() => router.push('/additional-document/preview')}
      onSkip={() => router.push('/esign')}
    />
  );
}
