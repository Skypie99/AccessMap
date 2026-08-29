-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529021646, hosted name "2026_05_25_push_tokens_complete".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

create or replace function public.handle_push_token_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_tokens_updated_at on public.push_tokens;
create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_push_token_updated_at();
