-- CLASSIFICATION (added 2026-08-28 migration-history truth repair): manual/ambiguous.
-- Read-only catalog evidence: public.notification_preferences and its 3 policies are
-- live, but the 4 per-column COMMENT ON COLUMN statements below (lines further down,
-- flag_status_updates/nearby_flags/watched_flag_updates/bulk_watch_alerts) are NOT
-- reflected live (col_description() returns null for all 4 columns), and this file
-- lacks the "drop policy if exists" guards present in the hosted-ledger version. So
-- this artifact does not match live catalog state either — there is no live-catalog
-- proof it was ever applied exactly as written, hence "manual/ambiguous" rather than
-- "live-out-of-band". It was previously (incorrectly) checked in as the managed
-- migration for hosted version 20260529175840 "notification_preferences", which does
-- not truthfully represent the hosted ledger's recorded SQL for that version (the
-- ledger version is now at
-- supabase/migrations/20260529175840_notification_preferences.sql). Preserved here,
-- unmodified, as a separate historical draft.
--
-- Original header follows, unmodified:
--
-- PROPOSAL ONLY — apply via Supabase Dashboard after Sky review
--
-- Creates the notification_preferences table and enables Row Level Security
-- so each authenticated user can only read and write their own row.
--
-- These preferences map 1-to-1 with the four toggles in
-- src/screens/NotificationPreferencesScreen.tsx (backed locally by
-- src/hooks/useNotificationPreferences.ts → AsyncStorage). This table is for
-- future server-side delivery logic (e.g. an Edge Function that checks whether
-- to send a push token notification before firing). The client currently reads
-- from AsyncStorage only; this migration is a forward-looking schema stub.
--
-- Rollback (if needed):
--   DROP TABLE IF EXISTS public.notification_preferences;

create table if not exists public.notification_preferences (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  flag_status_updates   boolean not null default true,
  nearby_flags          boolean not null default true,
  watched_flag_updates  boolean not null default true,
  bulk_watch_alerts     boolean not null default true,
  updated_at            timestamptz not null default now()
);

-- Comment columns so future engineers understand the mapping.
comment on table public.notification_preferences is
  'Per-user push/alert notification preferences. Mirrors the four toggles in NotificationPreferencesScreen.tsx.';
comment on column public.notification_preferences.flag_status_updates is
  'True → notify when a flag the user reported changes status.';
comment on column public.notification_preferences.nearby_flags is
  'True → notify when a new flag is reported near the user''s location.';
comment on column public.notification_preferences.watched_flag_updates is
  'True → notify when any flag on the user''s watch list changes status.';
comment on column public.notification_preferences.bulk_watch_alerts is
  'True → send a digest notification when many watched flags update at once.';

-- -------------------------------------------------------------------------
-- Row Level Security
-- -------------------------------------------------------------------------

alter table public.notification_preferences enable row level security;

-- Authenticated users may read their own row only.
create policy "Users can read their own notification preferences"
  on public.notification_preferences
  for select
  to authenticated
  using (user_id = auth.uid());

-- Authenticated users may insert or update their own row only.
-- Using a single USING + WITH CHECK on the combined "insert or update" policy
-- keeps the surface minimal and avoids the insert/update split that's easy to
-- get wrong (the WITH CHECK guards the written row, USING guards which rows
-- can be targeted by UPDATE).
create policy "Users can upsert their own notification preferences"
  on public.notification_preferences
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "Users can update their own notification preferences"
  on public.notification_preferences
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- No delete policy — rows are logically permanent; resetting means updating
-- to all-true, not dropping the row. Prevents accidental orphan state.
