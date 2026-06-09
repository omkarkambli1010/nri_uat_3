import { Suspense } from 'react';
import PassportUploadAll from '@/components/passport-upload/PassportUploadAll';

// Route: /passportUpload/upload — all-in-one Front + Back upload + details.
// Reached from /passportUpload/details (passes the chosen passport type as
// ?type=<Indian|Foreign Country>).

export default function PassportUploadAllPage() {
  return (
    <Suspense fallback={null}>
      <PassportUploadAll />
    </Suspense>
  );
}
