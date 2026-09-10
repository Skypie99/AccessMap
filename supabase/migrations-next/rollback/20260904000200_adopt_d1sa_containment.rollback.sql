-- Forward restoration for 20260904000200.
--
-- WARNING: this restores the PRE-D1S-A policy shapes, which are the ones the
-- D1S-A packet was written to contain (stale-account writes and looser photo
-- metadata ownership). Against production it would REMOVE live containment.
-- It exists so the rollback set is complete and rehearsable; running it on any
-- real database requires Sky's explicit authorization and a fresh capture first.
--
-- This is executable and self-contained so rollback rehearsal tests the actual
-- artifact rather than an instruction to reconstruct it by hand.

drop policy if exists "flag-photos auth upload" on storage.objects;
create policy "flag-photos auth upload"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "flag-photos owner delete" on storage.objects;
create policy "flag-photos owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'flag-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert to authenticated
  with check (true);

drop policy if exists "flags status update by any authenticated" on public.flags;
create policy "flags status update by any authenticated"
  on public.flags for update to authenticated
  using (true)
  with check (true);

grant execute on function public.enforce_flag_status_transition()
  to public, anon, authenticated;

create or replace function public.increment_reopen_request(p_flag_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE public.flags
    SET reopen_requests = reopen_requests + 1
    WHERE id = p_flag_id
      AND status = 'resolved'
    RETURNING reopen_requests INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

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
