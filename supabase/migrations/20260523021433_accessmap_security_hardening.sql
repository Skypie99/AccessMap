-- Reconstructed 2026-05-23 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260523021433, hosted name "accessmap_security_hardening".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- Trigger-only SECURITY DEFINER functions should not be callable via the REST API.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.handle_flag_status_change() from public, anon, authenticated;

-- The flag-photos bucket is public, so object URLs (/object/public/...) work without
-- this policy. The broad SELECT policy only enabled listing every file, so drop it.
drop policy if exists "flag-photos public read" on storage.objects;
