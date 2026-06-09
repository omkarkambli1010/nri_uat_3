import { Suspense } from 'react';
import UploadProcess from '@/components/upload-process/UploadProcess';

export default function UploadProcessPage() {
  return (
    <Suspense fallback={null}>
      <UploadProcess />
    </Suspense>
  );
}
