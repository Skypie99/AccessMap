-- Reconstructed 2026-05-23 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260523202748, hosted name "data_layer_hardening".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- ===========================================================================
-- 2026-05-23 — Data layer hardening (Dana / backend & database)
-- ===========================================================================
-- Applied via Supabase migration API on behalf of Sky. See repo file
-- supabase/migrations/2026-05-23_data_layer_hardening.sql for full notes
-- and rollback SQL.
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

create index if not exists flags_status_created_at_idx
  on public.flags (status, created_at desc);

drop index if exists flags_status_idx;

drop index if exists flags_geo_idx;
