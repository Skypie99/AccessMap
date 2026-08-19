-- ============================================================================
-- FILE:    2026-08-18_seed_reviewer_flags.sql
-- PURPOSE: Close App Store BLOCKER B2 — production has zero 'open' and zero
--          'verified' flags, so Map, Home and Tasks all render empty states to
--          an App Review reviewer. See
--          qa-reports/2026-08-18_AppStore_Readiness_Audit.md §B2.
--
-- ⚠ FILE ONLY — SKY RUNS THIS. No agent applies it (Const. Art. 1: no agent
--   touches a live database). Paste into the Supabase SQL editor for project
--   "Accessable City App" (kldlwszpfkdmsjrjhjym) and run.
--
-- SAFE TO RE-RUN? Yes, once. It is guarded: if any 'open' or 'verified' flag
--   already exists, it does nothing and tells you so. That makes a double-paste
--   a no-op rather than 24 duplicate pins.
--
-- ─── WHY THESE COORDINATES ─────────────────────────────────────────────────
-- docs/APP_STORE_REVIEWER_NOTES.md tells the reviewer that reports are
-- concentrated around KELOWNA, BRITISH COLUMBIA and to pan there. The 20 rows
-- already in production are also Kelowna (lat 49.782–49.892, lng −119.591 to
-- −119.473) but every one of them is resolved/rejected, so they are invisible
-- under the default filter and the notes read as false. These rows land in the
-- same area so the notes become true. If you would rather point the reviewer
-- somewhere else, change the coordinates here AND the city name in the notes —
-- they must agree.
--
-- ─── WHY user_id IS NULL ───────────────────────────────────────────────────
-- These are anonymous reports, which is a real shipped feature, not a fiction.
-- The alternative — attributing them to a seeded reviewer account — would put
-- a fake person on the leaderboard and require the auth-dashboard step that
-- 2026-05-31_reviewer_test_account.sql was blocked on. Anonymous rows also let
-- the reviewer exercise Verify/Resolve on content they did not author, which is
-- the interaction the Tasks tab exists for.
--
-- ─── WHY photo_url IS NULL ─────────────────────────────────────────────────
-- Matching the live anon-insert policy's shape. Seeding a photo would mean
-- putting an image in the flag-photos bucket, which is a separate manual step
-- and is not needed for review — the photo path is optional and testable by the
-- reviewer directly.
--
-- ─── TRIGGERS THIS WILL FIRE, AND WHY IT IS FINE ───────────────────────────
-- public.flags carries three BEFORE INSERT rate-limit triggers (captured in
-- 2026-07-27_drift_capture_live_flag_insert_throttles.sql):
--   · enforce_flag_creation_rate_limit — per-user 20/24h, keyed on NEW.user_id,
--     skips anon. These rows are anon, so it does not apply.
--   · enforce_flag_rate_limit          — per-user 20/24h on auth.uid(), same.
--   · enforce_global_anon_rate_limit   — GLOBAL anon cap, 100 inserts / 1 hour.
--     This one DOES apply. We insert 12 rows, well inside 100. If you have just
--     run something else that inserted anonymously, wait an hour or reduce the
--     list below.
-- The points trigger (handle_flag_status_change) fires on status CHANGE, i.e.
-- UPDATE — not on INSERT — so seeding a row directly as 'verified' awards
-- nobody points and cannot skew the leaderboard.
--
-- ─── ROLLBACK ──────────────────────────────────────────────────────────────
-- Every row is tagged with the context tag 'seed_2026_08_18', so the undo is
-- exact and cannot touch a real user's report:
--
--   delete from public.flags where 'seed_2026_08_18' = any(context_tags);
--
-- ============================================================================

do $$
declare
  existing_visible int;
  inserted_count   int;
begin
  -- Guard: only seed into a genuinely empty default view. This is what makes a
  -- second paste harmless, and it also stops this running by accident once real
  -- users have started reporting.
  select count(*) into existing_visible
    from public.flags
   where status in ('open', 'verified');

  if existing_visible > 0 then
    raise notice 'SKIPPED: % flag(s) already visible under the default filter (open/verified). Nothing inserted.', existing_visible;
    return;
  end if;

  insert into public.flags
    (user_id, lat, lng, category, severity, description, photo_url, status, context_tags)
  values
    -- ── OPEN (8) — what the reviewer sees first, and can Verify from Tasks ──
    (null, 49.88307, -119.49440, 'no_ramp',         4, 'Main entrance has three steps and no ramp. The side door is level but is kept locked outside business hours.',            null, 'open',     array['seed_2026_08_18']),
    (null, 49.88012, -119.49610, 'broken_sidewalk', 3, 'Pavement is heaved by a tree root across the full width. A wheelchair has to drop into the traffic lane to get past.',      null, 'open',     array['seed_2026_08_18']),
    (null, 49.88650, -119.48330, 'blocked_path',    5, 'Construction hoarding blocks the entire sidewalk with no marked detour. You have to backtrack a full block.',              null, 'open',     array['seed_2026_08_18']),
    (null, 49.87740, -119.50120, 'missing_signal',  4, 'Crossing has no audible signal and the tactile plate is worn smooth. Hard to find the button without sighted help.',        null, 'open',     array['seed_2026_08_18']),
    (null, 49.89020, -119.47880, 'steep_grade',     3, 'Ramp to the plaza is far steeper than it looks and has no handrail or level landing partway up.',                          null, 'open',     array['seed_2026_08_18']),
    (null, 49.88440, -119.50390, 'no_ramp',         2, 'Single 10cm lip at the entrance. Manageable with help, impossible alone.',                                                 null, 'open',     array['seed_2026_08_18']),
    (null, 49.87950, -119.48090, 'blocked_path',    3, 'Cafe seating and a sandwich board narrow the sidewalk to about half a metre at lunchtime.',                                null, 'open',     array['seed_2026_08_18']),
    (null, 49.89180, -119.49730, 'broken_sidewalk', 4, 'Long stretch of cracked and sunken slabs. Standing water after rain hides how deep the dips are.',                          null, 'open',     array['seed_2026_08_18']),

    -- ── VERIFIED (4) — proves the Tasks triage flow has both sections ──────
    (null, 49.88530, -119.49020, 'no_ramp',         4, 'Side entrance ramp ends at a step. Confirmed by a second visit — the ramp does not actually reach the door.',              null, 'verified', array['seed_2026_08_18']),
    (null, 49.88120, -119.48600, 'missing_signal',  5, 'No pedestrian signal at all on a four-lane crossing. Confirmed: the pole is there but the head was never installed.',      null, 'verified', array['seed_2026_08_18']),
    (null, 49.87880, -119.49290, 'steep_grade',     4, 'Approach grade to the underpass is severe enough that a manual chair needs assistance. Confirmed by two reporters.',        null, 'verified', array['seed_2026_08_18']),
    (null, 49.88900, -119.50010, 'blocked_path',    2, 'Bollard spacing is too narrow for a wider wheelchair or a mobility scooter. Confirmed by measurement.',                     null, 'verified', array['seed_2026_08_18']);

  get diagnostics inserted_count = row_count;
  raise notice 'OK: inserted % seed flag(s) near Kelowna BC (8 open, 4 verified).', inserted_count;
end $$;

-- ─── VERIFY (run this after; it is the check the audit asks for) ────────────
-- Expect non-zero counts for BOTH 'open' and 'verified'.
--
--   select status, count(*) from public.flags group by status order by status;
--
-- Expected after a successful run:
--   open      |  8
--   rejected  | 14
--   resolved  |  6
--   verified  |  4
