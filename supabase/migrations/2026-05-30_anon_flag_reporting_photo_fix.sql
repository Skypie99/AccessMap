-- ===========================================================================
-- 2026-05-30 — Secure anon INSERT policy: block photo_url injection
-- Author: Steve (Security) — see qa-reports for context
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     dashboard after reviewing. The agent system NEVER writes to the
--     live DB (Const. Art. 5.3). !!!
--
-- ---------------------------------------------------------------------------
-- SECURITY ISSUE
-- ---------------------------------------------------------------------------
--
-- An anon INSERT policy on public.flags without a photo_url constraint allows
-- any unauthenticated client to set photo_url to an arbitrary URL. This would
-- inject attacker-controlled image content into the public accessibility map,
-- enabling phishing imagery, offensive content, or SSRF-via-preview attacks.
--
-- Storage RLS (flag-photos bucket) already enforces that *uploads* require
-- auth.uid() in the path prefix — but that guard only applies to bucket
-- uploads. The photo_url column itself is free text. Without this fix, an
-- anon client can INSERT a flag with:
--   photo_url = 'https://attacker.com/evil.jpg'
-- bypassing Storage RLS entirely.
--
-- ---------------------------------------------------------------------------
-- FIX
-- ---------------------------------------------------------------------------
--
-- The anon INSERT WITH CHECK clause must include:
--   AND (photo_url IS NULL)
--
-- This ensures anon-created flags are always photo-free. Authenticated users
-- who want to attach a photo must sign in; the "flags insert own" policy
-- (which does not restrict photo_url) handles that path.
--
-- The user_id IS NULL constraint prevents anon users from claiming authorship
-- of a flag row belonging to another account. (auth.uid() is NULL under the
-- anon role — any non-NULL user_id would be a spoofed value.)
--
-- ---------------------------------------------------------------------------
-- PREREQUISITES
-- ---------------------------------------------------------------------------
--
-- public.flags.user_id must be nullable before this policy can permit rows
-- with user_id = NULL. Apply 2026-05-29_account_deletion_cascade.sql first:
--
--   ALTER TABLE public.flags ALTER COLUMN user_id DROP NOT NULL;
--
-- If that migration has not yet been applied, anon INSERTs will fail with
-- a NOT NULL constraint violation (not an RLS error). Apply it first.
--
-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--
--   drop policy if exists "flags anon insert" on public.flags;
--
--   After rollback, all anon INSERTs are implicitly denied (PostgREST
--   default-deny). Anonymous flag reporting will stop working. The
--   authenticated "flags insert own" policy is unaffected.
--
-- ---------------------------------------------------------------------------
-- IDEMPOTENT — safe to run twice (drop-if-exists / create).
-- ---------------------------------------------------------------------------
--
-- =========================================================================
-- HOW TO APPLY (Sky)
-- =========================================================================
--
-- 1. Confirm 2026-05-29_account_deletion_cascade.sql has been applied
--    (flags.user_id must be nullable). Check with:
--      select is_nullable
--      from information_schema.columns
--      where table_schema = 'public'
--        and table_name   = 'flags'
--        and column_name  = 'user_id';
--    Expected result: 'YES'
--
-- 2. Supabase Dashboard → Project → SQL Editor → New query →
--    paste this WHOLE file → Run.
--
-- 3. Smoke test:
--    a. As an authenticated user, report a flag with a photo — should succeed.
--    b. As an anon user (guest mode), report a flag — should succeed with
--       photo_url = NULL in the inserted row.
--    c. In Supabase → Table Editor → flags → manually attempt an anon INSERT
--       with photo_url = 'https://example.com/test.jpg' — should be rejected
--       by the WITH CHECK clause.
--
-- =========================================================================

-- Drop the policy whether it exists from a prior apply or from the (never-
-- committed) base migration being applied manually on the live DB.
drop policy if exists "flags anon insert" on public.flags;

-- Recreate with both guards:
--   1. user_id IS NULL  — anon users cannot claim authorship of any account
--   2. photo_url IS NULL — anon users cannot inject arbitrary image URLs
create policy "flags anon insert"
  on public.flags for insert
  to anon
  with check (
    user_id  is null
    and photo_url is null
  );

-- ===========================================================================
-- End of file.
-- ===========================================================================
