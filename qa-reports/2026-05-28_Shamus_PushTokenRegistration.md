# Shamus — Push Token Registration
**Date:** 2026-05-28  
**Branch:** `feat/push-token-registration-2026-05-28` (off `privacy/exif-strip-2026-05-28`)  
**Commit:** `c3a37cd`  
**Typecheck:** 0 errors

---

## What was built

Wired push notification token registration into the auth flow. No new screens, no new dependencies — pure wiring of the already-complete `pushNotifications.ts` library.

### Changes

**`src/lib/auth.tsx`** (+35 lines, -1 line):

1. Static imports of `getPushEnabled`, `requestExpoPushToken`, `savePushToken`, `showPushExplanation` from `./pushNotifications`.

2. Module-level `registerPushToken(userId, promptIfNew)` helper — best-effort, never throws:
   - If `promptIfNew` is true and push not yet enabled: shows PIPEDA-required in-app explanation, then requests OS permission, then upserts token.
   - If already enabled: silently re-registers (handles Expo token rotation on reinstall/upgrade).
   - If `promptIfNew` is false (session restore): only re-registers if previously enabled — never prompts.
   - All failure paths (permission denied, `expo-notifications` absent, network) are caught silently.

3. `onAuthStateChange` now handles two events:
   - `SIGNED_IN` → `registerPushToken(userId, true)` — may show PIPEDA explanation
   - `INITIAL_SESSION` → `registerPushToken(userId, false)` — silent re-registration only

### Sign-out path (pre-existing, not changed)
`supabase.ts` `signOut()` already calls `deletePushToken(userId)` via dynamic import. Sign-out clears both the DB row and the `@accessmap/push_enabled` AsyncStorage key.

---

## End-to-end flow (now complete)

| Step | Status | Where |
|---|---|---|
| `push_tokens` table + RLS | ✅ Live | DB (applied prior session) |
| `send-push-notification` Edge Function | ✅ Deployed | Supabase (Rory, prior session) |
| `notify-flag-status` Edge Function | ✅ Deployed | Supabase (Rory, this session) |
| `expo-notifications` installed | ✅ `~0.32.17` | `package.json` (Rory, this session) |
| `pushNotifications.ts` library | ✅ Built | `src/lib/pushNotifications.ts` |
| Sign-out token cleanup | ✅ Wired | `src/lib/supabase.ts` `signOut()` |
| Sign-in token registration | ✅ Wired | `src/lib/auth.tsx` (this commit) |
| `NOTIFY_WEBHOOK_SECRET` set | ✅ Done | Supabase Edge Function secrets (Sky/Cowork) |
| DB webhook on `public.flags UPDATE` | ✅ Done | Supabase DB webhooks (Sky/Cowork) |

**Push notifications are fully wired end-to-end.**

---

## UI Compliance Gate

Not applicable — no UI changes in this branch.

---

## Merge notes

Branch is ready to merge as part of the Monday wave, after `privacy/exif-strip-2026-05-28` (its base). The `package.json` + `package-lock.json` changes from the expo-notifications install are on this branch via commit `ae4abf5` and are included.
