# Shamus — Dani Design Compiler BLOCK Fix
**Date:** 2026-05-25
**Branch:** `feat/dani-block-fixes-2026-05-25`
**Based on:** `shamus/marker-clustering-2026-05-25`
**Gate results:** typecheck 0 errors · tests 710/710 PASS

---

## Summary

Dani issued a BLOCK on the clustering + flag-edit PR. This branch resolves every blocker
and polish item without adding new features. Six fixes across two files.

---

## Fix 1 — PlatformMap.tsx: makeStyles refactor + token sweep

**File:** `src/components/PlatformMap.tsx`

**Problem:** Static `StyleSheet.create` had no access to `useColor()`, leaving 11 raw
hex/color literals in cluster and callout styles that would be invisible or broken in dark mode.

**Change:** Converted to `makeStyles(color: ColorTheme)` pattern (matching FlagDetailModal,
MapScreen, and every other themed component). Added `useColor()` and `const styles = makeStyles(color)`
inside the component body. Replaced all 11 violations:

| Literal | Token |
|---|---|
| `#2563EB` (cluster bg) | `color.brand` |
| `#ffffff` (cluster text) | `color.textOnBrand` |
| `#2563EB` (clusterColor prop) | `color.brand` |
| `#ffffff` (clusterTextColor prop) | `color.textOnBrand` |
| `#fff` (callout bg) | `color.surface` |
| `#000` (callout shadowColor) | `color.shadow` |
| `#222` (calloutTitle) | `color.textStrong` |
| `#666` (calloutMeta) | `color.textMuted` |
| `#333` (calloutDesc) | `color.text` |
| `#eef1f5` (calloutPhoto bg) | `color.surfaceNeutral` |
| `#000` (cluster shadowColor) | `color.shadow` |

Also restored `accessibilityRole="button"` and `accessibilityLabel` on individual
`Marker` elements (were dropped when clustering was added), and marked the decorative
callout severity-bar View and photo Image as `accessibilityElementsHidden`.

---

## Fix 2 — FlagDetailModal.tsx: Reject button dark mode (a11y BLOCK)

**File:** `src/components/FlagDetailModal.tsx`

**Problem:** `rejectBtn: { backgroundColor: '#eef1f5' }` is a hardcoded light-palette value.
In dark mode the surface is `#111` so `#eef1f5` creates no contrast for the text `#333`.
This was the primary a11y BLOCK item.

**Change:**
- `rejectBtn.backgroundColor`: `#eef1f5` → `color.surfaceNeutral` (adapts: `#eef1f5` light / `#2a2a2a` dark)
- `rejectText.color`: `#333` → `color.text` (adapts: `#333` light / `#ddd` dark)
- `ActivityIndicator color="#333"` in reject spinner → `color.text`

**Contrast result (dark mode):** `color.text` (#ddd) on `color.surfaceNeutral` (#2a2a2a) = ~13:1 — WCAG AAA.

---

## Fix 3 — FlagDetailModal.tsx: display section token sweep

**File:** `src/components/FlagDetailModal.tsx`

Swept remaining raw literals in the non-edit (display) section of the card:

| Style | Literal | Token |
|---|---|---|
| `title.color` | `#222` | `color.textStrong` |
| `closeBtnText.color` | `#333` | `color.text` |
| `photo.backgroundColor` | `#eef1f5` | `color.surfaceNeutral` |
| `photoPlaceholderText.color` | `#666` | `color.textMuted` |
| `sectionLabel.color` | `#666` | `color.textMuted` |
| `description.color` | `#222` | `color.textStrong` |
| `description.fontSize` | `15` | `font.size.md` (= 15, from scale) |
| `metaValue.color` | `#333` | `color.text` |

Added `import { font } from '@/theme'` to support `font.size.md`.

---

## Fix 4 — FlagDetailModal.tsx: edit form chip style

**File:** `src/components/FlagDetailModal.tsx`

**Problem:** Category chips in the edit form used `outlined-soft` active state:
`borderColor: color.brand, backgroundColor: color.brandSoft`. The filter panel chips in
MapScreen use filled-brand: `backgroundColor: color.brand`. Sky's decision: make them match.

**Change:**
- `categoryChipActive.backgroundColor`: `color.brandSoft` → `color.brand`
- `categoryChipTextActive.color`: `color.brandOnSoft` → `color.textOnBrand`

Pattern now matches `filterPillActive / filterPillTextActive` in MapScreen exactly.

---

## Fix 5 — FlagDetailModal.tsx: severity button size

**File:** `src/components/FlagDetailModal.tsx`

**Problem:** Severity buttons in the edit form were 40×40, below the `a11y.minTargetSize = 44` floor.

**Change:**
- `severityBtn.width`: `40` → `44`
- `severityBtn.height`: `40` → `44`
- `severityBtn.borderRadius`: `20` → `22` (tracks the new size)

---

## Fix 6 — FlagDetailModal.tsx: fontSize 15

**File:** `src/components/FlagDetailModal.tsx`

**Problem:** `description` style used bare `fontSize: 15` not on the design scale token.

**Change:** `fontSize: 15` → `font.size.md` (token value is 15 — same runtime value, now
scale-tracked so a future scale change propagates automatically).

---

## Gate results

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test -- --passWithNoTests` | 710/710 PASS |

No test regressions. Gary's count of 710 held.

---

## Branch state

- `feat/dani-block-fixes-2026-05-25` created from `shamus/marker-clustering-2026-05-25` tip
- 2 commits: one for PlatformMap token sweep, one for all FlagDetailModal fixes
- Not merged · not pushed to remote
- All design decisions per Sky (2026-05-25 Dani BLOCK resolution brief)
