-- ============================================================================
-- MOD1 CHECKPOINT A — admin-only reject authorization + admin restore.
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
--
-- Supersedes 2026-08-19_flag_status_transition_guard_APPLIED.sql.
--
-- WHAT: closes the gap where ANY authenticated user (not just admins) could
-- transition a flag into 'rejected' from open or verified. The 2026-08-19
-- guard already gated resolved->rejected to admins (so AdminScreen's Dismiss
-- would work); this extends the SAME admin check to open->rejected and
-- verified->rejected, and adds a new rejected->open transition ("Restore"),
-- also admin-only, for moderator-error recovery.
--
-- LEGAL TRANSITIONS (after this migration):
--   open      -> verified | resolved            community
--   verified  -> resolved                       community
--   resolved  -> open                           community reopen (threshold RPC)
--   open      -> rejected            ADMIN ONLY
--   verified  -> rejected            ADMIN ONLY
--   resolved  -> rejected            ADMIN ONLY  (unchanged from 2026-08-19)
--   rejected  -> open                ADMIN ONLY  (NEW — "Restore")
--   any       -> same status                     idempotent no-op writes allowed
--
-- The RLS policy "flags status update by any authenticated" is intentionally
-- left as-is (any account row may attempt to write flags.status) — this
-- trigger remains the single point of transition-legality authority, exactly
-- as the 2026-08-19 migration designed it.
--
-- ROLLBACK:
--   re-apply 2026-08-19_flag_status_transition_guard_APPLIED.sql's
--   CREATE OR REPLACE FUNCTION body verbatim (restores pre-MOD1 behavior).
-- ============================================================================

create or replace function public.enforce_flag_status_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = old.status then
    return new; -- idempotent writes are fine
  end if;

  -- Community-legal transitions: never touch 'rejected' in either direction.
  if (old.status = 'open'     and new.status in ('verified', 'resolved'))
  or (old.status = 'verified' and new.status = 'resolved')
  or (old.status = 'resolved' and new.status = 'open')
  then
    return new;
  end if;

  -- Every transition INTO or OUT OF 'rejected' requires an admin.
  if (
    (old.status in ('open', 'verified', 'resolved') and new.status = 'rejected')
    or (old.status = 'rejected' and new.status = 'open')
  )
  and auth.uid() in (select id from public.users where is_admin = true)
  then
    return new;
  end if;

  raise exception 'illegal flag status transition: % -> %', old.status, new.status
    using errcode = 'P0001';
end;
$$;

-- Trigger definition unchanged — re-declared for clarity/idempotence.
drop trigger if exists flag_status_transition_guard on public.flags;
create trigger flag_status_transition_guard
  before update of status on public.flags
  for each row
  execute function public.enforce_flag_status_transition();
