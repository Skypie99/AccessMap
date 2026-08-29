-- =============================================================================
-- PROPOSE-ONLY — DO NOT APPLY WITHOUT SKY'S EXPLICIT APPROVAL
-- =============================================================================
--
-- FILE:    2026-05-29_function_search_path_hardening.sql
-- AUTHOR:  Dana (backend security, 2026-05-29)
-- STATUS:  PROPOSED — not applied to any environment
--
-- WHY THIS EXISTS:
--   The Supabase Security Advisor flagged five functions with warning
--   code 0011_function_search_path_mutable:
--
--     • public.handle_flag_status_change      (SECURITY DEFINER — highest risk)
--     • public.handle_push_token_updated_at
--     • public.set_flag_updated_at
--     • public.enforce_flag_status_only_for_non_owner
--     • public.update_flags_updated_at
--
--   Advisory reference:
--   https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable
--
--   ROOT CAUSE:
--   Without an explicit SET search_path, a session-level SET search_path
--   (or a role-level ALTER ROLE ... SET search_path) can redirect the
--   function's unqualified identifier lookups to attacker-controlled
--   schemas — a classic search_path hijack. For SECURITY DEFINER functions
--   this runs with elevated privileges, making the risk acute.
--
--   REMEDIATION:
--   ALTER each function to SET search_path = public, pg_temp.
--   This pins the lookup order to the public schema and the session-local
--   pg_temp, regardless of any SET search_path issued by callers or roles.
--   pg_temp is included so temporary objects created inside the function
--   (if any) still resolve correctly; it is appended last so it cannot
--   shadow real public objects.
--
--   All five functions are trigger functions (RETURNS trigger, no arguments).
--   Their signatures therefore take no parameter list.
--
--   NOTE ON handle_flag_status_change:
--   The propose-only migration 2026-05-29_fix_points_trigger.sql already
--   includes SET search_path = public in the CREATE OR REPLACE body. If that
--   migration is applied first, the ALTER below is a harmless no-op for that
--   function. If this migration is applied first, the ALTER hardens the
--   currently-live broken version; the fix_points_trigger migration can then
--   be applied on top without conflict.
--
--   NOTE ON update_flags_updated_at:
--   This function exists only on the live database (it was created by an
--   early schema iteration and is not defined in any migration file). Its
--   trigger was flagged as a duplicate in 2026-05-29_fix_points_trigger.sql
--   and that migration drops the trigger. However the function body itself
--   will remain until explicitly dropped. This migration hardens it in place
--   so the advisor warning is cleared regardless of whether the trigger drop
--   has been applied yet. The function can be dropped separately once Sky
--   confirms 2026-05-29_fix_points_trigger.sql has been applied.
--
-- IDEMPOTENCY:
--   ALTER FUNCTION ... SET search_path is always safe to re-run. It is a
--   pure metadata update with no side-effects on data.
--
-- SMOKE TEST (re-run after applying):
--   1. Open the Supabase dashboard → Database → Advisors (or SQL Editor).
--   2. Re-run the security linter. All five 0011 warnings should be gone.
--   3. Optionally: SELECT proname, proconfig FROM pg_proc
--        WHERE proname IN (
--          'handle_flag_status_change',
--          'handle_push_token_updated_at',
--          'set_flag_updated_at',
--          'enforce_flag_status_only_for_non_owner',
--          'update_flags_updated_at'
--        )
--        AND pronamespace = 'public'::regnamespace;
--      Confirm proconfig includes '{search_path=public,pg_temp}' for each row.
--
-- ROLLBACK (if needed):
--   For each function below, run the corresponding RESET:
--
--     ALTER FUNCTION public.handle_flag_status_change()
--       RESET search_path;
--
--     ALTER FUNCTION public.handle_push_token_updated_at()
--       RESET search_path;
--
--     ALTER FUNCTION public.set_flag_updated_at()
--       RESET search_path;
--
--     ALTER FUNCTION public.enforce_flag_status_only_for_non_owner()
--       RESET search_path;
--
--     ALTER FUNCTION public.update_flags_updated_at()
--       RESET search_path;
--
--   Note: RESET restores the mutable search_path behaviour (advisor warnings
--   will reappear). Only roll back if you have a specific operational reason.
--
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. handle_flag_status_change
--    SECURITY DEFINER — highest priority. Runs as the function owner
--    (typically postgres/service role) on every flag status update.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.handle_flag_status_change()
  SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- 2. handle_push_token_updated_at
--    Trigger function: fires BEFORE UPDATE on public.push_tokens to stamp
--    updated_at. No SECURITY DEFINER, but still hardened per best practice.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.handle_push_token_updated_at()
  SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- 3. set_flag_updated_at
--    Trigger function: fires BEFORE UPDATE on public.flags to stamp updated_at.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.set_flag_updated_at()
  SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- 4. enforce_flag_status_only_for_non_owner
--    Trigger function: fires BEFORE UPDATE on public.flags to revert non-status
--    column changes made by non-owners. Not SECURITY DEFINER, but reads
--    auth.uid() — hardening removes any search_path ambiguity for that call.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.enforce_flag_status_only_for_non_owner()
  SET search_path = public, pg_temp;


-- -----------------------------------------------------------------------------
-- 5. update_flags_updated_at
--    Trigger function: exists on live DB only (no migration file definition).
--    Duplicate of set_flag_updated_at(); its trigger will be dropped by
--    2026-05-29_fix_points_trigger.sql. Hardened here so the advisor warning
--    is cleared immediately, regardless of that migration's apply status.
-- -----------------------------------------------------------------------------
ALTER FUNCTION public.update_flags_updated_at()
  SET search_path = public, pg_temp;


-- =============================================================================
-- END OF MIGRATION — PROPOSE-ONLY, NOT APPLIED
-- =============================================================================
