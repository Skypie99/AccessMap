-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529181141, hosted name "notify_flag_status_webhook_trigger".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.


-- Enable pg_net for async HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function: fires on flag status changes, calls notify-flag-status edge function
CREATE OR REPLACE FUNCTION notify_flag_status_webhook()
RETURNS trigger AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url     := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'X-Webhook-Secret', '5c7b5da066f1da8f6201c83efdcfa2a61f3c38d5327c81fc8b293bad713b4912'
    ),
    body := jsonb_build_object(
      'type',       'UPDATE',
      'table',      'flags',
      'record',     to_jsonb(NEW),
      'old_record', to_jsonb(OLD)
    )::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wire the trigger
DROP TRIGGER IF EXISTS flag_status_notify_trigger ON public.flags;
CREATE TRIGGER flag_status_notify_trigger
  AFTER UPDATE ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION notify_flag_status_webhook();
