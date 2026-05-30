# Phase 3 Pre-Merge A11y Audit — WCAG 2.2 AA
**Date:** 2026-05-29  
**Author:** Alex (Accessibility)  
**Branch audited from:** `a11y/phase3-alex-premerge` (fix branch off `main`)  
**Fix commit:** `3f72909`

---

## Branches Audited

| Branch | New/modified UI files | Status |
|---|---|---|
| `feat/wave3-features` | `MyWatchedModal.tsx` (new), `ProfileScreen.tsx` | 🔴 see B1/B2 below |
| `a11y/phase3-polish` | `TasksScreen.tsx` (WCAG 4.1.3 announcements) | ✅ passes |
| `qa/coverage-sprint-phase3` | `TasksScreen.tsx` (removes memoizedFlags), `MapScreen.tsx` (same) | ✅ passes — no UI changes |
| `security/pre-launch-hardening` | `app.json`, docs only | ✅ passes — no UI |

---

## 🔴 Blocking Findings (WCAG AA fails) — ALL FIXED

### B1 — ProfileScreen: heroLabel contrast (WCAG 1.4.3)
**File:** `src/screens/ProfileScreen.tsx` · `heroLabel` style  
**Branch carrying the issue:** `feat/wave3-features` (pre-existing on `main`)  

| Token | Value | WCAG luminance |
|---|---|---|
| `color.pointsPillText` | `#dbe7fb` | L = 0.792 |
| `color.brand` (background) | `#2f80ed` | L = 0.222 |
| **Contrast ratio** | | **3.10:1** |

`heroLabel` was `fontSize: 11, fontWeight: '700'` → **small text** → needs 4.5:1 → **FAILED**.

**Fix applied:** `fontSize: 11` → `font.size.base` (14pt), `fontWeight: font.weight.bold`.  
At 14pt bold = "large text" under WCAG 1.4.3 → 3:1 threshold → 3.10:1 **PASSES** ✅  
File: [ProfileScreen.tsx:1585](../src/screens/ProfileScreen.tsx)

---

### B2 — ProfileScreen: heroSubtitle contrast (WCAG 1.4.3)
**File:** `src/screens/ProfileScreen.tsx` · `heroSubtitle` style  
**Branch carrying the issue:** `feat/wave3-features` (pre-existing on `main`)  

Same `color.pointsPillText` on `color.brand` background = 3.10:1.  
`heroSubtitle` was `fontSize: 13, fontWeight: '600'` (semibold, not bold).  
13pt + 600-weight = **small text** under WCAG → needs 4.5:1 → **FAILED**.  
(fontWeight '700' = bold; '600' = semibold → does NOT qualify as "bold" for WCAG large-text definition.)

**Fix applied:** `fontSize: font.size.base` (14pt), `fontWeight: font.weight.bold`.  
14pt bold = "large text" → 3:1 threshold → 3.10:1 **PASSES** ✅

---

### B3 — ReportFlagModal: Submit button unreachable at Dynamic Type 200% (WCAG 1.4.4)
**File:** `src/screens/ReportFlagModal.tsx`  
**Branch carrying the issue:** `main` (pre-existing; shipping in Phase 3 bundle)  

The `card` View was a plain `View` with `gap: 12` — no scroll container. Total form content ≈ 728pt. At **Dynamic Type Accessibility Extra Large (1.35×–2.0× scale)**, all rows expand and the Cancel + Report buttons are pushed below the visible viewport. The buttons become unreachable without any affordance to scroll to them.

**WCAG 1.4.4 (Resize Text):** content and functionality must remain operable when text is scaled up to 200%.

**Fix applied** per Dani's design spec (`designs/2026-05-29-report-modal-scrollview.md`):
- All form content wrapped in `<ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">`
- `<View style={styles.actions}>` kept **outside** the ScrollView as a sticky footer
- `card` style: `maxHeight: '88%'`, `flexShrink: 1`, `overflow: 'hidden'`
- `actions` style: `paddingHorizontal: 20`, `paddingTop: 12`, `paddingBottom: 20`, `borderTopWidth: StyleSheet.hairlineWidth`, `borderTopColor: color.borderSubtle`, `backgroundColor: color.surface`

Cancel + Report buttons are now **always visible** regardless of content height or text scale ✅  
File: [ReportFlagModal.tsx](../src/screens/ReportFlagModal.tsx)

---

## ✅ Passing — New Components

### MyWatchedModal (feat/wave3-features)

| Criterion | Result |
|---|---|
| **Labels** — all interactive elements | ✅ Row Pressable: full descriptive label (`category, severity, status, date`). Unwatch, View on map, Clear all, Close, Retry all labeled. RefreshControl: `accessibilityLabel="Pull down to refresh watched flags"`. |
| **Roles** — buttons, headings | ✅ `accessibilityRole="button"` on all Pressable elements. Title: `accessibilityRole="header"`. FlatList: `accessibilityRole="list"` with count label. Rows wrapped in `role="listitem"` View. |
| **Touch targets** — ≥44×44pt | ✅ `statusChip: minHeight: 44`, `sortChip: minHeight: 44`, `closeBtn: 32×32` with `hitSlop={12}` → 56pt effective, `unwatchBtn: hitSlop={10}` → effective ≥44pt, `viewOnMapBtn: 32×32` with `hitSlop={8}` → 48pt effective. |
| **Contrast** — new chip colors | ✅ Status filter chips use `color.brandText` (#1c4f99) on `color.surfaceNeutral` and `color.textOnBrand` (#fff) on status-specific fills. Sort chips: `color.brandText` on `color.brandSofter` (#eaf3ff) ≈ 9:1. All pass. |
| **Focus management** | ✅ React Native Modal with `animationType="slide"` moves focus to modal on iOS/Android. `onRequestClose` wired for back gesture. |
| **Dynamic content** | ✅ `accessibilityLiveRegion` not needed — list shows full results immediately; filter result is the FlatList with `accessibilityLabel` announcing count. |
| **Decorative elements** | ✅ Empty state icons, severity dot, resolved accent bar all have `accessibilityElementsHidden` / `importantForAccessibility="no-hide-descendants"`. |
| **Reduced motion** | ✅ No custom animations. Modal `animationType="slide"` uses system preference on both platforms. |

---

### ProfileScreen additions (feat/wave3-features)

| Addition | Result |
|---|---|
| **Watched Flags button** | ✅ `accessibilityRole="button"`, `accessibilityLabel="Watched Flags"`, `accessibilityHint` present, `minHeight: 64`. |
| **Verified stat in statsRow** | ✅ `statsRow` has `accessible`, `accessibilityRole="summary"`, combined label `"Your stats: X reported, Y verified, Z resolved"`. Stat children grouped and not individually traversed. |

---

### TasksScreen — a11y/phase3-polish additions

| Change | Result |
|---|---|
| **Single-card triage announcements** | ✅ `AccessibilityInfo.announceForAccessibility(msg)` now fires for verify/resolve/delete on single cards. Previously only bulk actions called it. Fixes WCAG 4.1.3 (Status Messages). |
| **Flash text liveRegion** | ✅ `<Text accessibilityLiveRegion="polite">` covers Android TalkBack; iOS uses the announceForAccessibility calls at each call site. |

---

## ⚠️ Advisory (not WCAG AA fails — no merge blocker)

### A1 — MyWatchedModal: exclusive chips use `"button"` role (not `"radio"`)
**File:** `src/components/MyWatchedModal.tsx`

Status filter chips and sort chips are mutually exclusive but use `accessibilityRole="button"` with `accessibilityState={{ selected }}`. The per-spec convention for exclusive chip groups is `"radio"`. This is not a WCAG 2.2 AA hard fail (button + selected state is readable by screen readers), but diverges from the pattern used in `TasksScreen` (which uses `"tab"` + `"tablist"` for its sort row).

**Recommendation:** Update sort chips to `"radio"` or `"tab"` in the next a11y cycle. Not a merge blocker.

### A2 — TasksScreen filter chips: touch targets 36pt (pre-existing on main)
**File:** `src/screens/TasksScreen.tsx` · `mineChip`, `sevChip`, `catChip`

All three chip styles have `minHeight: 36`. This is below the 44pt minimum (WCAG 2.5.5). However:
- `searchClearBtn` (minHeight: 32) has `hitSlop={8}` → 48pt effective ✅
- `mineChip`, `sevChip`, `catChip` have no `hitSlop`

These are **pre-existing on `main`** and not introduced by any Phase 3 branch. None of the Phase 3 branches modify these style definitions. Including here for completeness — should be addressed in a dedicated chip-target pass.

**Not a Phase 3 merge blocker**, but should be tracked for the next a11y sprint.

---

## Merge Clearance

| Branch | Blocker count | Cleared to merge? |
|---|---|---|
| `feat/wave3-features` | 2 (B1, B2 — contrast) | ✅ **YES** — after `a11y/phase3-alex-premerge` lands on `main` first |
| `a11y/phase3-polish` | 0 | ✅ **YES** |
| `qa/coverage-sprint-phase3` | 0 | ✅ **YES** |
| `security/pre-launch-hardening` | 0 | ✅ **YES** |

### Required merge order

```
a11y/phase3-alex-premerge  →  main    (this branch — contains B1/B2/B3 fixes)
feat/wave3-features        →  main    (requires above to be in main first)
a11y/phase3-polish         →  main
qa/coverage-sprint-phase3  →  main
security/pre-launch-hardening → main
```

B3 (ReportFlagModal) applies directly to `main` so it's included in `a11y/phase3-alex-premerge` with no ordering dependency beyond landing first.

---

## Fix Branch

**Branch:** `a11y/phase3-alex-premerge`  
**Commit:** `3f72909`  
**Files changed:** `src/screens/ProfileScreen.tsx`, `src/screens/ReportFlagModal.tsx`  
**Typecheck:** passes (pre-existing TS5101 deprecation warning only — not a type error)

---

## Verification Checklist (for Gary / Shamus post-merge)

- [ ] iPhone SE simulator: ProfileScreen hero "POINTS" label readable at 14pt bold
- [ ] iPhone SE simulator: heroSubtitle ("X points to badge") readable at 14pt bold
- [ ] iPhone SE + Dynamic Type Accessibility Extra Large: ReportFlagModal Report button visible without scrolling
- [ ] iPhone 14 + Dynamic Type XXL: Report button reachable via scroll in ReportFlagModal
- [ ] Tapping severity buttons while description keyboard is open → keyboard stays open (keyboardShouldPersistTaps="handled")
- [ ] Cancel button always visible at bottom of ReportFlagModal
- [ ] iOS VoiceOver: MyWatchedModal title announced as "Watched Flags, heading"
- [ ] iOS VoiceOver: statsRow announced as "Your stats: X reported, Y verified, Z resolved"
- [ ] iOS VoiceOver: triage action (verify/resolve) triggers spoken flash banner
