import { Suspense } from 'react';
import UploadPan from '@/components/upload-pan/UploadPan';

export default function UploadPanPage() {
  return (
    <Suspense fallback={null}>
      <UploadPan />
    </Suspense>
  );
}
