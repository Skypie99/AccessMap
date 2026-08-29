-- Reconstructed 2026-05-29 (repair applied 2026-08-28) from the hosted Supabase migration ledger
-- (supabase_migrations.schema_migrations), version 20260529175840, hosted name "notification_preferences".
-- This file REPLACES a prior managed migration at this version whose content did not
-- match the hosted-recorded SQL. The prior artifact is preserved under
-- supabase/nonmanaged/ (see qa-reports/2026-08-28_MigrationMapRepair_Evidence.md for
-- the classification). Below is the exact hosted-recorded SQL, verbatim.

create table if not exists public.notification_preferences (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  flag_status_updates   boolean not null default true,
  nearby_flags          boolean not null default true,
  watched_flag_updates  boolean not null default true,
  bulk_watch_alerts     boolean not null default true,
  updated_at            timestamptz not null default now()
);

comment on table public.notification_preferences is
  'Per-user push/alert notification preferences. Mirrors the four toggles in NotificationPreferencesScreen.tsx.';

alter table public.notification_preferences enable row level security;

drop policy if exists "Users can read their own notification preferences" on public.notification_preferences;
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can upsert their own notification preferences" on public.notification_preferences;
create policy "Users can upsert their own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update their own notification preferences" on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
