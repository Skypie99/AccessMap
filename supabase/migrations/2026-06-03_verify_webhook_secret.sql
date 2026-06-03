-- 2026-06-03_verify_webhook_secret.sql
-- Security helper: let the notify-flag-status Edge Function verify the webhook
-- secret against Vault without ever reading the raw value.
--
-- Both the DB trigger (notify_flag_status_webhook — reads Vault via pg_net) and
-- the Edge Function (calls this RPC via service-role REST) now share a single
-- source of truth. Rotation only needs vault.update_secret() + Edge Function
-- redeploy — no trigger rebuild, no env-var dance.
--
-- Rollback: DROP FUNCTION public.verify_webhook_secret(text);

CREATE OR REPLACE FUNCTION public.verify_webhook_secret(incoming text)
  RETURNS boolean
  LANGUAGE sql
  SECURITY DEFINER
  SET search_path = public, vault
AS $$
  SELECT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'webhook_secret' AND decrypted_secret = incoming
  );
$$;

REVOKE ALL ON FUNCTION public.verify_webhook_secret(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_webhook_secret(text) TO anon, authenticated;
