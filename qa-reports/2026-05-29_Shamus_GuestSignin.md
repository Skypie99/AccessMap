# Shamus QA Report — Guest Sign-In + Hamburger Menu
**Date:** 2026-05-29
**Role:** Shamus (Lead Developer)
**Branch:** `feat/guest-signin-hamburger-menu-2026-05-29`
**Status:** COMPLETE — 0 TS errors, 1120/1120 tests pass

---

## Summary

Feature complete. Guest sign-in + hamburger drawer is fully implemented on the branch. All Jordan conditions satisfied. Steve's signOut fix applied. Propose-only migration written.

---

## What Was Done

### 1. Branch Setup
- Checked out `feat/guest-signin-hamburger-menu-2026-05-29`
- Popped `stash@{0}` ("rory-stash: WIP on feat/guest-signin-hamburger-menu-2026-05-29 before merge wave")
- Cherry-picked 3 commits from `gary/fix-test-failures-2026-05-29`:
  - `597848d` — feat(ui): Round 1 liquid-glass design overhaul (adds HamburgerDrawer, LogoMark, HowToHelpScreen, ResourcesScreen, App.tsx guest mode, RootNavigator redesign)
  - `7793929` — feat(ui): Round 2 dark tiles, sign-in polish, drawer refinement
  - `e64a529` — fix(tests): resolve pre-existing flags.supabase + dayGroup test failures (jest.resetAllMocks)
- Applied OnboardingCards.tsx liquid-glass redesign from stash (emoji → Ionicons, dark gradient bg, glass card layout)

### 2. Jordan Condition 1 — Anon SELECT migration (Option A — Sky approved)
File: `supabase/migrations/2026-05-29_anon_flags_select.sql`
- Single idempotent policy: `CREATE POLICY "flags readable by anon" ON public.flags FOR SELECT TO anon USING (true);`
- Full header with author, privacy analysis, blast radius table, rollback, how-to-apply instructions
- PROPOSE-ONLY — not applied to live DB (Const. Art. 5.3)

### 3. Jordan Condition 2 — Hide Report FAB for guests
File: `src/screens/MapScreen.tsx`
- Wrapped the `＋ Report` FAB in `{authUser && (...)}` — only renders when signed in
- Also guarded `handleMapLongPress` with `if (!authUser) return;` so long-press doesn't trigger the report flow for guests either
- Added `authUser` to the `useCallback` dependency array for correctness

### 4. Jordan Condition 3 — Guest mode ephemeral (already implemented)
- `guestMode` is React state in `Gate` (App.tsx) — not written to AsyncStorage, not sent to Supabase
- On app restart, guest returns to SignInScreen (confirmed: no persistence path)

### 5. Steve Fix — signOut passes userId
File: `src/components/HamburgerDrawer.tsx`
- Changed `await signOut()` → `await signOut(user?.id)` in `handleSignOut`
- Added `user` to `useCallback` deps
- Result: when a signed-in user signs out from the drawer, the offline flag cache, tile cache, and push token are properly cleared via `supabase.ts` signOut logic

---

## Files Changed

| File | Change |
|---|---|
| `src/components/HamburgerDrawer.tsx` | Steve fix: pass `user?.id` to `signOut()` |
| `src/screens/MapScreen.tsx` | Jordan Condition 2: hide Report FAB + guard long-press for guests |
| `src/components/OnboardingCards.tsx` | Liquid-glass redesign: Ionicons, dark gradient, glass card layout, new styles |
| `supabase/migrations/2026-05-29_anon_flags_select.sql` | Jordan Condition 1: propose-only anon SELECT policy |
| (cherry-picked) `src/components/HamburgerDrawer.tsx` | Full HamburgerDrawer implementation |
| (cherry-picked) `src/components/LogoMark.tsx` | New LogoMark component |
| (cherry-picked) `src/screens/HowToHelpScreen.tsx` | New HowToHelp modal screen |
| (cherry-picked) `src/screens/ResourcesScreen.tsx` | New Resources modal screen |
| (cherry-picked) `App.tsx` | guestMode state + onGuest prop wiring |
| (cherry-picked) `src/navigation/RootNavigator.tsx` | Hamburger button, Ionicons tabs, dark nav bar |
| (cherry-picked) `src/screens/SignInScreen.tsx` | Liquid-glass sign-in, guest CTA, Round 2 polish |
| (cherry-picked) `src/components/PlatformMap.web.tsx` | CartoDB Dark Matter tiles |
| (cherry-picked) `src/lib/__tests__/flags.supabase.test.ts` | jest.resetAllMocks fix |

---

## Quality Gates

| Gate | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npx jest --passWithNoTests --forceExit` | 1120/1120 passed |
| Jordan Condition 1 (Option A migration) | DONE — propose-only file written |
| Jordan Condition 2 (hide FAB for guests) | DONE — FAB + long-press guarded |
| Jordan Condition 3 (ephemeral guest) | CONFIRMED — no AsyncStorage write |
| Steve fix (signOut userId) | DONE — `user?.id` passed |

---

## Decisions for Sky

| # | Decision | Status |
|---|---|---|
| Apply `supabase/migrations/2026-05-29_anon_flags_select.sql` | Pending Sky action in Supabase Dashboard | Required before guests see flags on the map |
| Merge `feat/guest-signin-hamburger-menu-2026-05-29` to main | Pending Sky / Morgan merge gate | Branch is clean, ready for review |

---

## Not Merged
Branch is NOT merged to main per standing policy. Sky merges only.

---

*Shamus (Lead Developer) — AccessMap*
