-- Reconstructed 2026-05-28 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260528230556, hosted name "data_layer_hardening".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

alter table public.flags
  add column if not exists updated_at timestamptz not null default now();

update public.flags
   set updated_at = created_at
 where updated_at = created_at + interval '0';

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

alter table public.flags
  drop constraint if exists flags_description_length_chk;
alter table public.flags
  add  constraint flags_description_length_chk
       check (description is null or char_length(description) <= 2000);

alter table public.users
  drop constraint if exists users_points_nonneg_chk;
alter table public.users
  add  constraint users_points_nonneg_chk check (points >= 0);

create index if not exists flags_status_created_at_idx
  on public.flags (status, created_at desc);

drop index if exists flags_status_idx;
drop index if exists flags_geo_idx;
