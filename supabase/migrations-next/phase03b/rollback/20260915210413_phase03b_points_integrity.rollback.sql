-- SAFE COMPENSATING RESTORATION — Phase03B points capability OFF.
--
-- This does NOT restore the pre-Phase03B reward implementation because that
-- would reopen repeat milestone awards, delete/reinsert vote farming, uncapped
-- comment rewards, and the -20 rejection penalty. It preserves every historical
-- point event, claim, daily counter, and one-way vote. It disables the affected
-- prospective rewards while retaining status-history writes. Reapplying the
-- forward migration resumes rewards from the preserved claim/counter state.
begin;

create or replace function public.handle_comment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
begin
  return new;
end
$fn$;

revoke all on function public.handle_comment_added()
  from public, anon, authenticated, service_role;

create or replace function public.handle_comment_vote_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_comment_author uuid;
begin
  select comment.user_id into v_comment_author
    from public.flag_comments comment
    where comment.id = new.comment_id;

  if v_comment_author = new.voter_id then
    raise exception 'Cannot vote on your own comment' using errcode = 'P0001';
  end if;

  -- Vote remains recorded and one-way; only its points side effect is disabled.
  return new;
end
$fn$;

revoke all on function public.handle_comment_vote_added()
  from public, anon, authenticated, service_role;

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_reporter_event text;
  v_actor_event text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  -- Preserve the canonical status audit trail while all Phase03B milestone
  -- rewards are disabled. Reject/restore remain points-neutral.
  insert into public.flag_status_history (flag_id, user_id, from_status, to_status)
  values (new.id, v_actor, old.status, new.status);

  -- A non-owner milestone reached while rewards are OFF still consumes its
  -- once-per-flag claims. Reapply therefore cannot pay it retroactively via a
  -- later reject/restore cycle. Owner self-triage stays zero and consumes none,
  -- matching the forward semantics.
  if v_actor is not null and v_actor is distinct from new.user_id then
    if new.status = 'verified' and old.status = 'open' then
      v_reporter_event := 'flag_verified_reporter';
      v_actor_event := 'flag_verified_actor';
    elsif new.status = 'resolved' and old.status in ('open', 'verified') then
      v_reporter_event := 'flag_resolved_reporter';
      v_actor_event := 'flag_resolved_actor';
    end if;

    if v_reporter_event is not null and new.user_id is not null then
      insert into public.flag_point_reward_claims (
        flag_id, event_type, awarded_user_id, claimed_at
      ) values (new.id, v_reporter_event, new.user_id, statement_timestamp())
      on conflict (flag_id, event_type) do nothing;
    end if;
    if v_actor_event is not null then
      insert into public.flag_point_reward_claims (
        flag_id, event_type, awarded_user_id, claimed_at
      ) values (new.id, v_actor_event, v_actor, statement_timestamp())
      on conflict (flag_id, event_type) do nothing;
    end if;
  end if;

  return new;
end
$fn$;

revoke all on function public.handle_flag_status_change()
  from public, anon, authenticated, service_role;

-- Explicitly preserve the one-way-vote boundary and all server-owned state.
drop policy if exists "comment_votes delete own" on public.comment_votes;
revoke delete on public.comment_votes from public, anon, authenticated;
revoke all on table public.flag_point_reward_claims
  from public, anon, authenticated;
revoke all on table public.comment_reward_daily
  from public, anon, authenticated;
revoke all on table public.comment_vote_reward_counts
  from public, anon, authenticated;

commit;
