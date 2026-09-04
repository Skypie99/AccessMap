-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075349, hosted name "fork2_oa_actor_guard_null_safe_plus_status_history_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create or replace function public.handle_flag_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reporter_bonus    int := 0;
  reporter_event    text;
  actor_bonus       int := 0;
  actor_event       text;
begin
  if new.status is null or new.status = old.status then
    return new;
  end if;

  -- Audit row first, so the history is faithful even if a later statement raises.
  insert into public.flag_status_history (flag_id, user_id, from_status, to_status)
  values (new.id, auth.uid(), old.status, new.status);

  if new.status = 'verified' and old.status = 'open' then
    reporter_bonus  := 10;
    reporter_event  := 'flag_verified_reporter';
    actor_bonus     := 3;
    actor_event     := 'flag_verified_actor';
  elsif new.status = 'resolved' and old.status in ('open', 'verified') then
    reporter_bonus  := 15;
    reporter_event  := 'flag_resolved_reporter';
    actor_bonus     := 7;
    actor_event     := 'flag_resolved_actor';
  elsif new.status = 'rejected' and auth.uid() in (
      select id from public.users where is_admin = true
    ) then
    -- Spam penalty: only when admin explicitly rejects
    if new.user_id is not null then
      update public.users
        set points = greatest(0, points - 20)
        where id = new.user_id;
      insert into public.point_events (user_id, event_type, delta, flag_id)
        values (new.user_id, 'flag_spam_penalty', -20, new.id);
    end if;
    return new;
  end if;

  if reporter_bonus > 0 and new.user_id is not null then
    update public.users
      set points = points + reporter_bonus
      where id = new.user_id;
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (new.user_id, reporter_event, reporter_bonus, new.id);
  end if;

  if actor_bonus > 0
     and auth.uid() is not null
     and auth.uid() is distinct from new.user_id then   -- << THE ONE CHANGED LINE
    update public.users
      set points = points + actor_bonus
      where id = auth.uid();
    insert into public.point_events (user_id, event_type, delta, flag_id)
      values (auth.uid(), actor_event, actor_bonus, new.id);
  end if;

  return new;
end;
$$;

revoke execute on function public.handle_flag_status_change()
  from public, anon, authenticated;
