-- =============================================================================
-- D1F4R3 — forward-only closure for durable drain, review liveness, terminal
-- Storage evidence, deterministic inventory, and canonical report deletion.
--
-- LOCAL SOURCE ONLY. This migration is intentionally not applied by this task.
-- It leaves the two frozen predecessor migrations byte-for-byte unchanged.
-- =============================================================================

-- The operation record, not an optimistic phase label, is the durable proof
-- that Transaction B drained pre-request writers. A corrupted CLEANING label
-- must never acquire authority to remove Storage or purge relational data.
alter table public.account_deletion_operations
  add column if not exists deletion_lock_confirmed_at timestamptz,
  add column if not exists review_generation integer not null default 0
    check (review_generation >= 0);
alter table public.account_deletion_operations
  drop constraint if exists account_deletion_operations_review_resume_from_check;
alter table public.account_deletion_operations
  add constraint account_deletion_operations_review_resume_from_check
  check (review_resume_from is null or review_resume_from in (
    'LOCK_DRAIN', 'CLEANING', 'VERIFYING', 'AUTH_DELETE', 'AUTH_RECONCILIATION'
  )) not valid;

-- R2 used a permanent unique source_ref. A resolved Auth ambiguity could then
-- suppress every later cycle. Generation is server-owned and advances only as
-- a held operation is opened, so a reviewer cannot manufacture a new cycle.
alter table public.account_deletion_review_items
  add column if not exists review_generation integer not null default 1
    check (review_generation >= 1);
alter table public.account_deletion_review_items
  drop constraint if exists account_deletion_review_items_operation_id_kind_source_ref_key;
alter table public.account_deletion_review_items
  drop constraint if exists account_deletion_review_items_check;
alter table public.account_deletion_review_items
  add constraint account_deletion_review_items_storage_shape_check check (
    (bucket_id is null and object_key is null)
    or (bucket_id = 'flag-photos' and object_key is not null and length(object_key) between 1 and 512)
  ) not valid;
create unique index if not exists account_deletion_review_items_generation_key
  on public.account_deletion_review_items(operation_id, kind, source_ref, review_generation);

-- Terminal evidence survives the relational purge and COMPLETE redaction. It
-- deliberately stores only server-derived row identities and object keys, never
-- an uploaded URL, a credential, or a client-supplied inventory.
create table if not exists public.account_deletion_terminal_evidence (
  terminal_evidence_id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.account_deletion_operations(operation_id),
  source_ref text not null check (length(source_ref) between 1 and 320),
  bucket_id text check (bucket_id is null or bucket_id = 'flag-photos'),
  object_key text check (object_key is null or length(object_key) between 1 and 512),
  disposition text not null check (disposition in (
    'PENDING_DELETE', 'BLOCKED_ASSOCIATION', 'PROVED_ABSENT',
    'PRESERVED_FOREIGN', 'NO_STORAGE_OBJECT_ASSOCIATED'
  )),
  recorded_at timestamptz not null default now(),
  reconciled_at timestamptz,
  unique (operation_id, source_ref),
  check ((object_key is null and bucket_id is null) or (object_key is not null and bucket_id = 'flag-photos'))
);
create index if not exists account_deletion_terminal_evidence_operation_idx
  on public.account_deletion_terminal_evidence(operation_id, disposition, source_ref);
alter table public.account_deletion_terminal_evidence enable row level security;
revoke all on table public.account_deletion_terminal_evidence from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_terminal_evidence to service_role;

-- NULL used to slip through the comparison and could become an unbounded
-- privileged inventory query. Reject it explicitly at the fixed-bucket RPC.
create or replace function public.account_deletion_storage_owned_page(
  p_subject_id uuid,
  p_after_object_key text default null,
  p_limit integer default 100
)
returns table(object_key text, owner_id text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_subject_id is null or p_limit is null or p_limit < 1 or p_limit > 100
    or (p_after_object_key is not null and (length(p_after_object_key) = 0 or length(p_after_object_key) > 512))
  then
    raise exception 'Invalid Storage inventory cursor.' using errcode = '22023';
  end if;
  return query
    select o.name::text, o.owner_id::text
    from storage.objects o
    where o.bucket_id = 'flag-photos'
      and o.owner_id::text = p_subject_id::text
      and (p_after_object_key is null or o.name::text > p_after_object_key)
    order by o.name asc
    limit p_limit;
end;
$$;

-- The production known-key inventory is a fixed, server-owned composite
-- cursor. It replaces offset .range() calls across every privacy-terminal
-- application relation. The cursor is a strict unique total order:
-- (object_key, source_ref, source_id).
create or replace function public.account_deletion_known_keys_page(
  p_operation_id uuid,
  p_subject_id uuid,
  p_after_object_key text default null,
  p_after_source_ref text default null,
  p_after_source_id uuid default null,
  p_limit integer default 100
)
returns table(object_key text, source_ref text, source_id uuid)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_operation_id is null or p_subject_id is null or p_limit is null or p_limit < 1 or p_limit > 100
    or ((p_after_object_key is null or p_after_source_ref is null or p_after_source_id is null)
        and not (p_after_object_key is null and p_after_source_ref is null and p_after_source_id is null))
  then
    raise exception 'Invalid known-key cursor.' using errcode = '22023';
  end if;
  return query
  with candidates as (
    select i.object_key::text as object_key, 'upload_intent'::text as source_ref, i.intent_id as source_id
      from public.flag_photo_upload_intents i
      where i.subject_id = p_subject_id and i.object_key is not null
    union all
    select f.photo_object_key::text, 'primary_flag', f.id
      from public.flags f
      where f.photo_uploader_id = p_subject_id and f.photo_object_key is not null
    union all
    select p.object_key::text, 'gallery_uploader', p.id
      from public.flag_photos p
      where p.uploader_id = p_subject_id and p.object_key is not null
    union all
    select p.object_key::text, 'subject_report_tree', p.id
      from public.flag_photos p join public.flags f on f.id = p.flag_id
      where f.user_id = p_subject_id and p.object_key is not null
    union all
    select u.avatar_object_key::text, 'avatar', u.id
      from public.users u
      where u.id = p_subject_id and u.avatar_object_key is not null
    union all
    select r.object_key::text, 'review_delete', r.review_item_id
      from public.account_deletion_review_items r
      where r.operation_id = p_operation_id and r.resolution = 'DELETE' and r.object_key is not null
    union all
    select e.object_key::text, 'terminal_pending', e.terminal_evidence_id
      from public.account_deletion_terminal_evidence e
      where e.operation_id = p_operation_id and e.disposition = 'PENDING_DELETE' and e.object_key is not null
  )
  select c.object_key, c.source_ref, c.source_id
    from candidates c
    where p_after_object_key is null
       or (c.object_key, c.source_ref, c.source_id) > (p_after_object_key, p_after_source_ref, p_after_source_id)
    order by c.object_key asc, c.source_ref asc, c.source_id asc
    limit p_limit;
end;
$$;

-- A legacy URL can establish a *review association* only when its fixed public
-- object form is completely unambiguous. It is never ownership authority and
-- cannot by itself authorize a delete. Encoded, signed, transformed, or other
-- unrecognized URLs remain a durable blocking association instead of guesses.
create or replace function public.account_deletion_legacy_object_key_from_url(p_url text)
returns text
language plpgsql immutable security definer set search_path = ''
as $$
declare v_key text;
begin
  if p_url is null
    or p_url !~ '^https?://[^/?#]+/storage/v1/object/public/flag-photos/[A-Za-z0-9._/-]+$'
  then return null; end if;
  v_key := regexp_replace(p_url, '^https?://[^/?#]+/storage/v1/object/public/flag-photos/', '');
  if length(v_key) between 1 and 512 then return v_key; end if;
  return null;
end;
$$;

-- Historical rows are converted to exact, server-derived association evidence
-- before purge. An unknown association is deliberately blocking and cannot be
-- acknowledged away; a known association becomes a normal exact-object proof
-- obligation, with exact Storage metadata still deciding ownership.
create or replace function public.capture_account_deletion_historical_evidence(
  p_operation_id uuid, p_lease_token uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_generation integer;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status in ('LOCKED', 'CLEANING', 'VERIFYING')
    for update;
  if not found or v_operation.subject_id is null then
    raise exception 'Deletion operation is not leased for evidence capture.' using errcode = 'P0001';
  end if;
  v_generation := v_operation.review_generation + 1;

  with raw as (
    select 'legacy_avatar:' || u.id::text as source_ref, public.account_deletion_legacy_object_key_from_url(u.avatar_url) as object_key,
      'LEGACY_AVATAR'::text as kind, 'legacy_avatar_without_canonical_key'::text as reason
      from public.users u where u.id = v_operation.subject_id and u.avatar_url is not null and u.avatar_object_key is null
    union all
    select 'legacy_primary:' || f.id::text, public.account_deletion_legacy_object_key_from_url(f.photo_url),
      'LEGACY_PRIMARY_PHOTO'::text, 'legacy_primary_without_canonical_key'::text
      from public.flags f where f.user_id = v_operation.subject_id and f.photo_url is not null and f.photo_object_key is null
    union all
    select 'legacy_gallery:' || p.id::text, public.account_deletion_legacy_object_key_from_url(p.url),
      'LEGACY_GALLERY_PHOTO'::text, 'legacy_gallery_without_canonical_key'::text
      from public.flag_photos p join public.flags f on f.id = p.flag_id
      where f.user_id = v_operation.subject_id and p.url is not null and p.object_key is null
    union all
    select 'backup_photo:' || p.id::text, public.account_deletion_legacy_object_key_from_url(p.url),
      'BACKUP_FLAG_PHOTO'::text, 'backup_photo_requires_terminal_association'::text
      from public.bk_2026_08_22_flag_photos p join public.bk_2026_08_22_flags f on f.id = p.flag_id
      where f.user_id = v_operation.subject_id and p.url is not null
  )
  insert into public.account_deletion_terminal_evidence(operation_id, source_ref, bucket_id, object_key, disposition)
    select p_operation_id, r.source_ref,
      case when r.object_key is null then null else 'flag-photos' end,
      r.object_key,
      case when r.object_key is null then 'BLOCKED_ASSOCIATION' else 'PENDING_DELETE' end
    from raw r
  on conflict (operation_id, source_ref) do nothing;

  -- The retained row identifier is a reviewer action target while the source
  -- row still exists. There is intentionally no ACKNOWLEDGE escape for it.
  insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, reason)
    select p_operation_id,
      case when e.source_ref like 'legacy_avatar:%' then 'LEGACY_AVATAR'
           when e.source_ref like 'legacy_primary:%' then 'LEGACY_PRIMARY_PHOTO'
           when e.source_ref like 'legacy_gallery:%' then 'LEGACY_GALLERY_PHOTO'
           else 'BACKUP_FLAG_PHOTO' end,
      'association:' || e.source_ref, v_generation, 'manual_exact_association_required'
      from public.account_deletion_terminal_evidence e
      where e.operation_id = p_operation_id and e.disposition = 'BLOCKED_ASSOCIATION'
  on conflict do nothing;

  insert into public.account_deletion_terminal_evidence(operation_id, source_ref, bucket_id, object_key, disposition)
    select p_operation_id, 'upload_intent:' || i.intent_id::text, i.bucket_id, i.object_key, 'PENDING_DELETE'
      from public.flag_photo_upload_intents i
      where i.subject_id = v_operation.subject_id and i.status in ('PREPARED', 'AMBIGUOUS')
  on conflict (operation_id, source_ref) do nothing;
  insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, bucket_id, object_key, reason)
    select p_operation_id, 'UPLOAD_INTENT', 'upload_intent:' || i.intent_id::text, v_generation,
      i.bucket_id, i.object_key, 'unresolved_upload_intent'
      from public.flag_photo_upload_intents i
      where i.subject_id = v_operation.subject_id and i.status in ('PREPARED', 'AMBIGUOUS')
  on conflict do nothing;
end;
$$;

-- Current canonical associations are captured before destructive work too.
-- It is set-based inside Postgres; the worker separately proves completion via
-- the paged production query above and never relies on this capture as paging.
create or replace function public.capture_account_deletion_canonical_evidence(
  p_operation_id uuid, p_lease_token uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_subject uuid;
begin
  select subject_id into v_subject from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status in ('LOCKED', 'CLEANING', 'VERIFYING', 'AUTH_DELETED')
    for update;
  if not found or v_subject is null then raise exception 'Deletion operation is not leased for canonical evidence.' using errcode = 'P0001'; end if;
  with current_keys as (
    select 'canonical_primary:' || f.id::text as source_ref, f.photo_object_key::text as object_key
      from public.flags f where f.photo_uploader_id = v_subject and f.photo_object_key is not null
    union all
    select 'canonical_gallery:' || p.id::text, p.object_key::text
      from public.flag_photos p where p.uploader_id = v_subject and p.object_key is not null
    union all
    select 'canonical_tree:' || p.id::text, p.object_key::text
      from public.flag_photos p join public.flags f on f.id = p.flag_id
      where f.user_id = v_subject and p.object_key is not null
    union all
    select 'canonical_avatar:' || u.id::text, u.avatar_object_key::text
      from public.users u where u.id = v_subject and u.avatar_object_key is not null
  )
  insert into public.account_deletion_terminal_evidence(operation_id, source_ref, bucket_id, object_key, disposition)
    select p_operation_id, c.source_ref, 'flag-photos', c.object_key, 'PENDING_DELETE' from current_keys c
  on conflict (operation_id, source_ref) do nothing;
end;
$$;

-- Long keys stay solely in object_key. source_ref is an opaque SHA-256 handle
-- bounded well under 320 characters, so it cannot truncate or collide by
-- prefix. A new capture resets a formerly preserved key to a pending proof.
create or replace function public.capture_account_deletion_exact_review_object(
  p_operation_id uuid, p_lease_token uuid, p_object_key text, p_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_generation integer; v_ref text;
begin
  if p_object_key is null or length(p_object_key) = 0 or length(p_object_key) > 512
    or p_reason is null or length(p_reason) = 0 then
    raise exception 'Invalid exact review object.' using errcode = '22023';
  end if;
  select review_generation + 1 into v_generation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status in ('LOCKED', 'CLEANING', 'VERIFYING', 'AUTH_DELETED')
    for update;
  if not found then raise exception 'Deletion operation is not leased for review capture.' using errcode = 'P0001'; end if;
  v_ref := 'object:sha256:' || encode(extensions.digest(p_object_key, 'sha256'), 'hex');
  insert into public.account_deletion_terminal_evidence(operation_id, source_ref, bucket_id, object_key, disposition, reconciled_at)
    values (p_operation_id, v_ref, 'flag-photos', p_object_key, 'PENDING_DELETE', null)
  on conflict (operation_id, source_ref) do update
    set object_key = excluded.object_key, disposition = 'PENDING_DELETE', reconciled_at = null;
  insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, bucket_id, object_key, reason)
    values (p_operation_id, 'EXACT_STORAGE', v_ref, v_generation, 'flag-photos', p_object_key, left(p_reason, 120))
  on conflict do nothing;
end;
$$;

create or replace function public.account_deletion_requires_review(p_operation_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
begin
  if exists (select 1 from public.account_deletion_review_items where operation_id = p_operation_id and resolution = 'UNRESOLVED')
  then return 'unresolved_review_item'; end if;
  if exists (select 1 from public.account_deletion_terminal_evidence
    where operation_id = p_operation_id and disposition = 'BLOCKED_ASSOCIATION')
  then return 'manual_exact_association_required'; end if;
  return null;
end;
$$;

-- The review status is legal only after an actionable durable item exists.
-- For an unexpected generic worker threshold, a bounded acknowledgement item
-- is created before the operation is placed on hold.
create or replace function public.move_account_deletion_to_review(
  p_operation_id uuid, p_lease_token uuid, p_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_resume text; v_generation integer;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status <> 'COMPLETE' for update;
  if not found then raise exception 'Deletion operation cannot enter review.' using errcode = 'P0001'; end if;
  v_generation := v_operation.review_generation + 1;
  v_resume := case
    when v_operation.status = 'AUTH_DELETED'
      or (v_operation.status = 'RETRY_REQUIRED' and v_operation.resume_from = 'AUTH_RECONCILIATION') then 'AUTH_RECONCILIATION'
    when v_operation.status = 'READY_FOR_AUTH_DELETE' then 'AUTH_DELETE'
    when v_operation.status = 'VERIFYING' then 'VERIFYING'
    when v_operation.status = 'REQUESTED' then 'LOCK_DRAIN'
    else 'CLEANING'
  end;
  if not exists (select 1 from public.account_deletion_review_items where operation_id = p_operation_id and resolution = 'UNRESOLVED') then
    insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, reason)
      values (p_operation_id, 'AUTH_OUTCOME_AMBIGUOUS',
        'worker:' || p_operation_id::text || ':' || v_generation::text, v_generation,
        left(coalesce(p_reason, 'manual_review_required'), 120));
  end if;
  update public.account_deletion_operations set status = 'FAILED_REVIEW_REQUIRED',
      review_reason = left(coalesce(p_reason, 'manual_review_required'), 120),
      review_opened_at = coalesce(review_opened_at, now()), review_resume_from = v_resume,
      review_generation = v_generation, resume_from = null, worker_lease_token = null, worker_lease_expires_at = null
    where operation_id = p_operation_id;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
    values (p_operation_id, 'worker', 'worker', 'review_opened:' || left(coalesce(p_reason, 'manual_review_required'), 80));
end;
$$;

-- A pre-lock failure always resumes LOCK_DRAIN, never CLEANING. Threshold
-- review creation inserts the next-generation actionable item first, then
-- changes status. This makes repeated Auth ambiguity cycles durable.
create or replace function public.retry_or_review_account_deletion(
  p_operation_id uuid, p_lease_token uuid, p_error_code text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_resume_from text; v_generation integer;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() for update;
  if not found then raise exception 'Deletion operation is not leased.' using errcode = 'P0001'; end if;
  v_resume_from := case
    when p_error_code = 'auth_outcome_ambiguous' then 'AUTH_RECONCILIATION'
    when v_operation.status = 'REQUESTED' then 'LOCK_DRAIN'
    when v_operation.status in ('LOCKED', 'CLEANING') then 'CLEANING'
    when v_operation.status = 'VERIFYING' then 'VERIFYING'
    when v_operation.status = 'READY_FOR_AUTH_DELETE' then 'AUTH_DELETE'
    when v_operation.status = 'AUTH_DELETED' then 'AUTH_RECONCILIATION'
    when v_operation.status = 'RETRY_REQUIRED' then v_operation.resume_from
    else null
  end;
  if v_resume_from is null then raise exception 'Deletion operation has no safe retry phase.' using errcode = 'P0001'; end if;
  if v_operation.worker_attempts >= 3 or v_operation.requested_at <= now() - interval '24 hours' then
    v_generation := v_operation.review_generation + 1;
    if v_resume_from = 'AUTH_RECONCILIATION' then
      insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, reason)
        values (p_operation_id, 'AUTH_OUTCOME_AMBIGUOUS', 'auth:' || p_operation_id::text,
          v_generation, 'auth_outcome_ambiguous') on conflict do nothing;
    else
      insert into public.account_deletion_review_items(operation_id, kind, source_ref, review_generation, reason)
        values (p_operation_id, 'AUTH_OUTCOME_AMBIGUOUS',
          'worker:' || p_operation_id::text || ':' || v_generation::text,
          v_generation, 'worker_retry_threshold') on conflict do nothing;
    end if;
    update public.account_deletion_operations set status = 'FAILED_REVIEW_REQUIRED',
      review_reason = 'worker_retry_threshold', review_opened_at = coalesce(review_opened_at, now()),
      review_resume_from = v_resume_from, review_generation = v_generation,
      last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120), resume_from = null,
      worker_lease_token = null, worker_lease_expires_at = null where operation_id = p_operation_id;
    insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
      values (p_operation_id, 'worker', 'worker', 'review_opened:worker_retry_threshold');
  else
    update public.account_deletion_operations set status = 'RETRY_REQUIRED', resume_from = v_resume_from,
      last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120),
      worker_lease_token = null, worker_lease_expires_at = null where operation_id = p_operation_id;
  end if;
end;
$$;

create or replace function public.resume_account_deletion_operation(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_status text;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status = 'RETRY_REQUIRED' for update;
  if not found or v_operation.resume_from is null then raise exception 'Deletion operation has no safe retry phase.' using errcode = 'P0001'; end if;
  v_status := case v_operation.resume_from
    when 'LOCK_DRAIN' then 'REQUESTED'
    when 'CLEANING' then 'CLEANING'
    when 'VERIFYING' then 'VERIFYING'
    when 'AUTH_DELETE' then 'READY_FOR_AUTH_DELETE'
    else null
  end;
  if v_status is null then raise exception 'Deletion operation requires Auth reconciliation.' using errcode = 'P0001'; end if;
  update public.account_deletion_operations set status = v_status, resume_from = null, last_error_code = null
    where operation_id = p_operation_id returning * into v_operation;
  return v_operation;
end;
$$;

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
  update public.account_deletion_operations set status = 'LOCKED', locked_at = now(), deletion_lock_confirmed_at = now()
    where operation_id = p_operation_id returning * into v_operation;
  return v_operation;
end;
$$;

create or replace function public.assert_account_deletion_drain(p_operation_id uuid, p_lease_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.account_deletion_operations o
    where o.operation_id = p_operation_id and o.worker_lease_token = p_lease_token
      and o.worker_lease_expires_at >= now() and o.status in ('LOCKED', 'CLEANING', 'VERIFYING')
      and o.locked_at is not null and o.deletion_lock_confirmed_at is not null
      and exists (select 1 from public.account_deletion_locks l where l.user_id = o.subject_id)
  ) then raise exception 'Durable Transaction-B deletion lock is required.' using errcode = 'P0001'; end if;
end;
$$;

create or replace function public.begin_account_deletion_cleaning(p_operation_id uuid, p_lease_token uuid)
returns public.account_deletion_operations
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() for update;
  if not found or v_operation.status not in ('LOCKED', 'CLEANING')
    or v_operation.locked_at is null or v_operation.deletion_lock_confirmed_at is null
    or not exists (select 1 from public.account_deletion_locks where user_id = v_operation.subject_id)
  then raise exception 'Durable Transaction-B deletion lock is required.' using errcode = 'P0001'; end if;
  if v_operation.status <> 'CLEANING' then
    update public.account_deletion_operations set status = 'CLEANING', last_error_code = null
      where operation_id = p_operation_id returning * into v_operation;
  end if;
  return v_operation;
end;
$$;

-- Review replay is an idempotent acknowledgement of a durable decision. The
-- response tells the Edge handler whether the operation actually requeued.
create or replace function public.resolve_account_deletion_review_item(
  p_operation_id uuid, p_evidence_digest text, p_review_item_id uuid, p_action text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
  v_item public.account_deletion_review_items%rowtype; v_next_status text;
begin
  if p_evidence_digest is null or p_evidence_digest !~ '^[0-9a-f]{64}$'
    or p_action is null or p_action not in ('DELETE', 'PRESERVE_FOREIGN', 'ACKNOWLEDGE')
  then raise exception 'Valid review evidence and action are required.' using errcode = '22023'; end if;
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id for update;
  if not found or v_operation.subject_id is null then raise exception 'Deletion operation is not reviewable.' using errcode = 'P0001'; end if;
  select * into v_item from public.account_deletion_review_items
    where review_item_id = p_review_item_id and operation_id = p_operation_id for update;
  if not found then raise exception 'Review item does not belong to operation.' using errcode = 'P0001'; end if;
  if v_item.resolution <> 'UNRESOLVED' then
    if v_item.resolution <> p_action then raise exception 'Review item already has a different resolution.' using errcode = 'P0001'; end if;
    return case when v_operation.status = 'FAILED_REVIEW_REQUIRED' then 'waiting_for_review'
      when v_operation.status = 'RETRY_REQUIRED' then 'requeued' else 'resolved_item' end;
  end if;
  if v_operation.status <> 'FAILED_REVIEW_REQUIRED' then raise exception 'Deletion operation is not awaiting review.' using errcode = 'P0001'; end if;

  if v_item.object_key is null then
    if p_action <> 'ACKNOWLEDGE' then raise exception 'This review item only supports acknowledgement.' using errcode = '22023'; end if;
    if v_item.reason = 'manual_exact_association_required' then
      raise exception 'Unknown historical association cannot be acknowledged.' using errcode = 'P0001';
    end if;
  elsif p_action = 'ACKNOWLEDGE' then
    raise exception 'Exact Storage associations need a terminal decision.' using errcode = '22023';
  elsif p_action = 'DELETE' then
    if exists (select 1 from storage.objects o where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
      and o.owner_id::text <> v_operation.subject_id::text) then
      raise exception 'Foreign Storage object cannot be approved for deletion.' using errcode = '42501';
    end if;
    update public.account_deletion_terminal_evidence set disposition = 'PENDING_DELETE', reconciled_at = null
      where operation_id = p_operation_id and object_key = v_item.object_key;
  else
    if not exists (select 1 from storage.objects o where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key)
      or exists (select 1 from storage.objects o where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
        and o.owner_id::text = v_operation.subject_id::text) then
      raise exception 'Preserve requires a currently foreign exact object.' using errcode = 'P0001';
    end if;
    update public.account_deletion_terminal_evidence set disposition = 'PRESERVED_FOREIGN', reconciled_at = now()
      where operation_id = p_operation_id and object_key = v_item.object_key;
  end if;
  if v_item.kind = 'UPLOAD_INTENT' then
    update public.flag_photo_upload_intents set status = 'CANCELLED', review_reason = 'sky_reviewed_account_deletion'
      where subject_id = v_operation.subject_id and object_key = v_item.object_key and status in ('PREPARED', 'AMBIGUOUS');
  end if;
  update public.account_deletion_review_items set resolution = p_action, resolved_at = now()
    where review_item_id = v_item.review_item_id;
  if exists (select 1 from public.account_deletion_review_items where operation_id = p_operation_id and resolution = 'UNRESOLVED') then
    v_next_status := 'waiting_for_review';
  else
    v_next_status := case when v_operation.review_resume_from = 'AUTH_RECONCILIATION' then 'RETRY_REQUIRED' else 'CLEANING' end;
    update public.account_deletion_operations set status = v_next_status,
      resume_from = case when v_next_status = 'RETRY_REQUIRED' then 'AUTH_RECONCILIATION' else null end,
      review_resume_from = null, review_reason = null, worker_lease_token = null, worker_lease_expires_at = null
      where operation_id = p_operation_id;
  end if;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action, evidence_digest)
    values (p_operation_id, 'privacy_reviewer', 'sky', 'review_item_' || p_action, p_evidence_digest);
  return case when v_next_status = 'RETRY_REQUIRED' or v_next_status = 'CLEANING' then 'requeued' else 'resolved_item' end;
end;
$$;

-- Before ready-for-Auth and again before COMPLETE, every durable association
-- must have an explicit terminal classification. Recheck preserved foreign
-- keys: a later subject-owner change reopens a precise review rather than
-- trusting a stale preserve decision forever.
create or replace function public.account_deletion_revalidate_preserved_foreign(
  p_operation_id uuid, p_lease_token uuid
)
returns table(object_key text)
language plpgsql security definer set search_path = ''
as $$
declare v_subject uuid;
begin
  select subject_id into v_subject from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status in ('LOCKED', 'CLEANING', 'VERIFYING', 'AUTH_DELETED') for update;
  if not found or v_subject is null then raise exception 'Deletion operation is not leased for terminality.' using errcode = 'P0001'; end if;
  update public.account_deletion_terminal_evidence e set disposition = 'PROVED_ABSENT', reconciled_at = now()
    where e.operation_id = p_operation_id and e.disposition = 'PRESERVED_FOREIGN'
      and not exists (select 1 from storage.objects o where o.bucket_id = e.bucket_id and o.name = e.object_key);
  return query select e.object_key from public.account_deletion_terminal_evidence e
    join storage.objects o on o.bucket_id = e.bucket_id and o.name = e.object_key
    where e.operation_id = p_operation_id and e.disposition = 'PRESERVED_FOREIGN'
      and o.owner_id::text = v_subject::text;
end;
$$;

create or replace function public.reconcile_account_deletion_storage_terminality(
  p_operation_id uuid, p_lease_token uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_status text;
begin
  select status into v_status from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status in ('CLEANING', 'VERIFYING', 'AUTH_DELETED')
    for update;
  if not found then raise exception 'Deletion operation is not leased for terminality.' using errcode = 'P0001'; end if;
  -- Auth deletion may have cascaded the subject mirror and lock row. Before
  -- Auth-last, the exact Transaction-B proof remains mandatory; after it, the
  -- operation can only reconcile the pre-captured immutable evidence.
  if v_status <> 'AUTH_DELETED' then perform public.assert_account_deletion_drain(p_operation_id, p_lease_token); end if;
  update public.account_deletion_terminal_evidence e set disposition = 'PROVED_ABSENT', reconciled_at = now()
    where e.operation_id = p_operation_id and e.disposition = 'PENDING_DELETE'
      and not exists (select 1 from storage.objects o where o.bucket_id = e.bucket_id and o.name = e.object_key);
  if exists (select 1 from public.account_deletion_terminal_evidence
      where operation_id = p_operation_id and disposition in ('PENDING_DELETE', 'BLOCKED_ASSOCIATION')) then
    raise exception 'Deletion Storage terminality is incomplete.' using errcode = 'P0001';
  end if;
end;
$$;

-- The relational purge retains the normal R2 scope but now requires both the
-- lock row and the Transaction-B confirmation timestamp, independently of a
-- mutable CLEANING/VERIFYING status label.
create or replace function public.purge_deleting_account(p_operation_id uuid, p_user_id uuid, p_lease_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_flag_ids uuid[] := '{}'::uuid[]; v_point_ids bigint[] := '{}'::bigint[]; v_residue bigint := 0;
begin
  if p_user_id is null or not exists (select 1 from public.account_deletion_locks where user_id = p_user_id)
    or not exists (select 1 from public.account_deletion_operations
      where operation_id = p_operation_id and subject_id = p_user_id and worker_lease_token = p_lease_token
        and worker_lease_expires_at >= now() and status in ('CLEANING', 'VERIFYING')
        and locked_at is not null and deletion_lock_confirmed_at is not null)
  then raise exception 'Durable Transaction-B deletion lock is required.' using errcode = 'P0001'; end if;
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
  delete from public.flags where user_id = p_user_id;
  delete from public.bk_2026_08_22_point_links where point_event_id = any(v_point_ids) or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_comments where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_photos where flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_status_history where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_verifications where verifier_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flag_edit_history where user_id = p_user_id or flag_id = any(v_flag_ids);
  delete from public.bk_2026_08_22_flags where user_id = p_user_id;
  select count(*) into v_residue from (
    select 1 from public.flags where user_id = p_user_id union all select 1 from public.flag_comments where user_id = p_user_id
    union all select 1 from public.flag_photos where uploader_id = p_user_id union all select 1 from public.flag_status_history where user_id = p_user_id
    union all select 1 from public.flag_verifications where verifier_id = p_user_id union all select 1 from public.flag_edit_history where user_id = p_user_id
    union all select 1 from public.comment_votes where voter_id = p_user_id union all select 1 from public.feedback where user_id = p_user_id
    union all select 1 from public.push_tokens where user_id = p_user_id union all select 1 from public.notification_preferences where user_id = p_user_id
    union all select 1 from public.realtime_subscribe_log where user_id = p_user_id union all select 1 from public.point_events where user_id = p_user_id
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
  select subject_id into v_subject from public.account_deletion_operations
    where operation_id = p_operation_id and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now() and status = 'AUTH_DELETED' for update;
  if not found or v_subject is null then raise exception 'Deletion operation is not ready to complete.' using errcode = 'P0001'; end if;
  if public.account_deletion_requires_review(p_operation_id) is not null
    or exists (select 1 from public.account_deletion_terminal_evidence
      where operation_id = p_operation_id and disposition not in ('PROVED_ABSENT', 'PRESERVED_FOREIGN', 'NO_STORAGE_OBJECT_ASSOCIATED'))
  then raise exception 'Deletion terminality remains incomplete.' using errcode = 'P0001'; end if;
  delete from public.flag_photo_upload_intents where subject_id = v_subject;
  -- Keep review items and terminal evidence as restricted audit records. They
  -- are the exact proof retained after subject_id is deliberately redacted.
  update public.account_deletion_operations set status = 'COMPLETE', completed_at = now(),
    receipt_expires_at = now() + interval '7 days', subject_id = null,
    worker_lease_token = null, worker_lease_expires_at = null, review_reason = null,
    review_resume_from = null, last_error_code = null where operation_id = p_operation_id and status = 'AUTH_DELETED';
end;
$$;

-- Canonical ordinary flag deletion runs through a narrow authenticated Edge
-- route. Direct admin Storage DELETE is no longer needed, avoiding a broad
-- client-side admin capability. The plan/finalize RPCs are service-role-only;
-- the Edge handler derives p_actor_id from a verified bearer token.
drop policy if exists "flag-photos admin delete" on storage.objects;

create or replace function public.account_deletion_prepare_flag_delete(p_flag_id uuid, p_actor_id uuid)
returns table(object_key text, expected_owner_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_flag public.flags%rowtype;
begin
  select * into v_flag from public.flags where id = p_flag_id for update;
  if not found or p_actor_id is null or not exists (select 1 from public.users a where a.id = p_actor_id) then
    raise exception 'Flag deletion is not authorized.' using errcode = '42501';
  end if;
  if v_flag.user_id <> p_actor_id and not exists (select 1 from public.users a where a.id = p_actor_id and a.is_admin) then
    raise exception 'Flag deletion is not authorized.' using errcode = '42501';
  end if;
  return query
    select v_flag.photo_object_key::text, v_flag.photo_uploader_id where v_flag.photo_object_key is not null
    union all
    select p.object_key::text, p.uploader_id from public.flag_photos p
      where p.flag_id = p_flag_id and p.object_key is not null;
end;
$$;

create or replace function public.account_deletion_finalize_flag_delete(p_flag_id uuid, p_actor_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_flag public.flags%rowtype;
begin
  select * into v_flag from public.flags where id = p_flag_id for update;
  if not found or p_actor_id is null then raise exception 'Flag deletion is not authorized.' using errcode = '42501'; end if;
  if v_flag.user_id <> p_actor_id and not exists (select 1 from public.users a where a.id = p_actor_id and a.is_admin) then
    raise exception 'Flag deletion is not authorized.' using errcode = '42501';
  end if;
  if exists (
    select 1 from storage.objects o where o.bucket_id = 'flag-photos' and o.name = v_flag.photo_object_key
    union all
    select 1 from storage.objects o join public.flag_photos p on p.object_key = o.name
      where o.bucket_id = 'flag-photos' and p.flag_id = p_flag_id
  ) then raise exception 'Canonical Storage cleanup is incomplete.' using errcode = 'P0001'; end if;
  delete from public.flags where id = p_flag_id;
  if not found then raise exception 'Flag deletion did not complete.' using errcode = 'P0001'; end if;
end;
$$;

-- R2 revoked the old bulk resolver. R3 removes the obsolete signature entirely
-- after confirming its active Edge caller was replaced by the one-item RPC.
drop function if exists public.resolve_account_deletion_review(uuid, text, uuid[], text[], boolean, boolean);

revoke all on function public.account_deletion_storage_owned_page(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.account_deletion_known_keys_page(uuid, uuid, text, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.capture_account_deletion_historical_evidence(uuid, uuid) from public, anon, authenticated;
revoke all on function public.capture_account_deletion_canonical_evidence(uuid, uuid) from public, anon, authenticated;
revoke all on function public.capture_account_deletion_exact_review_object(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.assert_account_deletion_drain(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_revalidate_preserved_foreign(uuid, uuid) from public, anon, authenticated;
revoke all on function public.reconcile_account_deletion_storage_terminality(uuid, uuid) from public, anon, authenticated;
revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text) from public, anon, authenticated;
revoke all on function public.account_deletion_prepare_flag_delete(uuid, uuid) from public, anon, authenticated;
revoke all on function public.account_deletion_finalize_flag_delete(uuid, uuid) from public, anon, authenticated;
grant execute on function public.account_deletion_storage_owned_page(uuid, text, integer) to service_role;
grant execute on function public.account_deletion_known_keys_page(uuid, uuid, text, text, uuid, integer) to service_role;
grant execute on function public.capture_account_deletion_historical_evidence(uuid, uuid) to service_role;
grant execute on function public.capture_account_deletion_canonical_evidence(uuid, uuid) to service_role;
grant execute on function public.capture_account_deletion_exact_review_object(uuid, uuid, text, text) to service_role;
grant execute on function public.assert_account_deletion_drain(uuid, uuid) to service_role;
grant execute on function public.account_deletion_revalidate_preserved_foreign(uuid, uuid) to service_role;
grant execute on function public.reconcile_account_deletion_storage_terminality(uuid, uuid) to service_role;
grant execute on function public.resolve_account_deletion_review_item(uuid, text, uuid, text) to service_role;
grant execute on function public.account_deletion_prepare_flag_delete(uuid, uuid) to service_role;
grant execute on function public.account_deletion_finalize_flag_delete(uuid, uuid) to service_role;

-- =============================================================================
-- STAGING RECOVERY NOTE
-- Before any separately authorized staging apply, snapshot functions, grants,
-- RLS policies, constraints, and account-deletion rows. Apply D1S-A, D1, R2,
-- then this R3 file in the reviewed history-safe sequence; never use db push
-- or migration repair. Validate catalog signatures/grants, held-writer MVCC,
-- canonical Storage removes, review replay, and pagination boundaries before
-- destructive accounts are exercised. If catalog validation fails before a
-- destructive operation, restore the captured prior function/policy/grant
-- definitions in an authorized staging recovery change. Do not attempt a
-- rollback after Storage/Auth/account purge: terminal evidence and backups
-- must instead drive a documented, human-approved recovery decision.
-- =============================================================================
