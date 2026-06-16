import { Suspense } from 'react';
import UploadSupporting from '@/components/upload-supporting/UploadSupporting';

export default function SupportDocumentPage() {
  return (
    <Suspense fallback={null}>
      <UploadSupporting />
    </Suspense>
  );
}
