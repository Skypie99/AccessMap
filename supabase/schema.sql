-- AccessMap database schema.
-- Run in the Supabase SQL editor (or via `supabase db push`).
--
-- RECONCILIATION STATUS (2026-06-07):
--   This file covers the original tables (users, flags, push_tokens) + the
--   2026-06-03 security gate functions + the F8 reopen RPC.  Ten additional
--   tables and several supporting functions are NOT yet represented here —
--   they were applied via the migration files in supabase/migrations/.
--   For the full live schema, run pg_dump or consult:
--     supabase/migrations/2026-05-23_data_layer_hardening.sql
--     supabase/migrations/2026-05-23_feedback_table.sql
--     supabase/migrations/2026-05-24_flag_context_tags.sql
--     supabase/migrations/2026-05-24_status_history_table.sql
--     supabase/migrations/2026-05-25_flag_edit_history_table.sql
--     supabase/migrations/2026-05-25_notification_preferences_proposal.sql
--     supabase/migrations/2026-05-25_push_tokens.sql
--     supabase/migrations/2026-05-27_users_email_privacy.sql
--     supabase/migrations/2026-05-28_d4_realtime_flags_filtered.sql
--     supabase/migrations/2026-05-29_account_deletion_cascade.sql
--     supabase/migrations/2026-05-29_anon_flags_select.sql
--     supabase/migrations/2026-05-29_function_search_path_hardening.sql
--     supabase/migrations/2026-05-30_admin_role.sql
--     supabase/migrations/2026-05-30_flag_reopen_requests.sql
--     supabase/migrations/2026-06-03_verify_webhook_secret.sql
--   Tables in live DB not yet in this file (use migrations as source of truth):
--     comment_votes, feedback, flag_comments, flag_edit_history, flag_photos,
--     flag_status_history, flag_verifications, notification_preferences,
--     point_events, realtime_subscribe_log

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- users: mirror of auth.users with profile fields, gamification, and streaks.
-- Live columns verified 2026-06-07 against information_schema.columns.
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id                   uuid primary key references auth.users(id) on delete cascade,
  email                text not null unique,
  display_name         text,
  avatar_url           text,
  points               integer not null default 0,
  created_at           timestamptz not null default now(),
  last_active_date     date,
  streak_days          integer not null default 0,
  longest_streak_days  integer not null default 0,
  is_admin             boolean not null default false
);

-- ---------------------------------------------------------------------------
-- flags: accessibility issues reported by users at a lat/lng.
-- user_id is nullable to support anonymous reports (anon_flags migration).
-- Live columns verified 2026-06-07 against information_schema.columns.
-- ---------------------------------------------------------------------------
create table if not exists public.flags (
  id                       uuid primary key default uuid_generate_v4(),
  user_id                  uuid references public.users(id) on delete cascade,
  lat                      double precision not null,
  lng                      double precision not null,
  category                 text not null check (category in (
    'no_ramp', 'broken_sidewalk', 'blocked_path',
    'missing_signal', 'steep_grade', 'other'
  )),
  description              text,
  severity                 smallint not null check (severity between 1 and 5),
  photo_url                text,
  status                   text not null default 'open' check (status in (
    'open', 'verified', 'resolved', 'rejected'
  )),
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  context_tags             text[] not null default '{}',
  reopen_requests          integer not null default 0,
  reopen_requests_reset_at timestamptz
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
-- Award points when a flag changes status.
-- Live body verified 2026-06-07 via pg_get_functiondef.
-- Points: +10/+3 on verified (reporter/actor); +15/+7 on resolved.
-- Writes to point_events table for audit trail (see migrations for table DDL).
-- is_admin spam-penalty branch: admin-explicit reject deducts 20pts from reporter.
-- DECISION PENDING (Sky): live awards 10/3/15/7; original schema.sql had 5/2/10/5.
--   Trust the live catalog (this file now matches live as of 2026-06-07).
-- ---------------------------------------------------------------------------
create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  elsif new.status = 'rejected' and auth.uid() in (
      select id from public.users where is_admin = true
    ) then
    -- Spam penalty: only when admin explicitly rejects
    if new.user_id is not null then
      update public.users
        set points = greatest(0, points - 20)
        where id = new.user_id;
      insert into public.point_events (user_id, event_type, delta, flag_id)
        values (new.user_id, 'flag_spam_penalty', -20, new.id);
    end if;
    return new;
  end if;

  if reporter_bonus > 0 and new.user_id is not null then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (new.user_id, reporter_event, reporter_bonus, new.id);
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() <> new.user_id then
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (auth.uid(), actor_event, actor_bonus, new.id);
  end if;

  return new;
end;
$$;

-- Note: trigger_flag_status_change was dropped 2026-06-03 (duplicate trigger).
-- Only on_flag_status_change remains.
drop trigger if exists trigger_flag_status_change on public.flags;
drop trigger if exists on_flag_status_change on public.flags;
create trigger on_flag_status_change
  after update of status on public.flags
  for each row execute function public.handle_flag_status_change();

revoke execute on function public.handle_flag_status_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reset reopen_requests when a flag is re-opened.
-- Applied live 2026-05-30 (see migrations/2026-05-30_flag_reopen_requests.sql).
-- Live body verified 2026-06-07 via pg_get_functiondef.
-- ---------------------------------------------------------------------------
create or replace function public.handle_flag_reopen_reset()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status = 'resolved' and new.status = 'open' then
    new.reopen_requests          := 0;
    new.reopen_requests_reset_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_flag_reopen_reset on public.flags;
create trigger on_flag_reopen_reset
  before update of status on public.flags
  for each row execute function public.handle_flag_reopen_reset();

revoke execute on function public.handle_flag_reopen_reset() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Webhook: notify the Edge Function when a flag status changes.
-- Reads the shared secret from Supabase Vault (webhook_secret).
-- Applied live 2026-06-03 (see migrations/2026-06-03_verify_webhook_secret.sql).
-- Live body verified 2026-06-07 via pg_get_functiondef.
-- ---------------------------------------------------------------------------
create or replace function public.verify_webhook_secret(incoming text)
returns boolean
language sql
security definer
set search_path = public, vault
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'webhook_secret' and decrypted_secret = incoming
  );
$$;

-- SR-018 / S-6 (2026-07-31): this function had NO grant statement here at all —
-- the only function in this file so treated. `create or replace` preserves
-- existing grants, so it was inert against current prod, but a fresh database
-- bootstrapped from this file would get PostgreSQL's default EXECUTE TO PUBLIC,
-- i.e. BROADER than the state that was flagged as a finding. Matches the live
-- posture applied 2026-07-27. Only service_role (the Edge Function's key) needs
-- to call this.
revoke execute on function public.verify_webhook_secret(text) from public, anon, authenticated;

create or replace function public.notify_flag_status_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare v_secret text; v_payload jsonb;
begin
  select decrypted_secret into v_secret from vault.decrypted_secrets
    where name = 'webhook_secret' limit 1;
  if v_secret is null then
    raise warning '[notify_flag_status_webhook] vault secret missing - skipping';
    return new;
  end if;
  v_payload := jsonb_build_object('type','UPDATE','table','flags','schema','public',
    'record', row_to_json(new), 'old_record', row_to_json(old));
  perform net.http_post(
    url := 'https://kldlwszpfkdmsjrjhjym.supabase.co/functions/v1/notify-flag-status',
    body := v_payload, params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret', v_secret),
    timeout_milliseconds := 5000);
  return new;
end;
$$;

drop trigger if exists flag_status_notify_trigger on public.flags;
create trigger flag_status_notify_trigger
  after update of status on public.flags
  for each row execute function public.notify_flag_status_webhook();

revoke execute on function public.notify_flag_status_webhook() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- increment_reopen_request: RPC called by clients when a user requests reopen.
-- Wired in the app (F8) 2026-06-07. Applied live 2026-05-30.
-- Live body verified 2026-06-07 via pg_get_functiondef.
-- ---------------------------------------------------------------------------
create or replace function public.increment_reopen_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.flags
    set reopen_requests = reopen_requests + 1
    where id = p_flag_id
      and status = 'resolved'
    returning reopen_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;

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

-- flags: anyone authenticated or anon can read (anon SELECT confirmed live 2026-06-07;
-- Jordan-approved via 2026-05-29_anon_flags_select.sql — flags contain no PII).
-- Additional live policies NOT yet modelled here (see migrations):
--   "flags anon insert"   — anon INSERT (anonymous reporting, 2026-05-29_anon_flags_select.sql)
--   "admin delete any flag" — authenticated DELETE for is_admin users (2026-05-30_admin_role.sql)
--   "flags owner edit open" — replaces "flags update own" in live DB; restricts owner edits to
--                             status='open' only (see 2026-05-25_flag_edit_rls_replacement.sql)
drop policy if exists "flags readable by authenticated" on public.flags;
create policy "flags readable by authenticated"
  on public.flags for select
  to authenticated
  using (true);

drop policy if exists "flags readable by anon" on public.flags;
create policy "flags readable by anon"
  on public.flags for select
  to anon
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
-- change ONLY the status column.
drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using (true)
  with check (
    user_id     is not distinct from (select user_id     from public.flags where id = flags.id)
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
-- INSERT policy tightened 2026-06-03: WITH CHECK path-scoped (was `true`).
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
