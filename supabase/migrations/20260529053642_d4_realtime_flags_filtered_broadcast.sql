-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529053642, hosted name "d4_realtime_flags_filtered_broadcast".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- D4: Realtime Flags — Option 2 (Filtered Broadcast)
-- Policy: Supabase Realtime publishes ONLY {id, status} from public.flags.
-- Clients receive the change notification then re-fetch the full row via the existing RLS-gated SELECT endpoint
-- lat/lng, category, severity, user_id, photo_url, and description NEVER leave the server inside a broadcast payload

-- STEP 1: Drop any Option-1 publication state that may already be live
do $$
begin
  execute 'alter publication supabase_realtime drop table public.flags';
  raise notice 'Removed public.flags from supabase_realtime (clearing Option-1 state).';
exception
  when undefined_object then
    raise notice 'public.flags was not in supabase_realtime; nothing to drop.';
  when sqlstate '42P17' then
    raise notice 'public.flags was not in supabase_realtime (alt code); nothing to drop.';
end $$;

-- STEP 2: Add public.flags with column-level filter (id, status only)
alter publication supabase_realtime add table public.flags (id, status);

-- STEP 3: Observability log table
create table if not exists public.realtime_subscribe_log (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references public.users(id) on delete cascade,
  event       text        not null check (event in ('subscribe', 'unsubscribe')),
  channel     text        not null,
  logged_at   timestamptz not null default now()
);
alter table public.realtime_subscribe_log enable row level security;
drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own"
  on public.realtime_subscribe_log for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
create or replace function public.log_realtime_event(
  p_event   text,
  p_channel text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'log_realtime_event requires an authenticated user';
  end if;
  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;
  insert into public.realtime_subscribe_log (user_id, event, channel)
  values (auth.uid(), p_event, p_channel);
end;
$$;
revoke execute on function public.log_realtime_event(text, text) from public, anon;
grant  execute on function public.log_realtime_event(text, text) to authenticated;
