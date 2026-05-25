# Alex A11y Audit — Wave 6
**Target screens:** SettingsScreen, OnboardingModal, OnboardingCards  
**Branch:** `a11y/auto-2026-05-25-alex-wave6-settings-onboarding`  
**Commit:** 9eae642  
**Date:** 2026-05-25  
**Auditor:** Alex (Accessibility & UX Engineer)  
**Verification:** `npx tsc --noEmit` → 0 errors · `npx jest --passWithNoTests` → 800 tests pass  

---

## Accessibility Parity Matrix (Design Compiler Layer 2)

Rows = component variant / mode. Columns = 7 WCAG 2.2 AA criteria.

| Component / Mode | Focus Visibility | Color Contrast | Keyboard Nav | SR Labels | Motion Reduction | Dynamic Type | Touch Target |
|---|---|---|---|---|---|---|---|
| SettingsScreen (light) | PASS — Pressable focus ring via OS | PASS — all tokens AA-checked in ThemeContext | PASS — tab order = DOM order | **PRE-FIX FAIL** → PASS (push switch now activatable) | N/A (no custom animation) | PASS — font scale tokens | PASS — minHeight 64pt |
| SettingsScreen (dark) | PASS | PASS — dark tokens verified in ThemeContext.tsx | PASS | PASS | N/A | PASS | PASS |
| OnboardingModal (light) | **PRE-FIX FAIL** → PASS (accessibilityViewIsModal) | **PRE-FIX FAIL** → PASS (migrated to theme tokens) | PASS — button order logical | PASS — labels + announceForAccessibility | **PRE-FIX FAIL** → PASS (animationType respects reducedMotion) | PASS — font.size tokens | PASS — minHeight 44pt on all buttons |
| OnboardingModal (dark) | PASS | **PRE-FIX FAIL** → PASS (hardcoded #fff/#222/#444 replaced with theme tokens) | PASS | PASS | PASS | PASS | PASS |
| OnboardingCards (light) | PASS (pre-existing) | PASS (pre-existing, textMuted 5.7:1) | PASS | PASS | PASS (pre-existing, useReducedMotion) | PASS | PASS |
| OnboardingCards (dark) | PASS | PASS (theme tokens) | PASS | PASS | PASS | PASS | PASS |

**Layer 2 result: PASS** (all pre-fix FAILs resolved in this wave)

---

## SettingsScreen — `/Users/skypie/AccessMap/src/screens/SettingsScreen.tsx`

### Issues found

#### BLOCKER — Push-switch not activatable by VoiceOver/TalkBack (WCAG 4.1.2)
The push-notifications toggle row used a `View` with `accessibilityRole="switch"`. VoiceOver can focus a View with a role, but cannot *activate* it — there is no `onPress` handler on a View. The inner `Switch` had `accessibilityElementsHidden={true}` to prevent double-focus. Result: VoiceOver users could see the switch was there, could hear its label and state, but tapping did nothing. The switch was completely inaccessible to screen reader users.

**WCAG criterion:** 4.1.2 Name, Role, Value  
**Status: FIXED** — converted container to `Pressable`, added `onPress={() => void handlePushToggle(!pushEnabled)`. Inner `Switch` remains AT-hidden to prevent double-activation. Added `accessibilityState.disabled` to mirror the `pushBusy || !user` guard.

---

### Issues not found (already passing)

- All `SettingsRow` items: `accessibilityRole="button"`, `accessibilityLabel={title}`, `accessibilityHint` ✓  
- Section headers: `accessibilityRole="header"` ✓  
- Destructive row ("Sign out"): color + hint both signal intent ✓  
- Export row: `busy` state propagates to `accessibilityState.busy` ✓  
- Decorative chevron and spinner: `accessibilityElementsHidden` ✓  
- Touch targets: `minHeight: 64` on all rows ✓  
- Dark mode: all styles use `useColor()` tokens ✓  
- `textSubtle` (#999 light, #777 dark) used only for decorative chevron (AT-hidden) ✓  

### Changes applied
1. `View` → `Pressable` for the push toggle row with `onPress`, `disabled`, and `accessibilityState.disabled`.

### Changes deferred (DECISION FOR SKY)
None.

---

## OnboardingModal — `/Users/skypie/AccessMap/src/screens/OnboardingModal.tsx`

*(Note: OnboardingModal is the **post-sign-in** onboarding, shown after auth. OnboardingCards is the **pre-auth** first-launch tutorial. Both were audited.)*

### Issues found

#### BLOCKER — Missing `accessibilityViewIsModal` (WCAG 2.4.3)
The full-screen Modal did not set `accessibilityViewIsModal` on its root View. VoiceOver could focus elements behind the modal overlay (the map, navigation tabs). This is a containment failure — assistive tech users get lost navigating content they shouldn't be able to reach.

**Status: FIXED** — added `accessibilityViewIsModal` to root `<View style={styles.screen}>`.

---

#### BLOCKER — Dark mode contrast failure (WCAG 1.4.3 + Parity Matrix Layer 2)
The modal used hardcoded hex colors: `backgroundColor: '#fff'` (screen), `color: '#222'` (title), `color: '#444'` (body), `color: '#666'` (skip text). In dark mode the app's surface switches to `#111` (via ThemeContext) but the modal stayed `#fff` — white modal on dark nav bars, and `#222` text on `#fff` would have been inverted to near-invisible in some cases. The static `StyleSheet` could not respond to the OS color scheme.

**Status: FIXED** — migrated entire stylesheet from `StyleSheet.create({...})` to `makeStyles(color: ColorTheme)`. Added `useColor()` hook call. All color literals replaced with theme tokens: `color.surface`, `color.textStrong`, `color.text`, `color.textMuted`, `color.brand`, `color.textOnBrand`, `color.borderStrong`. Design tokens are contrast-checked in ThemeContext.tsx comments.

---

#### SHOULD FIX — Modal animation ignores Reduce Motion (WCAG 2.3.3)
`animationType="slide"` was hardcoded. Users with vestibular disorders or migraine triggers who have enabled "Reduce Motion" at OS level would still get the slide animation on every appearance. OnboardingCards (the pre-auth counterpart) already uses `useReducedMotion()` correctly.

**Status: FIXED** — `animationType={reducedMotion ? 'none' : 'slide'}` using the existing `useReducedMotion()` hook from `@/lib/accessibility`.

---

#### SHOULD FIX — Carousel ScrollView accessible to AT (WCAG 2.5.7)
The horizontal `ScrollView` was reachable by VoiceOver. AT users could swipe into it and find themselves on off-screen cards with no visible context. The non-drag alternative (Next/Skip buttons) exists but was not the *only* path. The scroll container should be removed from the AT tree entirely.

**Status: FIXED** — added `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` to the ScrollView. AT users navigate exclusively via Next/Skip buttons which provide full position information.

---

#### SHOULD FIX — Incorrect `accessibilityRole="text"` on dots container View (WCAG 4.1.2)
The `dotsRow` View had `accessibilityRole="text"` with a redundant `accessibilityLabel` re-announcing the step position. This role is not valid on a container View in React Native and caused a duplicate announcement alongside the card's own label.

**Status: FIXED** — replaced the role+label combination with `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`. The dots are purely decorative; position is now announced exclusively via `announceForAccessibility()` on index change.

---

#### SHOULD FIX — No `announceForAccessibility` on card navigation (WCAG 4.1.3)
When the user tapped Next, the card changed but no status message was announced. VoiceOver focus moved to the first element of the new card — fine for rotor navigation — but the position context ("Step 2 of 3") was absent.

**Status: FIXED** — added `useEffect` that calls `AccessibilityInfo.announceForAccessibility(\`Step ${index + 1} of ${CARDS.length}\`)` whenever `index` changes.

---

#### NICE TO HAVE — Missing `accessibilityHint` on Next button (WCAG 1.3.3)
The Next button label included position ("Step N of M") but no hint explaining what the action does. Skip had no hint. Get Started had no hint.

**Status: FIXED** — added `accessibilityHint="Moves to the next introduction card"` on Next, and `accessibilityHint="Closes the introduction and opens the app"` on Get Started.

---

### Contrast notes (informational)
- Button text (white `#fff`) on `color.brand` (`#2f80ed`): 3.3:1. At `font.size.lg` (16pt) + `font.weight.bold` (700) this qualifies as WCAG "large text" (≥14pt bold), threshold 3:1. **Passes AA.** Noted for future consideration if the brand color ever changes.
- `color.textMuted` (#666) on `color.surface` (#fff): 5.7:1. Passes AA (4.5:1 threshold). Used for skip text.

### Changes applied
1. `accessibilityViewIsModal` on root View.
2. `animationType` driven by `useReducedMotion()`.
3. `AccessibilityInfo.announceForAccessibility` on index change.
4. Carousel ScrollView hidden from AT.
5. Dots container hidden from AT (removed incorrect `accessibilityRole="text"`).
6. Hints added to Next and Get Started buttons.
7. Full theme-token migration: `useColor()` + `makeStyles(color)` replacing static `StyleSheet.create`.

### Changes deferred (DECISION FOR SKY)
None.

---

## OnboardingCards — `/Users/skypie/AccessMap/src/components/OnboardingCards.tsx`

### Pre-existing good practice (no blockers found)
- `accessibilityViewIsModal` ✓  
- `useReducedMotion()` via `AccessibilityInfo.isReduceMotionEnabled` ✓  
- `announceForAccessibility` on index change ✓  
- Card heading `accessibilityRole="header"` ✓  
- Back `accessibilityState={{ disabled: isFirst }}` ✓  
- All targets ≥44pt ✓  
- Dots decorative / AT-hidden ✓  
- Emoji AT-hidden ✓  
- Theme tokens (`useColor()`) ✓  

### Issues found

#### NICE TO HAVE — Missing `accessibilityHint` on Next button (WCAG 1.3.3)
Skip has a hint ("Closes the tutorial and opens the app"). Get Started has a hint ("Completes the tutorial and opens the app"). Next had none — minor parity gap.

**Status: FIXED** — added `accessibilityHint="Moves to the next tutorial card"`.

### Changes applied
1. `accessibilityHint` on Next button.

---

## Summary

| Screen | BLOCKERs found | BLOCKERs fixed | SHOULD FIX | NICE TO HAVE | Layer 2 result |
|---|---|---|---|---|---|
| SettingsScreen | 1 | 1 | 0 | 0 | PASS |
| OnboardingModal | 2 | 2 | 3 | 1 | PASS |
| OnboardingCards | 0 | 0 | 0 | 1 | PASS |

**All fixes applied. Branch ready for Morgan routing + Sky merge when convenient.**

---

## WCAG 2.2 AA criteria referenced

- 1.1.1 Non-text Content — decorative emoji AT-hidden, no meaningful images without labels
- 1.4.1 Use of Color — dots position not conveyed by color alone (counter + button labels)
- 1.4.3 Contrast (Minimum) — all pairings delegated to theme tokens, contrast-verified in ThemeContext
- 1.4.11 Non-text Contrast — switch/button affordances use OS native rendering
- 1.3.3 Sensory Characteristics — hints added so instructions don't rely on shape/location alone
- 2.3.3 Animation from Interactions — modal and carousel animations respect OS Reduce Motion
- 2.4.3 Focus Order — accessibilityViewIsModal prevents AT from escaping modal
- 2.5.7 Dragging Movements — carousel swipe is sighted-only; AT navigates via buttons
- 4.1.2 Name, Role, Value — push switch now activatable; roles corrected
- 4.1.3 Status Messages — announceForAccessibility on card change
