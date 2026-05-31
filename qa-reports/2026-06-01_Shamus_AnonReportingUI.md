# QA Report — Anonymous Reporting UI

**Date:** 2026-06-01
**Author:** Shamus (Feature Pusher)
**Branch:** `feat/phase5-anon-reporting`
**Commit:** `5f45190`
**Scope:** Anonymous flag reporting — UI layer (builds on backend from prior commits)

---

## Summary

All 5 pending UI items from Alex's audit (`2026-05-30_Alex_AnonReporting_A11y.md` §3) are now built.

| Item | Status |
|---|---|
| "Reporting anonymously" banner in ReportFlagModal | ✅ DONE |
| Simplified anon form (hide photo/templates/tags) | ✅ DONE |
| Anonymous badge on FlagCard | ✅ DONE |
| Anonymous badge on FlagDetailModal | ✅ DONE |
| Rate-limit alert | ✅ DONE |
| Map pin visual (0.7 opacity, #9CA3AF tint) | ✅ DONE |

---

## What Was Built

### 1. ReportFlagModal — Anon Mode

**`src/screens/ReportFlagModal.tsx`**

When `user` is null (`isAnon = true`):

- **Title** changes to "Report anonymously" (`accessibilityRole="header"`)
- **Banner** appears below location line:
  - Lock emoji + "Reporting anonymously — your identity is not stored."
  - `accessibilityRole="alert"` (iOS VoiceOver announces on render)
  - `accessibilityLiveRegion="assertive"` (Android TalkBack)
  - "Sign in" link (`accessibilityRole="link"`) calls `onClose()`
- **Form** shows only: category, severity, description
- **Hidden** (auth-only): templates, seasonal tags, disability tags, photo picker, context tags
- **Photo note** shown instead: "Sign in to attach a photo." with tappable "Sign in" link
- **Submit button** text = "Report anonymously"; `accessibilityLabel="Submit anonymous flag report"`
- **Submit flow**:
  1. `checkAnonRateLimit()` — if throws, shows "Daily limit reached" Alert with Sign In + OK buttons
  2. `createAnonFlag({ lat, lng, category, severity, description })`
  3. `recordAnonSubmit()`
  4. `reset()` → `onCreated()` → `onClose()`

### 2. FlagCard — Anonymous Chip

**`src/components/FlagCard.tsx`**

When `flag.user_id === null`, renders a gray `"Anonymous"` chip in the header row after StatusBadge:
- `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` (AT-hidden; a11y covered by card's `accessibilityLabel` which already says ", anonymous report")
- Style: `backgroundColor: '#6b7280'`, `color: '#fff'`, `borderRadius: radius.circle`

### 3. FlagDetailModal — Anonymous Badge

**`src/components/FlagDetailModal.tsx`**

When `shownFlag.user_id === null`, the "Reported by" section shows a badge chip:
- `accessible` with `accessibilityLabel="Reported anonymously"` — announced by screen readers
- Style: `backgroundColor: '#6b7280'`, `borderRadius: 10`

### 4. PlatformMap — Anon Pin Visual

**`src/components/PlatformMap.tsx`**

When `f.user_id === null`:
- `pinColor="#9CA3AF"` (muted gray, distinct from severity colors)
- `opacity=0.7` (visually de-emphasized vs. attributed flags)
- `accessibilityLabel` includes `", anonymous report"` suffix

---

## Verification

```
npm run typecheck  → 0 errors
jest (63 tests)   → 63/63 PASS
  - src/lib/__tests__/anonRateLimit.test.ts
  - src/screens/__tests__/ReportFlagModal.test.tsx
  - src/components/__tests__/FlagCard.test.tsx
```

---

## Decisions For Sky

None — all items were spec'd by Alex; no schema changes, no new dependencies.

---

## Compile Requested

Requesting Dani run the **Design Compiler** (Const. Art. 2.4) against:

- **Branch:** `feat/phase5-anon-reporting`
- **Commit:** `5f45190`
- **Feature slug:** `anon-reporting-ui`
- **Changed surfaces:** ReportFlagModal (banner, title, submit button), FlagCard (header chip), FlagDetailModal ("Reported by" badge), PlatformMap (pin opacity/color)

Layers most likely to flag: Layer 1 (token drift — banner uses `color.brandSofter`/`brandOnSoft`, chip uses hardcoded `#6b7280`), Layer 5 (Luxury UI Score — gray chip is minimal).

When Dani issues `2026-06-01_DesignCompile_anon-reporting-ui.md`, Shamus will check the COMPILER RESULT before marking UI DONE.

---

## Next Steps

- **Dani/Alex:** Design Compiler run on the changed surfaces
- **Jordan:** Privacy gate review (null user_id, device-local rate-limit via AsyncStorage — no PII leaves device)
- **Rory:** Merge gate — awaiting compiler COMMIT + Jordan sign-off
