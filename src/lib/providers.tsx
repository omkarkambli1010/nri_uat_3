'use client';

import { PrimeReactProvider } from 'primereact/api';
import { Toast } from 'primereact/toast';
import { SpinnerProvider } from '@/components/spinner/Spinner';
import { toastRef } from '@/services/toast.service';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <PrimeReactProvider value={{ ripple: true }}>
      <SpinnerProvider>
        {children}
        <Toast ref={toastRef} position="bottom-center" />
      </SpinnerProvider>
    </PrimeReactProvider>
  );
}
