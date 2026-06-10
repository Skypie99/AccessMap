/**
 * Tiny error-shaping helper used by every catch block in the app.
 *
 * Across the codebase we kept writing the same line:
 *
 *   catch (e: any) { Alert.alert('…', e?.message ?? 'Unknown error.'); }
 *
 * That works but it's noisy and it had small drift over time — some sites
 * used 'Unknown error.', others 'Unknown error', a couple omitted the
 * fallback entirely. This helper is the single place that decides what
 * the user-visible string looks like when something blows up, so the
 * voice stays consistent.
 *
 * Why `unknown` instead of `any`: Promise rejection values aren't
 * guaranteed to be Error objects (Supabase sometimes throws plain
 * objects), and `unknown` forces us to type-narrow defensively.
 */

// User-facing copy for the failure shapes we can recognize. Centralized here
// so all ~98 errorMessage() call sites pick up the friendly wording for free.
const FEATURE_UNAVAILABLE = "That feature isn't available yet.";
const ITEM_NOT_FOUND = "That item couldn't be found. It may have been deleted.";
const NO_PERMISSION = "You don't have permission to do that.";
const NETWORK_TROUBLE = 'Check your internet connection and try again.';

// Postgres/PostgREST error codes that mean "the backend doesn't have this
// table/function/column yet" — i.e. a migration hasn't been applied.
//   42P01    undefined_table
//   42883    undefined_function
//   PGRST202 function not found in schema cache
//   PGRST204 column not found in schema cache
const MISSING_FEATURE_CODES = new Set(['42P01', '42883', 'PGRST202', 'PGRST204']);

// Keep the network regex NARROW (the exact phrases fetch/React Native emit).
// A bare /network/i would swallow legitimate messages like 'network down'
// that callers expect to pass through untouched.
const NETWORK_RE = /failed to fetch|network request failed|networkerror/i;
const PERMISSION_RE = /violates row-level security|permission denied/i;
const MISSING_RE = /does not exist/i;

/**
 * Map a recognized Supabase/Postgres/network failure to friendly copy.
 * Returns null when the error isn't one we recognize — callers then fall
 * through to the raw message exactly as before. Codes win over message text.
 */
function friendlyMessage(code: string, msg: string): string | null {
  if (MISSING_FEATURE_CODES.has(code)) return FEATURE_UNAVAILABLE;
  if (code === 'PGRST116') return ITEM_NOT_FOUND; // zero rows when one was expected
  if (code === '42501') return NO_PERMISSION; // insufficient_privilege
  if (NETWORK_RE.test(msg)) return NETWORK_TROUBLE;
  if (PERMISSION_RE.test(msg)) return NO_PERMISSION;
  if (MISSING_RE.test(msg)) return FEATURE_UNAVAILABLE;
  return null;
}

export function errorMessage(e: unknown, fallback = 'Unknown error.'): string {
  let code = '';
  if (e && typeof e === 'object' && 'code' in e) {
    const c = (e as { code?: unknown }).code;
    if (typeof c === 'string') code = c;
  }
  let raw = '';
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') raw = m;
  } else if (typeof e === 'string') {
    raw = e;
  }

  // Friendly mapping first; unmatched errors keep the original behavior
  // (raw message preserved — no blanket generic).
  const friendly = friendlyMessage(code, raw);
  if (friendly) return friendly;

  if (raw.length > 0) return raw;
  return fallback;
}
