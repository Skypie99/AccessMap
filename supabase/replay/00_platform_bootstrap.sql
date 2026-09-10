-- =============================================================================
-- Flagstone disposable-replay platform bootstrap  (PHASE-02B)
--
-- WHAT THIS IS
-- Supabase provides a platform layer that our migrations depend on but do not
-- create: the anon/authenticated/service_role roles, the auth/storage/vault/net
-- schemas, auth.uid(), auth.users, storage.objects and so on. A migration
-- lineage cannot be replayed on bare Postgres without it.
--
-- This file recreates ONLY the surface the 71 applied migrations actually touch,
-- established by grepping the lineage rather than by guessing:
--   auth.uid() (156 refs) · auth.users.id (FK target, 6 refs) · auth.email()
--   storage.objects · storage.buckets · storage.foldername()
--   vault.decrypted_secrets · net.http_post() · supabase_functions.http_request()
--   roles anon, authenticated, service_role
--
-- WHAT THIS IS NOT
-- It is not Supabase. Stubs marked [STUB] below have the right SIGNATURE and the
-- right PRIVILEGE SURFACE but no real behaviour. That makes this replay a proof
-- of SCHEMA reproduction — tables, columns, policies, grants, triggers,
-- functions — and NOT a proof of runtime behaviour for the stubbed pieces.
-- The replay report states this limitation rather than eliding it.
--
-- NO PRODUCTION CREDENTIAL, HOST OR SECRET APPEARS HERE. The harness runs on a
-- unix socket in a temp directory with TCP disabled.
-- =============================================================================

-- ---------------------------------------------------------------- roles ------
-- Supabase's PostgREST roles. NOLOGIN: nothing may connect as them here.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin inherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin inherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end
$$;

-- ------------------------------------------------------------- schemas -------
create schema if not exists auth;
create schema if not exists storage;
create schema if not exists extensions;
create schema if not exists vault;
create schema if not exists net;
create schema if not exists supabase_functions;
create schema if not exists graphql_public;

grant usage on schema public to anon, authenticated, service_role;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema storage to anon, authenticated, service_role;
grant usage on schema extensions to anon, authenticated, service_role;

-- Supabase puts `extensions` on the database search_path, which is why the
-- lineage can call uuid_generate_v4() unqualified. Reproducing that is part of
-- reproducing production, not a convenience.
alter database flagstone_replay set search_path to "$user", public, extensions;

-- ---------------------------------------------------------- extensions -------
-- Real, not stubbed: both ship with this Postgres build.
create extension if not exists "uuid-ossp" with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- [STUB] pg_net is Supabase-hosted with no local build. The harness replaces
-- the lineage's single `CREATE EXTENSION IF NOT EXISTS pg_net` statement in a
-- temp-only replay copy with a no-op, and provides the signatures here. This
-- avoids writing into PostgreSQL's global extension directory. These functions
-- perform NO network I/O; runtime pg_net behavior is out of scope.
create or replace function net.http_post(
  url text,
  body jsonb default '{}'::jsonb,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint language sql immutable as $$ select 0::bigint $$;

create or replace function net.http_get(
  url text,
  params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb,
  timeout_milliseconds integer default 5000
) returns bigint language sql immutable as $$ select 0::bigint $$;

-- [STUB] Supabase's webhook bridge. Same reasoning as above.
create or replace function supabase_functions.http_request()
returns trigger language plpgsql as $$ begin return new; end $$;

-- ---------------------------------------------------------------- auth -------
-- Shape matched to what the lineage uses: id is the FK target; email/role are
-- read by policies through the helper functions below.
create table if not exists auth.users (
  id uuid primary key default extensions.uuid_generate_v4(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- [STUB] In Supabase these read the request JWT. Here they read a GUC so the
-- pgTAP suites can impersonate a user deterministically:
--   set local request.jwt.claim.sub = '<uuid>';
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create or replace function auth.email() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.email', true), '')
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon')
$$;

grant execute on function auth.uid(), auth.email(), auth.role()
  to anon, authenticated, service_role;

-- ------------------------------------------------------------- storage -------
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  created_at timestamptz not null default now()
);

create table if not exists storage.objects (
  id uuid primary key default extensions.uuid_generate_v4(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  owner_id text,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table storage.objects enable row level security;

-- Real implementation, not a stub — the lineage's storage policies depend on
-- its exact semantics (first path segment must equal the caller's uid).
create or replace function storage.foldername(name text)
returns text[] language sql immutable as $$
  select string_to_array(regexp_replace(name, '/[^/]*$', ''), '/')
$$;
grant execute on function storage.foldername(text) to anon, authenticated, service_role;

-- --------------------------------------------------------------- vault -------
-- [STUB] Real Vault stores encrypted secrets. The lineage only ever SELECTs
-- from decrypted_secrets to compare a webhook secret, so an empty view with the
-- right columns keeps every dependent function valid. It holds NO secret value.
create table if not exists vault.secrets (
  id uuid primary key default extensions.uuid_generate_v4(),
  name text unique,
  secret text
);
create or replace view vault.decrypted_secrets as
  select id, name, secret as decrypted_secret from vault.secrets;

-- ------------------------------------------------------------ realtime -------
-- Supabase ships this publication; the D4 realtime migrations ALTER it.
create schema if not exists realtime;
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;

-- --------------------------------------------- Supabase default grants -------
-- Supabase ships these ALTER DEFAULT PRIVILEGES on the public schema. They are
-- the reason FDA-012 (TRUNCATE granted to anon/authenticated) exists at all —
-- reproducing them is what lets the replay observe that finding rather than
-- accidentally producing a cleaner database than production.
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
