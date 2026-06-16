'use client';

import { createContext, useContext, useState, useCallback } from 'react';
import styles from './spinner.module.scss';
import { publicPath } from "@/utils/publicPath";

// Spinner component — equivalent to Angular NgxSpinner
// Provides global show/hide spinner with context

interface SpinnerContextType {
  show: () => void;
  hide: () => void;
  // Coordination with in-button loaders (LoadingButton): while a button shows
  // its own inline loader the full-screen overlay is suppressed, then it hands
  // back automatically. See the SpinnerProvider comment for the full rationale.
  beginButtonLoading: () => void;
  endButtonLoading: () => void;
}

export const SpinnerContext = createContext<SpinnerContextType>({
  show: () => {},
  hide: () => {},
  beginButtonLoading: () => {},
  endButtonLoading: () => {},
});

export function useSpinner() {
  return useContext(SpinnerContext);
}

export function SpinnerProvider({ children }: { children: React.ReactNode }) {
  // We track what the app *wants* (`wanted`, toggled by show/hide) separately
  // from how many in-button loaders are active (`buttonCount`). The overlay is
  // shown only when something wants it AND no button loader is currently active.
  //
  // Why this hand-off model (instead of swallowing show()): many action
  // handlers call show() up-front and only call hide() AFTER navigation
  // completes (often via setTimeout chains in navigation.service). The button's
  // own promise, however, settles as soon as the API call returns — well before
  // router.push fires. If we simply ended feedback when the button stopped, the
  // user would see the inline loader disappear and then wait, with no spinner,
  // until the page finally changes. By keeping `wanted` true across the whole
  // action, the overlay automatically reappears the moment the inline loader
  // ends and covers that navigation tail until hide() runs post-navigation.
  const [wanted, setWanted] = useState(false);
  const [buttonCount, setButtonCount] = useState(0);

  const show = useCallback(() => setWanted(true), []);
  const hide = useCallback(() => setTimeout(() => setWanted(false), 200), []);

  const beginButtonLoading = useCallback(() => setButtonCount((c) => c + 1), []);
  const endButtonLoading = useCallback(
    () => setButtonCount((c) => Math.max(0, c - 1)),
    []
  );

  const visible = wanted && buttonCount === 0;

  return (
    <SpinnerContext.Provider value={{ show, hide, beginButtonLoading, endButtonLoading }}>
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
 