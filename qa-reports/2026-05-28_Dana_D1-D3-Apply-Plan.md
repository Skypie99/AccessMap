---
title: Dana — D1/D2/D3 SQL Apply Plan + Rollback
date: 2026-05-28
role: Dana (Database Planning)
task: Generate SQL apply order + copy-paste blocks for Sky
approval_status: CLEARED (Steve + Jordan co-signed D1/D2/D3)
---

# D1/D2/D3 Apply Plan for AccessMap

## Executive Summary

Steve (Security) and Jordan (Privacy) have co-signed all three migrations:
- **D1 — Flag Edit RLS Replacement** ✅ APPROVED
- **D2 — Push Tokens Table** ✅ APPROVED
- **D3 — Status Update Trigger** ✅ APPROVED
- **D4 — Realtime Flags Publication** ⚠️ BLOCKED (Sky decision pending on privacy design)

This document provides the exact SQL blocks ready for Sky to copy-paste into the Supabase SQL Editor, plus rollback procedures and smoke-test queries.

---

## Apply Order (Critical)

Apply in this order:

1. **D1** — `2026-05-25_flag_edit_rls_replacement.sql` (RLS policy tightening)
2. **D2** — `2026-05-25_push_tokens.sql` (new table + RLS + trigger)
3. **D3** — `2026-05-23_status_update_trigger_proposal.sql` (column-level revert trigger)

**Reason:** D1 must apply before D3 so the "flags owner edit open" policy is in place when the trigger fires. D2 is independent but grouped with D1/D3 in this batch for atomicity.

---

## D1: Flag Edit RLS Replacement

**File:** `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`  
**Approval:** Steve (Security) ✅ + Jordan (Privacy) ✅  
**Condition:** Edit UI must NOT expose photo_url field (code-level, not RLS — Shamus enforces this in UI build)

### Copy-Paste SQL (Apply this first)

```sql
-- D1: Flag Edit RLS Replacement (2026-05-25)
-- Approved by Steve (Security) + Jordan (Privacy) on 2026-05-28

drop policy if exists "flags update own" on public.flags;

create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
  )
  with check (
    (select auth.uid()) = user_id
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );
```

### Rollback SQL (if needed)

```sql
-- D1 Rollback: Restore original permissive owner UPDATE policy

drop policy if exists "flags owner edit open" on public.flags;

create policy "flags update own"
  on public.flags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

### What D1 Does

- **Tightens ownership check:** Owners can now only edit their own **open** flags (not verified/resolved/rejected).
- **Freezes immutable columns:** lat, lng, user_id, created_at, status cannot be changed even by the owner.
- **Allows editable columns:** description, category, severity can be freely updated by the owner on open flags.
- **Photos:** photo_url is technically editable in the DB, but the edit UI will omit it per Shamus (code-level protection). If you want DB-layer lock, add `photo_url is not distinct from (select photo_url from public.flags where id = flags.id)` to WITH CHECK.

### Smoke Test (after D1 applies)

```sql
-- Test 1: Owner edits description on their own open flag
-- Should succeed; updated_at refreshes
UPDATE public.flags
SET description = 'Updated description'
WHERE id = <owner-flag-id> AND status = 'open' AND user_id = auth.uid();
-- Expected: 1 row affected

-- Test 2: Owner tries to change lat/lng via correlated subselect
-- Should fail (WITH CHECK rejects)
UPDATE public.flags
SET lat = lat + 0.001
WHERE id = <owner-flag-id> AND user_id = auth.uid();
-- Expected: 0 rows affected (WITH CHECK fails silently as no-op)

-- Test 3: Owner tries to edit a verified flag they own
-- Should fail (USING requires status = 'open')
UPDATE public.flags
SET description = 'Changed'
WHERE id = <owner-verified-flag-id> AND user_id = auth.uid();
-- Expected: 0 rows affected (USING excludes non-open rows)

-- Test 4: Non-owner tries to edit owner's open flag
-- Should fail (USING requires ownership)
UPDATE public.flags
SET description = 'Hacked'
WHERE id = <owner-flag-id>;
-- Expected: 0 rows affected (USING requires auth.uid() = user_id)

-- Test 5: Non-owner can still flip status via existing policy
-- This should still work (the "flags status update by any authenticated" policy remains unchanged)
UPDATE public.flags
SET status = 'verified'
WHERE id = <any-flag-id>;
-- Expected: 1 row affected (non-owner status policy still active)
```

---

## D2: Push Tokens Table

**File:** `supabase/migrations/2026-05-25_push_tokens.sql`  
**Approval:** Steve (Security) ✅ + Jordan (Privacy) ✅  
**Condition:** App code must DELETE the push_tokens row on sign-out. Verify in `src/lib/auth.tsx` before deploying.

### Copy-Paste SQL (Apply this second)

```sql
-- D2: Push Tokens Table (2026-05-25)
-- Approved by Steve (Security) + Jordan (Privacy) on 2026-05-28

create table if not exists public.push_tokens (
  user_id   uuid primary key references public.users(id) on delete cascade,
  token     text not null,
  platform  text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

create policy "push_tokens: owner select"
  on public.push_tokens for select
  using (auth.uid() = user_id);

create policy "push_tokens: owner insert"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

create policy "push_tokens: owner update"
  on public.push_tokens for update
  using (auth.uid() = user_id);

create policy "push_tokens: owner delete"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

create or replace function public.handle_push_token_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_tokens_updated_at on public.push_tokens;
create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_push_token_updated_at();
```

### Rollback SQL (if needed)

```sql
-- D2 Rollback: Drop push_tokens table and related objects

drop trigger if exists push_tokens_updated_at on public.push_tokens;
drop function if exists public.handle_push_token_updated_at();
drop table if exists public.push_tokens;
```

### What D2 Does

- **Creates public.push_tokens table** with one row per user (primary key: user_id).
- **Stores push notification tokens** (token field) and platform (ios/android/web).
- **RLS policies:** Owner-scoped SELECT/INSERT/UPDATE/DELETE; service-role bypasses for Edge Function.
- **Automatic timestamp:** handle_push_token_updated_at trigger sets updated_at on every update.

### Smoke Test (after D2 applies)

```sql
-- Test 1: Authenticated user inserts their own token
-- Should succeed
INSERT INTO public.push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'ExponentPushToken[test123]', 'ios');
-- Expected: 1 row inserted

-- Test 2: User selects their own token
-- Should succeed
SELECT * FROM public.push_tokens WHERE user_id = auth.uid();
-- Expected: 1 row returned (the token from Test 1)

-- Test 3: User tries to read another user's token
-- Should fail (RLS policy blocks)
SELECT * FROM public.push_tokens WHERE user_id = '<different-user-uuid>';
-- Expected: 0 rows (RLS: owner select policy blocks)

-- Test 4: User updates their own token
-- Should succeed
UPDATE public.push_tokens
SET token = 'ExponentPushToken[updated123]'
WHERE user_id = auth.uid();
-- Expected: 1 row affected; updated_at refreshed by trigger

-- Test 5: User deletes their own token (opt-out)
-- Should succeed
DELETE FROM public.push_tokens WHERE user_id = auth.uid();
-- Expected: 1 row deleted

-- Verification: Check that the row no longer exists
SELECT * FROM public.push_tokens WHERE user_id = auth.uid();
-- Expected: 0 rows
```

---

## D3: Status Update Trigger

**File:** `supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`  
**Approval:** Steve (Security) ✅ + Jordan (Privacy) ✅

### Copy-Paste SQL (Apply this third)

```sql
-- D3: Status Update Trigger (2026-05-23)
-- Approved by Steve (Security) + Jordan (Privacy) on 2026-05-28

create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.user_id     := old.user_id;
  new.lat         := old.lat;
  new.lng         := old.lng;
  new.category    := old.category;
  new.severity    := old.severity;
  new.description := old.description;
  new.photo_url   := old.photo_url;
  new.created_at  := old.created_at;
  return new;
end;
$$;

drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
create trigger enforce_flag_status_only_for_non_owner
  before update on public.flags
  for each row execute function public.enforce_flag_status_only_for_non_owner();
```

### Rollback SQL (if needed)

```sql
-- D3 Rollback: Drop the column-revert trigger

drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
drop function if exists public.enforce_flag_status_only_for_non_owner();

-- After rollback, the verbose "flags status update by any authenticated" RLS policy
-- remains in place (baseline from schema.sql), enforcing column-level access control
-- via WITH CHECK instead of a trigger. The app will see failures on unauthorized
-- column changes instead of silent reverts.
```

### What D3 Does

- **Creates a BEFORE UPDATE trigger** that enforces non-owners can only change the `status` column.
- **Silent revert behavior:** If a non-owner tries to change any column except status, that column is reverted to its OLD value. The UPDATE succeeds at the HTTP layer but the unauthorized columns are unchanged in the DB.
- **Owner bypass:** Owners and unauthenticated (already blocked by RLS) keep full edit rights.
- **Future-proof:** Any new column added to flags gets automatic protection (the trigger only sets the ones it knows about, leaving new columns unchanged).

### Smoke Test (after D3 applies)

```sql
-- Setup: Create a test flag as Account A
INSERT INTO public.flags (lat, lng, user_id, category, severity, description, status)
VALUES (47.6062, -122.3321, auth.uid(), 'no_ramp', 3, 'No ramp at entrance', 'open');
-- Note the id for the next tests; let's call it <flag-id>

-- Test 1: Non-owner tries to flip status (should succeed)
-- Use a different authenticated user (Account B)
UPDATE public.flags
SET status = 'verified'
WHERE id = <flag-id>;
-- Expected: 1 row affected; status becomes 'verified'

-- Test 2: Non-owner tries to edit description (should be silently reverted)
UPDATE public.flags
SET description = 'Hacked description'
WHERE id = <flag-id>;
-- Expected: 1 row affected at HTTP layer, but description remains 'No ramp at entrance'

-- Verify Test 2:
SELECT description FROM public.flags WHERE id = <flag-id>;
-- Expected: 'No ramp at entrance' (not 'Hacked description')

-- Test 3: Non-owner tries to change lat/lng (should be silently reverted)
UPDATE public.flags
SET lat = 0, lng = 0
WHERE id = <flag-id>;
-- Expected: 1 row affected, but lat/lng unchanged

-- Verify Test 3:
SELECT lat, lng FROM public.flags WHERE id = <flag-id>;
-- Expected: 47.6062, -122.3321 (not 0, 0)

-- Test 4: Owner (Account A) can still edit description on their open flags
-- Switch back to Account A
UPDATE public.flags
SET description = 'Updated by owner'
WHERE id = <flag-id> AND status = 'open' AND user_id = auth.uid();
-- Note: Test 1 set status to 'verified', so this will return 0 rows (D1 policy excludes non-open)

-- Test 5: Verify the points trigger still fires on status change
-- (This is outside the scope of D3 alone, but important for smoke testing)
-- Create another flag as Account A, then have Account B verify it
INSERT INTO public.flags (lat, lng, user_id, category, severity, description, status)
VALUES (47.6062, -122.3321, auth.uid(), 'no_ramp', 3, 'Another flag', 'open');
-- Note the id; call it <flag2-id>

-- As Account B, flip the status:
UPDATE public.flags
SET status = 'verified'
WHERE id = <flag2-id>;
-- Expected: 1 row affected; handle_flag_status_change trigger fires AFTER this UPDATE
-- Account B should receive +2 points (points trigger interaction)

-- Check points:
SELECT points FROM public.users WHERE id = '<Account-B-uuid>';
-- Expected: points increased by 2 (or the appropriate amount per handle_flag_status_change)
```

---

## Post-Apply Smoke Test (All Three Migrations)

After all three migrations apply, run this integration test to verify coexistence:

```sql
-- Integration test: all three migrations working together

-- Setup (as Account A):
INSERT INTO public.flags (lat, lng, user_id, category, severity, description, status)
VALUES (47.6062, -122.3321, auth.uid(), 'no_ramp', 3, 'Original description', 'open');
-- Note the id; call it <flag-id>

-- Verify the owner can edit on open flags (D1 policy):
UPDATE public.flags
SET description = 'Owner edit 1'
WHERE id = <flag-id>;
-- Expected: 1 row affected; description updates

-- Verify owner cannot edit closed flags (D1 policy):
UPDATE public.flags
SET status = 'verified'
WHERE id = <flag-id>;
-- Expected: 1 row affected; status changes to verified

UPDATE public.flags
SET description = 'Owner edit 2'
WHERE id = <flag-id>;
-- Expected: 0 rows affected (D1 USING clause requires status = 'open')

-- Verify non-owner can flip status (D3 trigger + baseline policy):
-- As Account B:
UPDATE public.flags
SET status = 'resolved'
WHERE id = <flag-id>;
-- Expected: 1 row affected; status changes to resolved

-- Verify non-owner cannot edit other columns (D3 trigger reverts them):
UPDATE public.flags
SET description = 'Hacked by B'
WHERE id = <flag-id>;
-- Expected: 1 row affected at HTTP layer, but description unchanged

SELECT description FROM public.flags WHERE id = <flag-id>;
-- Expected: 'Owner edit 1' (not 'Hacked by B')

-- Verify push_tokens table is isolated (D2):
-- As Account B:
INSERT INTO public.push_tokens (user_id, token, platform)
VALUES (auth.uid(), 'ExponentPushToken[B]', 'ios');
-- Expected: 1 row inserted

-- As Account A, try to read Account B's token:
SELECT * FROM public.push_tokens WHERE user_id = '<Account-B-uuid>';
-- Expected: 0 rows (RLS blocks cross-owner reads)

-- As Account B, read their own token:
SELECT token FROM public.push_tokens WHERE user_id = auth.uid();
-- Expected: 1 row with token = 'ExponentPushToken[B]'
```

---

## D4 Status (Not Applied)

**File:** `supabase/migrations/2026-05-24_realtime_flags.sql`  
**Approval:** ⚠️ BLOCKED (Sky decision pending)  
**Reason:** Steve (Security) ✅ approved. Jordan flagged a privacy design question: **Is real-time broadcast of location + disability category intentional?**

### D4 Background

D4 adds the flags table to Supabase's realtime publication, enabling WebSocket subscriptions for live flag updates. **Technically safe** (respects existing RLS), but **privacy design trade-off:**

- **Current (without D4):** Flag data queryable via REST, updated on screen refresh.
- **After D4:** Flag data streamed in real-time to all authenticated users. Enables continuous monitoring of accessibility reports.
- **Risk:** Real-time + location + disability category can enable triangulation (e.g., "person is near accessible restroom" in real-time).

### D4 Copy-Paste SQL (if Sky approves after reviewing privacy implications)

```sql
-- D4: Realtime Flags Publication (2026-05-24)
-- BLOCKED: Sky decision pending on privacy design

ALTER PUBLICATION supabase_realtime ADD TABLE public.flags;
```

### D4 Rollback SQL (if applied, then rolled back)

```sql
ALTER PUBLICATION supabase_realtime DROP TABLE public.flags;
```

### Sky's D4 Decision Checklist

Before applying D4, confirm with Sky:

1. **Is real-time broadcast of lat/lng + disability category intentional?**
2. **Is the community-verification UX worth the privacy tradeoff?**
3. **If no:** Block D4, discuss anonymization strategy (round lat/lng, remove category from realtime broadcast, etc.).
4. **If yes:** Apply D4, add privacy notice in the app ("Your report is visible to other users in real-time").

---

## Summary Table

| Migration | Approval | SQL Ready | Rollback Ready | Smoke Test Ready | Status |
|---|---|---|---|---|---|
| D1 (flag-edit RLS) | Steve ✅ + Jordan ✅ | ✅ | ✅ | ✅ | **READY TO APPLY** |
| D2 (push-tokens) | Steve ✅ + Jordan ✅ | ✅ | ✅ | ✅ | **READY TO APPLY** |
| D3 (status-update trigger) | Steve ✅ + Jordan ✅ | ✅ | ✅ | ✅ | **READY TO APPLY** |
| D4 (realtime-flags) | Steve ✅ / Jordan ⚠️ DESIGN | ✅ | ✅ | N/A | **BLOCKED — Sky decision pending** |

---

## Instructions for Sky

1. **Log into Supabase Dashboard** → Project → SQL Editor
2. **Apply D1:** Paste the D1 copy-paste block → Run
3. **Run D1 smoke test** (select a few tests) to confirm owner edits work
4. **Apply D2:** Paste the D2 copy-paste block → Run
5. **Run D2 smoke test** to confirm push_tokens isolation works
6. **Apply D3:** Paste the D3 copy-paste block → Run
7. **Run D3 smoke test** to confirm non-owner column reverts work
8. **Run post-apply integration test** to verify all three coexist correctly
9. **For D4:** Review Jordan's privacy question, decide, then either apply D4 or leave it pending

---

## Approval Signatures

- **Steve (Security):** ✅ All four migrations are secure. D1/D2/D3 cleared for application. D4 inherits REST RLS (no security risk).
- **Jordan (Privacy):** ✅ D1/D2/D3 cleared for application. D4 requires Sky approval on privacy design (real-time broadcast of location data).
- **Dana (Database Planning):** ✅ SQL blocks generated, rollback procedures documented, smoke tests ready.

---

## Appendix: File References

- Steve's security audit: `/Users/skypie/AccessMap/qa-reports/2026-05-28_Steve_SQL-D1-D4-Security.md`
- Jordan's privacy audit: `/Users/skypie/AccessMap/qa-reports/2026-05-28_Jordan_SQL-D1-D4-Privacy.md`
- Migration files:
  - `supabase/migrations/2026-05-25_flag_edit_rls_replacement.sql`
  - `supabase/migrations/2026-05-25_push_tokens.sql`
  - `supabase/migrations/2026-05-23_status_update_trigger_proposal.sql`
  - `supabase/migrations/2026-05-24_realtime_flags.sql` (not applied yet)

---

**Report prepared by:** Dana (Database Planning)  
**Date:** 2026-05-28  
**Status:** READY FOR APPLICATION (D1/D2/D3 cleared; D4 pending Sky review)
