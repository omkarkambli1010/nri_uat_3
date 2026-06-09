import { Suspense } from 'react';
import AadhaarUploadAll from '@/components/upload-aadhaar/AadhaarUploadAll';

// Route: /aadhar/upload — all-in-one Aadhaar Front + Back upload (passport style).
// Reached from /aadhar. Replaces the old /aadhaar-front + /aadhaar-back pages.

export default function AadhaarUploadPage() {
  return (
    <Suspense fallback={null}>
      <AadhaarUploadAll />
    </Suspense>
  );
}
