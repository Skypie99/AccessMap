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
-- ⚠️ SUPERSEDED 2026-07-27 — DO NOT RE-RUN THIS GRANT IN ISOLATION.
--    This grant turned the function into a secret-testing oracle for any
--    anon caller. It was REVOKED on production 2026-07-27 (SR-018); the
--    revoke is recorded in 2026-07-27_sr018_verify_webhook_secret_revoke.sql,
--    which must be applied after this file on any fresh bootstrap.
--    Left in place rather than deleted because this file is the historical
--    record of what was applied on 2026-06-03. Findings S-6 / IO-4.
GRANT EXECUTE ON FUNCTION public.verify_webhook_secret(text) TO anon, authenticated;
