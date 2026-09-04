-- =============================================================================
-- D1F4R3-FIX2 — review-resume/replay correctness and canonical flag deletion.
--
-- LOCAL SOURCE ONLY. This migration is intentionally not applied by this task.
-- It leaves the frozen D1S-A and rejected D1 predecessor migrations unchanged.
--
-- Rollback / recovery: do not restore client DELETE privileges or policies. If
-- a separately authorized staging validation finds a function defect before a
-- destructive operation, restore the immediately prior review-function body in
-- a recovery migration while retaining this direct-DELETE containment. After a
-- destructive account operation, use the retained audit evidence and a human
-- recovery decision; do not attempt a data rollback.
-- =============================================================================

-- The review RPC is service-role-only and is called solely by the Sky-only
-- review Edge route. Its return type changes from text to a structured durable
-- state, so remove the old signature before replacing it. Review items remain
-- durable after COMPLETE, whereas subject_id is deliberately redacted there.
revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)
  from public, anon, authenticated;
drop function if exists public.resolve_account_deletion_review_item(uuid, text, uuid, text);

create function public.resolve_account_deletion_review_item(
  p_operation_id uuid, p_evidence_digest text, p_review_item_id uuid, p_action text
)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_operation public.account_deletion_operations%rowtype;
  v_item public.account_deletion_review_items%rowtype;
  v_next_status text;
  v_has_other_unresolved boolean;
begin
  if p_evidence_digest is null or p_evidence_digest !~ '^[0-9a-f]{64}$'
    or p_action is null or p_action not in ('DELETE', 'PRESERVE_FOREIGN', 'ACKNOWLEDGE')
  then
    raise exception 'Valid review evidence and action are required.' using errcode = '22023';
  end if;

  select * into v_operation
    from public.account_deletion_operations
    where operation_id = p_operation_id
    for update;
  if not found then
    raise exception 'Deletion operation is not reviewable.' using errcode = 'P0001';
  end if;

  select * into v_item
    from public.account_deletion_review_items
    where review_item_id = p_review_item_id and operation_id = p_operation_id
    for update;
  if not found then
    raise exception 'Review item does not belong to operation.' using errcode = 'P0001';
  end if;

  -- A repeated identical request must report the operation's durable current
  -- state, not a stale claim that this request requeued it. This branch runs
  -- before subject_id is required so COMPLETE redaction cannot break replay.
  if v_item.resolution <> 'UNRESOLVED' then
    if v_item.resolution <> p_action then
      raise exception 'Review item already has a different resolution.' using errcode = 'P0001';
    end if;
    if exists (
      select 1 from public.account_deletion_review_items
      where operation_id = p_operation_id and resolution = 'UNRESOLVED'
    ) then
      return jsonb_build_object('status', 'waiting_for_review', 'operation_status', v_operation.status);
    end if;
    if v_operation.status = 'COMPLETE' then
      return jsonb_build_object('status', 'complete', 'operation_status', v_operation.status);
    end if;
    if v_operation.status in (
      'REQUESTED', 'LOCKED', 'CLEANING', 'VERIFYING',
      'READY_FOR_AUTH_DELETE', 'RETRY_REQUIRED', 'AUTH_DELETED'
    ) then
      return jsonb_build_object('status', 'requeued', 'operation_status', v_operation.status);
    end if;
    -- A completed review item with an unrecognized operation state cannot be
    -- retried safely. Leave the durable rows unchanged for human inspection.
    raise exception 'Deletion review replay has no truthful durable state.' using errcode = 'P0001';
  end if;

  if v_operation.status <> 'FAILED_REVIEW_REQUIRED' or v_operation.subject_id is null then
    raise exception 'Deletion operation is not awaiting review.' using errcode = 'P0001';
  end if;

  select exists (
    select 1 from public.account_deletion_review_items
    where operation_id = p_operation_id
      and resolution = 'UNRESOLVED'
      and review_item_id <> v_item.review_item_id
  ) into v_has_other_unresolved;

  -- Validate the stored resume phase before resolving the last actionable
  -- item. A corrupt or unsupported value stays on hold without consuming the
  -- review evidence. LOCK_DRAIN deliberately returns to REQUESTED so the
  -- worker must execute Transaction B before any Storage or purge work.
  if not v_has_other_unresolved then
    v_next_status := case v_operation.review_resume_from
      when 'LOCK_DRAIN' then 'REQUESTED'
      when 'CLEANING' then 'CLEANING'
      when 'VERIFYING' then 'VERIFYING'
      when 'AUTH_DELETE' then 'READY_FOR_AUTH_DELETE'
      when 'AUTH_RECONCILIATION' then 'RETRY_REQUIRED'
      else null
    end;
    if v_next_status is null then
      raise exception 'Deletion review has no safe resume phase.' using errcode = 'P0001';
    end if;
  end if;

  if v_item.object_key is null then
    if p_action <> 'ACKNOWLEDGE' then
      raise exception 'This review item only supports acknowledgement.' using errcode = '22023';
    end if;
    if v_item.reason = 'manual_exact_association_required' then
      raise exception 'Unknown historical association cannot be acknowledged.' using errcode = 'P0001';
    end if;
  elsif p_action = 'ACKNOWLEDGE' then
    raise exception 'Exact Storage associations need a terminal decision.' using errcode = '22023';
  elsif p_action = 'DELETE' then
    if exists (
      select 1 from storage.objects o
      where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
        and o.owner_id::text <> v_operation.subject_id::text
    ) then
      raise exception 'Foreign Storage object cannot be approved for deletion.' using errcode = '42501';
    end if;
    update public.account_deletion_terminal_evidence
      set disposition = 'PENDING_DELETE', reconciled_at = null
      where operation_id = p_operation_id and object_key = v_item.object_key;
  else
    if not exists (
      select 1 from storage.objects o
      where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
    ) or exists (
      select 1 from storage.objects o
      where o.bucket_id = v_item.bucket_id and o.name = v_item.object_key
        and o.owner_id::text = v_operation.subject_id::text
    ) then
      raise exception 'Preserve requires a currently foreign exact object.' using errcode = 'P0001';
    end if;
    update public.account_deletion_terminal_evidence
      set disposition = 'PRESERVED_FOREIGN', reconciled_at = now()
      where operation_id = p_operation_id and object_key = v_item.object_key;
  end if;

  if v_item.kind = 'UPLOAD_INTENT' then
    update public.flag_photo_upload_intents
      set status = 'CANCELLED', review_reason = 'sky_reviewed_account_deletion'
      where subject_id = v_operation.subject_id
        and object_key = v_item.object_key
        and status in ('PREPARED', 'AMBIGUOUS');
  end if;

  update public.account_deletion_review_items
    set resolution = p_action, resolved_at = now()
    where review_item_id = v_item.review_item_id;

  if v_has_other_unresolved then
    return jsonb_build_object('status', 'waiting_for_review', 'operation_status', v_operation.status);
  end if;

  update public.account_deletion_operations
    set status = v_next_status,
        resume_from = case when v_next_status = 'RETRY_REQUIRED' then 'AUTH_RECONCILIATION' else null end,
        review_resume_from = null,
        review_reason = null,
        worker_lease_token = null,
        worker_lease_expires_at = null
    where operation_id = p_operation_id;

  insert into public.account_deletion_review_audit(
    operation_id, actor_kind, actor_id, action, evidence_digest
  ) values (
    p_operation_id, 'privacy_reviewer', 'sky', 'review_item_' || p_action, p_evidence_digest
  );

  return jsonb_build_object('status', 'requeued', 'operation_status', v_next_status);
end;
$$;

revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)
  to service_role;

-- Direct Data API DELETE can erase relational evidence before the canonical
-- Storage-first route runs. Remove both rows of defense: no client role keeps
-- DELETE table privilege, and no authenticated policy (including the legacy
-- FOR ALL owner policy) remains able to authorize a direct delete. Specific
-- INSERT and UPDATE policies established by D1 remain unchanged.
revoke delete on table public.flags from public, anon, authenticated;
grant select, insert, update on table public.flags to authenticated;
grant select, insert, update, delete on table public.flags to service_role;

drop policy if exists "flags_user_scoped" on public.flags;
drop policy if exists "flags delete own" on public.flags;
drop policy if exists "admin delete any flag" on public.flags;

-- The browser keeps sending only flagId to delete-flag. The Edge route derives
-- the verified caller and uses service-role-only prepare/finalize RPCs, so the
-- account-deletion Storage plan, exact-owner checks, exact-absence checks, and
-- relational finalization order remain mandatory.

-- =============================================================================
-- STAGING VALIDATION / RECOVERY
-- After separately authorized application, inspect information_schema role
-- privileges and pg_policies, then run supabase/tests/d1f4r3_fix2_flags_delete_rls.test.sql.
-- Verify authenticated owner and admin direct Data API DELETE both fail before
-- exercising delete-flag; verify create, owner edit, and community status
-- transition still pass. Do not use supabase db push or migration repair.
-- =============================================================================
