-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075821, hosted name "fork5_w1_dispute_counter_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

alter table public.flags
  add column if not exists dispute_requests          integer     not null default 0,
  add column if not exists dispute_requests_reset_at timestamptz;

create or replace function public.increment_dispute_request(p_flag_id uuid)
  returns integer
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  v_new_count integer;
begin
  update public.flags
    set dispute_requests = dispute_requests + 1
    where id = p_flag_id
      and status in ('open', 'verified')   -- doubt targets live reports only
    returning dispute_requests into v_new_count;
  return coalesce(v_new_count, 0);
end;
$$;
revoke execute on function public.increment_dispute_request(uuid) from public, anon;
grant  execute on function public.increment_dispute_request(uuid) to authenticated;

-- Reset on ANY status change: a transition starts a new evidentiary cycle.
create or replace function public.handle_flag_dispute_reset()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    new.dispute_requests          := 0;
    new.dispute_requests_reset_at := now();
  end if;
  return new;
end;
$$;
revoke execute on function public.handle_flag_dispute_reset()
  from public, anon, authenticated;

drop trigger if exists on_flag_dispute_reset on public.flags;
create trigger on_flag_dispute_reset
  before update of status on public.flags
  for each row execute function public.handle_flag_dispute_reset();

comment on function public.increment_dispute_request(uuid) is
  'Fork 5/W1: doubt counter on live flags. SECURITY DEFINER; no user_id
   stored (Jordan). Authenticated-only; W2 anon grant is gated - see header.';
