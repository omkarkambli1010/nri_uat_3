import type { KeyboardEvent } from 'react';

// Accessibility helpers shared across components.

/**
 * Makes a non-button element (e.g. a styled `<div>`/`<span>` that can't become a
 * real `<button>` without breaking existing layout) behave like a button for
 * keyboard users: it becomes focusable and activates on Enter/Space — satisfying
 * WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value).
 *
 * Prefer a real `<button>` when the styling allows it; reach for this only to
 * retrofit an existing clickable element without a visual regression. Remember
 * to also give icon-only controls an `aria-label`.
 *
 * @example
 *   <div className="back_cls" aria-label="Go back" {...buttonKeyProps(goBack)} />
 */
export function buttonKeyProps(onActivate: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault(); // stop Space from scrolling the page
        onActivate();
      }
    },
  };
}
