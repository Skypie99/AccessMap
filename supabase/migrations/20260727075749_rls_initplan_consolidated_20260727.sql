-- Reconstructed 2026-07-27 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260727075749, hosted name "rls_initplan_consolidated_20260727".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- push_tokens ×4
drop policy if exists "push_tokens: owner select" on public.push_tokens;
drop policy if exists "push_tokens owner select"  on public.push_tokens;
create policy "push_tokens owner select" on public.push_tokens for select
  to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner insert" on public.push_tokens;
drop policy if exists "push_tokens owner insert"  on public.push_tokens;
create policy "push_tokens owner insert" on public.push_tokens for insert
  to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner update" on public.push_tokens;
drop policy if exists "push_tokens owner update"  on public.push_tokens;
create policy "push_tokens owner update" on public.push_tokens for update
  to authenticated using ((select auth.uid()) = user_id)
                    with check ((select auth.uid()) = user_id);
drop policy if exists "push_tokens: owner delete" on public.push_tokens;
drop policy if exists "push_tokens owner delete"  on public.push_tokens;
create policy "push_tokens owner delete" on public.push_tokens for delete
  to authenticated using ((select auth.uid()) = user_id);

-- notification_preferences ×3
drop policy if exists "Users can read their own notification preferences"
  on public.notification_preferences;
create policy "Users can read their own notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "Users can upsert their own notification preferences"
  on public.notification_preferences;
create policy "Users can upsert their own notification preferences"
  on public.notification_preferences for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "Users can update their own notification preferences"
  on public.notification_preferences;
create policy "Users can update their own notification preferences"
  on public.notification_preferences for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- flag_comments ×2
drop policy if exists "flag_comments: own insert" on public.flag_comments;
create policy "flag_comments: own insert" on public.flag_comments for insert
  to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "flag_comments: own delete" on public.flag_comments;
create policy "flag_comments: own delete" on public.flag_comments for delete
  to authenticated using (user_id = (select auth.uid()));

-- flag_status_history ×1 (the maintainer policy's unwrapped auth.email())
drop policy if exists "flag_status_history readable by maintainer"
  on public.flag_status_history;
create policy "flag_status_history readable by maintainer"
  on public.flag_status_history for select to authenticated
  using ((select auth.email()) = 'skylerhalisky@gmail.com');
