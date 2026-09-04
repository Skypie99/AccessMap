-- Reconstructed 2026-05-30 (repair applied 2026-08-28) from the hosted Supabase migration ledger
-- (supabase_migrations.schema_migrations), version 20260530064949, hosted name "flag_creation_rate_limit".
-- This file REPLACES a prior managed migration at this version whose content did not
-- match the hosted-recorded SQL. The prior artifact is preserved under
-- supabase/nonmanaged/ (see qa-reports/2026-08-28_MigrationMapRepair_Evidence.md for
-- the classification). Below is the exact hosted-recorded SQL, verbatim.


-- Rate limit: max 20 flags per user per 24 hours
-- Prevents spam and abuse at the database level

CREATE OR REPLACE FUNCTION check_flag_creation_rate_limit()
RETURNS trigger AS $$
DECLARE
  flag_count integer;
  rate_limit constant integer := 20;
BEGIN
  -- Only apply to authenticated users (not anonymous)
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*)
  INTO flag_count
  FROM public.flags
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - INTERVAL '24 hours';

  IF flag_count >= rate_limit THEN
    RAISE EXCEPTION 'Rate limit exceeded: you can only create % flags per 24-hour period. Try again later.', rate_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_flag_creation_rate_limit ON public.flags;
CREATE TRIGGER enforce_flag_creation_rate_limit
  BEFORE INSERT ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION check_flag_creation_rate_limit();
