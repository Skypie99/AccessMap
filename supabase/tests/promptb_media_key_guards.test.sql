-- Staging-only pgTAP proof for Prompt B's B2 minimum backend contract
-- (20260830130000_promptb_media_key_read_contract.sql). Run after an
-- authorized migration apply against the real catalog. Jest cannot establish
-- Data API/catalog/grant/trigger behavior without PostgreSQL.
--
-- Catalog and privacy checks run directly against public.flags/users/
-- flag_photos. The guard-trigger behavior checks run against THROWAWAY LOCAL
-- probe tables instead: flags.user_id and flag_photos.flag_id are FK'd into
-- public.users/public.flags, and exercising the real INSERT/UPDATE policies
-- end-to-end needs a real or explicitly authorized sacrificial account (B2:
-- "Key-mutation denial ... run only in disposable replay/staging or an
-- explicitly authorized rollback-safe sacrificial fixture, never against
-- ordinary production rows") — that composed RLS+guard proof is deferred to
-- the authorized deployer with such an account, never fabricated here.
-- Attaching the exact deployed guard functions to a local temp table proves
-- the trigger LOGIC itself (the actual novel code this migration adds) with
-- zero fixture/FK/RLS entanglement and zero risk to any real row. The whole
-- suite is inside begin/rollback regardless (d1f4r3_fix2_flags_delete_rls.
-- test.sql's convention), so even the catalog/privacy half touches nothing.
begin;

select plan(25);

-- ---------------------------------------------------------------------------
-- Catalog: the three keys are nullable text with no default (DS-01/DS-02).
-- ---------------------------------------------------------------------------

select is(
  (select data_type from information_schema.columns
    where table_schema = 'public' and table_name = 'flags' and column_name = 'photo_object_key'),
  'text',
  'flags.photo_object_key is text'
);
select ok(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'flags' and column_name = 'photo_object_key') = 'YES',
  'flags.photo_object_key is nullable'
);
select ok(
  (select column_default from information_schema.columns
    where table_schema = 'public' and table_name = 'flags' and column_name = 'photo_object_key') is null,
  'flags.photo_object_key has no default'
);
select ok(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'users' and column_name = 'avatar_object_key') = 'YES',
  'users.avatar_object_key is nullable'
);
select ok(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'flag_photos' and column_name = 'object_key') = 'YES',
  'flag_photos.object_key is nullable'
);
select ok(
  (select is_nullable from information_schema.columns
    where table_schema = 'public' and table_name = 'flag_photos' and column_name = 'url') = 'NO',
  'flag_photos.url keeps its existing NOT NULL constraint (DS-04)'
);

-- ---------------------------------------------------------------------------
-- Privacy (DS-10/DS-11): authenticated column-only SELECT on the new users
-- key; no anon grant; no table-wide/email regression on the existing fence.
-- ---------------------------------------------------------------------------

select ok(
  has_column_privilege('authenticated', 'public.users', 'avatar_object_key', 'SELECT'),
  'authenticated can SELECT users.avatar_object_key'
);
select ok(
  not has_column_privilege('anon', 'public.users', 'avatar_object_key', 'SELECT'),
  'anon has no avatar_object_key column privilege'
);
select ok(
  not has_table_privilege('authenticated', 'public.users', 'SELECT'),
  'authenticated still has no table-wide users SELECT (unchanged fence)'
);
select ok(
  not has_column_privilege('authenticated', 'public.users', 'email', 'SELECT'),
  'authenticated still has no users.email column privilege (unchanged fence)'
);

-- ---------------------------------------------------------------------------
-- Guard logic (DS-07/DS-09), isolated per column via a throwaway local
-- table wired to the exact deployed guard function. Same five-shape proof
-- for each of the three guarded columns: forged INSERT denied, key-omitted
-- INSERT allowed, key UPDATE denied with zero row change, non-key UPDATE
-- still allowed.
-- ---------------------------------------------------------------------------

create temporary table promptb_probe_flags (
  id int primary key,
  description text,
  photo_object_key text
) on commit drop;
create trigger probe_insert before insert on promptb_probe_flags
  for each row execute function public.enforce_flags_photo_object_key_guard();
create trigger probe_update before update of photo_object_key on promptb_probe_flags
  for each row execute function public.enforce_flags_photo_object_key_guard();

select throws_ok(
  $$ insert into promptb_probe_flags (id, photo_object_key) values (1, 'forged/key.jpg') $$,
  '42501', null,
  'flags guard: INSERT with a non-null photo_object_key is denied'
);
select lives_ok(
  $$ insert into promptb_probe_flags (id, description) values (1, 'legacy row') $$,
  'flags guard: key-omitted INSERT succeeds'
);
select throws_ok(
  $$ update promptb_probe_flags set photo_object_key = 'forged/key.jpg' where id = 1 $$,
  '42501', null,
  'flags guard: UPDATE that sets photo_object_key is denied'
);
select is(
  (select photo_object_key from promptb_probe_flags where id = 1),
  null,
  'flags guard: the denied UPDATE left photo_object_key at zero row change'
);
select lives_ok(
  $$ update promptb_probe_flags set description = 'still editable' where id = 1 $$,
  'flags guard: an ordinary non-key UPDATE still succeeds'
);

create temporary table promptb_probe_users (
  id int primary key,
  display_name text,
  avatar_object_key text
) on commit drop;
create trigger probe_insert before insert on promptb_probe_users
  for each row execute function public.enforce_users_avatar_object_key_guard();
create trigger probe_update before update of avatar_object_key on promptb_probe_users
  for each row execute function public.enforce_users_avatar_object_key_guard();

select throws_ok(
  $$ insert into promptb_probe_users (id, avatar_object_key) values (1, 'forged/avatar.jpg') $$,
  '42501', null,
  'users guard: INSERT with a non-null avatar_object_key is denied'
);
select lives_ok(
  $$ insert into promptb_probe_users (id, display_name) values (1, 'Test User') $$,
  'users guard: key-omitted INSERT succeeds'
);
select throws_ok(
  $$ update promptb_probe_users set avatar_object_key = 'forged/avatar.jpg' where id = 1 $$,
  '42501', null,
  'users guard: UPDATE that sets avatar_object_key is denied'
);
select is(
  (select avatar_object_key from promptb_probe_users where id = 1),
  null,
  'users guard: the denied UPDATE left avatar_object_key at zero row change'
);
select lives_ok(
  $$ update promptb_probe_users set display_name = 'Renamed' where id = 1 $$,
  'users guard: an ordinary non-key UPDATE (e.g. display-name save) still succeeds'
);

create temporary table promptb_probe_flag_photos (
  id int primary key,
  url text,
  "position" int,
  object_key text
) on commit drop;
create trigger probe_insert before insert on promptb_probe_flag_photos
  for each row execute function public.enforce_flag_photos_object_key_guard();
create trigger probe_update before update of object_key on promptb_probe_flag_photos
  for each row execute function public.enforce_flag_photos_object_key_guard();

select throws_ok(
  $$ insert into promptb_probe_flag_photos (id, object_key) values (1, 'forged/photo.jpg') $$,
  '42501', null,
  'flag_photos guard: INSERT with a non-null object_key is denied'
);
select lives_ok(
  $$ insert into promptb_probe_flag_photos (id, url, "position") values (1, 'https://example.test/legacy.jpg', 0) $$,
  'flag_photos guard: key-omitted legacy-URL INSERT succeeds'
);
select throws_ok(
  $$ update promptb_probe_flag_photos set object_key = 'forged/photo.jpg' where id = 1 $$,
  '42501', null,
  'flag_photos guard: UPDATE that sets object_key is denied'
);
select is(
  (select object_key from promptb_probe_flag_photos where id = 1),
  null,
  'flag_photos guard: the denied UPDATE left object_key at zero row change'
);
select lives_ok(
  $$ update promptb_probe_flag_photos set "position" = 1 where id = 1 $$,
  'flag_photos guard: an ordinary non-key UPDATE still succeeds'
);

select * from finish();
rollback;
