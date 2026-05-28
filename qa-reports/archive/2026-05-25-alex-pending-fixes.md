# Alex — Pending A11y Fixes
**Date:** 2026-05-25
**Branch:** `a11y/pending-fixes-2026-05-25`
**Role:** Alex (Accessibility Engineer)
**Status:** COMPLETE — 5/5 fixes applied, 0 typecheck errors, 710/710 tests pass

---

## Context

These fixes were flagged as "pending when clustering/edit form land on main" in the 2026-05-25 a11y audit (`a11y/audit-2026-05-25`). The clustering (Shamus) and flag-edit-form features are now merged to main. This branch closes all five outstanding items.

---

## Fixes Applied

### Fix 1 — Cluster bubble tap target (`PlatformMap.tsx`)
**File:** `src/components/PlatformMap.tsx`

Added `hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}` to the cluster `Marker`. The rendered bubble is 40×40pt; hitSlop extends the touchable area to the WCAG 2.2 AA minimum of 44×44pt without altering the visual.

### Fix 2 — Cluster count Text double-announces (`PlatformMap.tsx`)
**File:** `src/components/PlatformMap.tsx`

Added `{...decorativeProps}` (from `src/lib/accessibility.ts`) to the count `<Text>` inside the cluster bubble. This sets `accessible={false}`, `importantForAccessibility="no-hide-descendants"`, and `accessibilityElementsHidden={true}`, silencing the element from the AT tree. The Marker's `accessibilityLabel` already conveys the count — the Text was causing a double-read.

### Fix 3 — Cluster singular/plural bug (`PlatformMap.tsx`)
**File:** `src/components/PlatformMap.tsx`

Changed the cluster `accessibilityLabel` from:
```
`${count} accessibility flags. Tap to expand.`
```
to:
```
`${count} ${count === 1 ? 'flag' : 'flags'}. Tap to expand.`
```
A count of 1 now reads "1 flag" instead of "1 flags". Also removed the word "accessibility" from the label — it was redundant in context and made the announcement longer than needed.

### Fix 4 — Flag edit form severity label (`FlagDetailModal.tsx`)
**File:** `src/components/FlagDetailModal.tsx`

Changed severity button `accessibilityLabel` from `` `Severity ${s}` `` to `` `Severity ${s} of 5` ``. Screen reader users now hear "Severity 3 of 5" — the scale context is essential for understanding relative severity.

### Fix 5 — Cancel button disabled state (`FlagDetailModal.tsx`)
**File:** `src/components/FlagDetailModal.tsx`

Added `accessibilityState={{ disabled: busy }}` to the Cancel button in the edit form. Previously the button was `disabled={busy}` visually/behaviorally but AT had no signal it was unavailable during a save. Now it mirrors the Save button's pattern.

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test -- --passWithNoTests` | 710/710 pass |
| Branch | `a11y/pending-fixes-2026-05-25` (not merged) |
| Commit | `2def98a fix(a11y): pending cluster + edit-form a11y fixes` |

---

## Files Changed

- `src/components/PlatformMap.tsx` — Fixes 1, 2, 3
- `src/components/FlagDetailModal.tsx` — Fixes 4, 5

---

## WCAG Compliance Notes

| Fix | Criterion |
|---|---|
| Tap target (Fix 1) | WCAG 2.2 SC 2.5.8 — Target Size (Minimum) |
| Double-announce (Fix 2) | WCAG 2.1 SC 1.3.1 — Info and Relationships |
| Singular/plural (Fix 3) | WCAG 2.1 SC 3.3.2 — Labels or Instructions |
| Severity scale (Fix 4) | WCAG 2.1 SC 1.3.3 — Sensory Characteristics |
| Disabled state (Fix 5) | WCAG 2.1 SC 4.1.2 — Name, Role, Value |

All five items are now closed. No open a11y items from the 2026-05-25 audit remain.
