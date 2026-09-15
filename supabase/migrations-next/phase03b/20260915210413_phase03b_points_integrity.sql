-- PHASE-03B: prospective points-integrity controls.
-- Historical point_events are retained unchanged and seed the new claim state.
begin;

create table if not exists public.flag_point_reward_claims (
  flag_id uuid not null references public.flags(id) on delete cascade,
  event_type text not null check (
    event_type in (
      'flag_verified_reporter',
      'flag_resolved_reporter',
      'flag_verified_actor',
      'flag_resolved_actor'
    )
  ),
  awarded_user_id uuid references public.users(id) on delete set null,
  claimed_at timestamptz not null default now(),
  primary key (flag_id, event_type)
);

alter table public.flag_point_reward_claims enable row level security;
revoke all on table public.flag_point_reward_claims
  from public, anon, authenticated, service_role;

insert into public.flag_point_reward_claims (
  flag_id, event_type, awarded_user_id, claimed_at
)
select distinct on (event.flag_id, event.event_type)
       event.flag_id,
       event.event_type,
       event.user_id,
       event.created_at
  from public.point_events event
 where event.flag_id is not null
   and event.event_type in (
     'flag_verified_reporter',
     'flag_resolved_reporter',
     'flag_verified_actor',
     'flag_resolved_actor'
   )
 order by event.flag_id, event.event_type, event.created_at, event.id
on conflict (flag_id, event_type) do nothing;

create table if not exists public.comment_reward_daily (
  user_id uuid not null references public.users(id) on delete cascade,
  reward_date date not null,
  reward_count smallint not null default 0 check (reward_count between 0 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, reward_date)
);

alter table public.comment_reward_daily enable row level security;
revoke all on table public.comment_reward_daily
  from public, anon, authenticated, service_role;

insert into public.comment_reward_daily (user_id, reward_date, reward_count, updated_at)
select event.user_id,
       (event.created_at at time zone 'UTC')::date,
       least(count(*)::integer, 5)::smallint,
       max(event.created_at)
  from public.point_events event
 where event.event_type = 'comment_added'
 group by event.user_id, (event.created_at at time zone 'UTC')::date
on conflict (user_id, reward_date) do update
  set reward_count = greatest(
        public.comment_reward_daily.reward_count,
        excluded.reward_count
      ),
      updated_at = greatest(public.comment_reward_daily.updated_at, excluded.updated_at);

-- Also count surviving comments. This keeps a safe capability-off interval from
-- reopening the same day's first-five budget when the forward migration is
-- reapplied; GREATEST preserves any higher historical point-event count.
insert into public.comment_reward_daily (user_id, reward_date, reward_count, updated_at)
select comment.user_id,
       (comment.created_at at time zone 'UTC')::date,
       least(count(*)::integer, 5)::smallint,
       max(comment.created_at)
  from public.flag_comments comment
 where comment.user_id is not null
 group by comment.user_id, (comment.created_at at time zone 'UTC')::date
on conflict (user_id, reward_date) do update
  set reward_count = greatest(
        public.comment_reward_daily.reward_count,
        excluded.reward_count
      ),
      updated_at = greatest(public.comment_reward_daily.updated_at, excluded.updated_at);

create table if not exists public.comment_vote_reward_counts (
  comment_id uuid primary key references public.flag_comments(id) on delete cascade,
  reward_count smallint not null default 0 check (reward_count between 0 and 10),
  updated_at timestamptz not null default now()
);

alter table public.comment_vote_reward_counts enable row level security;
revoke all on table public.comment_vote_reward_counts
  from public, anon, authenticated, service_role;

-- Seed from surviving one-vote rows. Historical point_events intentionally stay
-- untouched; their schema has no comment_id and must not be guessed from flag_id.
insert into public.comment_vote_reward_counts (comment_id, reward_count, updated_at)
select vote.comment_id,
       least(count(*)::integer, 10)::smallint,
       max(vote.created_at)
  from public.comment_votes vote
 group by vote.comment_id
on conflict (comment_id) do update
  set reward_count = greatest(
        public.comment_vote_reward_counts.reward_count,
        excluded.reward_count
      ),
      updated_at = greatest(public.comment_vote_reward_counts.updated_at, excluded.updated_at);

-- Votes are one-way. The existing primary key (comment_id, voter_id) now
-- becomes a lifetime one-vote claim because authenticated clients cannot delete.
drop policy if exists "comment_votes delete own" on public.comment_votes;
revoke delete on public.comment_votes from public, anon, authenticated;

create or replace function public.handle_comment_added()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_reward_count smallint;
  v_reward_date date := (statement_timestamp() at time zone 'UTC')::date;
begin
  if new.user_id is null then
    return new;
  end if;

  insert into public.comment_reward_daily (user_id, reward_date, reward_count, updated_at)
  values (new.user_id, v_reward_date, 1, statement_timestamp())
  on conflict (user_id, reward_date) do update
    set reward_count = public.comment_reward_daily.reward_count + 1,
        updated_at = statement_timestamp()
    where public.comment_reward_daily.reward_count < 5
  returning reward_count into v_reward_count;

  if v_reward_count is null then
    return new;
  end if;

  update public.users
     set points = points + 1
   where id = new.user_id;

  insert into public.point_events (user_id, event_type, delta, flag_id)
  values (new.user_id, 'comment_added', 1, new.flag_id);

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
  v_flag_id uuid;
  v_reward_count smallint;
begin
  select comment.user_id, comment.flag_id
    into v_comment_author, v_flag_id
    from public.flag_comments comment
    where comment.id = new.comment_id;

  if v_comment_author = new.voter_id then
    raise exception 'Cannot vote on your own comment' using errcode = 'P0001';
  end if;

  -- The upsert's row lock serializes concurrent voters and rechecks the latest
  -- committed counter after waiting. A COUNT in this AFTER trigger would keep
  -- the INSERT statement's older snapshot and could over-award at the boundary.
  insert into public.comment_vote_reward_counts (comment_id, reward_count, updated_at)
  values (new.comment_id, 1, statement_timestamp())
  on conflict (comment_id) do update
    set reward_count = public.comment_vote_reward_counts.reward_count + 1,
        updated_at = statement_timestamp()
    where public.comment_vote_reward_counts.reward_count < 10
  returning reward_count into v_reward_count;

  if v_reward_count is not null and v_comment_author is not null then
    update public.users
       set points = points + 2
     where id = v_comment_author;

    insert into public.point_events (user_id, event_type, delta, flag_id)
    values (v_comment_author, 'comment_upvoted', 2, v_flag_id);
  end if;

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
  v_reporter_bonus integer := 0;
  v_reporter_event text;
  v_actor_bonus integer := 0;
  v_actor_event text;
  v_claimed boolean;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  -- Status history remains complete even for zero-point moderation/recovery.
  insert into public.flag_status_history (flag_id, user_id, from_status, to_status)
  values (new.id, v_actor, old.status, new.status);

  -- Reject and restore are prospectively points-neutral. Historical penalties
  -- remain in point_events and user totals exactly as recorded.
  if new.status = 'rejected' or old.status = 'rejected' then
    return new;
  end if;

  if new.status = 'verified' and old.status = 'open' then
    v_reporter_bonus := 10;
    v_reporter_event := 'flag_verified_reporter';
    v_actor_bonus := 3;
    v_actor_event := 'flag_verified_actor';
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    v_reporter_bonus := 15;
    v_reporter_event := 'flag_resolved_reporter';
    v_actor_bonus := 7;
    v_actor_event := 'flag_resolved_actor';
  else
    return new;
  end if;

  -- An owner may triage their own report, but that action creates no reporter
  -- or actor award and does not consume the once-per-flag reward claims.
  if v_actor is not null and v_actor = new.user_id then
    return new;
  end if;

  if v_reporter_bonus > 0 and new.user_id is not null then
    insert into public.flag_point_reward_claims (
      flag_id, event_type, awarded_user_id, claimed_at
    ) values (
      new.id, v_reporter_event, new.user_id, statement_timestamp()
    )
    on conflict (flag_id, event_type) do nothing
    returning true into v_claimed;

    if coalesce(v_claimed, false) then
      update public.users
         set points = points + v_reporter_bonus
       where id = new.user_id;
      insert into public.point_events (user_id, event_type, delta, flag_id)
      values (new.user_id, v_reporter_event, v_reporter_bonus, new.id);
    end if;
  end if;

  v_claimed := false;
  if v_actor_bonus > 0 and v_actor is not null and v_actor is distinct from new.user_id then
    insert into public.flag_point_reward_claims (
      flag_id, event_type, awarded_user_id, claimed_at
    ) values (
      new.id, v_actor_event, v_actor, statement_timestamp()
    )
    on conflict (flag_id, event_type) do nothing
    returning true into v_claimed;

    if coalesce(v_claimed, false) then
      update public.users
         set points = points + v_actor_bonus
       where id = v_actor;
      insert into public.point_events (user_id, event_type, delta, flag_id)
      values (v_actor, v_actor_event, v_actor_bonus, new.id);
    end if;
  end if;

  return new;
end
$fn$;

revoke all on function public.handle_flag_status_change()
  from public, anon, authenticated, service_role;

commit;
