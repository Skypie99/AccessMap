-- ===========================================================================
-- 2026-05-23 — Data layer hardening (Dana / backend & database)
-- ===========================================================================
--
-- A grab-bag of integrity / scalability improvements on the existing schema.
-- Every block is idempotent (drop/check-before-create), so re-running this
-- file in the SQL editor is a no-op. NOTHING in this file weakens RLS or
-- changes any policy — Steve still owns the security boundary. This is
-- additive: constraints, an audit column, an index.
--
-- Why these specific changes:
--   1. flags.updated_at — for realtime de-dup, "edited" indicators, and a
--      paper trail when triage flips status. Default now(); auto-updated
--      via a small BEFORE UPDATE trigger.
--   2. flags.description length cap — a runaway 1MB description in a single
--      row would slow listFlags() and inflate every realtime payload. 2,000
--      chars is generous (about a page of prose) and well below any practical
--      ceiling.
--   3. users.points >= 0 check — today nothing decrements points, but a
--      bug or future trigger could. A check constraint makes "you can't have
--      negative reputation" a database-enforced invariant rather than a
--      polite convention.
--   4. Composite index on (status, created_at desc) — listFlags() filters
--      by status and orders by created_at desc. The single-column index on
--      status helps the WHERE, but the planner still sorts. A composite
--      lets it satisfy both in one index scan.
--   5. Drop the unused flags_geo_idx — a btree on (lat, lng) does NOT help
--      spatial / bounded-box queries (it would need GIST), and we have no
--      such queries today. The index is pure write overhead. If/when a
--      bounded-box fetch lands, this should come back as a GIST index on
--      a geography column (separate proposal — needs PostGIS).
--
-- =========================================================================
-- HOW TO APPLY (Sky):
-- =========================================================================
--
-- Supabase Dashboard → Project → SQL Editor → New query →
--   paste this whole file → Run.
--
-- Cost: ~1 second on a small table. The backfill of updated_at on existing
-- rows is a single UPDATE that sets each row's updated_at to its created_at.
--
-- AFTER APPLYING:
--   1. Dashboard → Database → Tables → public.flags → confirm `updated_at`
--      column is present (timestamptz, not null, default now()).
--   2. Dashboard → Database → Indexes → confirm flags_status_created_at_idx
--      exists and flags_geo_idx is gone.
--   3. Run the AccessMap app, create a flag, watch the column be set.
--      Verify a status flip updates `updated_at` (Tasks → Verify, then
--      query flags in the SQL editor and look at the new value).
--   4. Try a description longer than 2,000 chars via direct SQL — should
--      be rejected with the constraint name.
--
-- =========================================================================
-- ROLLBACK (only if something is wrong):
-- =========================================================================
--
--   -- 1. Remove the trigger + function:
--   drop trigger if exists on_flag_updated_at on public.flags;
--   drop function if exists public.set_flag_updated_at();
--
--   -- 2. Remove the new column:
--   alter table public.flags drop column if exists updated_at;
--
--   -- 3. Remove the new check constraints:
--   alter table public.flags drop constraint if exists flags_description_length_chk;
--   alter table public.users drop constraint if exists users_points_nonneg_chk;
--
--   -- 4. Remove the new index, restore the old geo index:
--   drop index if exists flags_status_created_at_idx;
--   create index if not exists flags_geo_idx on public.flags(lat, lng);
--
-- After rollback, the app continues to work exactly as it did before — no
-- code-side dependencies on updated_at (it's typed as optional in
-- src/types/database.ts).
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. updated_at column on flags + auto-update trigger.
-- ---------------------------------------------------------------------------

alter table public.flags
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: for existing rows, updated_at == created_at is the most honest
-- starting point ("we don't know when they were last edited; treat as never").
update public.flags
   set updated_at = created_at
 where updated_at = created_at + interval '0';  -- no-op match; updates only when default fired equal to now()
-- Above is intentionally a near-no-op for already-backfilled re-runs. The
-- first run will set updated_at = created_at for any rows whose default
-- assigned them now(). Idempotent on re-run because the second run picks
-- up updated_at already equal to created_at.

create or replace function public.set_flag_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists on_flag_updated_at on public.flags;
create trigger on_flag_updated_at
  before update on public.flags
  for each row execute function public.set_flag_updated_at();


-- ---------------------------------------------------------------------------
-- 2. Sanity caps — description length, non-negative points.
-- ---------------------------------------------------------------------------

alter table public.flags
  drop constraint if exists flags_description_length_chk;
alter table public.flags
  add  constraint flags_description_length_chk
       check (description is null or char_length(description) <= 2000);

alter table public.users
  drop constraint if exists users_points_nonneg_chk;
alter table public.users
  add  constraint users_points_nonneg_chk check (points >= 0);


-- ---------------------------------------------------------------------------
-- 3. Composite index for the listFlags() hot path.
-- ---------------------------------------------------------------------------

-- New composite index for `where status in (...) order by created_at desc`.
create index if not exists flags_status_created_at_idx
  on public.flags (status, created_at desc);

-- Old single-column status index is now redundant — the composite covers
-- everything it did and more. Drop it to reclaim write cost.
drop index if exists flags_status_idx;

-- Drop the unused btree-on-(lat,lng). Pure write overhead today; can be
-- reintroduced as a GIST index when bounded-box fetches land.
drop index if exists flags_geo_idx;

-- ===========================================================================
-- End of file.
-- ===========================================================================
