-- Reconstructed 2026-05-31 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260531015456, hosted name "flag_reopen_requests".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.

-- =============================================================================
-- APPROVED — Option A (per-cycle reset). Sky approved 2026-05-30.
-- =============================================================================
--
-- FILE:    2026-05-30_flag_reopen_requests.sql
-- AUTHOR:  Dana (data engineering, 2026-05-30)
-- FEATURE: F10 — Flag Reopen Mechanism
-- STATUS:  APPROVED — Option A (per-cycle reset); applied 2026-05-30

-- -----------------------------------------------------------------------------
-- 1. Add reopen_requests counter + reset timestamp to public.flags
-- -----------------------------------------------------------------------------
ALTER TABLE public.flags
  ADD COLUMN IF NOT EXISTS reopen_requests        integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopen_requests_reset_at timestamptz;


-- -----------------------------------------------------------------------------
-- 2. RPC: increment_reopen_request(p_flag_id uuid) → integer
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.increment_reopen_request(p_flag_id uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_new_count integer;
BEGIN
  UPDATE public.flags
    SET reopen_requests = reopen_requests + 1
    WHERE id = p_flag_id
      AND status = 'resolved'
    RETURNING reopen_requests INTO v_new_count;

  RETURN COALESCE(v_new_count, 0);
END;
$$;

-- Revoke from public/anon; grant only to authenticated.
REVOKE EXECUTE ON FUNCTION public.increment_reopen_request(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.increment_reopen_request(uuid) TO authenticated;

COMMENT ON FUNCTION public.increment_reopen_request(uuid) IS
  'F10: Atomically increments the reopen_requests counter on a resolved flag. '
  'SECURITY DEFINER — no user_id stored (Jordan privacy requirement). '
  'Returns the new counter value, or 0 if the flag was not in resolved status.';


-- -----------------------------------------------------------------------------
-- 3. Trigger: reset counter when a flag transitions back to 'open'
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_flag_reopen_reset()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'resolved' AND NEW.status = 'open' THEN
    NEW.reopen_requests          := 0;
    NEW.reopen_requests_reset_at := now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger-only function: not callable directly via the REST API.
REVOKE EXECUTE ON FUNCTION public.handle_flag_reopen_reset() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_reopen_reset ON public.flags;
CREATE TRIGGER on_flag_reopen_reset
  BEFORE UPDATE OF status ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_flag_reopen_reset();

COMMENT ON FUNCTION public.handle_flag_reopen_reset() IS
  'F10: Resets reopen_requests to 0 and stamps reopen_requests_reset_at '
  'whenever a flag transitions from resolved → open. Trigger-only; not '
  'directly callable via REST API.';


-- -----------------------------------------------------------------------------
-- 4. Index: speed up threshold checks
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS flags_reopen_requests_idx
  ON public.flags (reopen_requests)
  WHERE status = 'resolved';
