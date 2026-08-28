-- =============================================================================
-- D1 — Option A account deletion: durable deletion lock + atomic purge
--
-- STATUS: LOCAL ARTIFACT ONLY. Do not apply from this repository. Sky alone
-- applies reviewed migrations; this migration is deliberately additive and
-- does not replay or alter D1S-A.
--
-- The edge function owns the outer workflow:
--   authenticated subject → lock → Storage sweep → this RPC → final Storage
--   check → auth.users delete LAST.
--
-- This migration owns only database-safe work. It does not delete auth.users,
-- create Storage objects, weaken D1S-A, or redesign unrelated RLS surfaces.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Durable server-side fence
--
-- A lock exists from the first deletion attempt until auth.users is deleted.
-- The FK intentionally follows the public account mirror: auth.users delete
-- cascades to public.users, then removes this lock. A failed cleanup leaves
-- the lock in place so every active session stays write-blocked until retry.
-- -----------------------------------------------------------------------------
create table if not exists public.account_deletion_locks (
  user_id uuid primary key references public.users(id) on delete cascade,
  locked_at timestamptz not null default now()
);

alter table public.account_deletion_locks enable row level security;
revoke all privileges on table public.account_deletion_locks from public, anon, authenticated;
grant select, insert on table public.account_deletion_locks to service_role;

-- The function deliberately accepts no user id. Client policy evaluation can
-- answer only “may the current authenticated subject write?”, never whether
-- somebody else is locked.
create or replace function public.current_account_can_write()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
     and exists (
       select 1
       from public.users as account
       where account.id = (select auth.uid())
     )
     and not exists (
       select 1
       from public.account_deletion_locks as lock
       where lock.user_id = (select auth.uid())
     );
$$;
revoke all on function public.current_account_can_write() from public, anon;
grant execute on function public.current_account_can_write() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Lock-aware client write boundaries
--
-- PostgreSQL OR-combines permissive policies. Every existing permissive write
-- path is therefore replaced with its same predicate AND the D1 fence, rather
-- than adding an ineffective “not locked” policy beside it. Read policies and
-- anonymous-only writes are intentionally not changed.
-- -----------------------------------------------------------------------------

-- Own profile updates retain the admin-role immutability guard.
drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users for update
  to authenticated
  using (
    (select auth.uid()) = id
    and (select public.current_account_can_write())
  )
  with check (
    (select auth.uid()) = id
    and (select public.current_account_can_write())
    and is_admin is not distinct from
      (select is_admin from public.users where id = (select auth.uid()))
  );

-- Signed-in reports; the anon-only “flags anon insert” policy remains intact.
drop policy if exists "flags insert own" on public.flags;
create policy "flags insert own"
  on public.flags for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

-- Preserve the live owner/open-only edit contract and its immutable columns.
drop policy if exists "flags owner edit open" on public.flags;
create policy "flags owner edit open"
  on public.flags for update
  to authenticated
  using (
    (select auth.uid()) = user_id
    and status = 'open'
    and (select public.current_account_can_write())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
    and lat        = (select lat        from public.flags where id = flags.id)
    and lng        = (select lng        from public.flags where id = flags.id)
    and user_id    = (select user_id    from public.flags where id = flags.id)
    and created_at = (select created_at from public.flags where id = flags.id)
    and status     = (select status     from public.flags where id = flags.id)
  );

-- D1S-A deliberately allows authenticated community status triage. Keep that
-- product decision, but fence the actor’s account while deletion is pending.
drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update
  to authenticated
  using ((select public.current_account_can_write()))
  with check ((select public.current_account_can_write()));

drop policy if exists "flags delete own" on public.flags;
create policy "flags delete own"
  on public.flags for delete
  to authenticated
  using (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

-- An administrator who begins deleting their own account is also fenced.
drop policy if exists "admin delete any flag" on public.flags;
create policy "admin delete any flag"
  on public.flags for delete
  to authenticated
  using (
    (select public.current_account_can_write())
    and (select is_admin from public.users where id = (select auth.uid()))
  );

-- D1S-A ownership/path conditions remain present; only the active-account
-- test is narrowed to a current, unlocked account.
drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (select public.current_account_can_write())
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
    and (select public.current_account_can_write())
  );

-- This existing permissive admin path must be replaced too: adding a separate
-- “not deleting” policy would not restrict it because permissive RLS policies
-- compose with OR.
drop policy if exists "flag-photos admin delete" on storage.objects;
create policy "flag-photos admin delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'flag-photos'
    and (select public.current_account_can_write())
    and (select is_admin from public.users where id = (select auth.uid()))
  );

drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert
  to authenticated
  with check (
    position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
    and exists (
      select 1
      from public.flags as flag
      where flag.id = flag_photos.flag_id
        and flag.user_id = (select auth.uid())
    )
    and (select public.current_account_can_write())
  );

drop policy if exists "flag_photos: flag owner delete" on public.flag_photos;
create policy "flag_photos: flag owner delete"
  on public.flag_photos for delete
  to authenticated
  using (
    (select user_id from public.flags where id = flag_id) = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "flag_photos: flag owner update" on public.flag_photos;
create policy "flag_photos: flag owner update"
  on public.flag_photos for update
  to authenticated
  using (
    (select user_id from public.flags where id = flag_id) = (select auth.uid())
    and (select public.current_account_can_write())
  )
  with check (
    (select user_id from public.flags where id = flag_id) = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "flag_comments: own insert" on public.flag_comments;
create policy "flag_comments: own insert"
  on public.flag_comments for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "flag_comments: own delete" on public.flag_comments;
create policy "flag_comments: own delete"
  on public.flag_comments for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "admin delete any comment" on public.flag_comments;
create policy "admin delete any comment"
  on public.flag_comments for delete
  to authenticated
  using (
    (select public.current_account_can_write())
    and (select is_admin from public.users where id = (select auth.uid()))
  );

drop policy if exists "flag_verifications own insert" on public.flag_verifications;
create policy "flag_verifications own insert"
  on public.flag_verifications for insert
  to authenticated
  with check (
    (select auth.uid()) = verifier_id
    and verifier_id <> (select user_id from public.flags where id = flag_id)
    and (select public.current_account_can_write())
  );

drop policy if exists "comment_votes insert own" on public.comment_votes;
create policy "comment_votes insert own"
  on public.comment_votes for insert
  to authenticated
  with check (
    (select auth.uid()) = voter_id
    and (select public.current_account_can_write())
  );

drop policy if exists "comment_votes delete own" on public.comment_votes;
create policy "comment_votes delete own"
  on public.comment_votes for delete
  to authenticated
  using (
    (select auth.uid()) = voter_id
    and (select public.current_account_can_write())
  );

-- Keep guest feedback working. Only the signed-in branch needs the fence.
drop policy if exists "feedback_insert_self_or_anon" on public.feedback;
create policy "feedback_insert_self_or_anon"
  on public.feedback for insert
  with check (
    user_id is null
    or (
      user_id = (select auth.uid())
      and (select public.current_account_can_write())
    )
  );

drop policy if exists "feedback_delete_own" on public.feedback;
create policy "feedback_delete_own"
  on public.feedback for delete
  using (
    user_id is not null
    and user_id = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "push_tokens: owner insert" on public.push_tokens;
create policy "push_tokens: owner insert"
  on public.push_tokens for insert
  with check (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

drop policy if exists "push_tokens: owner update" on public.push_tokens;
create policy "push_tokens: owner update"
  on public.push_tokens for update
  using (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  )
  with check (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

drop policy if exists "push_tokens: owner delete" on public.push_tokens;
create policy "push_tokens: owner delete"
  on public.push_tokens for delete
  using (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

drop policy if exists "Users can upsert their own notification preferences" on public.notification_preferences;
create policy "Users can upsert their own notification preferences"
  on public.notification_preferences for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "Users can update their own notification preferences" on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and (select public.current_account_can_write())
  )
  with check (
    user_id = (select auth.uid())
    and (select public.current_account_can_write())
  );

drop policy if exists "flag_edit_history insert by flag owner" on public.flag_edit_history;
create policy "flag_edit_history insert by flag owner"
  on public.flag_edit_history for insert
  to authenticated
  with check (
    (select auth.uid()) = (select user_id from public.flags where id = flag_id)
    and (select public.current_account_can_write())
  );

drop policy if exists "subscribe_log insert own" on public.realtime_subscribe_log;
create policy "subscribe_log insert own"
  on public.realtime_subscribe_log for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select public.current_account_can_write())
  );

create or replace function public.log_realtime_event(p_event text, p_channel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.current_account_can_write() then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  if p_event not in ('subscribe', 'unsubscribe') then
    raise exception 'event must be ''subscribe'' or ''unsubscribe''';
  end if;

  insert into public.realtime_subscribe_log (user_id, event, channel)
  values ((select auth.uid()), p_event, p_channel);
end;
$$;
revoke execute on function public.log_realtime_event(text, text) from public, anon;
grant execute on function public.log_realtime_event(text, text) to authenticated;

-- Keep D1S-A’s counter semantics and authenticated-only grants. A locked
-- account cannot mutate community counters during account deletion.
create or replace function public.increment_reopen_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_count integer;
begin
  if not public.current_account_can_write() then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set reopen_requests = reopen_requests + 1
    where id = p_flag_id
      and status = 'resolved'
    returning reopen_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;
revoke execute on function public.increment_reopen_request(uuid) from public, anon;
grant execute on function public.increment_reopen_request(uuid) to authenticated;

create or replace function public.increment_dispute_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new_count integer;
begin
  if not public.current_account_can_write() then
    raise exception 'Account is no longer active.' using errcode = 'P0001';
  end if;

  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')
    returning dispute_requests into v_new_count;

  return coalesce(v_new_count, 0);
end;
$$;
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
grant execute on function public.increment_dispute_request(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Service-role-only, transaction-bound database and backup purge
--
-- PostgreSQL executes the full function in one transaction. A failed deletion
-- or residue assertion raises, so every database and protected-backup mutation
-- inside this function rolls back together. auth.users intentionally remains
-- outside: the Edge Function performs final Auth teardown only after the final
-- Storage verification succeeds.
-- -----------------------------------------------------------------------------
create or replace function public.purge_deleting_account(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  backup_flag_ids uuid[] := '{}'::uuid[];
  residue_count bigint := 0;
begin
  if p_user_id is null
     or not exists (
       select 1
       from public.account_deletion_locks as lock
       where lock.user_id = p_user_id
     )
  then
    raise exception 'Deletion lock is required.' using errcode = 'P0001';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[])
    into backup_flag_ids
    from public.bk_2026_08_22_flags
    where user_id = p_user_id;

  -- Direct contributions outside the user’s owned report trees.
  delete from public.comment_votes where voter_id = p_user_id;
  delete from public.flag_verifications where verifier_id = p_user_id;
  delete from public.flag_comments where user_id = p_user_id;
  delete from public.flag_photos
    where position('/flag-photos/' || p_user_id::text || '/' in url) > 0;
  delete from public.flag_status_history where user_id = p_user_id;
  delete from public.flag_edit_history where user_id = p_user_id;
  delete from public.feedback where user_id = p_user_id;
  delete from public.push_tokens where user_id = p_user_id;
  delete from public.notification_preferences where user_id = p_user_id;
  delete from public.realtime_subscribe_log where user_id = p_user_id;
  delete from public.point_events where user_id = p_user_id;

  -- Deleting owned reports cascades through their complete live report trees.
  delete from public.flags where user_id = p_user_id;

  -- D1S-A protects the seven backup relations from clients; Option A must
  -- nevertheless erase matching retained content in the same transaction.
  delete from public.bk_2026_08_22_point_links
    where flag_id = any(backup_flag_ids);
  delete from public.bk_2026_08_22_flag_comments
    where user_id = p_user_id or flag_id = any(backup_flag_ids);
  delete from public.bk_2026_08_22_flag_photos
    where flag_id = any(backup_flag_ids)
       or position('/flag-photos/' || p_user_id::text || '/' in url) > 0;
  delete from public.bk_2026_08_22_flag_status_history
    where user_id = p_user_id or flag_id = any(backup_flag_ids);
  delete from public.bk_2026_08_22_flag_verifications
    where verifier_id = p_user_id or flag_id = any(backup_flag_ids);
  delete from public.bk_2026_08_22_flag_edit_history
    where user_id = p_user_id or flag_id = any(backup_flag_ids);
  delete from public.bk_2026_08_22_flags where user_id = p_user_id;

  -- Every current and retained account-linked row must now be gone. The
  -- public/auth account and the durable lock are deliberate pre-auth survivors.
  select count(*) into residue_count
  from (
    select 1 from public.flags where user_id = p_user_id
    union all select 1 from public.flag_comments where user_id = p_user_id
    union all select 1 from public.flag_photos
      where position('/flag-photos/' || p_user_id::text || '/' in url) > 0
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
    union all select 1 from public.bk_2026_08_22_flag_comments
      where user_id = p_user_id or flag_id = any(backup_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_photos
      where flag_id = any(backup_flag_ids)
         or position('/flag-photos/' || p_user_id::text || '/' in url) > 0
    union all select 1 from public.bk_2026_08_22_flag_status_history
      where user_id = p_user_id or flag_id = any(backup_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_verifications
      where verifier_id = p_user_id or flag_id = any(backup_flag_ids)
    union all select 1 from public.bk_2026_08_22_flag_edit_history
      where user_id = p_user_id or flag_id = any(backup_flag_ids)
    union all select 1 from public.bk_2026_08_22_point_links
      where flag_id = any(backup_flag_ids)
  ) as residues;

  if residue_count <> 0 then
    raise exception 'Account deletion residue remains.' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.purge_deleting_account(uuid) from public, anon, authenticated;
grant execute on function public.purge_deleting_account(uuid) to service_role;

-- =============================================================================
-- D1-ONLY ROLLBACK — mechanics only; deleted account content is irreversible.
--
-- 1. Roll back the D1 Edge Function first. Do not run this while a deletion
--    lock exists: `select count(*) from public.account_deletion_locks;` must be
--    zero, otherwise the fence protecting an in-progress deletion would vanish.
-- 2. Restore the immediately pre-D1, D1S-A-compatible policy and RPC bodies;
--    never re-run or alter the deployed D1S-A migration itself.
-- 3. Revoke then drop `purge_deleting_account`, drop the policy helper, and
--    finally drop `account_deletion_locks`.
--
-- A rollback must not restore broad backup-table privileges, D1S-A’s former
-- storage/account boundary, or any already deleted report, backup, or media.
-- =============================================================================
