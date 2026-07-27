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
 * THIS FEATURE IS OFF. The migration is banked but NOT applied — verified
 * read-only against the live database on 2026-07-26: `public.flags` has no
 * `dispute_requests` column and no `increment_dispute_request` function.
 * Fork discipline: an agent writes the artifact, Sky applies it.
 *
 * To turn it on: apply
 * `supabase/migrations/2026-07-16_fork5_dispute_counter_PROPOSED.sql`, then
 * flip DISPUTE_ENABLED below. A guard test asserts it is `false`, so that flip
 * is a deliberate two-line change that cannot happen by accident.
 * ─────────────────────────────────────────────────────────────────────────
 */
import { supabase } from './supabase';

/**
 * Master gate for the dispute affordance.
 *
 * A capability probe would be the more elegant shape, but it is the wrong one
 * here: `dispute_requests` does not exist, so adding it to the flag select
 * would make PostgREST 42703 the WHOLE flag fetch and take the map down with
 * it. An explicit constant fails safe and costs one line to retire.
 */
export const DISPUTE_ENABLED = false;

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
  // Cast through `any` (the comments.ts idiom): `increment_dispute_request` is
  // absent from the generated Functions union in database.ts because it is
  // absent from the database. That compile error is the type system correctly
  // reporting the fork state — the cast is how the client half ships ahead of
  // the migration, and it retires when the types are regenerated after Sky
  // applies it.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc('increment_dispute_request', {
    p_flag_id: flagId,
  });
  if (error) {
    const code = (error as { code?: string }).code;
    // PGRST202 = function not in the schema cache; 42883 = undefined function.
    if (code === 'PGRST202' || code === '42883') {
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
