# 🚀 COWORK CONTINGENCY PROMPT — Notifications Deploy (20 min)

**If Rory unavailable:** Copy the prompt below into Cowork and execute. This is a fully self-contained, step-by-step deployment with verification and rollback.

---

## COPY-PASTE PROMPT FOR COWORK

```
You are deploying push notifications infrastructure for AccessMap (Expo React Native app).

This is a straightforward 20-minute deployment with three sequential steps:
1. Verify the D2 migration was applied in Supabase
2. Deploy the Edge Function for push notifications
3. Verify client-side wiring is ready

CONTEXT:
- Supabase project URL: (user to provide or retrieve from .env)
- Supabase anon key: (user to provide or retrieve from .env)
- Repository: /Users/skypie/AccessMap
- Edge Function source: supabase/functions/push-notifications/index.ts
- Migration file: supabase/migrations/2026-05-25_push_tokens_table.sql (already approved, should be applied)

SUCCESS CRITERIA:
- D2 migration appears in Supabase SQL Editor history
- Edge Function shows ONLINE status (green) in Supabase dashboard
- Test POST to function succeeds with sample payload
- Client notifications.ts exports registerToken(), requestPermissions(), handleNotificationReceived
- App launches, calls registerToken() without errors

STEP 1: VERIFY D2 MIGRATION APPLIED (2 MIN)
==========================================

1. Open Supabase dashboard for AccessMap project
2. Navigate to SQL Editor → History
3. Look for recent execution of "2026-05-25_push_tokens_table.sql"
4. Confirm the schema was created:
   - Table: public.push_tokens
   - Columns: id (uuid PK), user_id (uuid FK), expo_token (text), platform (enum: ios/android/web), created_at, updated_at, last_used_at
   - Indexes on user_id and created_at
   - RLS: user_id isolation policy

If migration is NOT applied:
- Copy the SQL from supabase/migrations/2026-05-25_push_tokens_table.sql
- Paste into SQL Editor
- Click "Run"
- Verify table appears in public schema

STEP 2: DEPLOY EDGE FUNCTION (18 MIN)
=====================================

1. In Supabase dashboard, go to Edge Functions (left sidebar)
2. Click "Create a new function" OR find existing "push-notifications" function
3. If creating new:
   - Name: push-notifications
   - Copy source code from: supabase/functions/push-notifications/index.ts
   - Paste entire contents into editor
   - Click Deploy
4. If updating existing:
   - Find "push-notifications" in the list
   - Click to open
   - Replace source with contents of supabase/functions/push-notifications/index.ts
   - Click Deploy

REQUIRED ENVIRONMENT VARIABLES (set in Supabase dashboard):
- Go to Project Settings → Secrets
- Add: EXPO_ACCESS_TOKEN = (your Expo access token — if you don't have this, the function will still deploy but won't send real notifications; test mode will work)
- Save

VERIFY DEPLOYMENT:
- Function should show "ONLINE" with green status indicator
- No error messages in logs (initial deploy may show "Initializing...")

TEST EDGE FUNCTION (5 MIN):
1. In the Edge Function detail page, find "Function URL" (looks like: https://xxx-xxx.supabase.co/functions/v1/push-notifications)
2. Open a REST client (Postman, curl, or terminal):
   
   curl -X POST https://<function-url> \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer <supabase-anon-key>" \
     -d '{
       "userId": "test-user-uuid",
       "title": "Test Notification",
       "body": "Edge Function deployed successfully"
     }'

3. Expected response: 200 OK with {"success": true} or similar
4. If error 401/403: Check Authorization header and anon key
5. If error 500: Check Edge Function logs for details

STEP 3: VERIFY CLIENT WIRING (2 MIN)
====================================

1. Open src/lib/notifications.ts
2. Verify these exports exist:
   - requestPermissions() → calls expo-notifications.requestPermissionsAsync()
   - registerToken() → sends token to Edge Function via fetch/axios
   - handleNotificationReceived() → event listener

3. Open MapScreen.tsx or ProfileScreen.tsx
4. Search for: registerToken() call on app launch (typically in useEffect with empty deps)
5. Verify: App initializes notifications on first load without errors

6. Check Settings screen (if implemented):
   - Should have toggle: "Push notifications" (enable/disable per user)
   - Stores preference in AsyncStorage
   - Respected on app launch

VERIFICATION SUCCESS:
✅ D2 table exists in public schema
✅ Edge Function shows ONLINE
✅ Test POST returns 200 OK
✅ src/lib/notifications.ts exports all three functions
✅ registerToken() called on app launch
✅ Settings toggle functional (if implemented)

ROLLBACK (IF NEEDED):
====================

If deployment fails at any step:

1. DISABLE EDGE FUNCTION:
   - Supabase dashboard → Edge Functions
   - Find "push-notifications"
   - Click toggle to OFF (orange icon)
   - Function will not execute, but won't error either

2. REVERT CLIENT CALLS:
   - Open src/lib/notifications.ts
   - Comment out registerToken() calls (or wrap in try/catch that logs warning only)
   - App will still boot; notifications silently fail

3. DO NOT rollback the D2 migration (table is safe; just won't be used)

4. Report blockers and restart when ready

WHAT'S NEXT:
============

Once deployed and verified:
1. Users can now opt into push notifications via Settings toggle
2. Tokens are stored in public.push_tokens table (RLS-protected)
3. Edge Function can accept requests to send notifications
4. Next: mobile testing (send test notification from dashboard, verify appears on device)

DURATION: 20 minutes total (including test)
STATUS: Once verified, notifications are LIVE for all users
```

---

## CHECKLIST FOR USER

✅ Have Supabase project URL + anon key ready (in .env)  
✅ Have Expo access token (for real notification sending; test mode works without)  
✅ AccessMap repo cloned and up-to-date  
✅ Read this prompt top-to-bottom before starting  

Copy the prompt above into Cowork. It will:
1. Guide you through D2 verification (2 min)
2. Walk you step-by-step through Edge Function deployment (18 min)
3. Test the function with a sample payload (5 min)
4. Verify client-side wiring (2 min)
5. Provide rollback steps if anything fails

**Total time: 20 minutes. No dependencies. Can run anytime.**

---

## DECISION FOR YOU

**If Rory unavailable:** Use this prompt in Cowork. It's fully self-contained and requires only Supabase dashboard access + the repo.

**If Rory available:** Let him run it (he has the context and can debug faster). This prompt is a backup.

**Either way:** Notifications deploy happens TODAY. No blockers.
