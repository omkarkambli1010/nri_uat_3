'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import styles from './spinner.module.scss';
import { publicPath } from "@/utils/publicPath";

// Spinner component — equivalent to Angular NgxSpinner
// Provides global show/hide spinner with context

interface SpinnerContextType {
  show: () => void;
  hide: () => void;
}

export const SpinnerContext = createContext<SpinnerContextType>({
  show: () => {},
  hide: () => {},
});

export function useSpinner() {
  return useContext(SpinnerContext);
}

export function SpinnerProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setTimeout(() => setVisible(false), 200), []);

  return (
    <SpinnerContext.Provider value={{ show, hide }}>
      {children}
      {visible && (
        <div className={styles.spinnerOverlay} aria-live="polite" role="status" aria-busy="true">
          <div className={styles.brandLoader} aria-hidden="true">
            <img
              src={publicPath("/assets/images/sbi-securities-logo.png")}
              alt=""
              className={styles.brandLogo}
            />
            <div className={styles.progressTrack}>
              <span className={styles.progressBar}></span>
            </div>
          </div>
          <p className={styles.spinnerText}>Please Wait</p>
        </div>
      )}
    </SpinnerContext.Provider>
  );
}

// Default export for use in AppShell (renders nothing — SpinnerProvider wraps the app)
export default function Spinner() {
  return null;
}
