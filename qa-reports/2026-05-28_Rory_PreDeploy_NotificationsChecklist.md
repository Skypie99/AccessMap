# ✅ RORY NOTIFICATIONS PRE-DEPLOY CHECKLIST

**Date:** 2026-05-28 · **Status:** READY (awaiting Dana D2 approval signal)  
**Authority:** Morgan (Standing Approval)

---

## PRE-DEPLOY VERIFICATION

Once **Dana approves `2026-05-25_push_tokens_table.sql` and confirms migration apply**, execute in this order:

### STEP 1: Confirm D2 Applied (2 min)
- [ ] Check Supabase dashboard → SQL Editor history
- [ ] Verify `2026-05-25_push_tokens_table.sql` appears in recent executions
- [ ] Confirm schema: `public.push_tokens` table exists with columns:
  - `id` (uuid PK)
  - `user_id` (uuid FK → auth.users)
  - `expo_token` (text)
  - `platform` (enum: ios / android / web)
  - `created_at`, `updated_at`, `last_used_at`
  - Indexes on `user_id`, `created_at`
  - RLS policies: user_id isolation

### STEP 2: Deploy Edge Function (18 min)
- [ ] Navigate to Supabase dashboard → Edge Functions
- [ ] Deploy function: `push-notifications` (if not already deployed)
  - Source: `supabase/functions/push-notifications/index.ts`
  - Env vars needed: `EXPO_ACCESS_TOKEN` (set via Supabase dashboard Secrets)
  - Runtime: Deno
- [ ] Verify function is ONLINE (green status)
- [ ] Test trigger: POST to function with test payload
  ```json
  {
    "userId": "<test-user-uuid>",
    "title": "Test Notification",
    "body": "Edge Function deployed successfully"
  }
  ```

### STEP 3: Verify Client Wiring (2 min)
- [ ] Confirm `src/lib/notifications.ts` is exporting:
  - `requestPermissions()` → calls `expo-notifications.requestPermissionsAsync()`
  - `registerToken()` → sends token to Edge Function
  - `handleNotificationReceived()` event listener
- [ ] Confirm `MapScreen.tsx` or `ProfileScreen.tsx` calls `registerToken()` on app launch
- [ ] Verify Settings screen has toggle: "Push notifications" (if implemented)

### STEP 4: Report Deployment (1 min)
- [ ] Create report: `qa-reports/2026-05-28_Rory_Notifications_Deployed.md`
  - Status: ✅ DEPLOYED
  - Timestamp: [deployment time]
  - Function URL: [Supabase function URL]
  - Test result: [pass/fail]
  - Next: Verify client receives test notifications

---

## TIMELINE

**Trigger:** Dana approves D2 migration  
**Execution:** 18 min (Steps 1–4)  
**Unblocks:** Push notifications go-live for all users  
**Gate:** Pre-deployment verification PASS before moving to client testing

---

## ROLLBACK (if needed)

If deployment fails at any step:
1. Disable Edge Function in Supabase dashboard (toggle off)
2. Revert client notification calls to console.warn only (safe fallback)
3. Report issue + blockers to Morgan
4. Do NOT apply D2 migration rollback unless Function deploy is fundamentally broken

---

**Status:** Ready to execute. Awaiting Dana D2 approval signal. You'll receive notification when checklist items are complete.

**RORY: Once you see this, monitor for Dana's D2 approval. When it arrives, execute checklist immediately.**
