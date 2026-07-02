import { useEffect, useRef } from "react";

/**
 * Shared stack of currently-active trap containers. When dialogs are stacked
 * (e.g. a camera or cropper modal opens on top of an upload modal that stays
 * mounted behind it), only the TOP-most trap should respond to Tab / Escape —
 * otherwise the traps fight over focus. Newest active trap is last.
 */
const trapStack: HTMLElement[] = [];

/**
 * Focus management for custom (non-Bootstrap) modal dialogs — implements the
 * WAI-ARIA dialog pattern so a keyboard / screen-reader user is never stranded:
 *
 *  - On open, focus moves into the dialog (first focusable element, or the
 *    dialog container itself as a fallback).                     — WCAG 2.4.3
 *  - Tab / Shift+Tab are trapped so focus can't escape to the page behind the
 *    modal while it's open.                                      — WCAG 2.1.2
 *  - Escape closes the dialog.                                   — WAI-ARIA APG
 *  - On close, focus is restored to whatever was focused before it opened
 *    (usually the trigger button).                               — WCAG 2.4.3
 *
 * Usage:
 *   const dialogRef = useFocusTrap<HTMLDivElement>(isOpen, close);
 *   ...
 *   {isOpen && (
 *     <div ref={dialogRef} role="dialog" aria-modal="true" tabIndex={-1} ...>
 *
 * Give the dialog container `tabIndex={-1}` so the fallback focus target works
 * even when the dialog has no focusable children yet.
 *
 * `onClose` is read through a ref, so passing a fresh inline arrow each render
 * will NOT re-run the trap (which would otherwise yank focus back to the first
 * element on every keystroke). Only the `active` flag drives setup/teardown.
 */
export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose?: () => void,
) {
  const ref = useRef<T>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    // Remember the trigger so we can hand focus back on close.
    const previouslyFocused = document.activeElement as HTMLElement | null;

    trapStack.push(node);
    const isTopmost = () => trapStack[trapStack.length - 1] === node;

    const getFocusable = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea:not([disabled]), ' +
            'input:not([disabled]), select:not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"])',
        ),
        // Skip elements hidden via display:none (offsetParent === null).
      ).filter((el) => el.offsetParent !== null);

    // Move focus into the dialog.
    const initial = getFocusable();
    (initial[0] ?? node).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      // Only the front-most stacked dialog reacts.
      if (!isTopmost()) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;

      const items = getFocusable();
      if (items.length === 0) {
        // Nothing tabbable — keep focus on the container.
        e.preventDefault();
        node.focus();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const activeEl = document.activeElement;

      if (e.shiftKey) {
        if (activeEl === first || !node.contains(activeEl)) {
          e.preventDefault();
          last.focus();
        }
      } else if (activeEl === last || !node.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    // Capture phase so we intercept Tab before it moves focus.
    document.addEventListener("keydown", onKeyDown, true);

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      const idx = trapStack.indexOf(node);
      if (idx !== -1) trapStack.splice(idx, 1);

      // Restore focus to the trigger — but only if focus is still inside this
      // dialog (or was lost to <body>). If a newer/other modal has already
      // claimed focus, leave it alone so we don't steal it back.
      const activeEl = document.activeElement;
      const focusStillHere =
        !activeEl || activeEl === document.body || node.contains(activeEl);
      if (
        focusStillHere &&
        previouslyFocused &&
        document.contains(previouslyFocused)
      ) {
        previouslyFocused.focus();
      }
    };
  }, [active]);

  return ref;
}
