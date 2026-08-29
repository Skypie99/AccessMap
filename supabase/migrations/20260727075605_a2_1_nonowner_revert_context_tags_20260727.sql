-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075605, hosted name "a2_1_nonowner_revert_context_tags_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create or replace function public.enforce_flag_status_only_for_non_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is null or auth.uid() = old.user_id then
    return new;
  end if;

  new.id           := old.id;            -- NEW: PK immutable
  new.user_id      := old.user_id;
  new.lat          := old.lat;
  new.lng          := old.lng;
  new.category     := old.category;
  new.severity     := old.severity;
  new.description  := old.description;
  new.photo_url    := old.photo_url;
  new.created_at   := old.created_at;
  new.context_tags := old.context_tags;  -- NEW: closes the tag-pollution hole
  return new;
end;
$$;

revoke execute on function public.enforce_flag_status_only_for_non_owner()
  from public, anon, authenticated;
