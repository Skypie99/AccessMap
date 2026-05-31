# Phase 5 Deep Accessibility Audit
**Date:** 2026-05-31  
**Auditor:** Alex (Accessibility + UX Engineer)  
**Branch — trust score fixes:** `a11y/phase5-deep-2026-05-31` (based on `feat/phase5-trust-score`)  
**Branch — anon banner fix:** `a11y/phase5-anon-banner-2026-05-31` (based on `main`)  
**Standard:** WCAG 2.2 AA  
**Scope:** All Phase 5 features: trust score, anonymous reporting, seasonal/disability tags, onboarding carousel

---

## Audit Summary

Phase 5 is in **good shape overall** — all existing WCAG 4.1.2 fixes from the prior Alex pass (383f746) held, point history and tier progress bar labelling are correct, and the onboarding carousel has solid touch targets and descriptive labels. Seven issues were found and fixed: one contrast failure (WCAG AA), three `accessible` / name-role-value gaps, one decorative icon exposed to VoiceOver, and two reduce-motion guards missing on animations.

| Severity | Count | Status |
|---|---|---|
| HIGH — WCAG AA violation | 2 | ✅ Fixed |
| MEDIUM — WCAG best practice | 3 | ✅ Fixed |
| BEST PRACTICE — Reduce Motion | 2 | ✅ Fixed |
| LOW — Advisory only | 1 | 📋 Documented |

---

## WCAG Findings

### 1. Trust Score System

#### FINDING TS-1 — `tierProgressLabel` contrast fails WCAG 1.4.3 🔴 HIGH
**File:** `src/screens/ProfileScreen.tsx` (style `tierProgressLabel`)  
**WCAG:** 1.4.3 Contrast (Minimum) — AA  
**Before:** `fontSize: font.size.sm` (13pt) + `fontWeight: font.weight.medium` ('500')  
**Color pair:** `#dbe7fb` (pointsPillText) on `#2f80ed` (brand) = **3.10:1**  
**Threshold required:** 4.5:1 (13pt normal/medium is not large text)  
**Result:** FAIL — the "X pts to Silver" label below the tier progress bar was unreadable in dim lighting

**Fix applied:** Bumped to `font.size.base` (14pt) + `font.weight.bold` — this crosses the WCAG "large text" threshold (≥14pt bold → 3:1 required → 3.10:1 passes). Same pattern as `heroLabel` and `heroSubtitle` which were already corrected.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING TS-2 — LeaderboardModal rows missing `accessible` — WCAG 4.1.2 🟠 HIGH
**File:** `src/components/LeaderboardModal.tsx:73`  
**WCAG:** 4.1.2 Name, Role, Value — AA  
**Detail:** Each leaderboard row had `role="listitem"` and a combined `accessibilityLabel` ("Gold medal, 1st place, Silver tier, Jane Doe, 150 points") but no `accessible={true}`. Without `accessible`, VoiceOver does not focus on the container View and ignores the combined label. Instead VoiceOver reads only the non-hidden child Text elements: the user's name and their points string — **rank, medal name, and tier are all silently dropped**.

**Fix applied:** Added `accessible` to each row's View.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING TS-3 — TierExplainerModal tier rows: `accessibilityState.selected` has no effect 🟡 MEDIUM
**File:** `src/screens/ProfileScreen.tsx:1658`  
**WCAG:** 4.1.2 Name, Role, Value — AA  
**Detail:** Each tier row in the explainer sheet had `accessibilityState={{ selected: isCurrent }}` and `accessibilityLabel` on the View, but again no `accessible={true}`. The "selected" state and the combined label were never announced. VoiceOver did read the child text "Silver · you are here" and "100 – 499 points" separately, so information was not entirely lost — but the programmatic state was not conveyed.

**Fix applied:** Added `accessible` to each tier row View.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING TS-4 — Tier progress bar animation ignores Reduce Motion 🟡 BEST PRACTICE
**File:** `src/screens/ProfileScreen.tsx:711–717`  
**WCAG:** 2.3.3 Animation from Interactions — AAA (best practice, explicitly in scope)  
**Detail:** `Animated.timing` with 600ms duration fired unconditionally; `ProfileScreen` had no `useReducedMotion` hook.

**Fix applied:** Imported `useReducedMotion` from `@/lib/accessibility`, called it at the top of `ProfileScreen`, and gated the animation: when `reduceMotion` is true, `tierProgressAnim.setValue(tierProgressValue)` jumps to the final width instantly.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING TS-5 — Tier progress bar: PASS (for reference)
**File:** `src/screens/ProfileScreen.tsx:881–910`  
The tier progress bar already has the full WCAG 4.1.2 treatment:
- `accessibilityRole="progressbar"` ✅
- `accessibilityLabel` = "Silver tier, 250 of 500 points to Gold" ✅
- `accessibilityValue={{ min: tier.threshold, max: tier.nextThreshold, now: points }}` ✅
- Animated fill hidden from AT (`accessibilityElementsHidden`) ✅
- Label text below hidden from AT (duplicate of the progressbar label) ✅

---

#### FINDING TS-6 — Point history list: PASS
**File:** `src/screens/ProfileScreen.tsx:944–992`  
- Container: `accessibilityRole="list"` ✅
- Rows: `accessible`, `role="listitem"`, combined label ("Earned 5 points: Flag reported, 2h ago") ✅
- Direction arrows (↑/↓): `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` ✅
- Delta text (+5 pts, −2 pts): covered by parent's `accessible`-grouped label ✅

---

#### FINDING TS-7 — Leaderboard contrast: PASS
**Light mode** — `color.text` (#333) on `tierGoldBg` (#fffbe6) ≥ 11:1, `tierSilverBg` (#f3f4f6) ≥ 14:1, `tierBronzeBg` (#fef3ec) ≥ 12:1. All well above 4.5:1. ✅  
**Dark mode** — `color.text` (#ddd) on `tierGoldBg` (#2d2509), `tierSilverBg` (#1d1d1f), `tierBronzeBg` (#2d1a0d). Code comment documents ≥ 10:1; spot-check of Gold: 11.1:1. ✅

---

### 2. Anonymous Reporting

#### FINDING AR-1 — Anonymous banner "Sign in" link hidden from VoiceOver 🟠 MEDIUM
**File:** `src/screens/ReportFlagModal.tsx:351–373` (on `main`)  
**WCAG:** 4.1.2 Name, Role, Value — AA  
**Detail:** The banner parent View had `accessible={true}`, which in React Native causes VoiceOver to focus on the parent as a single element and hides all child elements. The "Sign in" `Pressable` (with `accessibilityRole="link"`) was invisible to VoiceOver and not activatable via swipe navigation. The button's function (close the form so the user can sign in) was accessible to sighted users only.

**Fix applied:** Split the banner into two siblings:
1. An inner `View` with `accessible`, `accessibilityRole="alert"`, and `accessibilityLiveRegion="assertive"` — contains the lock icon + text. Alert announcement on first render is preserved.
2. The "Sign in" `Pressable` moved to a sibling position, independently focusable.

Added `anonBannerInfo` style for the inner row layout.

**Commit:** `7e56a50` on `a11y/phase5-anon-banner-2026-05-31`

---

#### FINDING AR-2 — Rate limit alert: PASS
**File:** `src/screens/ReportFlagModal.tsx:243–251`  
Uses `Alert.alert()` with two buttons — fully accessible via native OS alert dialog (UIAlertController on iOS, AlertDialog on Android). ✅

---

#### FINDING AR-3 — Anonymous pin opacity 0.7: PASS
**File:** `src/components/PlatformMap.tsx:208–216`  
Pin color `#9CA3AF` (gray) at opacity 0.7. The `accessibilityLabel` includes ", anonymous report" regardless of opacity — AT users hear the label. The opacity is purely decorative (it visually distinguishes anon from non-anon pins, consistent with unfocused pins at 0.55). No WCAG 1.4.11 violation since the contrast requirement for non-text UI components applies to the pin's meaning-conveying attributes, which are already in the label. ✅

---

#### FINDING AR-4 — FlagDetailModal "Anonymous" badge contrast: PASS
**File:** `src/components/FlagDetailModal.tsx:1231–1242`  
Badge: white (`#fff`) text on `#6b7280` background. Calculated: **4.83:1** — passes WCAG AA for 12pt/600 weight (threshold 4.5:1). Badge has `accessible`, `accessibilityLabel="Reported anonymously"`, and text child hidden from AT. ✅

---

### 3. Seasonal + Disability Tags

#### FINDING SDT-1 — Chip pickers in ReportFlagModal: PASS
**File:** `src/screens/ReportFlagModal.tsx` (trust-score branch)  
- Each chip: `accessibilityRole="checkbox"`, `accessibilityLabel` = descriptive string from `SEASONAL_TAG_LABELS` / `DISABILITY_TAG_LABELS` (e.g. "Icy in winter"), `accessibilityState={{ checked: active, disabled: tagsDisabled }}` ✅
- VoiceOver reads: "Icy in winter, checkbox" / "Icy in winter, checked, checkbox" ✅
- Labels are plain-language and unique across the picker ✅

---

#### FINDING SDT-2 — FlagDetailModal chip groups: PASS (with advisory)
**File:** `src/components/FlagDetailModal.tsx:581–619`  
- Each group has `accessible` + combined label: "Seasonal: Icy in winter, Flooded in spring" ✅  
- Individual chips have `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` ✅

**Advisory (LOW — not fixed):** The section heading Text ("Seasonal", "Who this affects") above each chip group is read by VoiceOver immediately before the group's combined label, which already starts with the heading. This creates a mild double-announcement ("Seasonal" … "Seasonal: Icy in winter"). Not a WCAG violation. Could be addressed by adding `accessibilityElementsHidden` to the heading Texts inside the chip group map, but this is optional and risks over-hiding if the structure changes.

---

### 4. Onboarding Carousel

#### FINDING OB-1 — Ionicons decorative icons not hidden from VoiceOver 🟠 MEDIUM
**File:** `src/components/OnboardingCards.tsx:316–319`  
**WCAG:** 1.1.1 Non-text Content — AA  
**Detail:** Each card renders an `Ionicons` glyph (font-based icon) in a circle container with no `accessibilityElementsHidden`. On iOS, VoiceOver attempts to read font-based icons, typically producing empty or garbled announcements (private-use Unicode code points). The card heading immediately below (`accessibilityRole="header"`) fully describes each slide — the icon is purely decorative.

**Fix applied:** Added `accessibilityElementsHidden` and `importantForAccessibility="no-hide-descendants"` to the icon circle `View` so VoiceOver on iOS and TalkBack on Android both skip it.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING OB-2 — Onboarding dot animation ignores Reduce Motion 🟡 BEST PRACTICE
**File:** `src/components/OnboardingCards.tsx:156–167`  
**WCAG:** 2.3.3 Animation from Interactions — AAA (best practice, explicitly in scope)  
**Detail:** `reduceMotion` was already read and used to disable scroll animation (`scrollEnabled={!reduceMotion}`), but the dot-width `Animated.spring` always fired regardless of the preference.

Note: the dots themselves ARE properly hidden from AT (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`), so this was a reduce-motion issue for **sighted** users who use Reduce Motion, not a screen-reader issue.

**Fix applied:** When `reduceMotion` is true, each `dotWidths` anim snaps to its target value instantly (`anim.setValue(...)`) inside the `useEffect`. Added `reduceMotion` to the `useEffect` dependency array.

**Commit:** `86e3fbf` on `a11y/phase5-deep-2026-05-31`

---

#### FINDING OB-3 — Back / Next / Skip / Permission buttons: PASS
| Element | Label | Hint | minHeight | Notes |
|---|---|---|---|---|
| Skip | "Skip the tutorial" | "Closes the tutorial and opens the app" | 44pt + hitSlop 12 | ✅ |
| Back (first card) | "Back. Disabled on first card." | — | 44pt | `accessibilityState.disabled` ✅ |
| Back (other cards) | "Back to card N of M" | — | 44pt | ✅ |
| Next | "Next. Card N+1 of M." | — | 44pt | ✅ |
| Allow Location | "Allow location access" | "Opens the system location permission dialog, then continues" | 44pt | ✅ |
| Turn on Notifications | "Turn on notifications" | "Opens the system notifications dialog, then continues" | 44pt | ✅ |
| Open the Map | "Open the map" | "Closes the introduction and opens AccessMap" | 44pt | ✅ |
| Maybe later | "Maybe later" | "Skips notifications and continues to the next step" | 44pt + hitSlop 8 | ✅ |

---

#### FINDING OB-4 — Dot indicator hidden from AT: PASS
**File:** `src/components/OnboardingCards.tsx:339–365`  
Parent `View` has both `importantForAccessibility="no-hide-descendants"` (TalkBack) and `accessibilityElementsHidden` (VoiceOver) — dots are properly hidden on both platforms. Card position is announced via `AccessibilityInfo.announceForAccessibility('Card N of M')` on index change. ✅

---

#### FINDING OB-5 — Skip text contrast: PASS
`rgba(255,255,255,0.65)` on dark gradient `#070b18` — effective contrast **8.49:1** at 14pt semibold. ✅

---

### 5. Global Checks

#### 5.1 Touch targets: PASS across all Phase 5 additions
All new `Pressable` / interactive elements checked: tier pill (32pt visual + hitSlop 8 = 48pt effective), leaderboard close (36pt + hitSlop 8 = 52pt), onboarding buttons (44pt minHeight), anon banner sign-in (minHeight 44). ✅

#### 5.2 All new images / icons properly hidden: PASS (after fix OB-1)
After fixing the Ionicons issue, all decorative icons in Phase 5 features are either:
- Hidden with `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` (stars, arrows, lock icon, medal emoji, tier emoji, Ionicons)
- Or paired with a proper `accessibilityLabel` on their container

#### 5.3 All new text contrast: PASS (after fix TS-1)
After bumping `tierProgressLabel` to 14pt bold, all visible Phase 5 text passes the relevant threshold. The `pointsPillText` (#dbe7fb) on brand (#2f80ed) at 3.10:1 meets the 3:1 large-text threshold for all other uses (heroLabel, heroSubtitle — both 14pt bold). ✅

#### 5.4 Reduce Motion: PASS (after fixes TS-4 and OB-2)
All Phase 5 animations now respect `reduceMotion`:
- Tier progress bar: snaps to final value ✅ (fixed)
- Onboarding dots: snaps to target width ✅ (fixed)
- Onboarding card scroll: already gated (`scrollEnabled={!reduceMotion}`) ✅
- FlagDetailModal slide: already gated (`animationType={reducedMotion ? 'none' : 'slide'}`) ✅

---

## Accessibility Parity Matrix (Layer 2 — Design Compiler)

Rows = Phase 5 feature areas. Columns = 7 WCAG 2.2 AA criteria.

| Feature Area | Focus visibility | Color contrast | Screen reader labels | Motion reduction | Dynamic type | Touch target ≥44pt | Non-text contrast |
|---|---|---|---|---|---|---|---|
| Trust tier progress bar | N/A (not interactive) | ✅ PASS (after fix TS-1) | ✅ PASS | ✅ PASS (after fix TS-4) | ✅ PASS (em units via font.size tokens) | N/A | ✅ PASS |
| Trust point history | N/A | ✅ PASS | ✅ PASS | N/A | ✅ PASS | N/A | N/A |
| Leaderboard rows | ✅ PASS (rows are focus targets after fix TS-2) | ✅ PASS | ✅ PASS (after fix TS-2) | N/A | ✅ PASS | ✅ PASS (minHeight 48) | N/A |
| Tier explainer rows | ✅ PASS (after fix TS-3) | ✅ PASS | ✅ PASS (after fix TS-3) | N/A | ✅ PASS | ✅ PASS (minHeight 48) | N/A |
| Anon reporting banner | ✅ PASS (after fix AR-1) | ✅ PASS (7.6:1) | ✅ PASS (after fix AR-1) | N/A | ✅ PASS | ✅ PASS (44pt link target) | N/A |
| Anonymous map pins | N/A | N/A | ✅ PASS (label includes "anonymous report") | N/A | N/A | N/A | ✅ PASS (pin visible at 0.7 opacity) |
| Anonymous badge (detail modal) | N/A | ✅ PASS (4.83:1) | ✅ PASS | N/A | ✅ PASS | N/A | N/A |
| Seasonal chip picker | ✅ PASS | ✅ PASS | ✅ PASS | N/A | ✅ PASS | ✅ PASS | N/A |
| Disability chip picker | ✅ PASS | ✅ PASS | ✅ PASS | N/A | ✅ PASS | ✅ PASS | N/A |
| Chip groups (detail modal) | N/A | ✅ PASS | ✅ PASS | N/A | ✅ PASS | N/A | N/A |
| Onboarding carousel | ✅ PASS | ✅ PASS (8.49:1 skip; 5.69:1 position pill) | ✅ PASS | ✅ PASS (after fix OB-2) | ✅ PASS | ✅ PASS (all ≥44pt) | N/A |

**Layer 2 Result: PASS** (all FAIL cells resolved by applied fixes)

---

## Applied Fixes Summary

### Branch: `a11y/phase5-deep-2026-05-31` (commit `86e3fbf`)
Files: `LeaderboardModal.tsx`, `OnboardingCards.tsx`, `ProfileScreen.tsx`

| # | File | Change | WCAG |
|---|---|---|---|
| 1 | `LeaderboardModal.tsx:73` | Added `accessible` to row View | 4.1.2 |
| 2 | `ProfileScreen.tsx` (style) | `tierProgressLabel` 13pt medium → 14pt bold | 1.4.3 |
| 3 | `ProfileScreen.tsx` (import) | Added `useReducedMotion` import | 2.3.3 |
| 4 | `ProfileScreen.tsx` (hook) | `const reduceMotion = useReducedMotion()` | 2.3.3 |
| 5 | `ProfileScreen.tsx` (effect) | Tier progress animation gated by `reduceMotion` | 2.3.3 |
| 6 | `ProfileScreen.tsx:1658` | Added `accessible` to tier explainer rows | 4.1.2 |
| 7 | `OnboardingCards.tsx:316` | Added `accessibilityElementsHidden` to icon circle | 1.1.1 |
| 8 | `OnboardingCards.tsx` (effect) | Dot spring animation gated by `reduceMotion` | 2.3.3 |

### Branch: `a11y/phase5-anon-banner-2026-05-31` (commit `7e56a50`)
File: `src/screens/ReportFlagModal.tsx`

| # | File | Change | WCAG |
|---|---|---|---|
| 9 | `ReportFlagModal.tsx:351–373` | Split banner: inner `accessible` alert + sibling Pressable | 4.1.2 |
| 10 | `ReportFlagModal.tsx` (style) | Added `anonBannerInfo` style for inner row | — |

---

## Escalations / Decisions for Sky

None of the findings require a Sky decision. All issues were safe additive fixes.

**Advisory for Dani (optional):**  
The chip group section labels in `FlagDetailModal` ("Seasonal", "Who this affects") are slightly redundant with the group's combined `accessibilityLabel` — VoiceOver reads the heading once as plain text, then again as the group label prefix. Low severity, cosmetic. Could be fixed by adding `accessibilityElementsHidden` to those specific heading Text elements. Recommended for a future polish pass.

---

## Typecheck Status
- `a11y/phase5-deep-2026-05-31`: tsc passes (no errors in changed files) ✅  
- `a11y/phase5-anon-banner-2026-05-31`: `npm run typecheck` clean ✅
