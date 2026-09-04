-- Reconstructed 2026-05-29 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260529043805, hosted name "push_tokens_table_fix".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

drop table if exists public.push_tokens;
create table public.push_tokens (
  user_id    uuid primary key references public.users(id) on delete cascade,
  token      text not null,
  platform   text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
create policy "push_tokens: owner select"
  on public.push_tokens for select using (auth.uid() = user_id);
create policy "push_tokens: owner insert"
  on public.push_tokens for insert with check (auth.uid() = user_id);
create policy "push_tokens: owner update"
  on public.push_tokens for update using (auth.uid() = user_id);
create policy "push_tokens: owner delete"
  on public.push_tokens for delete using (auth.uid() = user_id);
create or replace function public.handle_push_token_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;
drop trigger if exists push_tokens_updated_at on public.push_tokens;
create trigger push_tokens_updated_at
  before update on public.push_tokens
  for each row execute function public.handle_push_token_updated_at();
