-- PROPOSE-ONLY — Sky applies this via the Supabase SQL Editor. The agent
-- system never applies migrations to the live database (Constitution Art. 5).
--
-- Adds DB-level CHECK constraints so latitude/longitude on public.flags can
-- only hold geographically valid values:
--   * lat between -90 and 90
--   * lng between -180 and 180
--
-- WHY (defense-in-depth):
-- The client already validates coordinates at the trust boundary in
-- src/lib/flags.ts (createFlag, ~line 540: rejects non-finite and out-of-range
-- lat/lng before the insert). That guards the normal app path, but a direct
-- SQL insert, a future code path, a test fixture, or a different client could
-- still write garbage straight to the table. A DB constraint is the last line
-- of defense and makes the invariant true regardless of who is writing.
--
-- Idempotent: drops the constraints first (IF EXISTS) so re-running is safe.
-- This pattern also lets the migration double as the "update" path if the
-- bounds ever change — edit the predicate and re-run.
--
-- NOTE: this will fail if existing rows already violate the bounds. Given the
-- client-side guard has been in place, no such rows are expected, but if the
-- ALTER errors with a check-violation, inspect the offending rows first:
--   SELECT id, lat, lng FROM public.flags
--   WHERE lat < -90 OR lat > 90 OR lng < -180 OR lng > 180;
--
-- Rollback (if needed):
--   ALTER TABLE public.flags DROP CONSTRAINT IF EXISTS flags_lat_range_chk;
--   ALTER TABLE public.flags DROP CONSTRAINT IF EXISTS flags_lng_range_chk;

-- Latitude: valid range is -90 .. 90 degrees.
ALTER TABLE public.flags DROP CONSTRAINT IF EXISTS flags_lat_range_chk;
ALTER TABLE public.flags
  ADD CONSTRAINT flags_lat_range_chk
  CHECK (lat >= -90 AND lat <= 90);

-- Longitude: valid range is -180 .. 180 degrees.
ALTER TABLE public.flags DROP CONSTRAINT IF EXISTS flags_lng_range_chk;
ALTER TABLE public.flags
  ADD CONSTRAINT flags_lng_range_chk
  CHECK (lng >= -180 AND lng <= 180);

COMMENT ON CONSTRAINT flags_lat_range_chk ON public.flags IS
  'Defense-in-depth: latitude must be between -90 and 90. Mirrors client-side check in src/lib/flags.ts createFlag().';
COMMENT ON CONSTRAINT flags_lng_range_chk ON public.flags IS
  'Defense-in-depth: longitude must be between -180 and 180. Mirrors client-side check in src/lib/flags.ts createFlag().';
