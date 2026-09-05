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
-- NOT AUTHORIZED FOR APPLY.
-- =============================================================================

revoke execute on function public.check_flag_rate_limit() from public, anon;
revoke execute on function public.notify_flag_status_webhook() from public, anon;

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
    and (a.grantee = 0 or a.grantee = (select oid from pg_roles where rolname = 'anon'));

  if leaked is not null then
    raise exception 'EXECUTE still reachable by PUBLIC/anon on: %', leaked;
  end if;
end
$$;
