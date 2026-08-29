-- ============================================================================
-- FILE:   20260603002420_reconcile_oob_verify_webhook_secret_for_replay_20260829.sql
-- STATUS: 2026-08-29 migration-history RECONCILIATION. Not a new production
--         change — production already contains the reconciled object below.
--
-- WHY IT EXISTS:
--   `public.verify_webhook_secret(text)` was applied to production
--   HISTORICALLY OUT-OF-BAND: it exists live, but no migration in the managed
--   hosted history creates it. The quarantined artifact that documents that
--   out-of-band application lives at
--   `supabase/nonmanaged/live-out-of-band/2026-06-03_verify_webhook_secret.sql`
--   and is NOT itself part of managed history — it stays quarantined.
--
--   Because nothing in managed history creates the function, a fresh replay
--   deterministically fails at
--   `20260727075547_sr018_verify_webhook_secret_revoke.sql`, which runs:
--     revoke execute on function public.verify_webhook_secret(text)
--     from anon, authenticated, public;
--   against a function that was never created. This migration is the missing
--   prerequisite that makes fresh-environment replay truthful and
--   reproducible.
--
-- ORDERING KEY PROVENANCE:
--   20260603002420 is the UTC timestamp of the first repository commit that
--   introduced this function (45f7964, 2026-06-02T17:24:20-07:00 ==
--   2026-06-03T00:24:20Z). It is a stable ordering/provenance key chosen to
--   sort before the July revoke dependency — it is NOT a claim that this is
--   the exact original hosted application timestamp, which is unknown.
--
-- SAFETY POSTURE (does NOT restore the original historical grant):
--   The June 2026-06-03 out-of-band artifact originally granted EXECUTE to
--   anon + authenticated. That grant was found to be a secret-testing oracle
--   over Vault (findings S-6 / IO-4 / X-2) and was revoked on production
--   2026-07-27 (SR-018). This reconciliation migration creates the function
--   in the CURRENT SAFE production-equivalent state directly — SECURITY
--   DEFINER + search_path preserved, EXECUTE revoked from PUBLIC/anon/
--   authenticated, EXECUTE explicitly granted only to service_role — verified
--   2026-08-29 against the live production catalog (pg_proc.proacl showed
--   exactly `{postgres=X/postgres,service_role=X/postgres}`, matching this
--   function body byte-for-byte via pg_get_functiondef). It never passes
--   through the insecure intermediate state, so
--   `20260727075547_sr018_verify_webhook_secret_revoke.sql` remains a
--   harmless no-op revoke on replay, exactly as it already is on production.
--
-- BLAST RADIUS: NONE. Production already contains this exact object. The
--   only caller is the notify-flag-status Edge Function, which calls this RPC
--   with SUPABASE_SERVICE_ROLE_KEY (see its isAuthorized()).
-- ============================================================================

create or replace function public.verify_webhook_secret(incoming text)
  returns boolean
  language sql
  security definer
  set search_path = public, vault
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'webhook_secret' and decrypted_secret = incoming
  );
$$;

revoke execute on function public.verify_webhook_secret(text) from public, anon, authenticated;
grant execute on function public.verify_webhook_secret(text) to service_role;

-- ============================================================================
-- VERIFY (read-only): expect exactly postgres + service_role in proacl, no
-- anon/authenticated/PUBLIC entry —
--   select proname, proacl from pg_proc
--    where proname = 'verify_webhook_secret' and pronamespace = 'public'::regnamespace;
-- ============================================================================
