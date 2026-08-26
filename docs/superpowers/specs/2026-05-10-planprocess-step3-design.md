# Design: planprocess/2 → planprocess/3 Plan Value Handoff

**Date:** 2026-05-10  
**Branch:** feature/dummy-flow  
**Status:** Approved

---

## Problem

When the user clicks "Proceed" on `planprocess/2` (Plan Selection), the selected plan index is not passed to `planprocess/3` (Segment Preference). The step-3 component hardcodes "ProZERO" as the plan name and uses Figma-hosted image URLs that expire in 7 days.

---

## Scope

Two files change:

| File | Change |
|------|--------|
| `src/components/plan-preference/PlanPreference.tsx` | Write selected index to secureSessionService before navigating |
| `src/components/segment-preference/SegmentPreference.tsx` | Read index from secureSessionService, render plan name/icon dynamically |

---

## Design

### 1. planprocess/2 — pass selected plan

In `proceedWithPlan()`, add one line before `router.push`:

```ts
secureSessionService.setItem('selectedPlan', String(selectedIndex));
router.push('/planprocess/3');
```

Both the mobile "Selected" tab button and the desktop "Proceed" card button already route through `proceedWithPlan()` after updating `selectedIndex`, so both paths are covered with no further changes.

### 2. planprocess/3 — receive and display selected plan

**State passing mechanism:** secureSessionService key `selectedPlan` (integer string, defaulting to `1` if absent).

**Constants to add at file top:**

```ts
const PLAN_NAMES = ['Basic', 'Special', 'Premium'];
const PLAN_ICONS = [
  '/assets/plan-icons/plan-icon-basic.svg',
  '/assets/plan-icons/plan-icon-special.svg',
  '/assets/plan-icons/plan-icon-premium.svg',
];
```

**State:**

```ts
const [selectedIndex, setSelectedIndex] = useState<number>(() => {
  const stored = typeof window !== 'undefined'
    ? secureSessionService.getItem('selectedPlan')
    : null;
  return stored !== null ? parseInt(stored, 10) : 1;
});
```

**Template changes:**
- Replace `PROZERO_LOGO_MOB` and `PROZERO_LOGO_DESK` image sources with `PLAN_ICONS[selectedIndex]`
- Replace hardcoded `"ProZERO"` text with `PLAN_NAMES[selectedIndex]`
- Remove the two expiring Figma URL constants

**No changes needed to:**
- "Change" button — already navigates to `/planprocess/2`
- "Proceed" button — already navigates to `/CaptureSelfie/1`
- `CHECK_ICON` constant — generic checkmark, not plan-specific

### 3. Mobile segment row — border styling (Figma match)

The Figma mobile design shows the "Equity & MutualFund" row inside a bordered box:

```
border: 1px solid rgba(62, 63, 80, 0.3)
border-radius: 8px
padding: 16px
```

Apply this to the `sp-seg-row-mob` class in `segment-preference.module.scss`.

Desktop segment row has no border per Figma — existing style is already correct.

---

## State flow

```
planprocess/2
  └─ user selects plan (index 0/1/2)
  └─ clicks Proceed
  └─ secureSessionService.setItem('selectedPlan', String(selectedIndex))
  └─ router.push('/planprocess/3')

planprocess/3
  └─ reads secureSessionService.getItem('selectedPlan') → defaults to 1
  └─ renders PLAN_NAMES[index] and PLAN_ICONS[index]
  └─ "Change" → router.push('/planprocess/2')
  └─ "Proceed" → router.push('/CaptureSelfie/1')
```

---

## Out of scope

- No shared constants module (YAGNI — only 2 consumers)
- No URL query param approach
- No changes to planprocess/1 (Declaration) or CaptureSelfie
