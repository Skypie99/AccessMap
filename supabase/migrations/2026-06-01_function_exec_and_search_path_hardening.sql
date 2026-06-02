-- ===========================================================================
-- 2026-06-01 — Lock down trigger functions: fix search_path + revoke RPC EXECUTE
-- Author: Steve (Security) — final pre-tester audit
-- Finding F2 (MED). See qa-reports/2026-06-01_Security_Robustness_QA_Report.md
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — TEST ON A SUPABASE PREVIEW BRANCH FIRST, then Sky applies
--     to prod. The agent system never applies to live prod (Const. Art. 5.3).
--     CAUTION discovered during the audit: the live DB has hidden interactions
--     (e.g. a broken triage RLS policy that a "safe" change unmasked). For THIS
--     file specifically: pinning search_path on notify_flag_status_webhook can
--     break it IF its body calls net.* / extensions.* unqualified — verify the
--     status-change webhook still fires on a preview branch before prod. !!!
--
-- ---------------------------------------------------------------------------
-- THE GAP (verified live via get_advisors + pg_proc on 2026-06-01)
-- ---------------------------------------------------------------------------
--
-- Supabase's linter + pg_proc show four TRIGGER functions that are also
-- callable directly via the REST API (/rest/v1/rpc/<name>), and two of them
-- have a mutable search_path:
--
--   function                                  sec_def  search_path  anon  auth
--   notify_flag_status_webhook()              yes      MUTABLE      yes   yes
--   enforce_flag_status_only_for_non_owner()  no       MUTABLE      yes   yes
--   check_flag_creation_rate_limit()          yes      public       yes   yes
--   check_flag_rate_limit()                   yes      public       yes   yes
--
-- These are trigger functions — they should fire from triggers only, never be
-- invoked by clients. The baseline trigger functions (handle_new_user,
-- handle_flag_status_change) already REVOKE EXECUTE from public/anon/
-- authenticated and pin search_path; these newer ones simply missed the same
-- treatment. A mutable search_path on a SECURITY DEFINER function is the
-- classic privilege-escalation vector (an attacker who can create objects in
-- a schema on the search_path can shadow a referenced table/function).
--
-- By-design RPCs are intentionally left callable (they already pin search_path):
--   increment_reopen_request(uuid)  — authenticated RPC, search_path=public
--   log_realtime_event(text,text)   — authenticated RPC, search_path=public
--
-- ---------------------------------------------------------------------------
-- THE FIX — pin search_path, then revoke RPC EXECUTE on the trigger functions
-- ---------------------------------------------------------------------------

-- 1. Pin search_path on the two mutable functions.
alter function public.notify_flag_status_webhook()             set search_path = public;
alter function public.enforce_flag_status_only_for_non_owner() set search_path = public;

-- 2. Revoke direct RPC EXECUTE on all four trigger functions. Triggers keep
--    firing (trigger execution does not require EXECUTE); only the
--    /rest/v1/rpc surface is removed.
revoke execute on function public.notify_flag_status_webhook()             from public, anon, authenticated;
revoke execute on function public.enforce_flag_status_only_for_non_owner() from public, anon, authenticated;
revoke execute on function public.check_flag_creation_rate_limit()         from public, anon, authenticated;
revoke execute on function public.check_flag_rate_limit()                  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   grant execute on function public.notify_flag_status_webhook()             to public;
--   grant execute on function public.enforce_flag_status_only_for_non_owner() to public;
--   grant execute on function public.check_flag_creation_rate_limit()         to public;
--   grant execute on function public.check_flag_rate_limit()                  to public;
--   alter function public.notify_flag_status_webhook()             reset search_path;
--   alter function public.enforce_flag_status_only_for_non_owner() reset search_path;
--
-- ---------------------------------------------------------------------------
-- HOW TO APPLY (Sky) + SMOKE TEST
-- ---------------------------------------------------------------------------
-- Paste in Supabase → SQL Editor → Run (instant, no locks). Then verify:
--   1. Report a flag, then change its status — the status trigger + webhook
--      still fire normally (triggers unaffected by the EXECUTE revoke).
--   2. curl /rest/v1/rpc/notify_flag_status_webhook with a user JWT
--      -> MUST return 404/permission-denied (no longer callable).
--   3. Re-run get_advisors (security) — the function_search_path_mutable and
--      the two security_definer_function_executable lints for these functions
--      should clear.
-- ===========================================================================
