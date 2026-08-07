/**
 * Fork 5 / W1 — the "flag as wrong" dispute counter.
 *
 * A light signal of doubt that does NOT flip a flag's status: it fills the gap
 * between doing nothing and a unilateral Reject. Data shape mirrors F10's
 * reopen counter exactly — an aggregate integer on `flags`, incremented
 * through a SECURITY DEFINER RPC that stores NO user_id, ever (Jordan's hard
 * condition: a user<->location linkage would enable pattern-of-life
 * inference). Dedup is therefore client-side and per-cycle, the same soft
 * enforcement F10 accepted, bounded here by account friction since only
 * authenticated users may call the RPC.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THIS FEATURE IS ON as of 2026-07-27. Sky applied the migration in the
 * supervised Phase-3 prep slate — ledger `fork5_w1_dispute_counter_20260727`
 * — and triggered the flip below in the same session. Verified live at apply
 * time: `public.flags` carries `dispute_requests` + `dispute_requests_reset_at`,
 * `increment_dispute_request(uuid)` exists and is granted to `authenticated`
 * only, and the `on_flag_dispute_reset` trigger is in place.
 *
 * The guard test now asserts DISPUTE_ENABLED is `true`. It is a tripwire, not
 * a preference: this constant must match live migration state, and the test
 * fires if either side moves without the other.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase';
import { isFunctionMissing } from './postgrestErrors';

/**
 * Master gate for the dispute affordance.
 *
 * A capability probe would be the more elegant shape, but it was the wrong one
 * while the column was absent: adding `dispute_requests` to the flag select
 * would have made PostgREST 42703 the WHOLE flag fetch and taken the map down
 * with it. The explicit constant failed safe through the fork window; the
 * column now exists, so the hazard that motivated it is gone.
 */
export const DISPUTE_ENABLED = true;

/** The threshold at which a flag wears the additive `Disputed` treatment. */
export const DISPUTE_THRESHOLD = 2;

/**
 * Record doubt about a flag. Returns the new count, or `null` when the
 * migration has not been applied.
 *
 * The error discipline is copied deliberately from `requestFlagReopen`
 * (flags.ts) and the reason is recorded there in blood: collapsing every error
 * to null once made the UI show a success-sounding message for a vote that
 * never reached the server. ONLY "the function does not exist" degrades to
 * null. Everything else — network, RLS, timeout — throws, so the caller shows
 * an honest failure.
 */
export async function requestFlagDispute(flagId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('increment_dispute_request', {
    p_flag_id: flagId,
  });
  if (error) {
    if (isFunctionMissing(error)) {
      console.warn(
        '[dispute] increment_dispute_request RPC missing (migration not applied):',
        error.message,
      );
      return null;
    }
    throw error;
  }
  return typeof data === 'number' ? data : null;
}
