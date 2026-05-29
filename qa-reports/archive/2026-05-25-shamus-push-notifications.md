# Push Notifications — Shamus Build Report
**Date:** 2026-05-25
**Branch:** `feat/push-notifications-2026-05-25`
**Reviewer approval:** Jordan (2026-05-25, all 6 conditions required)

---

## What was built

| Area | File | Status |
|---|---|---|
| Migration (propose-only) | `supabase/migrations/2026-05-25_push_tokens.sql` | DONE — not applied |
| Edge Function | `supabase/functions/notify-flag-status/index.ts` | DONE — not deployed |
| Database types | `src/types/database.ts` | Extended with `push_tokens` table |
| Push helpers lib | `src/lib/pushNotifications.ts` | New file |
| Settings toggle | `src/screens/SettingsScreen.tsx` | Push notifications row added |
| Sign-out cleanup | `src/screens/SettingsScreen.tsx` | Token cleared before sign-out |
| Tests | `src/lib/__tests__/pushNotifications.test.ts` | 10 new tests |
| tsconfig | `tsconfig.json` | `supabase/functions` excluded from TS compile |

---

## Jordan's 6 required conditions — status

| # | Condition | Status |
|---|---|---|
| 1 | `push_tokens` migration file (propose-only) | ✅ Created at `supabase/migrations/2026-05-25_push_tokens.sql` |
| 2 | RLS owner-only policies | ✅ In migration SQL — 4 policies (select, insert, update, delete) |
| 3 | In-app explanation before OS permission prompt | ✅ `showPushExplanation()` in `pushNotifications.ts` — Alert with "Not now" / "Enable" before `requestPermissionsAsync()` |
| 4 | Settings toggle that deletes the token row | ✅ Switch in SettingsScreen "Notifications" section; toggle-off calls `deletePushToken()` + AsyncStorage |
| 5 | Clear token on sign-out | ✅ `handleSignOutPress` calls `deletePushToken(user.id)` before `signOut()` |
| 6 | Edge Function must NOT log tokens | ✅ Comment at top of function + no `console.log` of token anywhere in the function or lib |
| 7 (recommended) | Upsert, not insert | ✅ `savePushToken` uses `.upsert(..., { onConflict: 'user_id' })` |

---

## expo-notifications status

**NOT installed.** `grep "expo-notifications" package.json` returned nothing.

Sky must run:
```
npx expo install expo-notifications
```
before push tokens can be acquired. The app will not crash without it — all calls degrade gracefully via dynamic `require()` wrapped in try/catch, returning `null` for the token.

---

## How to test the toggle in the app

1. Install the package: `npx expo install expo-notifications`
2. Run the app: `npm start`
3. Navigate to the **Settings** tab (4th tab)
4. Under "Notifications", you'll see "Push notifications" with a Switch control
5. Toggle it ON → in-app Alert fires: "Get notified when your flag is verified or resolved. You can turn this off anytime in Settings."
6. Tap "Enable" → OS permission prompt fires → grant permission
7. Token is upserted into `push_tokens` (visible in Supabase table editor)
8. Toggle it OFF → token row is deleted from `push_tokens`, AsyncStorage set to false
9. Sign out → token is silently deleted (best-effort) before session ends

---

## Sky's deploy checklist

### Step 1 — Apply the database migration
In the **Supabase SQL editor** for your AccessMap project, run the contents of:
```
supabase/migrations/2026-05-25_push_tokens.sql
```
This is idempotent (`create table if not exists`, `create or replace function`, `drop trigger if exists`). Safe to re-run.

### Step 2 — Deploy the Edge Function
In your terminal (requires Supabase CLI):
```bash
cd ~/AccessMap
supabase functions deploy notify-flag-status --project-ref <your-project-ref>
```
Then in the Supabase dashboard, set up a **Database Webhook** on the `flags` table:
- Event: `UPDATE`
- HTTP method: `POST`
- URL: `https://<project-ref>.supabase.co/functions/v1/notify-flag-status`
- Headers: `Authorization: Bearer <service_role_key>` (or use the built-in secret injection)

The Edge Function uses `SUPABASE_SERVICE_ROLE_KEY` (injected automatically by the Supabase runtime) to bypass RLS when reading the push token.

### Step 3 — Install expo-notifications (if not done)
```bash
cd ~/AccessMap
npx expo install expo-notifications
```
Then rebuild the dev client (`npx expo run:ios` or `npx expo run:android`) — Expo Go does not support push tokens; a dev build or production build is required.

---

## Test results

| Check | Result |
|---|---|
| `npm run typecheck` | 0 errors |
| `npm test` | 735 passed (was 725 before — +10 new tests for pushNotifications.ts) |
| No token logging | Verified — no `console.log(token)` anywhere in new code |

---

## What is deferred / requires Sky action

- **Migration not applied** — propose-only per Jordan's condition 1
- **Edge Function not deployed** — requires Supabase CLI + webhook setup (see Step 2 above)
- **expo-notifications not installed** — requires `npx expo install expo-notifications` + dev client rebuild
- **Do NOT merge to main** — branch `feat/push-notifications-2026-05-25` only
