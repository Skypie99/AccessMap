-- Reconstructed 2026-05-23 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260523020620, hosted name "accessmap_schema".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- AccessMap database schema.
create extension if not exists "uuid-ossp";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.flags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  category text not null check (category in (
    'no_ramp', 'broken_sidewalk', 'blocked_path',
    'missing_signal', 'steep_grade', 'other'
  )),
  description text,
  severity smallint not null check (severity between 1 and 5),
  photo_url text,
  status text not null default 'open' check (status in (
    'open', 'verified', 'resolved', 'rejected'
  )),
  created_at timestamptz not null default now()
);

create index if not exists flags_user_id_idx on public.flags(user_id);
create index if not exists flags_status_idx on public.flags(status);
create index if not exists flags_geo_idx on public.flags(lat, lng);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_bonus int := 0;
  actor_bonus    int := 0;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus := 5;
    actor_bonus    := 2;
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus := 10;
    actor_bonus    := 5;
  end if;

  if reporter_bonus > 0 then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() <> new.user_id then
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
  end if;

  return new;
end;
$$;

drop trigger if exists on_flag_status_change on public.flags;
create trigger on_flag_status_change
  after update of status on public.flags
  for each row execute function public.handle_flag_status_change();

alter table public.users enable row level security;
alter table public.flags enable row level security;

drop policy if exists "users readable by authenticated" on public.users;
create policy "users readable by authenticated"
  on public.users for select
  to authenticated
  using (true);

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "flags readable by authenticated" on public.flags;
create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);

drop policy if exists "flags insert own" on public.flags;
create policy "flags insert own"
  on public.flags for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "flags update own" on public.flags;
create policy "flags update own"
  on public.flags for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "flags delete own" on public.flags;
create policy "flags delete own"
  on public.flags for delete
  to authenticated
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('flag-photos', 'flag-photos', true)
on conflict (id) do nothing;

drop policy if exists "flag-photos public read" on storage.objects;
create policy "flag-photos public read"
  on storage.objects for select
  to public
  using (bucket_id = 'flag-photos');

drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
