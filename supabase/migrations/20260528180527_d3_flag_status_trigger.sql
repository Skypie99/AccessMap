-- Reconstructed 2026-05-28 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260528180527, hosted name "d3_flag_status_trigger".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

CREATE OR REPLACE FUNCTION public.handle_flag_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'verified' AND OLD.status = 'open' THEN
    UPDATE public.user_profiles
    SET points = points + 10
    WHERE user_id = NEW.user_id;
  END IF;

  IF NEW.status = 'resolved' AND OLD.status = 'verified' THEN
    UPDATE public.user_profiles
    SET points = points + 5
    WHERE user_id = NEW.user_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_flag_status_change
  AFTER UPDATE OF status ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_flag_status_change();
