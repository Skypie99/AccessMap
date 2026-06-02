-- ===========================================================================
-- 2026-06-01 — Remove over-broad leftover RLS policies on public.flags
-- Author: Steve (Security) — final pre-tester audit
-- Finding F1 (HIGH). See qa-reports/2026-06-01_Security_Robustness_QA_Report.md
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     SQL Editor after reviewing. The agent system NEVER writes to the live
--     DB (Const. Art. 5.3). This file changes RLS — review carefully. !!!
--
-- ---------------------------------------------------------------------------
-- THE GAP (verified live via pg_policies on 2026-06-01)
-- ---------------------------------------------------------------------------
--
-- public.flags has accumulated overlapping permissive policies across many
-- migrations. Two leftovers defeat the intended least-privilege model.
-- Permissive policies are OR'd, so the LOOSEST policy wins:
--
--   1. policy "flags_auth_user_only"   FOR ALL  TO public
--        USING      (auth.uid() IS NOT NULL)
--        WITH CHECK (auth.uid() IS NOT NULL)
--
--      This grants ANY signed-in user full CRUD on EVERY flag. It overrides
--      "flags owner edit open", "flags status update by any authenticated",
--      "flags delete own", and "flags insert own". Concretely, a signed-in
--      attacker (or any tester) can:
--        - UPDATE any flag's lat/lng/category/description (vandalism; for a
--          wheelchair-routing app, moving a barrier pin is a SAFETY issue),
--        - DELETE any flag (data loss),
--        - INSERT a flag with a spoofed user_id (impersonation; also misroutes
--          the points trigger, which awards on new.user_id).
--
--   2. policy "flags insert anon"  FOR INSERT TO anon
--        WITH CHECK (user_id IS NULL AND status = 'open')
--
--      This older anon-insert policy does NOT constrain photo_url, so it
--      RE-OPENS the arbitrary-image-URL injection that
--      2026-05-30_anon_flag_reporting_photo_fix.sql ("flags anon insert",
--      WITH CHECK user_id IS NULL AND photo_url IS NULL) was applied to close.
--      With both present, anon can inject photo_url as long as status='open'.
--
-- The correct, intended policy set (kept):
--   SELECT  : "flags readable by authenticated" (auth) + "flags readable by anon" (anon)
--   INSERT  : "flags insert own" (auth, user_id = auth.uid())
--             "flags anon insert" (anon — hardened below to pin user_id+photo_url+status)
--   UPDATE  : "flags owner edit open" (owner) + "flags status update by any authenticated" (non-owner, status only)
--   DELETE  : "flags delete own" (owner)
--   plus    : "flags_user_scoped" (FOR ALL, owner-scoped: user_id = auth.uid()) — redundant but
--             HARMLESS (owner-only). Left in place as a safety net; optional future cleanup.
--
-- ---------------------------------------------------------------------------
-- THE FIX
-- ---------------------------------------------------------------------------

-- 1. Remove the over-broad "any signed-in user" policy.
drop policy if exists "flags_auth_user_only" on public.flags;

-- 2. Collapse the two anon INSERT policies into ONE hardened policy that pins
--    all three invariants: no spoofed author, no photo injection, status open.
drop policy if exists "flags insert anon" on public.flags;
drop policy if exists "flags anon insert" on public.flags;

create policy "flags anon insert"
  on public.flags for insert
  to anon
  with check (
    user_id   is null
    and photo_url is null
    and status   = 'open'
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK (restores the exact prior live state)
-- ---------------------------------------------------------------------------
--   create policy "flags_auth_user_only" on public.flags
--     for all to public
--     using (auth.uid() is not null)
--     with check (auth.uid() is not null);
--
--   drop policy if exists "flags anon insert" on public.flags;
--   create policy "flags insert anon" on public.flags
--     for insert to anon
--     with check (user_id is null and status = 'open');
--   create policy "flags anon insert" on public.flags
--     for insert to anon
--     with check (user_id is null and photo_url is null);
--
-- ---------------------------------------------------------------------------
-- HOW TO APPLY (Sky) + SMOKE TEST — run AFTER applying
-- ---------------------------------------------------------------------------
-- Paste this whole file in Supabase → SQL Editor → Run. Instant, no locks.
-- Then verify with two signed-in test accounts A (owner) and B (non-owner):
--   1. B UPDATEs A's flag description  -> MUST be rejected (RLS).
--   2. B UPDATEs A's flag status only  -> MUST succeed (triage flow intact).
--   3. B DELETEs A's flag              -> MUST be rejected.
--   4. A edits/deletes A's own flag    -> MUST succeed.
--   5. B INSERTs a flag with user_id = A's id -> MUST be rejected.
--   6. As anon (guest), INSERT a flag with photo_url='https://x/y.jpg'
--                                      -> MUST be rejected; with photo_url NULL,
--                                         user_id NULL, status 'open' -> succeeds.
-- If any "MUST be rejected" step succeeds, STOP and roll back.
-- ===========================================================================
