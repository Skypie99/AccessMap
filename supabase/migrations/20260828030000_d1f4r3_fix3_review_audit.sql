-- =============================================================================
-- D1F4R3-FIX3 — restore the privacy-audit write for every first review
-- resolution.
--
-- LOCAL SOURCE ONLY. This migration is intentionally not applied by this task.
-- It leaves the frozen D1S-A and rejected D1 predecessor migrations unchanged
-- and does not touch the FIX2 direct-DELETE containment.
--
-- Regression being repaired: the FIX2 resolver marked a review item resolved
-- and then returned waiting_for_review for a non-final item BEFORE reaching the
-- audit INSERT, so the first resolution of a multi-item review committed with
-- no durable audit record or evidence digest. Because identical replay returns
-- through the resolved-item replay branch, that missing record could never be
-- reconstructed. This function is the only change: the audit row for a first
-- resolution is written in the same transaction before ANY success return, for
-- the non-final waiting_for_review path and the final requeue path alike. If
-- the audit INSERT fails, the item resolution rolls back with it — a review
-- decision can never commit without its evidence.
--
-- Rollback / recovery: do not restore client DELETE privileges or policies. If
-- a separately authorized staging validation finds a function defect before a
-- destructive operation, restore the immediately prior review-function body in
-- a recovery migration while retaining this audit-before-return ordering. After
-- a destructive account operation, use the retained audit evidence and a human
-- recovery decision; do not attempt a data rollback.
-- =============================================================================

-- Same signature and jsonb return type as FIX2, so replace in place; the
-- service-role-only grant is re-asserted below rather than trusted to survive.
create or replace function public.resolve_account_deletion_review_item(
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
  -- before subject_id is required so COMPLETE redaction cannot break replay,
  -- and before the first-resolution effects below so a replay can never write
  -- a second audit row or repeat a terminal-evidence or intent side effect.
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

  -- The privacy-evidence chain: every first resolution writes exactly one
  -- audit row, carrying the reviewer's evidence digest, before any success
  -- return. Non-final and final resolutions share this single INSERT, so an
  -- INSERT failure aborts the resolution itself in the same transaction.
  insert into public.account_deletion_review_audit(
    operation_id, actor_kind, actor_id, action, evidence_digest
  ) values (
    p_operation_id, 'privacy_reviewer', 'sky', 'review_item_' || p_action, p_evidence_digest
  );

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

  return jsonb_build_object('status', 'requeued', 'operation_status', v_next_status);
end;
$$;

revoke all on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.resolve_account_deletion_review_item(uuid, text, uuid, text)
  to service_role;

-- =============================================================================
-- STAGING VALIDATION / RECOVERY
-- After separately authorized application, run
-- supabase/tests/d1f4r3_fix3_review_audit.test.sql (pgTAP) to prove, on the
-- real catalog, that a two-item review writes exactly one audit row per first
-- resolution with its exact evidence digest, that identical replay and
-- conflicting replay add no audit rows, and that the final item requeues
-- through the accepted FIX2 phase mapping. Do not use supabase db push or
-- migration repair.
-- =============================================================================
