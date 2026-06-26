# Network-Driven Global Loader Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the global loading overlay up until each page's data has loaded and the bound UI has been committed, driven by in-flight network activity, app-wide.

**Architecture:** A framework-agnostic module-level "loader bus" tracks in-flight axios requests via a counter, with a settle window after the last request resolves. Axios interceptors feed the bus; the React `SpinnerProvider` subscribes and shows the overlay while network is active (or a page still manually wants it). Background/polling calls opt out.

**Tech Stack:** Next.js 15, React 19, TypeScript 5.7, axios 1.7. No test framework in repo — verification is build/lint + scripted manual checks.

## Global Constraints

- No new test framework. Verify with `npm run lint` and `npm run build`, plus manual browser checks.
- `SETTLE_MS = 250`, `SAFETY_CAP_MS = 45000`.
- Opt-out marker on axios config: `skipLoader: true`.
- Changes are additive — existing `showSpinner()/hideSpinner()` (`wanted`) keep working; the `buttonCount` coordination in `SpinnerProvider` must be preserved.
- Axios-only coverage; `fetch()`-based loads (file-proxy previews) are intentionally not covered.
- Follow existing code style: 2-space indent, single quotes, no semicolon changes beyond local file convention (match the file being edited).

---

### Task 1: Loader bus module

**Files:**
- Create: `src/services/global-loader.ts`

**Interfaces:**
- Produces:
  - `startRequest(): void` — increment pending; cancel any pending settle/safety timers; emit `active=true` if it just became active.
  - `endRequest(): void` — decrement pending (floored at 0); when it reaches 0, schedule `active=false` after `SETTLE_MS`.
  - `subscribe(listener: (active: boolean) => void): () => void` — register listener, immediately invoke it with the current active state, return an unsubscribe function.

- [ ] **Step 1: Create the module**

```ts
// src/services/global-loader.ts
//
// Framework-agnostic global loading bus. Tracks in-flight (non-background)
// network requests so a UI layer can show one overlay while anything is
// pending. After the last request settles, the loader stays "active" for a
// short SETTLE_MS window so React can commit + paint the bound state before
// the overlay lifts, and so sequential awaited calls don't flicker the loader.

type Listener = (active: boolean) => void;

const SETTLE_MS = 250;
const SAFETY_CAP_MS = 45000;

let pending = 0;
let active = false;
let listeners: Listener[] = [];
let settleTimer: ReturnType<typeof setTimeout> | null = null;
let safetyTimer: ReturnType<typeof setTimeout> | null = null;

function clearSettle(): void {
  if (settleTimer) {
    clearTimeout(settleTimer);
    settleTimer = null;
  }
}

function clearSafety(): void {
  if (safetyTimer) {
    clearTimeout(safetyTimer);
    safetyTimer = null;
  }
}

function emit(): void {
  for (const l of listeners) l(active);
}

function setActive(next: boolean): void {
  if (active === next) return;
  active = next;
  emit();
}

export function startRequest(): void {
  pending += 1;
  clearSettle();
  if (!active) {
    setActive(true);
    // Safety cap: never let a hung request lock the overlay forever.
    clearSafety();
    safetyTimer = setTimeout(() => {
      pending = 0;
      clearSettle();
      setActive(false);
    }, SAFETY_CAP_MS);
  }
}

export function endRequest(): void {
  pending = Math.max(0, pending - 1);
  if (pending === 0) {
    clearSettle();
    settleTimer = setTimeout(() => {
      settleTimer = null;
      if (pending === 0) {
        clearSafety();
        setActive(false);
      }
    }, SETTLE_MS);
  }
}

export function subscribe(listener: Listener): () => void {
  listeners.push(listener);
  listener(active);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
```

- [ ] **Step 2: Type-check the module**

Run: `npx tsc --noEmit`
Expected: no new errors referencing `src/services/global-loader.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/global-loader.ts
git commit -m "feat: add global-loader bus for network-driven overlay"
```

---

### Task 2: Axios interceptors feed the bus

**Files:**
- Modify: `src/services/api.service.ts` (top-level, after the axios import / before the `APIService` class)

**Interfaces:**
- Consumes: `startRequest`, `endRequest` from `./global-loader` (Task 1).
- Produces: balanced start/end on every counted axios request; a `skipLoader` config flag that opts a request out.

**Note on config typing:** axios `InternalAxiosRequestConfig` doesn't include `skipLoader` or `_loaderCounted`. Read them with a local cast (`config as LoaderConfig`) rather than augmenting global axios types, to keep the change contained.

- [ ] **Step 1: Add the interceptor block**

Add near the top of `src/services/api.service.ts`, immediately after the existing `import` lines:

```ts
import { startRequest, endRequest } from './global-loader';

// Network-driven global loader: every axios request (unless it opts out with
// `skipLoader: true`) keeps the global overlay up while in flight. `_loaderCounted`
// marks a request we incremented for, so success/error decrement exactly once.
type LoaderConfig = { skipLoader?: boolean; _loaderCounted?: boolean };

axios.interceptors.request.use(
  (config) => {
    const c = config as typeof config & LoaderConfig;
    if (!c.skipLoader) {
      c._loaderCounted = true;
      startRequest();
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axios.interceptors.response.use(
  (response) => {
    if ((response.config as LoaderConfig)._loaderCounted) endRequest();
    return response;
  },
  (error) => {
    if ((error?.config as LoaderConfig | undefined)?._loaderCounted) endRequest();
    return Promise.reject(error);
  },
);
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no new errors in `src/services/api.service.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/api.service.ts
git commit -m "feat: feed global-loader from axios interceptors"
```

---

### Task 3: SpinnerProvider reflects network activity

**Files:**
- Modify: `src/components/spinner/Spinner.tsx`

**Interfaces:**
- Consumes: `subscribe` from `@/services/global-loader` (Task 1).
- Produces: overlay visible when `(wanted || networkActive) && buttonCount === 0`.

- [ ] **Step 1: Import subscribe and add the effect/state**

Add the import alongside the existing imports:

```tsx
import { useEffect } from 'react';
import { subscribe } from '@/services/global-loader';
```

(Merge `useEffect` into the existing `react` import line — current import is `import { createContext, useContext, useState, useCallback } from 'react';` → add `useEffect`.)

Inside `SpinnerProvider`, after the existing `const [buttonCount, setButtonCount] = useState(0);` line, add:

```tsx
  // Mirror the network-driven loader bus into React state so the overlay
  // stays up while any (non-background) request is in flight + its settle window.
  const [networkActive, setNetworkActive] = useState(false);
  useEffect(() => subscribe(setNetworkActive), []);
```

- [ ] **Step 2: Update the visibility expression**

Change:

```tsx
  const visible = wanted && buttonCount === 0;
```

to:

```tsx
  const visible = (wanted || networkActive) && buttonCount === 0;
```

- [ ] **Step 3: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors in `src/components/spinner/Spinner.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/components/spinner/Spinner.tsx
git commit -m "feat: show global overlay from network-driven loader bus"
```

---

### Task 4: Opt the status pollers out of the overlay

**Files:**
- Modify: `src/services/api.service.ts` (the method used by `getVerifyBankDetailsStatus`)
- Modify: `src/components/reverse-penny-drop/ReversePennyDrop.tsx`
- Modify: `src/components/rpd/Rpd.tsx`

**Interfaces:**
- Consumes: the `skipLoader` axios-config flag (Task 2).
- Produces: the 5-second bank-status poll no longer triggers the global overlay.

- [ ] **Step 1: Find the status-poll API method**

Run: `grep -rn "getVerifyBankDetailsStatus\|bank/rpd/status\|verifyBankDetails" src/services/api.service.ts src/components/reverse-penny-drop/ReversePennyDrop.tsx src/components/rpd/Rpd.tsx`
Expected: identifies the `apiService` method the poll calls and its axios call site.

- [ ] **Step 2: Thread `skipLoader` into the poll request**

In the identified `apiService` status method, add an optional parameter and forward it to the axios config. Example shape (adapt to the real method signature found in Step 1):

```ts
// in api.service.ts — the bank-status method called by the 5s poll
async getBankRpdStatus(/* existing args */, opts?: { skipLoader?: boolean }) {
  const response = await axios.get(url, {
    headers: { /* existing headers */ },
    ...(opts?.skipLoader ? { skipLoader: true } : {}),
  } as AxiosRequestConfig & { skipLoader?: boolean });
  return response.data;
}
```

If the poll calls a generic helper (e.g. `postRequest`/`getRequest`), add the same optional `skipLoader` passthrough there instead, forwarding it onto the axios config.

- [ ] **Step 3: Pass `skipLoader: true` from the poll call sites**

In `ReversePennyDrop.tsx` and `Rpd.tsx`, update the `getVerifyBankDetailsStatus(...)` calls that run inside `setInterval` to pass `{ skipLoader: true }` (matching the param added in Step 2). The initial (non-polled) status check, if any, should keep the loader — only the interval calls opt out.

- [ ] **Step 4: Type-check and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
git add src/services/api.service.ts src/components/reverse-penny-drop/ReversePennyDrop.tsx src/components/rpd/Rpd.tsx
git commit -m "fix: exempt bank-status polling from global loader overlay"
```

---

### Task 5: Build verification + manual smoke checks

**Files:** none (verification only).

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 2: Manual checks (dev server)**

Run: `npm run dev`, then verify in the browser:
- **Prefill page** (e.g. Personal Details / Foreign Address): the overlay stays up from navigation until fields are populated — no flash of empty/half-bound UI.
- **Form submit:** the inline `LoadingButton` loader shows during submit (overlay suppressed via `buttonCount`), then the overlay re-covers the navigation tail until the next page renders.
- **Reverse Penny Drop / RPD:** after the page loads, the overlay does **not** blink every 5 seconds during status polling.
- **Sequential loads:** a page that fires two awaited calls back-to-back shows one continuous overlay (no flicker between them).

- [ ] **Step 3: Commit (if any verification-driven tweaks were needed)**

```bash
git add -A
git commit -m "chore: verify network-driven global loader"
```

---

## Self-Review

**Spec coverage:**
- Loader bus (`global-loader.ts`) with settle window + safety cap → Task 1. ✓
- Axios interceptors with `skipLoader` opt-out + balanced `_loaderCounted` → Task 2. ✓
- `SpinnerProvider` wiring, additive visibility, `buttonCount` preserved → Task 3. ✓
- Poller opt-out (ReversePennyDrop, Rpd) → Task 4. ✓
- Verification (build + manual checks) → Task 5. ✓
- Known limitations (axios-only, fetch not covered, manual show/hide remain) → respected; no task removes manual calls (out of scope). ✓

**Placeholder scan:** Task 4 Steps 2–3 intentionally defer exact signatures to the grep in Step 1 because the real method name must be read from the code; the shape and the required change (`skipLoader` passthrough → axios config; interval calls pass `{ skipLoader: true }`) are fully specified.

**Type consistency:** `startRequest`/`endRequest`/`subscribe` names and signatures are identical across Tasks 1–3. `skipLoader` / `_loaderCounted` flag names are identical across Tasks 2 and 4.
