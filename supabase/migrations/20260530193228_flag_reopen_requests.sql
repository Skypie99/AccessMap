-- Reconstructed 2026-05-30 (migration-history truth repair, 2026-08-28) from the hosted Supabase migration
-- ledger (supabase_migrations.schema_migrations), version 20260530193228, hosted name "flag_reopen_requests".
-- This version previously had no local managed migration file. Below is the exact
-- hosted-recorded SQL, verbatim.


-- F10: Flag Reopen Mechanism (Option A — per-cycle reset, Sky approved 2026-05-30)
-- Privacy: no user_id stored for reopen votes (Jordan hard-requirement)
-- Security: SECURITY DEFINER + SET search_path on all functions (Steve hardening)

ALTER TABLE public.flags
  ADD COLUMN IF NOT EXISTS reopen_requests          integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reopen_requests_reset_at timestamptz;

-- RPC: increment counter atomically
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
    WHERE id = p_flag_id AND status = 'resolved'
    RETURNING reopen_requests INTO v_new_count;
  RETURN COALESCE(v_new_count, 0);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_reopen_request(uuid) FROM public, anon;
GRANT  EXECUTE ON FUNCTION public.increment_reopen_request(uuid) TO authenticated;

-- Trigger: reset counter when flag goes resolved → open (per-cycle reset, Option A)
-- Why BEFORE (not AFTER)? This function modifies NEW.reopen_requests and
-- NEW.reopen_requests_reset_at, which is only valid in a BEFORE trigger.
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

REVOKE EXECUTE ON FUNCTION public.handle_flag_reopen_reset() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS on_flag_reopen_reset ON public.flags;
CREATE TRIGGER on_flag_reopen_reset
  BEFORE UPDATE OF status ON public.flags
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_flag_reopen_reset();

-- Index for threshold queries: flags WHERE status = 'resolved' AND reopen_requests >= N
CREATE INDEX IF NOT EXISTS flags_reopen_requests_idx
  ON public.flags (reopen_requests)
  WHERE status = 'resolved';
