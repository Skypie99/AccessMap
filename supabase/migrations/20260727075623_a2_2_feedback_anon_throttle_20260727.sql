-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075623, hosted name "a2_2_feedback_anon_throttle_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create or replace function public.check_feedback_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent   integer;
  anon_cap integer := 30;   -- anonymous feedback rows / 1h, global (tune me)
begin
  if new.user_id is not null then
    return new;
  end if;

  select count(*) into recent
    from public.feedback
   where user_id is null
     and created_at > now() - interval '1 hour';

  if recent >= anon_cap then
    raise exception 'Feedback is temporarily rate-limited. Please try again later.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke execute on function public.check_feedback_rate_limit() from public, anon, authenticated;

drop trigger if exists enforce_feedback_rate_limit on public.feedback;
create trigger enforce_feedback_rate_limit
  before insert on public.feedback
  for each row execute function public.check_feedback_rate_limit();
