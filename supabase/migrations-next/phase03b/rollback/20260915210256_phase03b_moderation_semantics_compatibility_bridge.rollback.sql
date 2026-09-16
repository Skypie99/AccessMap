-- SAFE COMPENSATING RESTORATION — Phase03B moderation capability OFF, compatibility retained.
--
-- This retains the bounded Build 33 / pinned-web compatibility bridge for
-- direct verify/resolve/reopen while the compatibility trigger continues to
-- force reject/restore through the now-disabled audited RPC. It also retains a
-- community-only CAS transition RPC for verify/resolve/reopen. The queue and
-- moderation RPC stay revoked. Tightened RLS, reason columns, and the ledger
-- remain intact. The repaired non-owner flags guard also stays in place, so
-- cross-owner photo_alt writes remain atomically denied in this safe state.
-- Reapply the forward migration to restore moderation capability.
begin;

revoke all on function public.moderate_report(
  uuid, text, public.flag_status, text
) from public, anon, authenticated, service_role;
revoke all on function public.list_open_moderation_reports(integer)
  from public, anon, authenticated, service_role;

create or replace function public.transition_flag_status(
  p_flag_id uuid,
  p_expected_status public.flag_status,
  p_new_status public.flag_status,
  p_moderation_reason text default null,
  p_report_id uuid default null
)
returns setof public.flags
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_updated public.flags%rowtype;
begin
  if v_actor is null
     or not exists (select 1 from public.users account where account.id = v_actor)
  then
    raise exception 'Account is no longer active.' using errcode = '42501';
  end if;

  if nullif(btrim(p_moderation_reason), '') is not null or p_report_id is not null then
    raise exception 'Moderation is disabled.' using errcode = '42501';
  end if;

  if p_expected_status = p_new_status then
    raise exception 'The requested status is already current.' using errcode = 'P0001';
  end if;

  if not (
    (p_expected_status = 'open'::public.flag_status
      and p_new_status in ('verified'::public.flag_status, 'resolved'::public.flag_status))
    or (p_expected_status = 'verified'::public.flag_status
      and p_new_status = 'resolved'::public.flag_status)
    or (p_expected_status = 'resolved'::public.flag_status
      and p_new_status = 'open'::public.flag_status)
  ) then
    raise exception 'Moderation is disabled.' using errcode = '42501';
  end if;

  update public.flags
     set status = p_new_status::text,
         last_moderation_reason_code = null
   where id = p_flag_id
     and status = p_expected_status::text
   returning * into v_updated;

  if not found then
    if not exists (select 1 from public.flags where id = p_flag_id) then
      raise exception 'Flag not found.' using errcode = 'P0002';
    end if;
    raise exception 'This flag changed since you opened it. Refresh and try again.'
      using errcode = 'P0001';
  end if;

  return next v_updated;
end
$fn$;

revoke all on function public.transition_flag_status(
  uuid, public.flag_status, public.flag_status, text, uuid
) from public, anon, authenticated, service_role;
grant execute on function public.transition_flag_status(
  uuid, public.flag_status, public.flag_status, text, uuid
) to authenticated;

-- The direct bridge stays open only for authenticated status writes. Rejected
-- rows stay hidden, reason writes stay server-owned, and the compatibility
-- trigger keeps direct reject/restore closed. These statements also guard
-- against privilege drift before the compensating restoration is run.
revoke update (status) on public.flags from public, anon;
grant update (status) on public.flags to authenticated;
revoke update (last_moderation_reason_code)
  on public.flags from public, anon, authenticated;
revoke update (
  moderation_reviewed_at,
  moderation_reviewed_by,
  moderation_resolution,
  moderation_action_intent,
  moderation_reason_code
) on public.feedback from public, anon, authenticated;
revoke update, delete on public.flag_moderation_events
  from public, anon, authenticated, service_role;

commit;
