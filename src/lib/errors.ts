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
export function errorMessage(e: unknown, fallback = 'Unknown error.'): string {
  if (e && typeof e === 'object' && 'message' in e) {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string' && m.length > 0) return m;
  }
  if (typeof e === 'string' && e.length > 0) return e;
  return fallback;
}
