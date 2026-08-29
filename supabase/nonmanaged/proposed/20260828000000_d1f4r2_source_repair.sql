-- =============================================================================
-- D1F4R2 — forward-only source repair for deletion evidence and Storage safety.
--
-- LOCAL SOURCE ONLY. Do not apply this migration remotely from this task.
-- Frozen containment/deletion migrations remain untouched; this file supersedes
-- the affected functions only after a separately approved hosted application.
-- =============================================================================

-- Keep the phase that must resume after a manual review. In particular, an
-- ambiguous Auth provider result returns only through AUTH_RECONCILIATION.
alter table public.account_deletion_operations
  add column if not exists review_resume_from text;
alter table public.account_deletion_operations
  drop constraint if exists account_deletion_operations_review_resume_from_check;
alter table public.account_deletion_operations
  add constraint account_deletion_operations_review_resume_from_check
  check (review_resume_from is null or review_resume_from in (
    'CLEANING', 'VERIFYING', 'AUTH_DELETE', 'AUTH_RECONCILIATION'
  )) not valid;

-- Server-owned, bounded review work. source_ref is an internal row reference,
-- never a public URL or a client-provided Storage inventory.
create table if not exists public.account_deletion_review_items (
  review_item_id uuid primary key default gen_random_uuid(),
  operation_id uuid not null references public.account_deletion_operations(operation_id) on delete cascade,
  kind text not null check (kind in (
    'LEGACY_AVATAR', 'LEGACY_PRIMARY_PHOTO', 'LEGACY_GALLERY_PHOTO',
    'BACKUP_FLAG_PHOTO', 'EXACT_STORAGE', 'UPLOAD_INTENT',
    'AUTH_OUTCOME_AMBIGUOUS'
  )),
  source_ref text not null check (length(source_ref) between 1 and 320),
  bucket_id text check (bucket_id is null or bucket_id = 'flag-photos'),
  object_key text check (object_key is null or length(object_key) between 1 and 512),
  reason text not null check (length(reason) between 1 and 120),
  resolution text not null default 'UNRESOLVED' check (resolution in (
    'UNRESOLVED', 'DELETE', 'PRESERVE_FOREIGN', 'ACKNOWLEDGE'
  )),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (operation_id, kind, source_ref),
  check (
    (kind in ('EXACT_STORAGE', 'UPLOAD_INTENT') and bucket_id = 'flag-photos' and object_key is not null)
    or (kind not in ('EXACT_STORAGE', 'UPLOAD_INTENT') and bucket_id is null and object_key is null)
  )
);
create index if not exists account_deletion_review_items_operation_idx
  on public.account_deletion_review_items(operation_id, resolution, created_at);
alter table public.account_deletion_review_items enable row level security;
revoke all on table public.account_deletion_review_items from public, anon, authenticated;
grant select, insert, update, delete on table public.account_deletion_review_items to service_role;

-- New writes are held to the anonymous photo-free boundary even while an
-- eventual hosted migration-validation decision is pending for historic rows.
alter table public.flags drop constraint if exists flags_anonymous_photo_free;
alter table public.flags add constraint flags_anonymous_photo_free check (
  user_id is not null
  or (
    photo_url is null
    and photo_object_key is null
    and photo_uploader_id is null
    and photo_alt is null
  )
) not valid;
drop policy if exists "flags anon insert" on public.flags;
create policy "flags anon insert" on public.flags for insert to anon
  with check (
    user_id is null
    and photo_url is null
    and photo_object_key is null
    and photo_uploader_id is null
    and photo_alt is null
  );

-- Storage metadata is exposed only through fixed-bucket, read-only,
-- service-role functions. owner_id remains text: malformed values simply do
-- not match a subject id and cannot authorize deletion.
create or replace function public.account_deletion_storage_exact_object(p_object_key text)
returns table(object_key text, owner_id text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_object_key is null or length(p_object_key) = 0 or length(p_object_key) > 512 then
    raise exception 'Invalid Storage object key.' using errcode = '22023';
  end if;
  return query
    select o.name::text, o.owner_id::text
    from storage.objects o
    where o.bucket_id = 'flag-photos' and o.name = p_object_key;
end;
$$;

create or replace function public.account_deletion_storage_owned_page(
  p_subject_id uuid,
  p_after_object_key text default null,
  p_limit integer default 100
)
returns table(object_key text, owner_id text)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_subject_id is null or p_limit < 1 or p_limit > 100
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

-- Capture durable historic evidence before the worker can purge the associated
-- row. No URL is copied into the review queue and no object is deleted here.
create or replace function public.capture_account_deletion_historical_evidence(
  p_operation_id uuid, p_lease_token uuid
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status in ('LOCKED', 'CLEANING', 'VERIFYING')
    for update;
  if not found or v_operation.subject_id is null then
    raise exception 'Deletion operation is not leased for evidence capture.' using errcode = 'P0001';
  end if;

  insert into public.account_deletion_review_items(operation_id, kind, source_ref, reason)
    select p_operation_id, 'LEGACY_AVATAR', 'user:' || u.id::text, 'legacy_avatar_without_canonical_key'
    from public.users u
    where u.id = v_operation.subject_id and u.avatar_url is not null and u.avatar_object_key is null
  on conflict do nothing;

  insert into public.account_deletion_review_items(operation_id, kind, source_ref, reason)
    select p_operation_id, 'LEGACY_PRIMARY_PHOTO', 'flag:' || f.id::text, 'legacy_primary_photo_without_canonical_key'
    from public.flags f
    where f.user_id = v_operation.subject_id and f.photo_url is not null and f.photo_object_key is null
  on conflict do nothing;

  insert into public.account_deletion_review_items(operation_id, kind, source_ref, reason)
    select p_operation_id, 'LEGACY_GALLERY_PHOTO', 'flag_photo:' || p.id::text, 'legacy_gallery_photo_without_canonical_key'
    from public.flag_photos p
    join public.flags f on f.id = p.flag_id
    where f.user_id = v_operation.subject_id and p.url is not null and p.object_key is null
  on conflict do nothing;

  insert into public.account_deletion_review_items(operation_id, kind, source_ref, reason)
    select p_operation_id, 'BACKUP_FLAG_PHOTO', 'backup_flag_photo:' || p.id::text, 'backup_photo_requires_review'
    from public.bk_2026_08_22_flag_photos p
    join public.bk_2026_08_22_flags f on f.id = p.flag_id
    where f.user_id = v_operation.subject_id and p.url is not null
  on conflict do nothing;

  -- An unfinished direct upload has no timed absence inference. Capture its
  -- server-generated exact key so review can select a bounded outcome.
  insert into public.account_deletion_review_items(operation_id, kind, source_ref, bucket_id, object_key, reason)
    select p_operation_id, 'UPLOAD_INTENT', 'intent:' || i.intent_id::text,
      i.bucket_id, i.object_key, 'unresolved_upload_intent'
    from public.flag_photo_upload_intents i
    where i.subject_id = v_operation.subject_id and i.status in ('PREPARED', 'AMBIGUOUS')
  on conflict do nothing;
end;
$$;

create or replace function public.capture_account_deletion_exact_review_object(
  p_operation_id uuid, p_lease_token uuid, p_object_key text, p_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if p_object_key is null or length(p_object_key) = 0 or length(p_object_key) > 512
    or p_reason is null or length(p_reason) = 0
  then
    raise exception 'Invalid exact review object.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status in ('LOCKED', 'CLEANING', 'VERIFYING', 'AUTH_DELETED')
  ) then
    raise exception 'Deletion operation is not leased for review capture.' using errcode = 'P0001';
  end if;
  insert into public.account_deletion_review_items(
    operation_id, kind, source_ref, bucket_id, object_key, reason
  ) values (
    p_operation_id, 'EXACT_STORAGE', 'object:' || p_object_key, 'flag-photos', p_object_key, left(p_reason, 120)
  ) on conflict do nothing;
end;
$$;

-- Exact text comparison has no UUID cast failure mode. Existing URLs remain
-- display-only; canonical provenance must match Storage's authoritative owner.
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
    where bucket_id = v_intent.bucket_id and name = v_intent.object_key
      and owner_id::text = v_intent.subject_id::text
  ) then
    update public.flag_photo_upload_intents set status = 'AMBIGUOUS', review_reason = 'exact_storage_owner_not_confirmed'
      where intent_id = v_intent.intent_id;
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
  outcome text, id uuid, display_name text, avatar_url text, avatar_object_key text,
  points integer, created_at timestamptz
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
    where bucket_id = v_intent.bucket_id and name = v_intent.object_key
      and owner_id::text = v_intent.subject_id::text
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

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'flag-photos'
    and owner_id::text = (select auth.uid())::text
    and (select public.current_account_can_write())
  );

-- All review holds are durable and explicit. The worker first captures
-- historical evidence; an unexpected Storage object is recorded before the
-- worker enters FAILED_REVIEW_REQUIRED.
create or replace function public.account_deletion_requires_review(p_operation_id uuid)
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype;
begin
  select * into v_operation from public.account_deletion_operations where operation_id = p_operation_id;
  if not found or v_operation.subject_id is null then return 'operation_subject_missing'; end if;
  if exists (
    select 1 from public.account_deletion_review_items
    where operation_id = p_operation_id and resolution = 'UNRESOLVED'
  ) then return 'unresolved_review_item'; end if;
  if exists (
    select 1 from public.flag_photo_upload_intents
    where subject_id = v_operation.subject_id and status in ('PREPARED', 'AMBIGUOUS')
  ) then return 'unresolved_upload_intent'; end if;
  return null;
end;
$$;

create or replace function public.move_account_deletion_to_review(
  p_operation_id uuid, p_lease_token uuid, p_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_resume text;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status <> 'COMPLETE'
    for update;
  if not found then raise exception 'Deletion operation cannot enter review.' using errcode = 'P0001'; end if;
  v_resume := case
    when v_operation.status = 'AUTH_DELETED'
      or (v_operation.status = 'RETRY_REQUIRED' and v_operation.resume_from = 'AUTH_RECONCILIATION')
      then 'AUTH_RECONCILIATION'
    when v_operation.status = 'READY_FOR_AUTH_DELETE' then 'AUTH_DELETE'
    when v_operation.status = 'VERIFYING' then 'VERIFYING'
    else 'CLEANING'
  end;
  update public.account_deletion_operations
    set status = 'FAILED_REVIEW_REQUIRED',
      review_reason = left(coalesce(p_reason, 'manual_review_required'), 120),
      review_opened_at = coalesce(review_opened_at, now()),
      review_resume_from = v_resume,
      resume_from = null,
      worker_lease_token = null,
      worker_lease_expires_at = null
    where operation_id = p_operation_id;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
    values (p_operation_id, 'worker', 'worker', 'review_opened:' || left(coalesce(p_reason, 'manual_review_required'), 80));
end;
$$;

-- One reviewer action per durable item. The server supplies the item identity,
-- shape, and exact key; input cannot become a bulk object-inventory assertion.
create or replace function public.resolve_account_deletion_review_item(
  p_operation_id uuid, p_evidence_digest text, p_review_item_id uuid, p_action text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_operation public.account_deletion_operations%rowtype;
  v_item public.account_deletion_review_items%rowtype;
  v_intent_id uuid;
  v_next_status text;
begin
  if p_evidence_digest is null or p_evidence_digest !~ '^[0-9a-f]{64}$'
    or p_action is null or p_action not in ('DELETE', 'PRESERVE_FOREIGN', 'ACKNOWLEDGE')
  then raise exception 'Valid review evidence and action are required.' using errcode = '22023'; end if;
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id and status = 'FAILED_REVIEW_REQUIRED'
    for update;
  if not found or v_operation.subject_id is null then
    raise exception 'Deletion operation is not awaiting review.' using errcode = 'P0001';
  end if;
  select * into v_item from public.account_deletion_review_items
    where review_item_id = p_review_item_id and operation_id = p_operation_id
    for update;
  if not found then raise exception 'Review item does not belong to operation.' using errcode = 'P0001'; end if;
  if v_item.resolution <> 'UNRESOLVED' then
    if v_item.resolution = p_action then return; end if;
    raise exception 'Review item already has a different resolution.' using errcode = 'P0001';
  end if;
  if v_item.kind in ('EXACT_STORAGE', 'UPLOAD_INTENT') then
    if p_action = 'ACKNOWLEDGE' then raise exception 'Exact Storage items need a delete or preserve decision.' using errcode = '22023'; end if;
    if p_action = 'DELETE' and exists (
      select 1 from storage.objects o
      where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
        and o.owner_id::text <> v_operation.subject_id::text
    ) then raise exception 'Foreign Storage object cannot be approved for deletion.' using errcode = '42501'; end if;
    if v_item.kind = 'UPLOAD_INTENT' then
      select i.intent_id into v_intent_id from public.flag_photo_upload_intents i
        where i.subject_id = v_operation.subject_id
          and ('intent:' || i.intent_id::text) = v_item.source_ref
          and i.status in ('PREPARED', 'AMBIGUOUS')
        for update;
      if not found then raise exception 'Upload intent no longer has a reviewable state.' using errcode = 'P0001'; end if;
      update public.flag_photo_upload_intents
        set status = 'CANCELLED', review_reason = 'sky_reviewed_account_deletion'
        where intent_id = v_intent_id;
    end if;
  elsif p_action <> 'ACKNOWLEDGE' then
    raise exception 'Historical evidence can only be acknowledged.' using errcode = '22023';
  end if;
  update public.account_deletion_review_items
    set resolution = p_action, resolved_at = now()
    where review_item_id = v_item.review_item_id;
  if not exists (
    select 1 from public.account_deletion_review_items
    where operation_id = p_operation_id and resolution = 'UNRESOLVED'
  ) then
    v_next_status := case when v_operation.review_resume_from = 'AUTH_RECONCILIATION'
      then 'RETRY_REQUIRED' else 'CLEANING' end;
    update public.account_deletion_operations
      set status = v_next_status,
        resume_from = case when v_next_status = 'RETRY_REQUIRED' then 'AUTH_RECONCILIATION' else null end,
        review_resume_from = null,
        review_reason = null,
        worker_lease_token = null,
        worker_lease_expires_at = null
      where operation_id = p_operation_id;
  end if;
  insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action, evidence_digest)
    values (p_operation_id, 'privacy_reviewer', 'sky', 'review_item_' || p_action, p_evidence_digest);
end;
$$;

-- The threshold path preserves the computed recovery phase before it clears a
-- lease. It cannot strand an Auth ambiguity in FAILED_REVIEW_REQUIRED.
create or replace function public.retry_or_review_account_deletion(
  p_operation_id uuid, p_lease_token uuid, p_error_code text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_operation public.account_deletion_operations%rowtype; v_resume_from text;
begin
  select * into v_operation from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
    for update;
  if not found then raise exception 'Deletion operation is not leased.' using errcode = 'P0001'; end if;
  v_resume_from := case
    when p_error_code = 'auth_outcome_ambiguous' then 'AUTH_RECONCILIATION'
    when v_operation.status = 'REQUESTED' then 'CLEANING'
    when v_operation.status in ('LOCKED', 'CLEANING') then 'CLEANING'
    when v_operation.status = 'VERIFYING' then 'VERIFYING'
    when v_operation.status = 'READY_FOR_AUTH_DELETE' then 'AUTH_DELETE'
    when v_operation.status = 'AUTH_DELETED' then 'AUTH_RECONCILIATION'
    when v_operation.status = 'RETRY_REQUIRED' then v_operation.resume_from
    else null
  end;
  if v_resume_from is null then raise exception 'Deletion operation has no safe retry phase.' using errcode = 'P0001'; end if;
  if v_operation.worker_attempts >= 3 or v_operation.requested_at <= now() - interval '24 hours' then
    update public.account_deletion_operations
      set status = 'FAILED_REVIEW_REQUIRED',
        review_reason = 'worker_retry_threshold',
        review_opened_at = coalesce(review_opened_at, now()),
        review_resume_from = v_resume_from,
        last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120),
        resume_from = null,
        worker_lease_token = null,
        worker_lease_expires_at = null
      where operation_id = p_operation_id;
    insert into public.account_deletion_review_audit(operation_id, actor_kind, actor_id, action)
      values (p_operation_id, 'worker', 'worker', 'review_opened:worker_retry_threshold');
    if v_resume_from = 'AUTH_RECONCILIATION' then
      insert into public.account_deletion_review_items(operation_id, kind, source_ref, reason)
        values (p_operation_id, 'AUTH_OUTCOME_AMBIGUOUS', 'auth:' || p_operation_id::text, 'auth_outcome_ambiguous')
      on conflict do nothing;
    end if;
  else
    update public.account_deletion_operations
      set status = 'RETRY_REQUIRED',
        resume_from = v_resume_from,
        last_error_code = left(coalesce(p_error_code, 'worker_failure'), 120),
        worker_lease_token = null,
        worker_lease_expires_at = null
      where operation_id = p_operation_id;
  end if;
end;
$$;

create or replace function public.complete_account_deletion(p_operation_id uuid, p_lease_token uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_subject uuid;
begin
  select subject_id into v_subject from public.account_deletion_operations
    where operation_id = p_operation_id
      and worker_lease_token = p_lease_token
      and worker_lease_expires_at >= now()
      and status = 'AUTH_DELETED'
    for update;
  if not found or v_subject is null then raise exception 'Deletion operation is not ready to complete.' using errcode = 'P0001'; end if;
  if public.account_deletion_requires_review(p_operation_id) is not null
    or exists (select 1 from public.account_deletion_review_items where operation_id = p_operation_id and resolution = 'UNRESOLVED')
  then raise exception 'Deletion review remains unresolved.' using errcode = 'P0001'; end if;
  delete from public.flag_photo_upload_intents where subject_id = v_subject;
  delete from public.account_deletion_review_objects where operation_id = p_operation_id;
  delete from public.account_deletion_review_items where operation_id = p_operation_id;
  update public.account_deletion_operations
    set status = 'COMPLETE',
      completed_at = now(),
      receipt_expires_at = now() + interval '7 days',
      subject_id = null,
      worker_lease_token = null,
      worker_lease_expires_at = null,
      review_reason = null,
      review_resume_from = null,
      last_error_code = null
    where operation_id = p_operation_id and status = 'AUTH_DELETED';
end;
$$;

-- The old unbounded review RPC remains in historic source but is no longer
-- callable. The new Edge Function uses the one-item function above.
revoke all on function public.resolve_account_deletion_review(uuid, text, uuid[], text[], boolean, boolean)
  from public, anon, authenticated, service_role;
revoke all on function public.account_deletion_storage_exact_object(text) from public, anon, authenticated;
revoke all on function public.account_deletion_storage_owned_page(uuid, text, integer) from public, anon, authenticated;
revoke all on function public.capture_account_deletion_historical_evidence(uuid, uuid) from public, anon, authenticated;
revoke all on function public.capture_account_deletion_exact_review_object(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.account_deletion_storage_exact_object(text) to service_role;
grant execute on function public.account_deletion_storage_owned_page(uuid, text, integer) to service_role;
grant execute on function public.capture_account_deletion_historical_evidence(uuid, uuid) to service_role;
grant execute on function public.capture_account_deletion_exact_review_object(uuid, uuid, text, text) to service_role;
grant execute on function public.resolve_account_deletion_review_item(uuid, text, uuid, text) to service_role;
