"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type MouseEvent,
} from "react";
import { useSpinner } from "@/components/spinner/Spinner";
import styles from "./loading-button.module.scss";

type LoadingButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /**
   * Controlled loading state. When provided, the parent owns the spinner and
   * the button will NOT auto-manage loading from the onClick promise.
   */
  loading?: boolean;
  /**
   * onClick may be sync or async. When `loading` is uncontrolled and the
   * handler returns a promise, the button shows its spinner until the promise
   * settles, then auto-restores — disabling repeat clicks for the duration.
   */
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void | Promise<unknown>;
};

/**
 * LoadingButton — drop-in replacement for a primary/action `<button>`.
 *
 * Behaviour:
 *  - Spinner renders absolutely on the right of the label, so the button's
 *    width and height never change between normal and loading states.
 *  - Spinner inherits the text colour (currentColor), so it works on solid
 *    (white text) and outline (purple text) buttons without configuration.
 *  - While loading the button is disabled (no repeat clicks) and aria-busy.
 *  - While loading it suppresses the global full-screen overlay (via the
 *    spinner context) so the inline loader and overlay never double up.
 *  - Pass your existing className (e.g. `btn_cls`) — its styling is preserved;
 *    this component only layers the spinner + state transition on top.
 */
const LoadingButton = forwardRef<HTMLButtonElement, LoadingButtonProps>(
  function LoadingButton(
    { loading, disabled, children, className, onClick, type = "button", ...rest },
    ref
  ) {
    const { beginButtonLoading, endButtonLoading } = useSpinner();
    const [autoLoading, setAutoLoading] = useState(false);
    const mountedRef = useRef(true);
    // Tracks whether THIS button currently holds an overlay-suppression so we
    // always release exactly once (on settle or on unmount mid-action).
    const suppressingRef = useRef(false);

    const release = useCallback(() => {
      if (suppressingRef.current) {
        suppressingRef.current = false;
        endButtonLoading();
      }
    }, [endButtonLoading]);

    useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
        release(); // page navigated away mid-action — don't leak suppression
      };
    }, [release]);

    const isControlled = loading !== undefined;
    const isLoading = isControlled ? loading : autoLoading;

    // Controlled mode: mirror the parent's loading flag into overlay suppression.
    useEffect(() => {
      if (!isControlled) return;
      if (loading && !suppressingRef.current) {
        suppressingRef.current = true;
        beginButtonLoading();
      } else if (!loading) {
        release();
      }
    }, [isControlled, loading, beginButtonLoading, release]);

    const handleClick = useCallback(
      (e: MouseEvent<HTMLButtonElement>) => {
        if (isLoading) return;
        const result = onClick?.(e);
        // Auto-manage loading only when uncontrolled and the handler is async.
        if (
          !isControlled &&
          result &&
          typeof (result as Promise<unknown>).then === "function"
        ) {
          setAutoLoading(true);
          // Begin suppression synchronously, in the same event tick, so an
          // overlay triggered by showSpinner() inside the handler never paints.
          suppressingRef.current = true;
          beginButtonLoading();
          Promise.resolve(result).finally(() => {
            release();
            if (mountedRef.current) setAutoLoading(false);
          });
        }
      },
      [isControlled, isLoading, onClick, beginButtonLoading, release]
    );

    const classes = [className, styles.btn, isLoading ? styles.isLoading : ""]
      .filter(Boolean)
      .join(" ");

    return (
      <button
        ref={ref}
        type={type}
        className={classes}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        onClick={handleClick}
        {...rest}
      >
        <span className={styles.content}>
          {/* Mirror spacer: reserves the spinner's width on the left so the
              label stays centred and nothing shifts when loading toggles. */}
          <span className={styles.spacer} aria-hidden="true" />
          <span className={styles.label}>{children}</span>
          <span className={styles.spinner} aria-hidden="true" />
        </span>
      </button>
    );
  }
);

export default LoadingButton;
