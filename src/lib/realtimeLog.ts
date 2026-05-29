/**
 * D4: Realtime observability RPC wrapper (Safeguard #3).
 *
 * Typed wrapper around `supabase.rpc('log_realtime_event', ...)`.
 * Call on subscribe and unsubscribe to record client intent in the
 * `realtime_subscribe_log` table (server-side, auth-gated).
 *
 * Degrades gracefully: if the table/function has not yet been applied to
 * the database (the D4 SQL is applied by Sky, not automatically), the RPC
 * call will return a PostgREST error. We console.warn and swallow it so
 * subscribe/unsubscribe flows are never blocked by missing observability
 * infrastructure.
 */

import { supabase } from './supabase';

/**
 * Log a realtime subscribe or unsubscribe event to the observability table.
 * Fire-and-forget — callers do not need to await this; failure is non-fatal.
 */
export async function logRealtimeEvent(
  event: 'subscribe' | 'unsubscribe',
  channel: string,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('log_realtime_event', {
      p_event: event,
      p_channel: channel,
    });
    if (error) {
      // Expected before D4 SQL is applied (function does not exist yet).
      // After apply, this should be silent.
      console.warn('[D4] logRealtimeEvent RPC error:', error.message);
    }
  } catch (e) {
    console.warn('[D4] logRealtimeEvent unexpected error:', e);
  }
}
