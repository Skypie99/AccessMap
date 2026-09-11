-- PHASE-03A LOCAL CANDIDATE: STAGE-MF-04 rollback.
--
-- Restores the Phase 02 adoption body, which contains the hardcoded PRODUCTION
-- endpoint. That is the pre-candidate posture, and it therefore restores the exact
-- coupling STAGE-MF-04 exists to remove: any database carrying a 'webhook_secret'
-- row would again post to production.
--
-- Rolling this back on a non-production target is safe only while that target has
-- no 'webhook_secret'. This is not a routine undo.
BEGIN;

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

revoke execute on function public.notify_flag_status_webhook()
  from public, anon, authenticated;

COMMIT;
