-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529084136, hosted name "2026_05_23_data_layer_hardening_fix".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- Add updated_at column if it doesn't exist (using DO block for compatibility)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'flags' and column_name = 'updated_at'
  ) then
    alter table public.flags add column updated_at timestamptz default now();
  end if;
end $$;

-- Backfill updated_at for any existing rows that don't have it set
update public.flags
   set updated_at = created_at
 where updated_at is null;

-- Auto-update updated_at on every flag update
create or replace function public.update_flags_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists update_flags_updated_at on public.flags;
create trigger update_flags_updated_at
  before update on public.flags
  for each row execute function public.update_flags_updated_at();

-- Add description length check (max 2000 chars)
do $$
begin
  alter table public.flags
    add constraint description_max_length
      check (length(coalesce(description, '')) <= 2000)
      not valid;
  alter table public.flags validate constraint description_max_length;
exception
  when others then null;
end $$;

-- Add points >= 0 check constraint
do $$
begin
  alter table public.users
    add constraint points_non_negative
      check (points >= 0)
      not valid;
  alter table public.users validate constraint points_non_negative;
exception
  when others then null;
end $$;

-- Create composite index on (status, created_at desc) for efficient queries
create index if not exists idx_flags_status_created_at_desc
  on public.flags (status, created_at desc);

-- Drop the unused btree geo index (if it exists)
drop index if exists idx_flags_geo;
