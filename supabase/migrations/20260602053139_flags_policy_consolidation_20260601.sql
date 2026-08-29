-- Reconstructed 2026-06-02 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260602053139, hosted name "flags_policy_consolidation_20260601".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- F1: remove the over-broad leftover policy that grants any signed-in user full
-- CRUD on every flag, and collapse the two anon-insert policies into one that
-- pins user_id + photo_url + status. See qa-steve audit 2026-06-01.

drop policy if exists "flags_auth_user_only" on public.flags;

drop policy if exists "flags insert anon" on public.flags;
drop policy if exists "flags anon insert" on public.flags;

create policy "flags anon insert"
  on public.flags for insert
  to anon
  with check (
    user_id   is null
    and photo_url is null
    and status   = 'open'
  );
