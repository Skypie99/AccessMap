-- ============================================================================
-- SOURCE FILE ONLY — not applied to any hosted project by this migration.
-- Prompt B B2 final architecture / B2 minimum backend contract
-- (qa-reports/2026-08-30_SolMax_PromptB_B2_FinalArchitecture.md).
-- ============================================================================
--
-- WHAT: the exact-candidate client selects flags.photo_object_key,
-- users.avatar_object_key, and flag_photos.object_key on every full read.
-- Production physically lacks all three (confirmed 2026-08-30 preflight
-- against project kldlwszpfkdmsjrjhjym: ledger at 69 entries ending
-- 20260819214410_photo_alt_text, catalog absent all three columns), so those
-- reads fail with PostgreSQL 42703 while sibling projections that omit the
-- keys succeed. This adds the three columns as nullable, unpopulated display
-- keys plus the minimum grant/guard set to keep them server-owned. It does
-- NOT add flags.photo_uploader_id or flag_photos.uploader_id (no client
-- display consumer; B2 Group 1/3) and does NOT enable any canonical
-- upload/avatar writer (B2 Groups 4/6/7 remain out of scope).
--
-- NO DEFAULT. NO BACKFILL. NO EXISTING-ROW CHANGE. Every legacy photo_url /
-- flag_photos.url / avatar_url value is untouched; flag_photos.url keeps its
-- existing NOT NULL constraint (DS-01 through DS-05).
--
-- GRANTS: flags and flag_photos already carry table-level SELECT for
-- anon/authenticated with RLS as the real gate (flag_photos has no anon
-- policy, so anon sees no rows regardless) — the new columns inherit that
-- same visibility automatically; no new grant statement is needed for them.
-- users has NO table-level SELECT (see 20260529192040_users_email_privacy);
-- access is column-enumerated, so avatar_object_key needs its own explicit
-- grant. anon already holds zero SELECT columns on users and gets none here
-- (DS-10/DS-11): authenticated column-only SELECT, no table grant, no email
-- exposure, no anon avatar-key privilege.
--
-- GUARDS: three narrow BEFORE INSERT/UPDATE-OF triggers reject only a
-- non-null key on INSERT or any change to an existing key on UPDATE
-- (errcode 42501, zero row change) — every legacy URL write, every
-- non-media write, and every existing INSERT/UPDATE policy path is
-- otherwise unaffected. Trigger functions cannot be invoked as an RPC
-- (Postgres rejects a direct call to a trigger-returning function), so no
-- explicit EXECUTE revoke is needed beyond that.
--
-- OUT OF SCOPE (B2 Groups 4/6/7, deferred): upload-intent table,
-- prepare/commit/cancel RPCs, Storage policy changes, account write-fence
-- expansion, deletion machinery, leaderboard RPC work. None of that is
-- touched here.
--
-- ROLLBACK:
--   drop trigger if exists flags_photo_object_key_insert_guard on public.flags;
--   drop trigger if exists flags_photo_object_key_update_guard on public.flags;
--   drop function if exists public.enforce_flags_photo_object_key_guard();
--   drop trigger if exists users_avatar_object_key_insert_guard on public.users;
--   drop trigger if exists users_avatar_object_key_update_guard on public.users;
--   drop function if exists public.enforce_users_avatar_object_key_guard();
--   drop trigger if exists flag_photos_object_key_insert_guard on public.flag_photos;
--   drop trigger if exists flag_photos_object_key_update_guard on public.flag_photos;
--   drop function if exists public.enforce_flag_photos_object_key_guard();
--   revoke select (avatar_object_key) on public.users from authenticated;
--   alter table public.flags drop column if exists photo_object_key;
--   alter table public.users drop column if exists avatar_object_key;
--   alter table public.flag_photos drop column if exists object_key;
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.flags
  add column if not exists photo_object_key text;

alter table public.users
  add column if not exists avatar_object_key text;

alter table public.flag_photos
  add column if not exists object_key text;

-- ---------------------------------------------------------------------------
-- Narrow grant: users.avatar_object_key, authenticated-read-only
-- ---------------------------------------------------------------------------

grant select
  (avatar_object_key)
  on public.users
  to authenticated;

-- ---------------------------------------------------------------------------
-- Guard: public.flags.photo_object_key is server-owned
-- ---------------------------------------------------------------------------

create or replace function public.enforce_flags_photo_object_key_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.photo_object_key is not null then
      raise exception 'photo_object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.photo_object_key is distinct from old.photo_object_key then
    raise exception 'photo_object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists flags_photo_object_key_insert_guard on public.flags;
create trigger flags_photo_object_key_insert_guard
  before insert on public.flags
  for each row
  execute function public.enforce_flags_photo_object_key_guard();

drop trigger if exists flags_photo_object_key_update_guard on public.flags;
create trigger flags_photo_object_key_update_guard
  before update of photo_object_key on public.flags
  for each row
  execute function public.enforce_flags_photo_object_key_guard();

-- ---------------------------------------------------------------------------
-- Guard: public.users.avatar_object_key is server-owned
-- ---------------------------------------------------------------------------

create or replace function public.enforce_users_avatar_object_key_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.avatar_object_key is not null then
      raise exception 'avatar_object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.avatar_object_key is distinct from old.avatar_object_key then
    raise exception 'avatar_object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists users_avatar_object_key_insert_guard on public.users;
create trigger users_avatar_object_key_insert_guard
  before insert on public.users
  for each row
  execute function public.enforce_users_avatar_object_key_guard();

drop trigger if exists users_avatar_object_key_update_guard on public.users;
create trigger users_avatar_object_key_update_guard
  before update of avatar_object_key on public.users
  for each row
  execute function public.enforce_users_avatar_object_key_guard();

-- ---------------------------------------------------------------------------
-- Guard: public.flag_photos.object_key is server-owned
-- ---------------------------------------------------------------------------

create or replace function public.enforce_flag_photos_object_key_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.object_key is not null then
      raise exception 'object_key is server-managed and cannot be set directly'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.object_key is distinct from old.object_key then
    raise exception 'object_key is server-managed and cannot be changed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists flag_photos_object_key_insert_guard on public.flag_photos;
create trigger flag_photos_object_key_insert_guard
  before insert on public.flag_photos
  for each row
  execute function public.enforce_flag_photos_object_key_guard();

drop trigger if exists flag_photos_object_key_update_guard on public.flag_photos;
create trigger flag_photos_object_key_update_guard
  before update of object_key on public.flag_photos
  for each row
  execute function public.enforce_flag_photos_object_key_guard();
