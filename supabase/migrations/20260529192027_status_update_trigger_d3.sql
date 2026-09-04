-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529192027, hosted name "status_update_trigger_d3".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.user_id     := old.user_id;
  new.lat         := old.lat;
  new.lng         := old.lng;
  new.category    := old.category;
  new.severity    := old.severity;
  new.description := old.description;
  new.photo_url   := old.photo_url;
  new.created_at  := old.created_at;
  return new;
end;
$$;

drop trigger if exists enforce_flag_status_only_for_non_owner on public.flags;
create trigger enforce_flag_status_only_for_non_owner
  before update on public.flags
  for each row execute function public.enforce_flag_status_only_for_non_owner();
