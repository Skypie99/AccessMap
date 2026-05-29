# Steve — Email Select Cleanup
**Date:** 2026-05-29  
**Role:** Steve (Security / Code Hygiene)  
**Branch:** fix/email-select-cleanup-2026-05-29  
**Status:** COMPLETE — branch pushed, NOT merged to main

---

## Summary

The email-privacy migration revoked the `email` column from `public.users` grants for `authenticated`. Three `.select()` calls against `public.users` still included `email` in their column list — returning `null` silently on every call. This is dead code: unnecessary wire bytes and a future hazard if the grant is ever mistakenly reinstated.

**Result: NOT already clean.** Changes were required and have been applied.

---

## Findings

### Dead `.select()` columns (3 locations)

| File | Line (origin/main) | Issue |
|------|-------------------|-------|
| `src/lib/users.ts` | 45 | `updateUserProfile` selected `email` on the `.update().select()` return |
| `src/screens/ProfileScreen.tsx` | 270 | Profile load query included `email` |
| `src/screens/SettingsScreen.tsx` | 248 | Settings/data-export query included `email` |

### Dead fallback expression (1 location)

| File | Line | Issue |
|------|------|-------|
| `src/screens/SettingsScreen.tsx` | 263 | `user.email ?? profileRow?.email ?? null` — the `profileRow?.email` half always resolved to `null` post-migration |

The `user.email` references elsewhere in both screens (e.g. `user.email` from the Supabase auth object at line 717 in ProfileScreen, the `getInitials` call) are **not affected** — those come from the auth session object, not the public.users table, and continue to work correctly.

---

## Changes Made

**Branch:** `fix/email-select-cleanup-2026-05-29` (off `origin/main`, commit `6db83a0`)

**`src/lib/users.ts`**
- Removed `email` from `.select('id, email, display_name, avatar_url, points, created_at')` → `'id, display_name, avatar_url, points, created_at'`

**`src/screens/ProfileScreen.tsx`**
- Same select column removal (profile load query)

**`src/screens/SettingsScreen.tsx`**
- Same select column removal (data-export query)
- Simplified `user.email ?? profileRow?.email ?? null` → `user.email ?? null` (dead fallback removed)

---

## Typecheck + Test Results

**Typecheck:** 1 pre-existing error (`expo-image-manipulator` missing types in `src/lib/flags.ts`). Identical on `origin/main`. Zero new errors introduced.

**Tests:** The `users.test.ts` suite fails to run in the local environment due to the same missing `expo-image-manipulator` module. This failure is pre-existing and identical on `origin/main`. No new failures introduced.

---

## Decisions for Sky

None — this is straightforward dead-code removal, reversible, no behavioral change. `user.email` fallback to auth session is preserved throughout. Branch is ready for Shamus to review and merge when appropriate.

---

## Files Changed

- `src/lib/users.ts`
- `src/screens/ProfileScreen.tsx`
- `src/screens/SettingsScreen.tsx`
