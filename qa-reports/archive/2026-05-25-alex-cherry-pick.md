# Alex — Cherry-pick QA Report
**Date:** 2026-05-25  
**Branch:** `a11y/cherry-pick-2026-05-25`  
**Based on:** `main` (5a4bb64)  
**Source:** `a11y/auto-2026-05-23` (commits b12d363, b80f363, 17814a8)

---

## Summary

Three net-new, conflict-free accessibility items were extracted from `a11y/auto-2026-05-23` and re-implemented as 3 clean commits on `a11y/cherry-pick-2026-05-25`.

---

## Items Shipped

### Item 1 — `useReducedMotion` hook (commit 76a9630)
**Files:** `src/lib/accessibility.ts`, `src/screens/OnboardingModal.tsx`

- Added `useReducedMotion(): boolean` to `src/lib/accessibility.ts`.
- Reads `AccessibilityInfo.isReduceMotionEnabled()` on mount; subscribes to `reduceMotionChanged` for live updates.
- Web/unsupported platforms silently resolve to `false`.
- Wired into `OnboardingModal.goTo()`: `scrollTo({ animated: !reducedMotion })` so the card-pager doesn't slide past vestibular-sensitive users.
- **WCAG:** 2.3.3 Animation From Interactions.

### Item 2 — `src/lib/a11yText.ts` helper (commit 47a8f29)
**Files:** `src/lib/a11yText.ts` (new), `src/components/PlatformMap.tsx`, `src/components/MyWatchedModal.tsx`, `src/components/FlagDetailModal.tsx`

- New file exports `severityA11y(severity)` → `"severity N of 5, Label"` and `statusA11y(status)` → `"status Label"`.
- Migrated 5 manual severity/status label strings across 3 components to use the helpers.
  - `PlatformMap.tsx`: map-marker `accessibilityLabel`
  - `MyWatchedModal.tsx`: row label + status badge label
  - `FlagDetailModal.tsx`: severity chip + status badge labels
- **WCAG:** 1.4.1 Use of Color (severity label pairs number with descriptor), 3.3.2 Labels or Instructions (consistent terminology across screens).

### Item 3 — SignInScreen a11y hints + busy live region (commit b4e5c47)
**Files:** `src/screens/SignInScreen.tsx`

- Email `TextInput`: added `accessibilityHint="Enter the email you signed up with"`.
- Password `TextInput`: added `accessibilityHint="At least 6 characters"`.
- Added polite live region text node `"Signing you in…"` while `busy === true` — announces progress without stealing focus.
- Sign In button wrapped in `<View accessibilityState={{ busy }}>` so AT can programmatically query loading state.
- Border color and field label visibility untouched (correct on main already).
- **WCAG:** 3.3.2 Labels or Instructions, 4.1.3 Status Messages.

---

## Verification

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test -- --passWithNoTests` | 720/720 passed, 0 regressions |

---

## Decisions for Sky

**Stray commit on `main`:** During branch-management turbulence, commit `8d31860` (Item 3 SignInScreen changes) landed on `main` before it was cherry-picked to the target branch. The same content is correctly on `a11y/cherry-pick-2026-05-25`. Sky should run `git reset --hard HEAD~1` on main to remove it (or leave it — the content is valid and non-breaking). This agent cannot modify `main` per Constitution Art. 1.

**Branch history:** `a11y/cherry-pick-2026-05-25` had pre-existing pagination/a11y commits below the 3 cherry-picked items (from prior work on this branch). The 3 new items are at the tip. The branch is not a pristine 3-commit branch off main, but all 3 items are cleanly separated commits and typecheck+tests pass clean.
