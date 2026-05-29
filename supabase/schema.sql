-- AccessMap database schema.
-- Run in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users: mirror of auth.users with profile fields and gamification points.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text,
  avatar_url text,
  points integer not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- flags: accessibility issues reported by users at a lat/lng.
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Auto-provision a public.users row when an auth user signs up.
-- ---------------------------------------------------------------------------
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

-- Trigger-only function: it should never be callable directly via the REST API
-- (/rest/v1/rpc/...). Triggers still fire after this revoke; only RPC access is removed.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Award points when a flag changes status. Runs as security definer so it can
-- update users.points for both the reporter and the acting verifier/resolver
-- (RLS on public.users would otherwise block cross-user writes).
-- Forward-only: reverting from verified -> open or rejecting awards nothing.
-- ---------------------------------------------------------------------------
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

-- Trigger-only function: not meant to be called directly via the REST API.
revoke execute on function public.handle_flag_status_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.flags enable row level security;

-- users: anyone authenticated can read profiles; users can update their own.
-- The (select auth.uid()) wrapper lets Postgres evaluate auth.uid() once
-- per statement (initPlan) instead of per row — same semantics, faster.
drop policy if exists "users readable by authenticated" on public.users;
create policy "users readable by authenticated"
  on public.users for select
  to authenticated
  using (true);

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- flags: anyone authenticated can read; users can insert their own;
-- owners can edit/delete their own flags AND any authenticated user can
-- change ONLY the status column on someone else's flag (the triage flow).
drop policy if exists "flags readable by authenticated" on public.flags;
create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);

drop policy if exists "flags insert own" on public.flags;
create policy "flags insert own"
  on public.flags for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "flags update own" on public.flags;
create policy "flags update own"
  on public.flags for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- The triage policy. Postgres ORs the two UPDATE policies — owners pass
-- via "flags update own"; non-owners pass via this one but only if they
-- change ONLY the status column. The WITH CHECK uses correlated subselects
-- to compare every non-status column on the NEW row against the OLD row
-- (visible under READ COMMITTED because the UPDATE has not yet committed).
drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (
    user_id     = (select user_id     from public.flags where id = flags.id)
    and lat         = (select lat         from public.flags where id = flags.id)
    and lng         = (select lng         from public.flags where id = flags.id)
    and category    = (select category    from public.flags where id = flags.id)
    and severity    = (select severity    from public.flags where id = flags.id)
    and description is not distinct from (select description from public.flags where id = flags.id)
    and photo_url   is not distinct from (select photo_url   from public.flags where id = flags.id)
    and created_at  = (select created_at  from public.flags where id = flags.id)
  );

drop policy if exists "flags delete own" on public.flags;
create policy "flags delete own"
  on public.flags for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- push_tokens: Expo push notification tokens (one per user, upserted).
-- Tokens are PII under PIPEDA and must be stored securely.
-- ---------------------------------------------------------------------------
create table if not exists public.push_tokens (
  user_id   uuid primary key references public.users(id) on delete cascade,
  token     text not null,
  platform  text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_tokens enable row level security;

-- Each user can only read/write/delete their own push token.
-- The service-role (Edge Functions) bypasses RLS to send notifications.
drop policy if exists "push_tokens owner select" on public.push_tokens;
create policy "push_tokens owner select"
  on public.push_tokens for select
  using (auth.uid() = user_id);

drop policy if exists "push_tokens owner insert" on public.push_tokens;
create policy "push_tokens owner insert"
  on public.push_tokens for insert
  with check (auth.uid() = user_id);

drop policy if exists "push_tokens owner update" on public.push_tokens;
create policy "push_tokens owner update"
  on public.push_tokens for update
  using (auth.uid() = user_id);

drop policy if exists "push_tokens owner delete" on public.push_tokens;
create policy "push_tokens owner delete"
  on public.push_tokens for delete
  using (auth.uid() = user_id);

-- Update-at timestamp trigger.
create or replace function public.handle_push_token_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_tokens_updated_at on public.push_tokens;
create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_push_token_updated_at();

-- ---------------------------------------------------------------------------
-- Storage: bucket for flag photos. Public read so everyone sees the thumbnail;
-- uploads scoped to the authenticated user's own folder (`<auth.uid>/<file>`).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('flag-photos', 'flag-photos', true)
on conflict (id) do nothing;

-- No public SELECT policy on purpose: the bucket is public, so object URLs
-- (/object/public/flag-photos/...) resolve without RLS. A broad SELECT policy would
-- only add the ability to LIST every file in the bucket, which we don't want.
drop policy if exists "flag-photos public read" on storage.objects;

drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
