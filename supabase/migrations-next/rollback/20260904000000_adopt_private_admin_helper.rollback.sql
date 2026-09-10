-- Forward restoration for 20260904000000. Never a history rewrite.
-- Restores the pre-adoption policy shape (the repository's inline-subquery
-- variant) and removes the helper. Only meaningful on a database that did NOT
-- already have the helper — against production this would REMOVE a live,
-- load-bearing object, so it must never be run there without Sky's explicit
-- authorization and a fresh catalog capture first.

drop policy if exists "users update own row" on public.users;
create policy "users update own row"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and is_admin is not distinct from
      (select is_admin from public.users where id = (select auth.uid()))
  );

drop function if exists private.current_user_is_admin();
drop schema if exists private;
