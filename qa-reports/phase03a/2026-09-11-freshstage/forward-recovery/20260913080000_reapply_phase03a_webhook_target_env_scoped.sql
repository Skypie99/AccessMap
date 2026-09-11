-- FORWARD RE-APPLICATION of 20260911120000_phase03a_webhook_target_env_scoped.sql.
-- STAGE-MF-08 forward-only recovery: re-applying a candidate that was deliberately
-- undone is ANOTHER new forward version (20260913080000), never a re-run of the original
-- and never a ledger edit. The ledger ends up reading: applied, undone, re-applied.
--
-- Staging rehearsal on disposable branch cepayqmsoqxshsiyqnvz.
-- =============================================================================
-- PHASE-03A LOCAL CANDIDATE — STAGE-MF-04: environment-scope the webhook target.
--
-- WHAT WAS WRONG
-- The corrected staging rerun measured this on the live disposable branch:
-- public.notify_flag_status_webhook() is SECURITY DEFINER, is attached to the
-- ENABLED trigger flag_status_notify_trigger on public.flags, and posts to a
-- hardcoded PRODUCTION url. Any client permitted to update a flag's status runs
-- it. It is not a dormant adoption literal.
--
-- It has never fired -- net.http_request_queue was empty -- for exactly one
-- reason: vault.decrypted_secrets holds no 'webhook_secret' row on a
-- non-production target. One absent row was the entire control standing between a
-- disposable staging database and production's Edge Function. An invariant
-- maintained by absence is not an invariant.
--
-- WHAT THIS CHANGES
-- The endpoint stops being a compiled-in literal and becomes per-database
-- configuration read at runtime, exactly as the secret already is:
--
--     vault.decrypted_secrets WHERE name = 'webhook_endpoint'
--
-- There is NO default and NO fallback. A database that has not been told where to
-- post does not post. Staging cannot inherit production's endpoint, because a
-- Supabase development branch does not copy its parent's Vault rows -- measured:
-- this staging branch holds exactly one secret, the FDA-028 epoch key.
--
-- WHY A FORWARD MIGRATION AND NOT AN EDIT
-- 20260904000400_adopt_execute_revokes.sql is an ADOPTION candidate. Its purpose
-- is to make source match what production actually has, which is the Phase 02
-- contract-truth premise. Editing it would make the repository disagree with
-- production and defeat the adoption. It is left byte-identical; this is a new
-- forward artifact that supersedes the function afterwards.
--
-- PRODUCTION PRECONDITION — READ BEFORE ANY PRODUCTION APPLY
-- Production today has 'webhook_secret' and the hardcoded url, so its webhook
-- works. Applying this to production BEFORE creating a 'webhook_endpoint' Vault
-- row would fail closed and silently stop status notifications. That is safe, not
-- harmless. The production authorization packet must require creating
-- 'webhook_endpoint' first. This candidate creates it nowhere.
--
-- =============================================================================
BEGIN;

create or replace function public.notify_flag_status_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
DECLARE v_secret text; v_endpoint text; v_payload jsonb;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING '[notify_flag_status_webhook] vault secret missing - skipping';
    RETURN NEW;
  END IF;

  -- STAGE-MF-04. No literal, no default, no inherited production endpoint.
  -- Absent configuration means this database has no webhook target, and a
  -- database with no target does not send.
  SELECT decrypted_secret INTO v_endpoint FROM vault.decrypted_secrets
    WHERE name = 'webhook_endpoint' LIMIT 1;
  -- Scheme + host, optional port, then either a path or nothing. The trailing "/"
  -- used to be mandatory, so a perfectly good "https://host" read as unconfigured
  -- and the webhook silently no-op'd -- an operator would reasonably conclude the
  -- migration was broken. Independent review 2026-09-11, SHOULD-FIX.
  IF v_endpoint IS NULL OR v_endpoint !~ '^https://[a-z0-9.-]+(:[0-9]+)?(/|$)' THEN
    RAISE WARNING '[notify_flag_status_webhook] no valid webhook_endpoint configured - skipping';
    RETURN NEW;
  END IF;

  v_payload := jsonb_build_object('type','UPDATE','table','flags','schema','public',
    'record', row_to_json(NEW), 'old_record', row_to_json(OLD));
  PERFORM net.http_post(
    url := v_endpoint,
    body := v_payload, params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret', v_secret),
    timeout_milliseconds := 5000);
  RETURN NEW;
END; $$;

-- The function is trigger-only. Re-assert the Phase 02 revokes: CREATE OR REPLACE
-- preserves the existing ACL, but a rebuilt database has no existing ACL to keep.
revoke execute on function public.notify_flag_status_webhook()
  from public, anon, authenticated;

-- Assert rather than trust. If a client role could read or write the endpoint, the
-- target would be client-controlled, which is worse than a hardcoded one.
do $$
declare
  leaked text;
begin
  select string_agg(distinct grantee::text, ', ') into leaked
  from information_schema.table_privileges
  where table_schema = 'vault'
    and table_name in ('secrets', 'decrypted_secrets')
    and grantee in ('anon', 'authenticated', 'PUBLIC');
  if leaked is not null then
    raise exception 'STAGE-MF-04: vault secret tables reachable by client role(s): %', leaked;
  end if;

  select string_agg(p.proname, ', ') into leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
       aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname = 'public'
    and a.privilege_type = 'EXECUTE'
    and p.proname = 'notify_flag_status_webhook'
    and (a.grantee = 0 or a.grantee in (
      select oid from pg_roles where rolname in ('anon', 'authenticated')
    ));
  if leaked is not null then
    raise exception 'STAGE-MF-04: EXECUTE still reachable by PUBLIC/anon on: %', leaked;
  end if;
end
$$;

COMMIT;
