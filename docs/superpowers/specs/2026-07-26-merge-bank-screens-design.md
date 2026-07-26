# Merge `personalDetailsForm/6` into `manual-bankdetails`

Date: 2026-07-26
Status: approved

## Problem

Bank capture is split across two screens:

| Route | Component | Does |
|---|---|---|
| `personalDetailsForm/6` | `LinkBankAccount` | Pick account type(s): NRO / Non PIS NRE |
| `manual-bankdetails` | `ManualBankDetails` | Per type: statement upload, account no., IFSC |

The first screen's only output is `sessionStorage.SelectedAccountTypes`, which the
second immediately reads back. Two screens, one decision.

Merge them into a single `/manual-bankdetails` screen and drop
`personalDetailsForm/6`, so step 5 leads straight to bank details. This mirrors
the earlier `/oci` + `/oci/upload` and `/visa` + `/visa/upload` merges.

## Prior art

Commit `9569baf "page merging"` already implemented this merge. Commit
`2bfe026 "branch-change"` reverted it while also rewriting `ManualBankDetails`
for other reasons. This design re-applies the merge onto the current file rather
than restoring `9569baf` wholesale, because each version holds work the other
lacks:

- `9569baf` has the merge (`ACCOUNT_TYPES`, `CheckboxOption`, selection state).
- HEAD has the newer `isStageDataLoading` gate and a simplified upload path.

## Design

### Route alias

Navigation in this flow is server-driven: 24 components read
`uiMetadata.route` from the API and push it, and `back-navigation.service.ts`
reads `backStageUrl.route`. The backend still returns `personalDetailsForm/6`
after `PERSONAL_DETAILS5`, and users mid-application have it cached in
`sessionStorage.allowedRoutes`.

A redirect in `next.config.ts` catches every one of those paths at once:

```ts
async redirects() {
  return [{
    source: "/personalDetailsForm/6",
    destination: "/manual-bankdetails",
    permanent: false,
  }];
}
```

Next applies this to client-side `router.push` as well as direct hits. It is
`permanent: false` so it can be removed once the backend stops emitting the old
route.

Rejected: a `resolveRoute()` helper imported into all 24 components — large
churn for a route only `FatherSpouseName` emits, and it would miss cached
`allowedRoutes`.

### Merged screen

`ManualBankDetails` absorbs the selector:

- `ACCOUNT_TYPES`, `CheckIcon` and `CheckboxOption` move over from
  `LinkBankAccount`, along with the checkbox SCSS.
- `selectedAccountTypes` state starts empty and is driven by the checkboxes,
  prefilled from `sessionStorage.SelectedAccountTypes` on a return visit.
- Every toggle mirrors the selection back to `sessionStorage`, because the
  downstream `ManualBankInfo` screen and the stage-data reload both read it.
- Ticking a type reveals that type's section (upload + account no. + IFSC)
  immediately, in the same page. One `Proceed` submits everything.

### Journey handling

`accountType` from `useSessionValue`, matching `LinkBankAccount`:

- **semi-digital** — both options render; user chooses.
- **digital** — NRO forced and persisted, and the group still renders showing
  NRO alone, pre-ticked.

The selector was briefly hidden on the digital journey, on the theory that a
single always-ticked checkbox is a control with no choice in it. That was wrong:
`LinkBankAccount` rendered the group unconditionally, so digital users saw one
pre-ticked NRO checkbox on step 6. Hiding it was a regression against the screen
being merged. Reverted to always render, matching both `LinkBankAccount` and
`9569baf`.

### Back navigation

`goBack` targets `/personalDetailsForm/5`, following `9569baf`. The
`readOnly={isStageDataLocked}` guard from `9569baf` is dropped — HEAD has no
equivalent lock, and inventing one is out of scope.

## Changes

| File | Change |
|---|---|
| `next.config.ts` | add `redirects()` |
| `components/manual-bankdetails/ManualBankDetails.tsx` | absorb selector; `goBack` → step 5 |
| `components/manual-bankdetails/manual-bankdetails.module.scss` | checkbox styles |
| `app/personalDetailsForm/[step]/page.tsx` | drop `'6'` and its import |
| `components/link-bank-account/` | delete |
| `components/penny-drop/PennyDrop.tsx` | push `/manual-bankdetails` |
| `components/rpd/Rpd.tsx` | push `/manual-bankdetails` |
| `components/reverse-penny-drop/ReversePennyDrop.tsx` | push `/manual-bankdetails` |
| `lib/app-routing.ts`, `lib/app-module.ts` | update route/component docs |

`ReversePennyDrop.tsx:457` points at step 5 and is left alone.

## Verification

No test framework: `npm test` names jest, which is not installed and has no
config. Verification is therefore:

1. `npx tsc --noEmit` clean.
2. App boots; `/manual-bankdetails` renders.
3. `/personalDetailsForm/6` redirects rather than 404s.
4. Semi-digital shows both checkboxes; ticking one reveals its section.
5. Digital shows no selector and the NRO section directly.
6. Back from the merged screen lands on step 5.

Steps 4–6 need a session with `accountType` and `ApplicationId` set, so they are
manual checks rather than automated ones.
