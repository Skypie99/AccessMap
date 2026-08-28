-- =============================================================================
-- D1F4 — durable, asynchronous account deletion and canonical photo intents
--
-- LOCAL SOURCE ONLY. This forward migration deliberately leaves both frozen
-- artifacts byte-for-byte unchanged:
--   * 2026-08-27_d1sa_deployed_security_containment.sql
--   * 2026-08-27_d1_option_a_account_deletion.sql
-- Do not use `supabase db push`, `supabase migration repair`, or any remote
-- apply from this repository. Sky owns the separately reviewed history-safe
-- application and all hosted staging acceptance.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Durable operation, request fence, and the worker-only drain barrier.
-- -----------------------------------------------------------------------------
alter table public.users
  add column if not exists deletion_fence_version bigint not null default 0;

create or replace function public.prevent_client_deletion_fence_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.deletion_fence_version is distinct from old.deletion_fence_version
     and coalesce((select auth.role()), '') <> 'service_role'
  then
    raise exception 'deletion fence is server managed' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_client_deletion_fence_change on public.users;
create trigger prevent_client_deletion_fence_change
  before update on public.users
  for each row execute function public.prevent_client_deletion_fence_change();

-- No foreign key is intentional: the server-only Auth subject reference must
-- survive auth.users deletion until Auth outcome reconciliation is definitive.
create table if not exists public.account_deletion_operations (
  operation_id uuid primary key,
  subject_id uuid,
  receipt_hash text not null check (receipt_hash ~ '^[0-9a-f]{64}$'),
  status text not null check (status in (
    'REQUESTED', 'LOCKED', 'CLEANING', 'VERIFYING', 'READY_FOR_AUTH_DELETE',
    'AUTH_DELETED', 'COMPLETE', 'RETRY_REQUIRED', 'FAILED_REVIEW_REQUIRED'
  )),
  requested_at timestamptz not null default now(),
  locked_at timestamptz,
  completed_at timestamptz,
  receipt_expires_at timestamptz,
  worker_lease_token uuid,
  worker_lease_expires_at timestamptz,
  worker_attempts integer not null default 0 check (worker_attempts >= 0),
  -- RETRY_REQUIRED is not a phase. Preserve the exact safe phase that must
  -- resume so a generic retry can never skip the drain, verification, or
  -- Auth-last ordering.
  resume_from text check (resume_from is null or resume_from in (
    'LOCK_DRAIN', 'CLEANING', 'VERIFYING', 'AUTH_DELETE', 'AUTH_RECONCILIATION'
  )),
  review_reason text,
  review_opened_at timestamptz,
  intent_review_resolved_at timestamptz,
  historic_review_resolved_at timestamptz,
  last_error_code text,
  check (
    (status = 'COMPLETE' and subject_id is null and completed_at is not null)
    or (status <> 'COMPLETE' and subject_id is not null)
  )
);
create unique index if not exists account_deletion_operations_one_active_subject
  on public.account_deletion_operations(subject_id)
  where status <> 'COMPLETE';
create index if not exists account_deletion_operations_worker_idx
  on public.account_deletion_operations(status, worker_lease_expires_at, requested_at);
alter table public.account_deletion_operations enable row level security;
revoke all on table public.account_deletion_operations from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_operations to service_role;

create table if not exists public.account_deletion_review_audit (
  id bigint generated always as identity primary key,
  operation_id uuid not null references public.account_deletion_operations(operation_id) on delete cascade,
  actor_kind text not null check (actor_kind in ('worker', 'privacy_reviewer')),
  actor_id text not null check (actor_id in ('worker', 'sky')),
  action text not null,
  -- A fixed-size digest of redacted evidence, never a photo, URL, secret, or
  -- client-visible credential.
  evidence_digest text check (evidence_digest is null or evidence_digest ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.account_deletion_review_audit enable row level security;
revoke all on table public.account_deletion_review_audit from public, anon, authenticated;
grant select, insert on table public.account_deletion_review_audit to service_role;

-- Exact keys supplied by Sky's privileged review action. They are operational
-- cleanup state, deleted before COMPLETE; audit stores only a redacted digest.
create table if not exists public.account_deletion_review_objects (
  operation_id uuid not null references public.account_deletion_operations(operation_id) on delete cascade,
  bucket_id text not null check (bucket_id = 'flag-photos'),
  object_key text not null,
  primary key (operation_id, bucket_id, object_key)
);
alter table public.account_deletion_review_objects enable row level security;
revoke all on table public.account_deletion_review_objects from public, anon, authenticated;
grant select, insert, delete on table public.account_deletion_review_objects to service_role;

-- -----------------------------------------------------------------------------
-- 2. New photo provenance. Existing URLs remain display-only legacy data.
-- -----------------------------------------------------------------------------
alter table public.flags
  add column if not exists photo_object_key text,
  add column if not exists photo_uploader_id uuid;
alter table public.users add column if not exists avatar_object_key text;
alter table public.flag_photos
  add column if not exists object_key text,
  add column if not exists uploader_id uuid;
alter table public.flag_photos alter column url drop not null;

-- RLS WITH CHECK expressions cannot reliably distinguish OLD from NEW values
-- on every direct write path. These database-boundary triggers therefore make
-- canonical provenance server-owned. The trusted finalization RPCs set the
-- transaction-local marker immediately before their own write; a PostgREST
-- caller cannot set that marker through an ordinary INSERT or UPDATE.
create or replace function public.prevent_untrusted_flag_photo_provenance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.d1f4_trusted_photo_commit', true), '') <> '1' then
    if tg_op = 'INSERT' then
      if new.photo_url is not null
         or new.photo_object_key is not null
         or new.photo_uploader_id is not null
      then
        raise exception 'Canonical flag photo metadata is server managed.' using errcode = '42501';
      end if;
    elsif new.photo_url is distinct from old.photo_url
       or new.photo_object_key is distinct from old.photo_object_key
       or new.photo_uploader_id is distinct from old.photo_uploader_id
    then
      raise exception 'Canonical flag photo metadata is server managed.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_untrusted_flag_photo_provenance_write on public.flags;
create trigger prevent_untrusted_flag_photo_provenance_write
  before insert or update on public.flags
  for each row execute function public.prevent_untrusted_flag_photo_provenance_write();

create or replace function public.prevent_untrusted_avatar_provenance_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.d1f4_trusted_photo_commit', true), '') <> '1'
     and (
       new.avatar_url is distinct from old.avatar_url
       or new.avatar_object_key is distinct from old.avatar_object_key
     )
  then
    raise exception 'Canonical avatar metadata is server managed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_untrusted_avatar_provenance_write on public.users;
create trigger prevent_untrusted_avatar_provenance_write
  before update on public.users
  for each row execute function public.prevent_untrusted_avatar_provenance_write();

create or replace function public.prevent_untrusted_flag_photo_row_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.d1f4_trusted_photo_commit', true), '') <> '1' then
    raise exception 'Flag photo metadata is server managed.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_untrusted_flag_photo_row_write on public.flag_photos;
create trigger prevent_untrusted_flag_photo_row_write
  before insert or update on public.flag_photos
  for each row execute function public.prevent_untrusted_flag_photo_row_write();

revoke all on function public.prevent_untrusted_flag_photo_provenance_write() from public, anon, authenticated;
revoke all on function public.prevent_untrusted_avatar_provenance_write() from public, anon, authenticated;
revoke all on function public.prevent_untrusted_flag_photo_row_write() from public, anon, authenticated;

create table if not exists public.flag_photo_upload_intents (
  intent_id uuid primary key default gen_random_uuid(),
  subject_id uuid not null,
  bucket_id text not null check (bucket_id = 'flag-photos'),
  -- Opaque random key. New paths contain no account UUID or client timestamp.
  object_key text not null unique,
  intent_kind text not null check (intent_kind in ('flag_photo', 'avatar')),
  extension text not null check (extension in ('jpg', 'png')),
  status text not null check (status in ('PREPARED', 'COMMITTED', 'CANCELLED', 'AMBIGUOUS')),
  created_at timestamptz not null default now(),
  committed_at timestamptz,
  flag_id uuid references public.flags(id) on delete set null,
  review_reason text
);
create index if not exists flag_photo_upload_intents_subject_status_idx
  on public.flag_photo_upload_intents(subject_id, status);
alter table public.flag_photo_upload_intents enable row level security;
revoke all on table public.flag_photo_upload_intents from public, anon, authenticated;
grant select, insert, update, delete on table public.flag_photo_upload_intents to service_role;

-- Every authenticated write reaches this gate. The KEY SHARE lock is the
-- admission ticket. A writer admitted before REQUESTED holds it through its
-- transaction; Transaction B's FOR UPDATE waits for all such writers before it
-- can set LOCKED. A later read-committed request sees the durable nonterminal
-- operation and is denied. Transaction A's fence-version update invalidates a
-- stale repeatable-read snapshot that reaches this gate later; Transaction B
-- preserves the separate full writer drain.
create or replace function public.account_subject_can_write(p_subject uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare v_fence_version bigint;
begin
  if p_subject is null then return false; end if;
  select deletion_fence_version into v_fence_version
    from public.users where id = p_subject for key share;
  if not found then return false; end if;
  return not exists (
    select 1 from public.account_deletion_operations
    where subject_id = p_subject and status <> 'COMPLETE'
  );
end;
$$;

create or replace function public.current_account_can_write()
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  return public.account_subject_can_write((select auth.uid()));
end;
$$;
revoke all on function public.account_subject_can_write(uuid) from public, anon, authenticated;
revoke all on function public.current_account_can_write() from public, anon;
grant execute on function public.current_account_can_write() to authenticated;
revoke all on function public.prevent_client_deletion_fence_change() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Replace every permissive authenticated mutation path with the gate.
-- Anonymous report creation stays anonymous/photo-less; authenticated callers
-- cannot use a NULL feedback row to bypass their own deletion fence.
-- -----------------------------------------------------------------------------
drop policy if exists "feedback_insert_self_or_anon" on public.feedback;
drop policy if exists "feedback_insert_anon_only" on public.feedback;
drop policy if exists "feedback_insert_authenticated_self" on public.feedback;
create policy "feedback_insert_anon_only" on public.feedback for insert to anon
  with check (user_id is null);
create policy "feedback_insert_authenticated_self" on public.feedback for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));

drop policy if exists "users update own row" on public.users;
create policy "users update own row" on public.users for update to authenticated
  using (id = (select auth.uid()) and (select public.current_account_can_write()))
  with check (
    id = (select auth.uid())
    and (select public.current_account_can_write())
    and is_admin is not distinct from (select u.is_admin from public.users u where u.id = (select auth.uid()))
    and avatar_url is not distinct from (select u.avatar_url from public.users u where u.id = (select auth.uid()))
    and avatar_object_key is not distinct from (select u.avatar_object_key from public.users u where u.id = (select auth.uid()))
  );

-- New direct reports are photo-free. Only the server-authoritative intent
-- commit function can attach canonical metadata after checking storage.objects.
drop policy if exists "flags anon insert" on public.flags;
create policy "flags anon insert" on public.flags for insert to anon
  with check (
    user_id is null
    and photo_url is null
    and photo_object_key is null
    and photo_uploader_id is null
  );
drop policy if exists "flags insert own" on public.flags;
create policy "flags insert own" on public.flags for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and photo_url is null and photo_object_key is null and photo_uploader_id is null
    and (select public.current_account_can_write())
  );
drop policy if exists "flags_user_scoped" on public.flags;
drop policy if exists "flags update own" on public.flags;
drop policy if exists "flags owner edit open" on public.flags;
create policy "flags owner edit open" on public.flags for update to authenticated
  using (user_id = (select auth.uid()) and status = 'open' and (select public.current_account_can_write()))
  with check (
    user_id = (select auth.uid()) and (select public.current_account_can_write())
    and lat = (select old.lat from public.flags old where old.id = flags.id)
    and lng = (select old.lng from public.flags old where old.id = flags.id)
    and user_id = (select old.user_id from public.flags old where old.id = flags.id)
    and created_at = (select old.created_at from public.flags old where old.id = flags.id)
    and status = (select old.status from public.flags old where old.id = flags.id)
    and photo_url is not distinct from (select old.photo_url from public.flags old where old.id = flags.id)
    and photo_object_key is not distinct from (select old.photo_object_key from public.flags old where old.id = flags.id)
    and photo_uploader_id is not distinct from (select old.photo_uploader_id from public.flags old where old.id = flags.id)
  );
drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated" on public.flags for update to authenticated
  using ((select public.current_account_can_write()))
  with check (
    (select public.current_account_can_write())
    and photo_url is not distinct from (select old.photo_url from public.flags old where old.id = flags.id)
    and photo_object_key is not distinct from (select old.photo_object_key from public.flags old where old.id = flags.id)
    and photo_uploader_id is not distinct from (select old.photo_uploader_id from public.flags old where old.id = flags.id)
  );
drop policy if exists "flags delete own" on public.flags;
create policy "flags delete own" on public.flags for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "admin delete any flag" on public.flags;
create policy "admin delete any flag" on public.flags for delete to authenticated
  using ((select public.current_account_can_write()) and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin
  ));

-- The old URL/prefix-based direct metadata insert is removed. A flag owner
-- may still remove a linked row while active, but cannot forge/change it.
drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
drop policy if exists "flag_photos: flag owner update" on public.flag_photos;
drop policy if exists "flag_photos: flag owner delete" on public.flag_photos;
create policy "flag_photos: flag owner delete" on public.flag_photos for delete to authenticated
  using ((select public.current_account_can_write()) and
    (select f.user_id from public.flags f where f.id = flag_id) = (select auth.uid()));

drop policy if exists "flag_comments: own insert" on public.flag_comments;
create policy "flag_comments: own insert" on public.flag_comments for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "flag_comments: own delete" on public.flag_comments;
create policy "flag_comments: own delete" on public.flag_comments for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "admin delete any comment" on public.flag_comments;
create policy "admin delete any comment" on public.flag_comments for delete to authenticated
  using ((select public.current_account_can_write()) and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin
  ));

drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert" on public.flag_verifications for insert to authenticated
  with check (verifier_id = (select auth.uid()) and (select public.current_account_can_write())
    and verifier_id <> (select f.user_id from public.flags f where f.id = flag_id));
drop policy if exists "comment_votes insert own" on public.comment_votes;
create policy "comment_votes insert own" on public.comment_votes for insert to authenticated
  with check (voter_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "comment_votes delete own" on public.comment_votes;
create policy "comment_votes delete own" on public.comment_votes for delete to authenticated
  using (voter_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "feedback_delete_own" on public.feedback;
create policy "feedback_delete_own" on public.feedback for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()));

drop policy if exists "push_tokens: owner insert" on public.push_tokens;
create policy "push_tokens: owner insert" on public.push_tokens for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "push_tokens: owner update" on public.push_tokens;
create policy "push_tokens: owner update" on public.push_tokens for update to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()))
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "push_tokens: owner delete" on public.push_tokens;
create policy "push_tokens: owner delete" on public.push_tokens for delete to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "Users can upsert their own notification preferences" on public.notification_preferences;
create policy "Users can upsert their own notification preferences" on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "Users can update their own notification preferences" on public.notification_preferences;
create policy "Users can update their own notification preferences" on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid()) and (select public.current_account_can_write()))
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "flag_edit_history insert by flag owner" on public.flag_edit_history;
create policy "flag_edit_history insert by flag owner" on public.flag_edit_history for insert to authenticated
  with check ((select public.current_account_can_write()) and
    (select f.user_id from public.flags f where f.id = flag_id) = (select auth.uid()));
drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own" on public.realtime_subscribe_log for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.current_account_can_write()));

-- One PREPARED intent permits exactly one new direct Storage insert. The exact
-- key is already durable and the client cannot choose it. Storage's owner_id
-- is verified on commit; staging must prove its hosted behavior before deploy.
create or replace function public.can_upload_prepared_flag_photo(p_bucket_id text, p_object_key text)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare v_status text;
begin
  if not public.current_account_can_write() then return false; end if;
  select status into v_status from public.flag_photo_upload_intents
    where subject_id = (select auth.uid()) and bucket_id = p_bucket_id and object_key = p_object_key
    for key share;
  return found and v_status = 'PREPARED';
end;
$$;
revoke all on function public.can_upload_prepared_flag_photo(text, text) from public, anon;
grant execute on function public.can_upload_prepared_flag_photo(text, text) to authenticated;
drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'flag-photos' and (select public.can_upload_prepared_flag_photo(bucket_id, name)));
drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete" on storage.objects for delete to authenticated
  using (bucket_id = 'flag-photos' and owner_id::uuid = (select auth.uid()) and (select public.current_account_can_write()));
drop policy if exists "flag-photos admin delete" on storage.objects;
create policy "flag-photos admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'flag-photos' and (select public.current_account_can_write()) and exists (
    select 1 from public.users u where u.id = (select auth.uid()) and u.is_admin
  ));

-- SECURITY DEFINER mutation helpers bypass RLS, so fence them explicitly.
create or replace function public.increment_reopen_request(p_flag_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_new_count integer;
begin
  if not public.current_account_can_write() then raise exception 'Account is no longer active.' using errcode = 'P0001'; end if;
  update public.flags set reopen_requests = reopen_requests + 1 where id = p_flag_id and status = 'resolved'
    returning reopen_requests into v_new_count;
  return coalesce(v_new_count, 0);
end;
$$;
create or replace function public.increment_dispute_request(p_flag_id uuid)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_new_count integer;
begin
  if not public.current_account_can_write() then raise exception 'Account is no longer active.' using errcode = 'P0001'; end if;
  update public.flags set dispute_requests = dispute_requests + 1 where id = p_flag_id and status in ('open', 'verified')
    returning dispute_requests into v_new_count;
  return coalesce(v_new_count, 0);
end;
$$;
create or replace function public.log_realtime_event(p_event text, p_channel text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.current_account_can_write() then raise exception 'Account is no longer active.' using errcode = 'P0001'; end if;
  if p_event not in ('subscribe', 'unsubscribe') then raise exception 'invalid realtime event' using errcode = '22023'; end if;
  insert into public.realtime_subscribe_log(user_id, event, channel) values ((select auth.uid()), p_event, p_channel);
end;
$$;

-- -----------------------------------------------------------------------------
-- 4. Transaction A, Transaction B, upload finalization, and review state.
-- -----------------------------------------------------------------------------
-- Invoked only by the authenticated request Edge Function, which derives
-- p_subject_id from verified Auth. It takes no account-row exclusive lock:
-- committing REQUESTED plus one non-key account-row version update is the
-- immediate policy fence and must not wait for already admitted KEY SHARE
-- writers. Transaction B remains the separate writer-drain barrier.
create or replace function public.request_account_deletion(
  p_operation_id uuid, p_receipt_hash text, p_subject_id uuid
)
returns table(operation_id uuid, status text, requested_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare v_existing public.account_deletion_operations%rowtype;
begin
  if p_operation_id is null or p_subject_id is null or p_receipt_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid deletion receipt.' using errcode = '22023';
  end if;
  select * into v_existing from public.account_deletion_operations
    where account_deletion_operations.operation_id = p_operation_id for update;
  if found then
    if v_existing.subject_id = p_subject_id and v_existing.receipt_hash = p_receipt_hash then
      return query select v_existing.operation_id, v_existing.status, v_existing.requested_at;
      return;
    end if;
    raise exception 'Deletion request conflicts with existing operation.' using errcode = '23505';
  end if;
  if not exists (select 1 from public.users where id = p_subject_id) then
    raise exception 'Deletion subject has no account row.' using errcode = 'P0001';
  end if;
  select * into v_existing from public.account_deletion_operations
    where subject_id = p_subject_id and status <> 'COMPLETE' for update;
  if found then raise exception 'A deletion request is already active.' using errcode = '23505'; end if;
  insert into public.account_deletion_operations(operation_id, subject_id, receipt_hash, status)
    values (p_operation_id, p_subject_id, p_receipt_hash, 'REQUESTED') returning * into v_existing;

  -- This non-destructive, non-key UPDATE commits with REQUESTED. Existing
  -- KEY SHARE holders remain the pre-request drain set; a REPEATABLE READ
  -- transaction whose snapshot predates this request but only now reaches the
  -- account gate cannot lock the obsolete tuple and must fail/retry instead of
  -- being admitted. Transaction B still does the eventual FOR UPDATE drain.
  update public.users
    set deletion_fence_version = deletion_fence_version + 1
    where id = p_subject_id;
  if not found then raise exception 'Deletion subject has no account row.' using errcode = 'P0001'; end if;

  return query select v_existing.operation_id, v_existing.status, v_existing.requested_at;
end;
$$;

create or replace function public.claim_next_account_deletion_operation(p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  if p_lease_token is null then raise exception 'Worker lease token is required.' using errcode = '22023'; end if;
  select * into v_operation from public.account_deletion_operations
    where status in ('REQUESTED', 'LOCKED', 'CLEANING', 'VERIFYING', 'READY_FOR_AUTH_DELETE', 'AUTH_DELETED', 'RETRY_REQUIRED')
      and (worker_lease_expires_at is null or worker_lease_expires_at < now())
    order by requested_at for update skip locked limit 1;
  if not found then return null; end if;
  update public.account_deletion_operations set worker_lease_token = p_lease_token,
    worker_lease_expires_at = now() + interval '5 minutes', worker_attempts = worker_attempts + 1
    where operation_id = v_operation.operation_id returning * into v_operation;
  return v_operation;
end;
$$;

-- Renewal is a lease ownership proof as well as a keep-alive. The worker calls
-- it before every destructive Storage/Auth action and during paginated storage
-- inventory scans, so a reclaimed operation cannot continue after expiry.
create or replace function public.renew_account_deletion_lease(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  update public.account_deletion_operations
    set worker_lease_expires_at = now() + interval '5 minutes'
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status <> 'COMPLETE'
    returning * into v_operation;
  if not found then raise exception 'Deletion operation lease has expired.' using errcode = 'P0001'; end if;
  return v_operation;
end;
$$;

-- Rehydrate only the phase recorded by retry_or_review_account_deletion().
-- No generic retry can jump directly into a later destructive phase.
create or replace function public.resume_account_deletion_operation(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_status text;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status = 'RETRY_REQUIRED'
    for update;
  if not found or v_operation.resume_from is null then
    raise exception 'Deletion operation has no safe retry phase.' using errcode = 'P0001';
  end if;
  v_status := case v_operation.resume_from
    when 'LOCK_DRAIN' then 'REQUESTED'
    when 'CLEANING' then 'CLEANING'
    when 'VERIFYING' then 'VERIFYING'
    when 'AUTH_DELETE' then 'READY_FOR_AUTH_DELETE'
    else null
  end;
  if v_status is null then
    raise exception 'Deletion operation requires Auth reconciliation.' using errcode = 'P0001';
  end if;
  update public.account_deletion_operations
    set status = v_status, resume_from = null, last_error_code = null
    where operation_id = p_operation_id
    returning * into v_operation;
  return v_operation;
end;
$$;

-- Transaction B: FOR UPDATE conflicts with every admitted KEY SHARE writer.
-- It therefore commits LOCKED only after pre-REQUESTED writers drain, then
-- changes the version so stale snapshots cannot join the old generation.
create or replace function public.lock_requested_account_deletion(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_fence bigint;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() for update;
  if not found then raise exception 'Deletion operation is not leased.' using errcode = 'P0001'; end if;
  if v_operation.status <> 'REQUESTED' then return v_operation; end if;
  select deletion_fence_version into v_fence from public.users where id = v_operation.subject_id for update;
  if not found then raise exception 'Deletion subject has no account row.' using errcode = 'P0001'; end if;
  update public.users set deletion_fence_version = v_fence + 1 where id = v_operation.subject_id;
  insert into public.account_deletion_locks(user_id) values (v_operation.subject_id) on conflict (user_id) do nothing;
  update public.account_deletion_operations set status = 'LOCKED', locked_at = now()
    where operation_id = p_operation_id returning * into v_operation;
  return v_operation;
end;
$$;

create or replace function public.begin_account_deletion_cleaning(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() for update;
  if not found or v_operation.status not in ('LOCKED', 'CLEANING') then
    raise exception 'Deletion operation cannot start cleaning.' using errcode = 'P0001';
  end if;
  if v_operation.status <> 'CLEANING' then
    update public.account_deletion_operations set status = 'CLEANING', last_error_code = null
      where operation_id = p_operation_id returning * into v_operation;
  end if;
  return v_operation;
end;
$$;

create or replace function public.mark_account_deletion_verifying(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() for update;
  if not found or v_operation.status not in ('CLEANING', 'VERIFYING') then raise exception 'Deletion operation cannot verify.' using errcode = 'P0001'; end if;
  if v_operation.status = 'CLEANING' then update public.account_deletion_operations set status = 'VERIFYING'
    where operation_id = p_operation_id returning * into v_operation; end if;
  return v_operation;
end;
$$;

-- A narrowly scoped authenticated Postgres RPC is preferred over a separate
-- upload Edge Function. It derives auth.uid(), checks the durable fence, and
-- returns only an opaque intent id/key; it cannot choose an account or attach
-- a photo to a report.
create or replace function public.prepare_flag_photo_upload(p_extension text, p_kind text default 'flag_photo')
returns table(intent_id uuid, object_key text)
language plpgsql security definer set search_path = ''
as $$
declare v_subject uuid := (select auth.uid()); v_extension text := lower(coalesce(p_extension, '')); v_intent uuid := gen_random_uuid(); v_key text;
begin
  if v_subject is null or not public.current_account_can_write() then raise exception 'Account is no longer active.' using errcode = 'P0001'; end if;
  if v_extension not in ('jpg', 'png') or p_kind not in ('flag_photo', 'avatar') then raise exception 'Unsupported photo upload.' using errcode = '22023'; end if;
  v_key := 'uploads/' || gen_random_uuid()::text || '.' || v_extension;
  insert into public.flag_photo_upload_intents(intent_id, subject_id, bucket_id, object_key, intent_kind, extension, status)
    values (v_intent, v_subject, 'flag-photos', v_key, p_kind, v_extension, 'PREPARED');
  return query select v_intent, v_key;
end;
$$;

-- A client upload response is never proof. Commit requires the exact object,
-- bucket, and Storage owner metadata. Any absence/mismatch leaves a durable
-- ambiguity; it cannot advance automatically to READY/COMPLETE.
create or replace function public.commit_flag_photo_upload(
  p_intent_id uuid, p_flag_id uuid, p_position integer, p_alt_text text, p_set_primary boolean
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_intent public.flag_photo_upload_intents%rowtype;
begin
  select * into v_intent from public.flag_photo_upload_intents
    where intent_id = p_intent_id and subject_id = (select auth.uid()) for update;
  if not found or not public.current_account_can_write() or v_intent.status <> 'PREPARED' or v_intent.intent_kind <> 'flag_photo' then
    raise exception 'Photo upload cannot be committed.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.flags where id = p_flag_id and user_id = v_intent.subject_id) then
    raise exception 'Photo target is not owned by uploader.' using errcode = '42501';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = v_intent.bucket_id
      and name = v_intent.object_key
      and owner_id::uuid = v_intent.subject_id
  ) then
    update public.flag_photo_upload_intents set status = 'AMBIGUOUS', review_reason = 'exact_storage_owner_not_confirmed'
      where intent_id = v_intent.intent_id;
    -- Return a safe result instead of raising: an exception would roll this
    -- durable ambiguity back and falsely make the direct upload look absent.
    return 'AMBIGUOUS';
  end if;
  perform set_config('app.d1f4_trusted_photo_commit', '1', true);
  insert into public.flag_photos(flag_id, url, alt_text, position, object_key, uploader_id)
    values (p_flag_id, null, left(coalesce(p_alt_text, ''), 200), greatest(coalesce(p_position, 0), 0), v_intent.object_key, v_intent.subject_id);
  if coalesce(p_set_primary, false) then
    update public.flags set photo_url = null, photo_object_key = v_intent.object_key, photo_uploader_id = v_intent.subject_id,
      photo_alt = nullif(left(coalesce(p_alt_text, ''), 200), '') where id = p_flag_id;
  end if;
  update public.flag_photo_upload_intents set status = 'COMMITTED', committed_at = now(), flag_id = p_flag_id
    where intent_id = v_intent.intent_id;
  return 'COMMITTED';
end;
$$;

create or replace function public.commit_avatar_photo_upload(p_intent_id uuid)
returns table(
  outcome text,
  id uuid,
  display_name text,
  avatar_url text,
  avatar_object_key text,
  points integer,
  created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_intent public.flag_photo_upload_intents%rowtype; v_user public.users%rowtype;
begin
  select * into v_intent from public.flag_photo_upload_intents
    where intent_id = p_intent_id and subject_id = (select auth.uid()) for update;
  if not found or not public.current_account_can_write() or v_intent.status <> 'PREPARED' or v_intent.intent_kind <> 'avatar' then
    raise exception 'Avatar upload cannot be committed.' using errcode = 'P0001';
  end if;
  if not exists (
    select 1 from storage.objects
    where bucket_id = v_intent.bucket_id
      and name = v_intent.object_key
      and owner_id::uuid = v_intent.subject_id
  ) then
    update public.flag_photo_upload_intents set status = 'AMBIGUOUS', review_reason = 'exact_storage_owner_not_confirmed'
      where intent_id = v_intent.intent_id;
    return query select 'AMBIGUOUS'::text, null::uuid, null::text, null::text, null::text, null::integer, null::timestamptz;
    return;
  end if;
  perform set_config('app.d1f4_trusted_photo_commit', '1', true);
  update public.users set avatar_url = null, avatar_object_key = v_intent.object_key where id = v_intent.subject_id
    returning * into v_user;
  update public.flag_photo_upload_intents set status = 'COMMITTED', committed_at = now() where intent_id = v_intent.intent_id;
  return query select 'COMMITTED'::text, v_user.id, v_user.display_name, v_user.avatar_url,
    v_user.avatar_object_key, v_user.points, v_user.created_at;
end;
$$;

-- No timed absence inference: an unfinished direct user-JWT upload is always
-- AMBIGUOUS until Sky's same-operation review action resolves it.
create or replace function public.cancel_flag_photo_upload(p_intent_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.current_account_can_write() then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;
  update public.flag_photo_upload_intents set status = 'AMBIGUOUS', review_reason = 'client_upload_not_authoritatively_terminal'
    where intent_id = p_intent_id and subject_id = (select auth.uid()) and status = 'PREPARED';
  if not found then raise exception 'Photo upload cannot be cancelled.' using errcode = 'P0001'; end if;
end;
$$;

-- This function identifies the only safe pre-Auth holds. It does not parse a
-- URL or UUID prefix. Legacy rows and unexpected owner inventory are manual
-- review classes, never a reason to call storage.list() or declare success.
create or replace function public.account_deletion_requires_review(p_operation_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id;
  if not found or v_operation.subject_id is null then return 'operation_subject_missing'; end if;
  if exists (select 1 from public.flag_photo_upload_intents
      where subject_id = v_operation.subject_id and status in ('PREPARED', 'AMBIGUOUS')) then
    return 'unresolved_upload_intent';
  end if;
  if v_operation.historic_review_resolved_at is null and (
    exists (select 1 from public.flags where user_id = v_operation.subject_id and photo_url is not null and photo_object_key is null)
    or exists (select 1 from public.flag_photos p join public.flags f on f.id = p.flag_id
      where f.user_id = v_operation.subject_id and p.url is not null and p.object_key is null)
    or exists (select 1 from storage.objects o where o.bucket_id = 'flag-photos' and o.owner_id::uuid = v_operation.subject_id
      and not exists (select 1 from public.flag_photo_upload_intents i where i.object_key = o.name)
      and not exists (select 1 from public.account_deletion_review_objects r where r.operation_id = p_operation_id and r.object_key = o.name))
  ) then return 'historic_photo_provenance'; end if;
  return null;
end;
$$;

create or replace function public.move_account_deletion_to_review(p_operation_id uuid, p_lease_token uuid, p_reason text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  update public.account_deletion_operations set status = 'FAILED_REVIEW_REQUIRED', review_reason = left(p_reason, 120),
      review_opened_at = coalesce(review_opened_at, now()), resume_from = null,
      worker_lease_token = null, worker_lease_expires_at = null
    where operation_id = p_operation_id and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() and status <> 'COMPLETE';
  if not found then raise exception 'Deletion operation cannot enter review.' using errcode = 'P0001'; end if;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
    values (p_operation_id, 'worker', 'worker', 'review_opened:' || left(p_reason, 80));
end;
$$;

-- Sky's privileged review action is the only caller of this function. It must
-- use exact keys/owner evidence and a redacted digest, keeps the same operation
-- fenced, and returns it to CLEANING rather than skipping to Auth/COMPLETE.
create or replace function public.resolve_account_deletion_review(
  p_operation_id uuid, p_evidence_digest text, p_absent_intent_ids uuid[] default '{}'::uuid[],
  p_exact_object_keys text[] default '{}'::text[], p_resolve_intents boolean default false,
  p_resolve_historic boolean default false
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_operation public.account_deletion_operations%rowtype;
  v_intent public.flag_photo_upload_intents%rowtype;
  v_key text;
  v_subject_object_count integer;
  v_reviewed_key_count integer;
begin
  if p_evidence_digest is null or p_evidence_digest !~ '^[0-9a-f]{64}$' then raise exception 'Redacted evidence digest required.' using errcode = '22023'; end if;
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id and status = 'FAILED_REVIEW_REQUIRED' for update;
  if not found or v_operation.subject_id is null or (not p_resolve_intents and not p_resolve_historic) then
    raise exception 'Deletion operation is not awaiting review.' using errcode = 'P0001';
  end if;
  if p_resolve_intents then
    for v_intent in select * from public.flag_photo_upload_intents where subject_id = v_operation.subject_id and status in ('PREPARED', 'AMBIGUOUS') for update loop
      -- Keep every reviewed exact key for the operation lifetime, including a
      -- key confirmed absent. A later appearance cannot disappear from cleanup
      -- evidence merely because a human supplied an earlier absence claim.
      insert into public.account_deletion_review_objects(operation_id, bucket_id, object_key)
        values (p_operation_id, v_intent.bucket_id, v_intent.object_key) on conflict do nothing;
      if v_intent.intent_id = any(coalesce(p_absent_intent_ids, '{}'::uuid[])) then
        -- Reviewer input is insufficient by itself. CANCELLED records a
        -- database-side, same-resolution exact-object absence check only.
        if exists (
          select 1 from storage.objects
          where bucket_id = v_intent.bucket_id and name = v_intent.object_key
        ) then
          raise exception 'Visible intent object cannot be resolved as absent.' using errcode = 'P0001';
        end if;
        update public.flag_photo_upload_intents set status = 'CANCELLED', review_reason = 'sky_reviewed_exact_absence' where intent_id = v_intent.intent_id;
      elsif v_intent.object_key = any(coalesce(p_exact_object_keys, '{}'::text[])) and exists (
        select 1 from storage.objects
        where bucket_id = v_intent.bucket_id
          and name = v_intent.object_key
          and owner_id::uuid = v_operation.subject_id
      ) then
        update public.flag_photo_upload_intents set status = 'COMMITTED', review_reason = 'sky_reviewed_exact_object' where intent_id = v_intent.intent_id;
      else raise exception 'Every ambiguous intent requires an exact reviewed outcome.' using errcode = 'P0001'; end if;
    end loop;
    update public.account_deletion_operations set intent_review_resolved_at = now() where operation_id = p_operation_id;
  end if;
  if p_resolve_historic then
    -- A reviewer cannot waive unknown subject-owned objects. This compares
    -- the provided exact set with the authoritative database inventory.
    select count(*) into v_subject_object_count
      from storage.objects
      where bucket_id = 'flag-photos' and owner_id::uuid = v_operation.subject_id;
    select count(distinct reviewed.key) into v_reviewed_key_count
      from unnest(coalesce(p_exact_object_keys, '{}'::text[])) as reviewed(key);
    if v_reviewed_key_count <> v_subject_object_count then
      raise exception 'Reviewed key set is not the complete owner inventory.' using errcode = 'P0001';
    end if;
    foreach v_key in array coalesce(p_exact_object_keys, '{}'::text[]) loop
      if not exists (
        select 1 from storage.objects
        where bucket_id = 'flag-photos' and name = v_key and owner_id::uuid = v_operation.subject_id
      ) then
        raise exception 'Reviewed object lacks the expected exact owner.' using errcode = 'P0001';
      end if;
      insert into public.account_deletion_review_objects(operation_id, bucket_id, object_key)
        values (p_operation_id, 'flag-photos', v_key) on conflict do nothing;
    end loop;
    update public.account_deletion_operations set historic_review_resolved_at = now() where operation_id = p_operation_id;
  end if;
  update public.account_deletion_operations set status = 'CLEANING', review_reason = null,
    resume_from = null, worker_lease_token = null, worker_lease_expires_at = null where operation_id = p_operation_id;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action, evidence_digest)
    values (p_operation_id, 'privacy_reviewer', 'sky', 'review_resolved_requeue', p_evidence_digest);
end;
$$;

create or replace function public.retry_or_review_account_deletion(p_operation_id uuid, p_lease_token uuid, p_error_code text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_resume_from text;
begin
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id
    and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() for update;
  if not found then raise exception 'Deletion operation is not leased.' using errcode = 'P0001'; end if;
  if v_operation.worker_attempts >= 3 or v_operation.requested_at <= now() - interval '24 hours' then
    update public.account_deletion_operations set status = 'FAILED_REVIEW_REQUIRED', review_reason = 'worker_retry_threshold',
      review_opened_at = coalesce(review_opened_at, now()), last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120),
      resume_from = null, worker_lease_token = null, worker_lease_expires_at = null where operation_id = p_operation_id;
    insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
      values (p_operation_id, 'worker', 'worker', 'review_opened:worker_retry_threshold');
  else
    v_resume_from := case
      -- A provider error after any Auth call must be reconciled first; retrying
      -- deletion blindly would violate Auth-last outcome safety.
      when p_error_code = 'auth_outcome_ambiguous' then 'AUTH_RECONCILIATION'
      when v_operation.status = 'REQUESTED' then 'LOCK_DRAIN'
      when v_operation.status in ('LOCKED', 'CLEANING') then 'CLEANING'
      when v_operation.status = 'VERIFYING' then 'VERIFYING'
      when v_operation.status = 'READY_FOR_AUTH_DELETE' then 'AUTH_DELETE'
      when v_operation.status = 'AUTH_DELETED' then 'AUTH_RECONCILIATION'
      when v_operation.status = 'RETRY_REQUIRED' then v_operation.resume_from
      else null
    end;
    if v_resume_from is null then
      raise exception 'Deletion operation has no safe retry phase.' using errcode = 'P0001';
    end if;
    update public.account_deletion_operations set status = 'RETRY_REQUIRED', resume_from = v_resume_from,
      last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120),
      worker_lease_token = null, worker_lease_expires_at = null where operation_id = p_operation_id;
  end if;
end;
$$;

create or replace function public.mark_account_deletion_ready_for_auth(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_reason text;
begin
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id
    and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() for update;
  if not found or v_operation.status <> 'VERIFYING' then raise exception 'Deletion operation is not verifying.' using errcode = 'P0001'; end if;
  v_reason := public.account_deletion_requires_review(p_operation_id);
  if v_reason is not null then raise exception 'Deletion requires manual review.' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.account_deletion_locks where user_id = v_operation.subject_id) then raise exception 'Deletion lock is required.' using errcode = 'P0001'; end if;
  update public.account_deletion_operations set status = 'READY_FOR_AUTH_DELETE' where operation_id = p_operation_id returning * into v_operation;
  return v_operation;
end;
$$;

create or replace function public.mark_account_deletion_auth_deleted(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id
    and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() for update;
  if not found or (
    v_operation.status <> 'READY_FOR_AUTH_DELETE'
    and not (v_operation.status = 'RETRY_REQUIRED' and v_operation.resume_from = 'AUTH_RECONCILIATION')
  ) then raise exception 'Deletion is not ready for Auth reconciliation.' using errcode = 'P0001'; end if;
  update public.account_deletion_operations set status = 'AUTH_DELETED', resume_from = null where operation_id = p_operation_id returning * into v_operation;
  return v_operation;
end;
$$;

-- This replaces the rejected synchronous purge with an operation-bound purge.
-- Exact provenance removes direct contributions on other users' reports only
-- when uploader_id proves ownership. Deleting the subject's own flag tree may
-- cascade its complete report tree. No foreign metadata is deleted merely to
-- make a residue count reach zero; URL/UUID substring matching is absent.
create or replace function public.purge_deleting_account(p_operation_id uuid, p_user_id uuid, p_lease_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_flag_ids uuid[] := '{}'::uuid[]; v_point_ids bigint[] := '{}'::bigint[]; v_residue bigint := 0;
begin
  if p_user_id is null or not exists (select 1 from public.account_deletion_locks where user_id = p_user_id)
    or not exists (
      select 1 from public.account_deletion_operations
      where operation_id = p_operation_id and subject_id = p_user_id
        and worker_lease_token = p_lease_token and worker_lease_expires_at >= now()
        and status in ('CLEANING', 'VERIFYING')
    ) then
    raise exception 'Deletion lock is required.' using errcode = 'P0001';
  end if;
  if public.account_deletion_requires_review(p_operation_id) is not null then raise exception 'Deletion requires manual review.' using errcode = 'P0001'; end if;
  select coalesce(array_agg(id), '{}'::uuid[]) into v_flag_ids from public.flags where user_id = p_user_id;
  select coalesce(array_agg(id), '{}'::bigint[]) into v_point_ids from public.point_events where user_id = p_user_id;
  delete from public.comment_votes where voter_id = p_user_id;
  delete from public.flag_verifications where verifier_id = p_user_id;
  delete from public.flag_comments where user_id = p_user_id;
  delete from public.flag_photos where uploader_id = p_user_id and flag_id <> all(v_flag_ids);
  delete from public.flag_status_history where user_id = p_user_id;
  delete from public.flag_edit_history where user_id = p_user_id;
  delete from public.feedback where user_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.realtime_subscribe_log where user_id = p_user_id;
  delete from public.point_events where user_id = p_user_id;
  -- Own report tree only. Do not reach through foreign reports.
  delete from public.flags where user_id = p_user_id;
  delete from public.bk_2026_08_22_point_links where point_event_id = any(v_point_ids) or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_comments where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_photos where flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_status_history where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_verifications where verifier_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_edit_history where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flags where user_id = p_user_id;
  select count(*) into v_residue from (
    select 1 from public.flags where user_id = p_user_id
    union all select 1 from public.flag_comments where user_id = p_user_id
    union all select 1 from public.flag_photos where uploader_id = p_user_id
    union all select 1 from public.flag_status_history where user_id = p_user_id
    union all select 1 from public.flag_verifications where verifier_id = p_user_id
    union all select 1 from public.flag_edit_history where user_id = p_user_id
    union all select 1 from public.comment_votes where voter_id = p_user_id
    union all select 1 from public.feedback where user_id = p_user_id
    union all select 1 from public.push_tokens where user_id = p_user_id
    union all select 1 from public.notification_preferences where user_id = p_user_id
    union all select 1 from public.realtime_subscribe_log where user_id = p_user_id
    union all select 1 from public.point_events where user_id = p_user_id
    union all select 1 from public.bk_2026_08_22_flags where user_id = p_user_id
    union all select 1 from public.bk_2026_08_22_flag_comments where user_id = p_user_id or flag_id = any(v_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_photos where flag_id = any(v_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_status_history where user_id = p_user_id or flag_id = any(v_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_verifications where verifier_id = p_user_id or flag_id = any(v_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_edit_history where user_id = p_user_id or flag_id = any(v_flag_ids)
    union all select 1 from public.bk_2026_08_22_point_links where point_event_id = any(v_point_ids) or flag_id = any(v_flag_ids)
  ) residues;
  if v_residue <> 0 then raise exception 'Account deletion residue remains.' using errcode = 'P0001'; end if;
end;
$$;

create or replace function public.complete_account_deletion(p_operation_id uuid, p_lease_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_subject uuid;
begin
  select subject_id into v_subject from public.account_deletion_operations where operation_id = p_operation_id
    and worker_lease_token = p_lease_token and worker_lease_expires_at >= now() and status = 'AUTH_DELETED' for update;
  if not found or v_subject is null then raise exception 'Deletion operation is not ready to complete.' using errcode = 'P0001'; end if;
  delete from public.flag_photo_upload_intents where subject_id = v_subject;
  delete from public.account_deletion_review_objects where operation_id = p_operation_id;
  update public.account_deletion_operations set status = 'COMPLETE', completed_at = now(), receipt_expires_at = now() + interval '7 days',
    subject_id = null, worker_lease_token = null, worker_lease_expires_at = null, review_reason = null, last_error_code = null
    where operation_id = p_operation_id and status = 'AUTH_DELETED';
end;
$$;

-- Capability status remains available after Auth deletion but exposes no
-- subject, email, object keys, reason codes, or Auth provider details.
create or replace function public.account_deletion_receipt_status(p_operation_id uuid, p_receipt_hash text)
returns table(status text, requested_at timestamptz, completed_at timestamptz)
language sql stable security definer set search_path = ''
as $$
  select o.status, o.requested_at, o.completed_at from public.account_deletion_operations o
  where o.operation_id = p_operation_id and o.receipt_hash = p_receipt_hash
    and (o.receipt_expires_at is null or o.receipt_expires_at >= now());
$$;

revoke all on function public.request_account_deletion(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.claim_next_account_deletion_operation(uuid) from public, anon, authenticated;
revoke all on function public.renew_account_deletion_lease(uuid, uuid) from public, anon, authenticated;
revoke all on function public.resume_account_deletion_operation(uuid, uuid) from public, anon, authenticated;
revoke all on function public.lock_requested_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.begin_account_deletion_cleaning(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_verifying(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_requires_review(uuid) from public, anon, authenticated;
revoke all on function public.move_account_deletion_to_review(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.resolve_account_deletion_review(uuid, text, uuid[], text[], boolean, boolean) from public, anon, authenticated;
revoke all on function public.retry_or_review_account_deletion(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_ready_for_auth(uuid, uuid) from public, anon, authenticated;
revoke all on function public.mark_account_deletion_auth_deleted(uuid, uuid) from public, anon, authenticated;
revoke all on function public.purge_deleting_account(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.complete_account_deletion(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_receipt_status(uuid, text) from public, anon, authenticated;
grant execute on function public.request_account_deletion(uuid, text, uuid) to service_role;
grant execute on function public.claim_next_account_deletion_operation(uuid) to service_role;
grant execute on function public.renew_account_deletion_lease(uuid, uuid) to service_role;
grant execute on function public.resume_account_deletion_operation(uuid, uuid) to service_role;
grant execute on function public.lock_requested_account_deletion(uuid, uuid) to service_role;
grant execute on function public.begin_account_deletion_cleaning(uuid, uuid) to service_role;
grant execute on function public.mark_account_deletion_verifying(uuid, uuid) to service_role;
grant execute on function public.account_deletion_requires_review(uuid) to service_role;
grant execute on function public.move_account_deletion_to_review(uuid, uuid, text) to service_role;
grant execute on function public.resolve_account_deletion_review(uuid, text, uuid[], text[], boolean, boolean) to service_role;
grant execute on function public.retry_or_review_account_deletion(uuid, uuid, text) to service_role;
grant execute on function public.mark_account_deletion_ready_for_auth(uuid, uuid) to service_role;
grant execute on function public.mark_account_deletion_auth_deleted(uuid, uuid) to service_role;
grant execute on function public.purge_deleting_account(uuid, uuid, uuid) to service_role;
grant execute on function public.complete_account_deletion(uuid, uuid) to service_role;
grant execute on function public.account_deletion_receipt_status(uuid, text) to service_role;
grant execute on function public.prepare_flag_photo_upload(text, text) to authenticated;
grant execute on function public.commit_flag_photo_upload(uuid, uuid, integer, text, boolean) to authenticated;
grant execute on function public.commit_avatar_photo_upload(uuid) to authenticated;
grant execute on function public.cancel_flag_photo_upload(uuid) to authenticated;

-- Rollback is mechanics-only: disable the worker/functions first and verify no
-- nonterminal operation exists. Never restore deleted content or weaken D1S-A.
