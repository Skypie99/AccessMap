# Dana — Search Path Hardening Report
**Date:** 2026-05-29  
**Author:** Dana (backend security)  
**Status:** PROPOSE-ONLY — migration file written, nothing applied to live DB  
**Migration file:** `supabase/migrations/2026-05-29_function_search_path_hardening.sql`

---

## 1. What Was Flagged

The Supabase Security Advisor (lint rule `0011_function_search_path_mutable`) flagged five functions for having a role-mutable `search_path`. Without a pinned `search_path`, a session-level or role-level `SET search_path` can redirect unqualified identifier lookups inside the function to an attacker-controlled schema — a search_path hijack. For `SECURITY DEFINER` functions the attack runs with elevated privileges.

Reference: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

**Functions flagged:**

| Function | Type | SECURITY DEFINER? | Risk level |
|---|---|---|---|
| `public.handle_flag_status_change()` | Trigger | YES | High |
| `public.handle_push_token_updated_at()` | Trigger | No | Medium |
| `public.set_flag_updated_at()` | Trigger | No | Medium |
| `public.enforce_flag_status_only_for_non_owner()` | Trigger | No | Medium |
| `public.update_flags_updated_at()` | Trigger | No | Medium |

---

## 2. Investigation Summary

### Signature verification

All five are trigger functions (`RETURNS trigger`). Trigger functions in PostgreSQL take no user-supplied arguments — their signatures are `function_name()` with no parameter list. This was confirmed by reading the defining migrations:

- `handle_flag_status_change` — defined in `2026-05-24_status_history_table.sql` and superseded by `2026-05-29_fix_points_trigger.sql` (PROPOSE-ONLY, not yet applied)
- `handle_push_token_updated_at` — defined in `2026-05-25_push_tokens.sql`
- `set_flag_updated_at` — defined in `2026-05-23_data_layer_hardening.sql`
- `enforce_flag_status_only_for_non_owner` — defined in `2026-05-23_status_update_trigger_proposal.sql`
- `update_flags_updated_at` — exists on the live DB only; no migration file definition. It is a duplicate of `set_flag_updated_at()` and its trigger is scheduled to be dropped by `2026-05-29_fix_points_trigger.sql`. The function body persists on the DB until explicitly dropped, so it is hardened in this migration.

### Choice of remediation value

`SET search_path = public, pg_temp` was chosen over `= ''` (empty) because:

- All five functions use unqualified references to objects in `public` (e.g. `public.users`, `public.flags`, `auth.uid()`). Setting to empty would require rewriting every identifier as schema-qualified.
- `pg_temp` is appended last so the function can still use temporary tables if needed, and it cannot shadow real public objects because it is listed after `public`.
- This matches the pattern already used in the `handle_flag_status_change` rewrite in `2026-05-29_fix_points_trigger.sql` (`SET search_path = public`), extended with `pg_temp` for completeness.

### Interaction with pending migration

`2026-05-29_fix_points_trigger.sql` (also PROPOSE-ONLY) already includes `SET search_path = public` in the `CREATE OR REPLACE FUNCTION` body for `handle_flag_status_change`. If Sky applies that migration first, the `ALTER FUNCTION` for `handle_flag_status_change` in this file is a harmless no-op. If this migration is applied first, the live (broken) version of the function gets hardened; the fix_points_trigger migration can then be applied on top without conflict.

---

## 3. Exact ALTER Statements

```sql
ALTER FUNCTION public.handle_flag_status_change()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.handle_push_token_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.set_flag_updated_at()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.enforce_flag_status_only_for_non_owner()
  SET search_path = public, pg_temp;

ALTER FUNCTION public.update_flags_updated_at()
  SET search_path = public, pg_temp;
```

---

## 4. Smoke Test (after applying)

1. Re-run the Supabase Security Advisor. All five `0011_function_search_path_mutable` warnings should be gone.
2. Optionally confirm via SQL:

```sql
SELECT proname, proconfig
FROM pg_proc
WHERE proname IN (
  'handle_flag_status_change',
  'handle_push_token_updated_at',
  'set_flag_updated_at',
  'enforce_flag_status_only_for_non_owner',
  'update_flags_updated_at'
)
AND pronamespace = 'public'::regnamespace;
```

Expected: each row has `proconfig` containing `{search_path=public,pg_temp}`.

---

## 5. Rollback

For each function, run `ALTER FUNCTION ... RESET search_path;` — this restores the mutable behaviour (advisor warnings will reappear). Full rollback statements are in the migration file header.

---

## 6. Decisions for Sky

No decisions required. This is a pure metadata change (`ALTER FUNCTION` sets a GUC in `pg_proc.proconfig`). It does not change any function body, any data, any RLS policy, or any trigger behaviour. It is completely safe to apply at any time.

**Recommended apply order:**
1. This migration (`2026-05-29_function_search_path_hardening.sql`) — clears the five advisor warnings.
2. `2026-05-29_fix_points_trigger.sql` — fixes the points bug (separate Sky decision still pending per that report).

Either order is safe; there are no conflicts.

---

## 7. Hard Rails Compliance

- No live DB write performed — migration file only.
- No main branch touched.
- No external sends.
- No credentials handled.
- This report + migration file are the complete deliverable.
