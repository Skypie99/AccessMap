-- Admin role: is_admin column + admin-level RLS policies.
-- Apply in the Supabase SQL editor. All statements are idempotent.
--
-- What this migration does:
--   1. Adds is_admin boolean to public.users (default false, never NULL).
--   2. Creates a policy allowing admins to DELETE any flag.
--   3. Replaces the "users update own row" policy with one that blocks
--      clients from changing their own is_admin value in either direction.
--      Only direct DB / service-role access can promote a user to admin.

-- -------------------------------------------------------------------------
-- 1. Column
-- -------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- -------------------------------------------------------------------------
-- 2. Admin can delete any flag
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "admin delete any flag" ON public.flags;
CREATE POLICY "admin delete any flag"
  ON public.flags FOR DELETE
  TO authenticated
  USING (
    (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid()))
  );

-- -------------------------------------------------------------------------
-- 3. Replace "users update own row" to lock is_admin against client writes.
--    The original policy (in schema.sql) had no WITH CHECK guard on is_admin.
--    This replacement adds the invariant: the new row's is_admin must equal
--    the stored value — a client cannot flip it in either direction.
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "users update own row" ON public.users;
CREATE POLICY "users update own row"
  ON public.users FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id
    AND is_admin IS NOT DISTINCT FROM
      (SELECT is_admin FROM public.users WHERE id = (SELECT auth.uid()))
  );
