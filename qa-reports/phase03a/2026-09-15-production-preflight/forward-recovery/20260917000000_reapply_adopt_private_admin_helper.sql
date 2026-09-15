-- FORWARD REAPPLICATION of 20260904000000_adopt_private_admin_helper.
-- Prepared as production Phase 03A preflight evidence only.
-- This later canonical version preserves the original ledger row and reapplies the exact accepted source body.
-- Execution requires a separate exact owner authorization, fresh version-availability proof, and independent security review.
-- =============================================================================
-- FORWARD-ONLY CANDIDATE — not applied anywhere. PHASE-02B.
--
-- Version 20260904000000 is strictly after the ledger head 20260830130000.
--
-- PURPOSE: make the repository able to rebuild production's admin-escalation
-- guard. Production has private.current_user_is_admin() and a policy that uses
-- it; both were applied out of band and exist in no repository file. See
-- supabase/nonmanaged/live-out-of-band/2026-09-04_adopted_private_admin_helper.sql
--
-- EFFECT AGAINST PRODUCTION: none. Every statement is idempotent and asserts
-- the state production is already in. It is written to be a NO-OP there and a
-- CORRECTION on any database rebuilt from source.
--
-- EFFECT ON A FRESH REPLAY/STAGING: creates the private schema and helper and
-- repoints the policy, so staging stops diverging from production on the one
-- predicate that governs privilege escalation.
--
-- NOT AUTHORIZED FOR APPLY. Phase 02 applies nothing. This is a candidate for a
-- later, separately authorized apply with the rollback in
-- migrations-next/rollback/.
-- =============================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
select account.is_admin
from public.users as account
where account.id = (select auth.uid())
$function$;

-- Least privilege: the helper reads another user's admin flag under definer
-- rights, so anon and PUBLIC must never hold EXECUTE.
revoke execute on function private.current_user_is_admin() from public;
revoke execute on function private.current_user_is_admin() from anon;
grant execute on function private.current_user_is_admin() to authenticated;

-- Repoint the escalation guard onto the helper. Recreated rather than ALTERed
-- so the statement is idempotent from either starting shape.
drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    ((select auth.uid()) = id)
    and (not (is_admin is distinct from (select private.current_user_is_admin())))
  );
