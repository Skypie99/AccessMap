# Dana — is_admin Bug Fix Proposal
**Date:** 2026-06-02  
**Engineer:** Dana (Backend)  
**Project:** AccessMap (Supabase project `kldlwszpfkdmsjrjhjym`)  
**Mode:** PROPOSE-ONLY — apply nothing  
**Severity:** HIGH (live bug, blocks all reject/reopen transitions)

---

## Executive Summary

The live `handle_flag_status_change()` trigger references `public.users.is_admin` in its `ELSIF NEW.status = 'rejected'` branch. The column does not exist on `public.users` in production. Because Postgres plans the full function body at CREATE time and the `ELSIF` branch is evaluated at runtime whenever its predecessor branches don't match, **any status transition that falls through to that branch — specifically `rejected` and any non-verified, non-resolved transitions (including attempts to revert) — throws `ERROR: column "is_admin" does not exist` and rolls back the entire UPDATE**.

This means: `open → rejected` fails. `verified → rejected` fails. Any future state that hits the `ELSIF` guard fails. Forward `open → verified` and `open/verified → resolved` work correctly (they match the first two `IF/ELSIF` branches and return before reaching the broken subquery).

---

## 1. Blast Radius — Every Broken Reference to `is_admin` (Live Read-Only Scan)

### 1a. Functions with `is_admin` in `pg_proc.prosrc`

Scanned all functions in the `public` namespace via `pg_proc`. Result:

| Function | Status |
|---|---|
| `handle_flag_status_change()` | **BROKEN** — `ELSIF NEW.status='rejected' AND auth.uid() IN (SELECT id FROM public.users WHERE is_admin = true)` — column does not exist, throws on any rejected/revert transition |

No other function in `public` references `is_admin` in its source.

### 1b. RLS Policies with `is_admin`

Scanned all `pg_policies` rows for `qual ILIKE '%is_admin%' OR with_check ILIKE '%is_admin%'`. Result:

**Zero matching rows.** No live RLS policy references `is_admin`. The two policies that *would* reference it — `"admin delete any flag"` and the replacement `"users update own row"` — are defined only in `supabase/migrations/2026-05-30_admin_role.sql`, which was never applied.

### 1c. Client-Side References (Impact if Column Stays Absent)

- `src/lib/admin.ts` — `useIsAdmin()` hook selects `is_admin` from `public.users`. Without the column, PostgREST returns the row with `is_admin` absent; the hook reads `data?.is_admin ?? false` → always returns `false`. **Degrades gracefully — no crash.** Admin tab never appears.
- `src/navigation/RootNavigator.tsx` — conditionally renders Admin tab based on `useIsAdmin()`. Returns `false` → Admin tab hidden. **Graceful.**
- `src/types/database.ts` — `UserRow.is_admin?: boolean` is optional. **Graceful.**

### 1d. Migration File Reference (Not Live)

`supabase/migrations/2026-05-30_trust_score_system.sql` line 165 also has the `is_admin = true` subquery inside the same `CREATE OR REPLACE FUNCTION` block. This is the migration that installed the currently-live broken function. The `is_admin` ref in the migration file is the source of the drift, not a separate live problem — it's the same function.

### 1e. Blast Radius Summary

**One live broken artifact**: `handle_flag_status_change()`. Zero broken RLS policies. Client degrades gracefully without the column.

Operational impact: Any moderator or user attempting to **reject a flag** receives a `500`/Postgres error and the status is **not changed**. There is no silent data corruption — the transaction rolls back cleanly. No points are awarded or deducted erroneously for rejected transitions.

---

## 2. Option A — Apply `2026-05-30_admin_role.sql`

### What the Migration Does

```sql
-- Step 1: Add column
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Step 2: New admin-level DELETE policy on flags
DROP POLICY IF EXISTS "admin delete any flag" ON public.flags;
CREATE POLICY "admin delete any flag"
  ON public.flags FOR DELETE
  TO authenticated
  USING (
    (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid()))
  );

-- Step 3: Replace "users update own row" to lock is_admin against client writes
DROP POLICY IF EXISTS "users update own row" ON public.users;
CREATE POLICY "users update own row"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND is_admin IS NOT DISTINCT FROM
      (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid()))
  );
```

### Safety Analysis — Each Change

**Step 1 — ADD COLUMN**: `ADD COLUMN IF NOT EXISTS` with `NOT NULL DEFAULT false` is safe and non-destructive. All existing rows get `is_admin = false`. Existing indexes are unaffected. The `handle_flag_status_change()` function immediately resolves the column reference — the rejected branch begins working, though it is still dead (no user has `is_admin = true` yet).

**Step 2 — "admin delete any flag" policy**: This is a new PERMISSIVE DELETE policy for `authenticated`. Without any user having `is_admin = true`, this policy grants no additional delete access to anyone. Once Sky manually promotes a user via service-role, that user gains DELETE-any-flag. The existing `"flags delete own"` policy already allows owners to delete their own flags; this adds admin override. **No over-grant risk currently; zero users are is_admin.**

RLS safety check: The USING clause `(SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid()))` uses the initPlan pattern (good for performance, evaluates once per statement). It is a scalar subquery with a primary key lookup — if `auth.uid()` is null (e.g., anon client), the subquery returns `NULL`, which Postgres treats as not-true, so the policy is not satisfied. **No anon delete risk.**

**Step 3 — Replace "users update own row"**: The live policy currently has:
```
USING: (SELECT auth.uid()) = id
WITH CHECK: (SELECT auth.uid()) = id
```
The replacement tightens `WITH CHECK` to additionally assert `is_admin IS NOT DISTINCT FROM (stored is_admin)` — clients cannot flip their own `is_admin` value. This is strictly more restrictive. No existing client code writes `is_admin` (only `display_name`, `avatar_url` are client-updateable). **No breakage risk. Correctly closes the self-promotion vector.**

### Option A Verdict: Safe to Apply

All three steps are additive or restrictive — no data is deleted, no policies are broadened, no new features are activated until Sky manually sets `is_admin = true` on a user row.

### Apply Steps (Sky executes in Supabase SQL Editor)

1. Open Supabase Dashboard → SQL Editor for project `kldlwszpfkdmsjrjhjym`.
2. Paste and run the full contents of `supabase/migrations/2026-05-30_admin_role.sql` (no edits needed — it is idempotent).
3. Verify with:
```sql
-- Confirms column exists
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_admin';

-- Confirms all existing users are false
SELECT COUNT(*) FROM public.users WHERE is_admin = true;  -- should be 0

-- Confirms the policy exists
SELECT policyname, cmd, qual FROM pg_policies
WHERE tablename = 'flags' AND policyname = 'admin delete any flag';
```

### Smoke Test After Apply

```sql
-- Use a test flag id. Replace {flag_id} with a real id from:
SELECT id FROM public.flags WHERE status = 'open' LIMIT 1;

-- Simulate the trigger by doing an UPDATE as a service-role call:
-- (Sky can do this via SQL Editor which runs as service-role, bypassing RLS)
UPDATE public.flags
  SET status = 'rejected'
  WHERE id = '{flag_id}';

-- If trigger succeeds: no error, row shows status = 'rejected'
-- (Note: auth.uid() is NULL in SQL Editor context, so the spam-penalty
--  branch is NOT entered — the admin subquery returns false.
--  That is correct behavior — penalty only applies when an admin user
--  makes the change from the app.)
SELECT status FROM public.flags WHERE id = '{flag_id}';
-- Revert after smoke test:
UPDATE public.flags SET status = 'open' WHERE id = '{flag_id}';
```

---

## 3. Option B — Fix `handle_flag_status_change()` Without Adding `is_admin`

Option B removes the dependency on `is_admin` by dropping the admin spam-penalty branch from the trigger. The trigger becomes simpler and correct. The `is_admin` column and admin feature remain absent/deferred.

**Trade-off**: The spam-penalty feature (admin rejects → reporter loses 20 points, `flag_spam_penalty` event recorded) is silently removed. The admin UI (`AdminScreen`, `useIsAdmin()` hook, Admin tab in navigation) continues to not appear (because `is_admin` column is still absent → `useIsAdmin()` returns false). If Option B is chosen, `2026-05-30_admin_role.sql` should be explicitly deferred or dropped — otherwise the function installed by Option B would be immediately overwritten the next time the migration is applied.

**Also required with Option B**: `supabase/migrations/2026-05-30_trust_score_system.sql` contains the same `handle_flag_status_change()` body (with the `is_admin` branch) on line 138–198. If Option B is applied as a standalone migration, future re-application of `trust_score_system.sql` (e.g., during a DB restore or branch reset) would reinstall the broken version. Option B must therefore **also include an update to `trust_score_system.sql`** — or be clearly documented as a forward-patch that supersedes it.

### Option B SQL

```sql
-- Option B: Fix handle_flag_status_change to remove is_admin dependency.
-- Apply in the Supabase SQL Editor.
-- This drops the admin spam-penalty branch entirely.
-- is_admin column is NOT added; AdminScreen will remain inaccessible.
-- If the admin feature is later desired, apply 2026-05-30_admin_role.sql
-- and then re-add the spam-penalty branch.

CREATE OR REPLACE FUNCTION public.handle_flag_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
BEGIN
  IF NEW.status IS NULL OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'verified' AND OLD.status = 'open' THEN
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  ELSIF NEW.status = 'resolved' AND OLD.status IN ('open', 'verified') THEN
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  -- Note: 'rejected' transitions are now a no-op (no penalty, no error).
  -- Reopen/revert transitions (e.g., resolved → open) are also no-ops.
  END IF;

  IF reporter_bonus > 0 AND NEW.user_id IS NOT NULL THEN
    UPDATE public.users
      SET points = points + reporter_bonus
      WHERE id = NEW.user_id;
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (NEW.user_id, reporter_event, reporter_bonus, NEW.id);
  END IF;

  IF actor_bonus > 0
     AND auth.uid() IS NOT NULL
     AND auth.uid() <> NEW.user_id THEN
    UPDATE public.users
      SET points = points + actor_bonus
      WHERE id = auth.uid();
    INSERT INTO public.point_events (user_id, event_type, delta, flag_id)
      VALUES (auth.uid(), actor_event, actor_bonus, NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_flag_status_change() FROM public, anon, authenticated;
```

This is a `CREATE OR REPLACE` — it does not drop/recreate the trigger, so the existing `on_flag_status_change` trigger continues firing the updated function body.

### Option B Limitations

- Admin spam-penalty feature is permanently dropped (no `flag_spam_penalty` events ever written).
- `2026-05-30_trust_score_system.sql` remains internally inconsistent (line 165 still has `is_admin = true`). If that migration is ever re-run, the bug reappears. Dana recommends also patching that file in git to remove the `is_admin` branch if Option B is chosen.
- Admin UI (`AdminScreen`) remains dead until Sky explicitly chooses to apply `2026-05-30_admin_role.sql` later.

---

## 4. Recommendation

### Recommended Option: **Option A**

Apply `2026-05-30_admin_role.sql`. It is safe, additive, and completes the migration that was clearly authored to support the admin feature already built (AdminScreen, useIsAdmin hook, RootNavigator admin tab, UserRow type). Option A fixes the live bug AND correctly installs the infrastructure that the codebase already expects.

Option B is adequate as a temporary emergency patch if Sky needs the bug fixed immediately and is not ready to commit to the admin feature — but it introduces migration-file debt and defeats code already shipped.

**Apply order if Option A:**
1. Apply `2026-05-30_admin_role.sql` (fixes the bug, adds column, adds admin delete policy, hardens update policy).
2. No other migration changes needed — the admin feature stays dormant until Sky manually sets `is_admin = true` on a user row via SQL Editor or service-role.

### Decision Needed From Sky

**POINT VALUE DRIFT — DECISION FOR SKY**

The live trigger (`handle_flag_status_change` as installed by `2026-05-30_trust_score_system.sql`) uses:
- Reporter: **+10 verified / +15 resolved**
- Actor: **+3 verified / +7 resolved**

`supabase/schema.sql` (the base schema document) and `CLAUDE.md` both document:
- Reporter: **+5 verified / +10 resolved**
- Actor: **+2 verified / +5 resolved**

The trust_score migration intentionally changed these values (it is documented on migration line 136: "replaces original +5/+10 reporter, +2/+5 actor from schema.sql"). The live values are therefore the **intended values** — the migration authored them deliberately. However, `schema.sql` and `CLAUDE.md` were never updated to reflect the change, causing ongoing confusion.

**Dana recommends**: Accept the live values (10/3/15/7) as canonical, update `schema.sql` comments and `CLAUDE.md` to match, and treat the original 5/2/10/5 values as superseded. This is a documentation fix, not a data change — no points rollback is warranted.

**Sky must decide**: Are the live 10/3/15/7 values intentional and final? Or should the trigger be revised back toward 5/2/10/5? Once confirmed, Dana will update `schema.sql` accordingly.

---

## 5. Secondary Follow-Up Items (Non-Blocking for This Fix)

These are pre-existing items from the security audit, not introduced by this bug:

1. **Rotate hardcoded webhook secrets**: `notify_flag_status_webhook()` reads from `vault.decrypted_secrets`. Two webhook-related secrets in trigger defs may be hardcoded — Dana flagged this in the 2026-06-01 security audit. Not blocking for this fix.
2. **Duplicate status trigger**: Two triggers fire on flag updates (`on_flag_status_change` and `update_flags_updated_at`; also two `updated_at` triggers exist: `on_flag_updated_at` and `update_flags_updated_at`). The double `updated_at` trigger is redundant — Sky/Dana should consolidate on a future migration pass. Not blocking.
3. **Trust score migration consistency**: If Option A is chosen, `2026-05-30_trust_score_system.sql` line 165 still has the `is_admin` reference inside its `CREATE OR REPLACE` block. After Option A applies the column, this is no longer broken — but the migration file would reinstall a working (not broken) function body if ever re-run. No immediate action needed.

---

## Files Consulted

- `/Users/skypie/AccessMap/supabase/migrations/2026-05-30_admin_role.sql`
- `/Users/skypie/AccessMap/supabase/migrations/2026-05-30_trust_score_system.sql`
- `/Users/skypie/AccessMap/supabase/schema.sql`
- `/Users/skypie/AccessMap/src/lib/admin.ts`
- `/Users/skypie/AccessMap/src/types/database.ts`
- `/Users/skypie/AccessMap/src/navigation/RootNavigator.tsx`
- Live DB queries: `pg_proc.prosrc`, `pg_policies`, `information_schema.columns`

---

*Dana — Backend Engineer (propose-only). No migrations applied. No state changed.*
