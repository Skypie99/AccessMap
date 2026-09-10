-- =============================================================================
-- FORWARD-ONLY CANDIDATE — not applied anywhere. PHASE-02B.
--
-- Version 20260904000400 is strictly after the ledger head 20260830130000, and
-- deliberately LAST in this wave: it revokes on functions the earlier
-- candidates create.
--
-- PURPOSE: close the final direction of drift the replay found, and the only
-- one that runs the dangerous way round. On every other delta the repository
-- was missing something production has. Here the repository is MORE PERMISSIVE
-- than production: a database rebuilt from source leaves EXECUTE on
--   public.check_flag_rate_limit()      (a trigger-only rate limiter)
--   public.notify_flag_status_webhook() (a trigger-only webhook sender)
-- available to PUBLIC and anon, which production revoked out of band.
--
-- Direct EXECUTE on a trigger-only SECURITY DEFINER function is exactly the
-- FDA-010 shape: a caller can invoke the body outside the trigger context it
-- was written for. Production is already hardened; only source was not.
--
-- EFFECT AGAINST PRODUCTION: none — already revoked there.
-- EFFECT ON A REBUILT DATABASE: removes an escalation surface that would
-- otherwise exist only in staging, which is the worst place for a difference
-- like this to hide.
--
-- This candidate also replaces the historical webhook implementation whose
-- generated replay snapshot exposed a retired literal. The replacement reads
-- the value from Vault at runtime. The endpoint below is a public project URL,
-- not a credential; no key or secret is present in this file.
--
-- NOT AUTHORIZED FOR APPLY.
-- =============================================================================

create or replace function public.verify_webhook_secret(incoming text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' AND decrypted_secret = incoming
  );
$$;

create or replace function public.notify_flag_status_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
DECLARE v_secret text; v_payload jsonb;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' LIMIT 1;
  IF v_secret IS NULL THEN
    RAISE WARNING '[notify_flag_status_webhook] vault secret missing - skipping';
    RETURN NEW;
  END IF;
  v_payload := jsonb_build_object('type','UPDATE','table','flags','schema','public',
    'record', row_to_json(NEW), 'old_record', row_to_json(OLD));
  PERFORM net.http_post(
    url := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
    body := v_payload, params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret', v_secret),
    timeout_milliseconds := 5000);
  RETURN NEW;
END; $$;

revoke execute on function public.check_flag_rate_limit()
  from public, anon, authenticated;
revoke execute on function public.notify_flag_status_webhook()
  from public, anon, authenticated;
revoke execute on function public.verify_webhook_secret(text)
  from public, anon, authenticated;

-- Assert the intent rather than trusting the revoke silently succeeded.
do $$
declare
  leaked text;
begin
  select string_agg(p.proname, ', ') into leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace,
       aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
  where n.nspname = 'public'
    and a.privilege_type = 'EXECUTE'
    and p.proname in ('check_flag_rate_limit', 'notify_flag_status_webhook')
    and (a.grantee = 0 or a.grantee in (
      select oid from pg_roles where rolname in ('anon', 'authenticated')
    ));

  if leaked is not null then
    raise exception 'EXECUTE still reachable by PUBLIC/anon on: %', leaked;
  end if;
end
$$;
