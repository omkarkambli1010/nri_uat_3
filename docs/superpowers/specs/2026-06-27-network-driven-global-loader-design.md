# Network-Driven Global Loader — Design

**Date:** 2026-06-27
**Status:** Approved (design)

## Problem

Across the app, the full-screen loading overlay is managed manually per page: each
screen calls `showSpinner()` inside an async function and `hideSpinner()` in a
`finally` block the instant the API call resolves. This hides the loader **before**
React commits the bound state (and before any secondary async data — dropdown
masters, document previews, images — is set), so the user briefly sees an empty or
half-bound UI.

`ForeignAddress.tsx` is the only screen that does this "correctly": it shows the
spinner on mount and hides it only once **all** bindings settle (`countryLoading`
false **and** `prefillDone` true, the latter set after awaiting field + document
prefill).

The fix should be **project-wide**, not per page.

## Goal

Keep the global loading overlay up until the data a page depends on has loaded and
the bound UI has been committed — applied uniformly across the whole app with
minimal per-page churn.

## Chosen Approach: Network-Driven Global Loader

Drive the overlay from in-flight network activity. While any (non-background) API
request is pending, the overlay stays up; after the last request settles, a short
**settle window** keeps it up just long enough for React to commit and paint the
bound state before the overlay lifts. This is low-touch (near-zero per-page changes)
and genuinely app-wide because nearly every page binds from awaited API calls.

### Alternatives considered

- **Readiness gate (per-page opt-in):** global overlay auto-shows on route change;
  each page calls `pageReady()` once bound. Most explicit/correct, but touches ~50
  components and needs a safety timeout. Rejected as too invasive.
- **Incremental per-page fix:** apply the `ForeignAddress` discipline to each screen
  individually. Precise but ~50 repetitive edits. Rejected as highest effort.

## Components

### 1. Loader bus — `src/services/global-loader.ts` (new)

Framework-agnostic module-level singleton tracking in-flight requests:

- `startRequest()` / `endRequest()` maintain a `pending` counter.
- `subscribe(listener: (active: boolean) => void): () => void` lets React observe
  active/inactive; returns an unsubscribe function.
- **Settle window:** when `pending` drops to 0, schedule emitting `inactive` after
  `SETTLE_MS` (~250ms). A new `startRequest()` within that window cancels the
  pending-off and keeps the loader active. This (a) bridges the micro-gap between
  sequential awaited calls so the loader doesn't flicker, and (b) gives React a
  window to commit + paint bound state before the overlay lifts.
- **Safety cap:** an optional max-active timer (~45s) forces `inactive` so a hung
  request can't lock the overlay forever.
- Emits the current active state to all listeners on every transition; emits
  immediately on a new subscription so late subscribers sync.

Constants: `SETTLE_MS = 250`, `SAFETY_CAP_MS = 45000`.

### 2. Axios interceptors — in `src/services/api.service.ts`

Registered once at module load on the shared `axios` instance:

- **Request interceptor:** unless the request opts out (see below), call
  `startRequest()` and mark the config (`config._loaderCounted = true`) so
  start/end stay balanced even when other interceptors short-circuit.
- **Response interceptor (success):** if `response.config._loaderCounted`, call
  `endRequest()`.
- **Error interceptor:** if `error.config?._loaderCounted`, call `endRequest()`,
  then re-reject so existing error handling is unchanged.

**Opt-out marker:** a request opts out by setting `skipLoader: true` on its axios
config (checked in the request interceptor). Background/polling calls use this.

### 3. Wire into `SpinnerProvider` — `src/components/spinner/Spinner.tsx`

- Add state `networkActive`, defaulting to false.
- `useEffect(() => subscribe(setNetworkActive), [])` (subscribe returns the
  unsubscribe for cleanup).
- Change visibility from `wanted && buttonCount === 0` to
  `(wanted || networkActive) && buttonCount === 0`.

This is **additive**: existing `showSpinner()/hideSpinner()` (`wanted`) keep working,
and the `buttonCount` coordination is preserved — during a form submit the inline
`LoadingButton` still suppresses the overlay, then the overlay re-covers the
navigation tail once the inline loader ends. No per-page changes needed for the
common case.

### 4. Opt out the pollers

Pass `skipLoader: true` on the 5-second status-poll calls so the overlay doesn't
blink every poll:

- `src/components/reverse-penny-drop/ReversePennyDrop.tsx` — `getVerifyBankDetailsStatus`
- `src/components/rpd/Rpd.tsx` — `getVerifyBankDetailsStatus`

These call through `apiService`; the `skipLoader` flag must thread down to the
underlying axios config for the status request. If the status request goes through a
shared `apiService` method, that method gains an optional `skipLoader` parameter
forwarded to the axios config.

## Known Limitations (accepted for v1)

- **Axios-only.** Secondary data fetched via `fetch()` (e.g. the file-proxy document
  previews in `ForeignAddress`) does not trigger the loader. Those screens already
  manage their own loader, so this is acceptable.
- **"Ready" = network idle + settle**, not a literal render-complete signal. The
  settle window bridges the commit/paint gap; it is a heuristic, not a guarantee.
- **Existing manual `show/hide` calls remain** (now largely redundant but harmless).
  A later cleanup pass can remove them; out of scope here.

## Testing

- **Loader bus unit tests** (`global-loader`): counter increments/decrements;
  `active` stays true across overlapping requests; settle window keeps active across
  a sub-`SETTLE_MS` gap then flips inactive; safety cap forces inactive; subscribe
  emits current state and unsubscribe stops delivery. Use fake timers.
- **Interceptor balance:** a counted request increments on request and decrements on
  both success and error; a `skipLoader` request does neither.
- **Manual verification:** load a prefill page (e.g. Personal Details) — overlay
  stays until fields are bound; submit a form — inline button loader shows, overlay
  re-covers navigation; open RPD — overlay does not blink every 5s.

## Out of Scope

- Removing existing per-page `show/hide` calls.
- Covering `fetch()`-based secondary loads.
- The Document Type dropdown change (separate, already done) and the date-picker
  highlight behavior (no change required).
