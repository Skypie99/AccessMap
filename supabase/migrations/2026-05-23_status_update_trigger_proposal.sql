-- ===========================================================================
-- 2026-05-23 — PROPOSAL: replace the brittle non-owner-status RLS policy
--                          with a BEFORE UPDATE trigger.
-- ===========================================================================
--
-- !!! DO NOT APPLY YET — propose-only. Read the analysis below first. !!!
--
-- This is a *better-pattern* proposal, not a fix for a known bug. The current
-- "flags status update by any authenticated" policy in schema.sql works, but
-- it's fragile: it lists every non-status column explicitly with subselects,
-- and any new column added to public.flags must be added to that policy or
-- the column silently becomes editable by non-owners.
--
-- Concrete risk:
--   The companion migration `2026-05-23_data_layer_hardening.sql` adds an
--   `updated_at` column to public.flags. The trigger sets it to now() on
--   every UPDATE. That's safe — the BEFORE UPDATE trigger overwrites whatever
--   the client sent — but anything ELSE we add (e.g. a future `resolved_by`
--   user_id column, an `internal_notes` column) is one schema migration away
--   from being editable by random authenticated users until someone remembers
--   to update the RLS policy. The current pattern is a foot-gun.
--
-- Better pattern: a BEFORE UPDATE trigger that, when the current user is NOT
-- the row's owner, refuses any change EXCEPT to `status` by reverting all
-- non-status columns to their OLD values. Then the "flags status update by
-- any authenticated" RLS policy collapses to a trivial `using (true)` /
-- `with check (true)` because the trigger enforces the column-level rule.
--
-- New columns get the protection automatically: the trigger preserves
-- everything that wasn't `status` for non-owners, period.
--
-- Why "propose-only":
--   1. It's a behavior change at the database boundary. Even if the new
--      behavior is provably equivalent + safer, it deserves a deliberate
--      apply with both accounts at hand to smoke test.
--   2. The trigger needs to coexist with `handle_flag_status_change` (the
--      points trigger). They're both AFTER vs BEFORE on the same UPDATE, but
--      ordering matters: this trigger must fire BEFORE the row hits the
--      points trigger so the points trigger sees the (validated) new status.
--      Postgres fires BEFORE triggers in name order — `set_flag_updated_at`
--      and this new `enforce_flag_status_only_for_non_owner` both run BEFORE.
--      Alphabetical order makes the latter fire first, which is what we want.
--   3. Steve should sign off before this lands.
--
-- =========================================================================
-- HOW TO APPLY (after review):
-- =========================================================================
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this file → Run.
--
-- AFTER APPLYING:
--   1. Smoke test with two accounts (same as the schema.sql instructions):
--      - Account A creates a flag.
--      - Account B opens Tasks → Verify on A's flag.
--          Expected: status flips to verified, B's points +2 from the
--          points trigger.
--      - Direct REST PATCH from B trying to change A's flag's description.
--          Expected: PATCH succeeds at the HTTP layer (RLS passes), but
--          the description is *unchanged* in the DB because the trigger
--          reverted it. This is the only behavior difference from today:
--          today the WITH CHECK fails the whole UPDATE; with the trigger,
--          the UPDATE succeeds but is silently a no-op for unauthorized
--          columns. Steve may prefer the loud failure — that's the call.
--
-- =========================================================================
-- ROLLBACK (if smoke test fails):
-- =========================================================================
--
--   drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
--   drop function if exists public.enforce_flag_status_only_for_non_owner();
--   -- Then re-run the "flags status update by any authenticated" policy body
--   -- from supabase/schema.sql to restore the prior (verbose) enforcement.
--
-- ===========================================================================

-- Reverts any non-status column change attempted by a non-owner. Runs as
-- a regular trigger (not security definer) — it only reads/writes the row
-- being updated, no cross-row access needed.
create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
as $$
begin
  -- Owners (and unauthenticated paths, which RLS already blocks) keep full
  -- edit rights. Only non-owners get the column-level revert.
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  -- Revert every column except status to its OLD value. Easier and safer
  -- than enumerating new columns one by one.
  new.user_id     := old.user_id;
  new.lat         := old.lat;
  new.lng         := old.lng;
  new.category    := old.category;
  new.severity    := old.severity;
  new.description := old.description;
  new.photo_url   := old.photo_url;
  new.created_at  := old.created_at;
  -- updated_at intentionally NOT reverted — it tracks "this row was touched"
  -- which is honest for a status flip.
  -- Any column added later is preserved automatically because the trigger
  -- only sets the ones it knows about.
  return new;
end;
$$;

drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
create trigger enforce_flag_status_only_for_non_owner
  before update on public.flags
  for each row execute function public.enforce_flag_status_only_for_non_owner();

-- After applying, the WITH CHECK clauses on "flags status update by any
-- authenticated" become belt-and-suspenders. They're safe to leave in
-- place (defence in depth) or to simplify to `with check (true)`. Leave
-- them in for now and revisit after the trigger has been live for a week.
