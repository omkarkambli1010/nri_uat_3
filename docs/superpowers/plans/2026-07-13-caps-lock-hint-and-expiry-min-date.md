# Caps Lock Hint & Foreign Address Expiry Minimum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a floating "Caps Lock is on" badge beside any focused text field app-wide, and require the Foreign Address "Document Expiry Date" to be at least three months in the future.

**Architecture:** Two independent changes. (1) A single `CapsLockHint` client component mounted once in `AppShell` watches Caps Lock and focus at the document level and portals one badge anchored to the focused field — no feature component is touched, because this codebase has no shared `Input` component (181 raw `<input>` elements across 31 files). (2) `ForeignAddress` computes a `minExpiryDate` of today + 3 months, passes it as `minDate` to both of its `DateField` instances, and rejects earlier typed dates in `validate()`.

**Tech Stack:** Next.js (App Router), React 19 client components, TypeScript, SCSS modules, PrimeReact `Calendar` (wrapped by `src/components/date-field/DateField.tsx`).

**Specs:**
- `docs/superpowers/specs/2026-07-13-caps-lock-hint-design.md`
- `docs/superpowers/specs/2026-07-13-foreign-address-expiry-min-date-design.md`

## Global Constraints

- **No test framework exists.** `npm test` points at jest, but jest is not a dependency and there are no test files. Do NOT add a test framework. Every task is verified by `npx tsc --noEmit`, `npm run lint`, and the manual browser checks written out in the task.
- **Dev server:** `npm run dev` (Next dev server on http://localhost:3000).
- **Caps Lock hint scope:** `<textarea>` and `<input>` of type `text`, `email`, `password`, `search`, `url` (an `<input>` with no `type` attribute counts as `text`). Excluded: disabled, readonly, and digit-only fields (`type="number"`, `type="tel"`, or `inputmode` of `numeric` / `decimal` / `tel`).
- **Badge copy, verbatim:** `Caps Lock is on`.
- **Expiry rule:** `minDate = today + 3 months`, day clamped on month overflow. No upper bound.
- **Expiry error copy pattern, verbatim:** `Document must be valid for at least 3 more months (on or after DD/MM/YYYY)`.
- **Existing expiry error copy is unchanged:** `Please Select Expiry date`.
- Both features must behave identically in the mobile and desktop layouts of `ForeignAddress`, which render the expiry field twice.

---

### Task 1: Global Caps Lock hint

**Files:**
- Create: `src/components/caps-lock-hint/CapsLockHint.tsx`
- Create: `src/components/caps-lock-hint/caps-lock-hint.module.scss`
- Modify: `src/components/app-shell/AppShell.tsx` (import at the top with the other component imports; render inside the returned fragment, right after `<Spinner />` on line 165)

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces: `export default function CapsLockHint(): JSX.Element | null` — takes no props. Nothing else depends on it.

- [ ] **Step 1: Create the component**

Create `src/components/caps-lock-hint/CapsLockHint.tsx` with exactly this content:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './caps-lock-hint.module.scss';

// CapsLockHint — one app-wide "Caps Lock is on" badge.
//
// The app has no shared <Input> component (181 raw <input> elements across 31
// feature files), so rather than touching every call site this watches Caps Lock
// and focus at the document level and floats a single badge above-right of
// whichever eligible field currently has focus.
//
// Caps Lock is only readable from a keyboard/mouse event, so the state starts
// `null` (badge hidden) until the first one arrives. Every route into a field is
// preceded by a click or a Tab, so the state is known by the time a field has
// focus. Touch-only devices have no Caps Lock key, fire no such events, and so
// never show the badge — which is the intended outcome, not a gap.

const TEXTUAL_INPUT_TYPES = new Set(['text', 'email', 'password', 'search', 'url']);
const NUMERIC_INPUT_MODES = new Set(['numeric', 'decimal', 'tel']);

// Gap between the badge and the edge of the field it is anchored to.
const GAP = 6;
// Badge height + gap + clearance for the sticky header. With less room than this
// above the field, the badge flips below it rather than hiding under the header.
const FLIP_THRESHOLD = 64;

type BadgePos = { top: number; right: number; above: boolean };

// Letter-accepting, editable fields only — digit-only fields (OTP boxes, PAN and
// account-number inputs) are skipped, since Caps Lock has no effect there.
function isEligible(el: EventTarget | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return false;
  if (el.disabled || el.readOnly) return false;

  const mode = (el.getAttribute('inputmode') ?? '').toLowerCase();
  if (NUMERIC_INPUT_MODES.has(mode)) return false;

  if (el instanceof HTMLTextAreaElement) return true;

  // An <input> with no type attribute defaults to text.
  const type = (el.getAttribute('type') ?? 'text').toLowerCase();
  return TEXTUAL_INPUT_TYPES.has(type);
}

export default function CapsLockHint() {
  // null = not known yet (no key/mouse event seen). Badge stays hidden.
  const [capsOn, setCapsOn] = useState<boolean | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);
  const [pos, setPos] = useState<BadgePos | null>(null);

  // Caps Lock state — readable from any keyboard or mouse event.
  useEffect(() => {
    const read = (e: Event) => {
      const ev = e as KeyboardEvent | MouseEvent;
      setCapsOn(ev.getModifierState('CapsLock'));
    };
    document.addEventListener('keydown', read, true);
    document.addEventListener('keyup', read, true);
    document.addEventListener('mousedown', read, true);
    return () => {
      document.removeEventListener('keydown', read, true);
      document.removeEventListener('keyup', read, true);
      document.removeEventListener('mousedown', read, true);
    };
  }, []);

  // The focused eligible field, if any.
  useEffect(() => {
    const onFocusIn = (e: FocusEvent) => {
      setTarget(isEligible(e.target) ? e.target : null);
    };
    const onFocusOut = () => setTarget(null);
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  const visible = capsOn === true && target !== null;

  // Anchor the badge to the field and keep it there through scrolling and
  // resizing. Lenis (the smooth-scroll wrapper in AppShell) emits native scroll
  // events, so a plain scroll listener covers smooth scrolling too.
  useEffect(() => {
    if (!visible || !target) {
      setPos(null);
      return;
    }

    const place = () => {
      const rect = target.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setPos(null); // field scrolled out of view
        return;
      }
      const above = rect.top >= FLIP_THRESHOLD;
      setPos({
        top: above ? rect.top - GAP : rect.bottom + GAP,
        right: Math.max(GAP, window.innerWidth - rect.right),
        above,
      });
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [visible, target]);

  // `pos` is only ever set from an effect, so this never portals during SSR.
  if (!visible || !pos) return null;

  return createPortal(
    <div
      className={`${styles.badge} ${pos.above ? styles.above : styles.below}`}
      style={{ top: pos.top, right: pos.right }}
      role="status"
      aria-live="polite"
    >
      <span className={styles.icon} aria-hidden="true">
        ⇪
      </span>
      Caps Lock is on
    </div>,
    document.body,
  );
}
```

- [ ] **Step 2: Create the styles**

Create `src/components/caps-lock-hint/caps-lock-hint.module.scss` with exactly this content:

```scss
// Floating "Caps Lock is on" badge. Positioned from JS (top/right are set
// inline); this file owns only the look and the above/below flip.
//
// z-index sits above page content and the sticky header (2000 in globals.scss)
// but below the global spinner and PrimeReact overlays (both 9999), so it never
// covers a loader or a modal.
.badge {
  position: fixed;
  z-index: 2100;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: 1px solid #e6b800;
  border-radius: 12px;
  background: #fff4d6;
  box-shadow: 0 1px 3px rgb(0 0 0 / 12%);
  color: #6b4e00;
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  pointer-events: none; // never intercept a click meant for the field
}

// `top` is the field's top edge, so shift the badge fully above it.
.above {
  transform: translateY(-100%);
}

// `top` is already below the field — nothing to shift.
.below {
  transform: none;
}

.icon {
  font-size: 13px;
  line-height: 1;
}
```

- [ ] **Step 3: Mount it in AppShell**

In `src/components/app-shell/AppShell.tsx`, add the import below the existing `Spinner` import (line 6):

```tsx
import CapsLockHint from "@/components/caps-lock-hint/CapsLockHint";
```

and render it directly after `<Spinner />` in the returned fragment (line 165):

```tsx
      <Header />
      <Spinner />
      <CapsLockHint />
```

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

Run: `npm run lint`
Expected: no new errors or warnings for `src/components/caps-lock-hint/**` or `AppShell.tsx`.

- [ ] **Step 5: Verify in the browser**

Run: `npm run dev`, then open http://localhost:3000 and navigate to a screen with a text field (e.g. `/personalDetailsForm/5` — Father/Spouse Name).

Check each of these:
1. Caps Lock **on**, then click into the name field → the amber "⇪ Caps Lock is on" badge appears just above the field's top-right corner.
2. With the field still focused, press Caps Lock **off** → the badge disappears immediately.
3. Press Caps Lock **on** again while still focused → the badge reappears.
4. Click outside the field (blur) → the badge disappears.
5. On a screen with two or more text fields (e.g. `/foreignAddress`), Tab between them with Caps Lock on → the badge follows the focused field.
6. On the OTP screen (`/mobile-home-otp`), focus an OTP box with Caps Lock on → **no badge** (those boxes are digit-only).
7. Scroll the page while the badge is visible → it stays anchored to its field, and hides once the field scrolls out of view.
8. Focus a field near the very top of the viewport → the badge flips to *below* the field rather than hiding under the sticky header.

- [ ] **Step 6: Commit**

```bash
git add src/components/caps-lock-hint src/components/app-shell/AppShell.tsx
git commit -m "feat: show a Caps Lock indicator beside the focused text field"
```

---

### Task 2: Foreign Address — Document Expiry Date must be 3+ months out

**Files:**
- Modify: `src/components/foreign-address/ForeignAddress.tsx`
  - line 3 — add `useMemo` to the React import
  - after `dateToStr` (line 28) — add the `addMonthsClamped` helper
  - inside the component, after `const showExpiry = isOvd(docType);` (line 254) — add `minExpiryDate` / `minExpiryStr` / `minExpiryDisplay`
  - lines 397–400 — extend the expiry branch of `validate()`
  - line 705 — add `minDate` to the mobile `DateField`
  - line 934 — add `minDate` to the desktop `DateField`

**Interfaces:**
- Consumes: `DateField` (`src/components/date-field/DateField.tsx`) — already accepts `minDate?: Date` and forwards it to PrimeReact's `Calendar` through `useStableDay`, which caches the reference by calendar day so a fresh `Date` per render will not reformat the input and wipe half-typed text. **`DateField` needs no changes.**
- Produces: nothing consumed by other tasks.

- [ ] **Step 1: Add the month-arithmetic helper**

In `src/components/foreign-address/ForeignAddress.tsx`, insert this immediately after the `dateToStr` helper (which ends on line 28), before the `// ForeignAddress — Enter Foreign Address form` comment block:

```ts
// Start of the day `months` months after `from`, clamping day-of-month overflow.
// Plain JS rolls 30 Nov + 3 months over to 2 Mar (via "30 Feb"); this clamps to
// the last real day of the target month (28 or 29 Feb) instead.
const addMonthsClamped = (from: Date, months: number): Date => {
  const shifted = from.getMonth() + months;
  const year = from.getFullYear() + Math.floor(shifted / 12);
  const month = ((shifted % 12) + 12) % 12;
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(from.getDate(), lastDayOfMonth));
};
```

- [ ] **Step 2: Compute the minimum expiry date in the component**

In the same file, immediately after `const showExpiry = isOvd(docType);` (line 254), add:

```ts
  // Document Expiry Date must be at least 3 months away: every earlier date —
  // including today and every past date — is disabled in the picker and rejected
  // on submit. No upper bound.
  const minExpiryDate = useMemo(() => addMonthsClamped(new Date(), 3), []);
  // Compared as 'YYYY-MM-DD' strings so the check is a plain calendar-day
  // comparison, immune to the UTC-midnight parse in strToDate shifting the day
  // for users in negative UTC offsets.
  const minExpiryStr = dateToStr(minExpiryDate);
  const minExpiryDisplay = minExpiryStr.split('-').reverse().join('/'); // DD/MM/YYYY
```

Then update the React import on line 3 to include `useMemo`:

```ts
import { useState, useEffect, useRef, useMemo } from 'react';
```

- [ ] **Step 3: Reject earlier dates in validate()**

In `validate()`, replace this block (lines 397–400):

```ts
    // Expiry only applies to OVD documents.
    if (showExpiry && !expiryDate) {
      e.expiryDate = 'Please Select Expiry date';
    }
```

with:

```ts
    // Expiry only applies to OVD documents. The picker disables anything before
    // minExpiryDate, but a date can still be typed by hand — so bound it here too.
    if (showExpiry) {
      if (!expiryDate) {
        e.expiryDate = 'Please Select Expiry date';
      } else if (expiryDate < minExpiryStr) {
        e.expiryDate = `Document must be valid for at least 3 more months (on or after ${minExpiryDisplay})`;
      }
    }
```

- [ ] **Step 4: Pass minDate to the mobile DateField**

At the mobile expiry field (line 705), add the `minDate` prop directly after `onChange`:

```tsx
            <DateField
              // Remount when the document type changes so a programmatic expiry
              // reset (e.g. binding PIO/OCI whose reused expiry is empty) is
              // reflected — DateField otherwise ignores a value cleared to null.
              key={`mob-expiry-${docType}`}
              inputId="mob-expiry"
              value={strToDate(expiryDate)}
              onChange={(d) => setExpiryDate(dateToStr(d))}
              minDate={minExpiryDate}
              dateFormat="dd/mm/yy"
              placeholder="DD/MM/YYYY"
              showIcon
              iconPos="right"
              touchUI
              panelClassName="p-prime-cal-sm"
              className="p-prime-cal"
            />
```

- [ ] **Step 5: Pass minDate to the desktop DateField**

At the desktop expiry field (line 934), add the same prop in the same position:

```tsx
                    <DateField
                      // Remount on document-type change so a programmatic expiry
                      // reset (binding PIO/OCI with an empty reused expiry) shows.
                      key={`desk-expiry-${docType}`}
                      inputId="desk-expiry"
                      value={strToDate(expiryDate)}
                      onChange={(d) => setExpiryDate(dateToStr(d))}
                      minDate={minExpiryDate}
                      dateFormat="dd/mm/yy"
                      placeholder="DD/MM/YYYY"
                      showIcon
                      iconPos="right"
                      touchUI
                      panelClassName="p-prime-cal-sm"
                      className="p-prime-cal"
                    />
```

- [ ] **Step 6: Typecheck and lint**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

Run: `npm run lint`
Expected: no new errors or warnings for `ForeignAddress.tsx`.

- [ ] **Step 7: Verify in the browser**

Run: `npm run dev`, open http://localhost:3000/foreignAddress, and select an OVD document type (Passport / PIO / OCI) so the "Document Expiry Date" field appears.

Check each of these:
1. Open the calendar icon → today and every day up to three months out are greyed out; the first selectable day is exactly three months from today. Past dates are not selectable.
2. A date beyond three months (e.g. next year) is selectable, and there is no upper limit — page forward several years and days stay selectable.
3. Type a date one month out and press Proceed → the inline error `Document must be valid for at least 3 more months (on or after DD/MM/YYYY)` appears under the field and Proceed does not navigate.
4. Type a date one year out → accepted; the error clears and Proceed submits.
5. Leave the field empty and press Proceed → the original `Please Select Expiry date` error still appears (unchanged).
6. Repeat checks 1 and 3 in the **desktop** layout (widen the window) — behaviour is identical.
7. Month-end boundary: temporarily set the machine date to 30 November, reload, and confirm the first selectable day is 28 (or 29) February, **not** 2 March. Reset the machine date afterwards.

- [ ] **Step 8: Commit**

```bash
git add src/components/foreign-address/ForeignAddress.tsx
git commit -m "feat: require Foreign Address document expiry to be 3+ months out"
```
