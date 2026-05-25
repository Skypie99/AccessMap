-- AccessMap realtime publication migration
--
-- Adds public.flags to Supabase's default `supabase_realtime` publication so
-- INSERT / UPDATE / DELETE events are broadcast to subscribed clients. This
-- unblocks the "Realtime flag updates" feature in FEATURES.md.
--
-- =========================================================================
-- Sky: run this in the Supabase dashboard SQL editor (one button-press).
-- =========================================================================
--
-- Where to run:
--   Supabase Dashboard -> Project -> SQL Editor -> New query -> paste -> Run.
--
-- Or via the supabase CLI if you have it set up:
--   supabase db push  (if this file is in a tracked migrations folder)
--   psql "$SUPABASE_DB_URL" -f supabase/realtime.sql
--
-- Cost: ~1 second. Idempotent — the do-block below checks before adding.
--
-- =========================================================================
-- Team analysis (Morgan + Steve + Dana + Peter + Alex), 2026-05-23
-- =========================================================================
--
-- Steve (security/privacy):
--   - Supabase realtime respects RLS. The `flags readable by authenticated`
--     SELECT policy is `using (true)` for any authenticated user, so realtime
--     subscribers see the SAME rows REST already returns. No new data surface.
--   - `user_id` arriving in a realtime payload is identical exposure to
--     `select user_id from flags` over REST — that's an existing question
--     about pseudonymity, not a new one introduced by realtime.
--   - The bucket and storage policies are unaffected.
--
-- Dana (schema):
--   - One-line `ALTER PUBLICATION ... ADD TABLE` is the canonical Supabase
--     enable. Wrapped in a guard so it's safe to re-run.
--   - Rollback documented below — `DROP TABLE` from the publication.
--
-- Peter (performance):
--   - Negligible at expected concurrency (single-digit users).
--   - Supabase free tier covers 200 concurrent realtime connections.
--
-- Alex (a11y):
--   - No direct a11y impact. Future client-side wiring of incoming flags
--     should consider AccessibilityInfo.announceForAccessibility for mid-read
--     additions, but that's a screen-side concern, not a SQL one.
--
-- See qa-reports/decisions-2026-05-23-morgan.md Decision 2 for the full
-- role-by-role analysis.
-- =========================================================================

-- Add public.flags to the realtime publication if it's not already in it.
-- Wrapped in a do-block so re-running this file is a no-op.
do $$
declare
  is_published boolean;
begin
  select exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'flags'
  )
  into is_published;

  if not is_published then
    execute 'alter publication supabase_realtime add table public.flags';
    raise notice 'public.flags added to supabase_realtime publication.';
  else
    raise notice 'public.flags already in supabase_realtime publication; nothing to do.';
  end if;
end $$;

-- =========================================================================
-- Rollback (only if realtime needs to be turned off again):
-- =========================================================================
--
--   alter publication supabase_realtime drop table public.flags;
--
-- After the rollback runs, existing client subscriptions stop receiving
-- updates; they don't error. The client code falls back to its current
-- "fetch on focus" behavior.
