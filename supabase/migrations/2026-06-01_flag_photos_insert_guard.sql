-- ===========================================================================
-- 2026-06-01 — Stop arbitrary-URL injection into public.flag_photos
-- Author: Steve (Security) — final pre-tester audit
-- Finding F3 (MED). See qa-reports/2026-06-01_Security_Robustness_QA_Report.md
-- ===========================================================================
--
-- !!! PROPOSE-ONLY — DO NOT APPLY YET. Sky applies this in the Supabase
--     SQL Editor after reviewing. The agent system NEVER writes to the live
--     DB (Const. Art. 5.3). !!!
--
-- ---------------------------------------------------------------------------
-- THE GAP (verified live via get_advisors + pg_policies on 2026-06-01)
-- ---------------------------------------------------------------------------
--
-- The flag_photos junction (applied 2026-05-31) has:
--
--   policy "flag_photos: authenticated insert" FOR INSERT TO authenticated
--     WITH CHECK (true)
--
-- Supabase's linter flags this (rls_policy_always_true): any authenticated
-- user can INSERT a row linking ANY flag_id to ANY url string. The design
-- note assumed Storage RLS anchors the URL to the uploader — but Storage RLS
-- only governs bucket UPLOADS, not the free-text `url` column. So an
-- authenticated client can attach 'https://attacker.com/evil.jpg' (or another
-- user's photo) to any flag: content injection / phishing imagery on the
-- public accessibility map. This is the same class as the anon photo_url
-- injection already closed for single-photo flags.
--
-- ---------------------------------------------------------------------------
-- THE FIX
-- ---------------------------------------------------------------------------
--
-- Require the inserted `url` to point inside the caller's OWN storage folder,
-- i.e. contain `/flag-photos/<auth.uid>/`. This ties each junction row to a
-- file the caller actually owns (Storage RLS guarantees only they could have
-- uploaded there), while preserving the community model: any signed-in user
-- may still add THEIR OWN photo to any flag — they just can't reference
-- someone else's file or an arbitrary external URL.

drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;

create policy "flag_photos: authenticated insert"
  on public.flag_photos for insert
  to authenticated
  with check (
    position('/flag-photos/' || (select auth.uid())::text || '/' in url) > 0
  );

-- ---------------------------------------------------------------------------
-- ROLLBACK
-- ---------------------------------------------------------------------------
--   drop policy if exists "flag_photos: authenticated insert" on public.flag_photos;
--   create policy "flag_photos: authenticated insert"
--     on public.flag_photos for insert to authenticated with check (true);
--
-- ---------------------------------------------------------------------------
-- HOW TO APPLY (Sky) + SMOKE TEST
-- ---------------------------------------------------------------------------
-- Paste in Supabase → SQL Editor → Run (instant, no locks). Then verify:
--   1. As a signed-in user, add a photo to a flag via the multi-photo UI
--      (PhotoGallery) — the uploaded URL is under your own folder -> succeeds.
--   2. In Table Editor, attempt to INSERT a flag_photos row with
--      url='https://example.com/x.jpg' -> MUST be rejected by WITH CHECK.
--   3. Re-run get_advisors (security) — the rls_policy_always_true lint for
--      flag_photos should clear.
-- NOTE: src/lib/photos.ts already tolerates this table being absent (42P01);
-- this policy change is transparent to the client.
-- ===========================================================================
