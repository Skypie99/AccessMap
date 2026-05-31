// Analytics — no-PII event wrapper.
//
// Sentry was removed in Phase 5 (iOS 26 crash); re-wire to a real backend
// (PostHog, Amplitude, etc.) in Phase 6. Until then all functions are stubs
// that log to the Metro console in dev so callsites keep working unchanged.
//
// The PII guard (stripPII) stays — any future backend wiring must run through
// it before events leave the device.

// ---------------------------------------------------------------------------
// PII guard — the load-bearing part of this file.
// ---------------------------------------------------------------------------

const PII_EXACT_KEYS = new Set<string>([
  'lat',
  'lng',
  'latitude',
  'longitude',
  'coords',
  'coordinates',
  'name',
  'email',
  'content',
  'comment',
  'description',
  'address',
  'phone',
  'token',
  'secret',
  'password',
]);

const PII_SUBSTRINGS = [
  'user_id',
  'userid',
  'flag_id',
  'flagid',
  'display_name',
  'displayname',
  'username',
  'email',
  'description',
  'password',
  'secret',
];

function isPiiKey(key: string): boolean {
  const k = key.toLowerCase();
  if (PII_EXACT_KEYS.has(k)) return true;
  return PII_SUBSTRINGS.some((sub) => k.includes(sub));
}

/**
 * Return a copy of `props` containing only safe, primitive values:
 *   - keys that aren't on the PII denylist, and
 *   - values that are a string, number, or boolean.
 *
 * Exported so the unit tests can assert on the guard directly.
 */
export function stripPII(
  props: Record<string, unknown>,
): Record<string, string | number | boolean> {
  const safe: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(props)) {
    if (isPiiKey(key)) continue;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Bucket a comment's length so we can track engagement without logging
 * the comment text itself. Exported so comments.ts can reuse the exact bins.
 */
export function commentLengthBucket(length: number): 'short' | 'medium' | 'long' {
  if (length < 80) return 'short';
  if (length < 300) return 'medium';
  return 'long';
}

// ---------------------------------------------------------------------------
// Public API — stub implementations until Phase 6 wires a real backend.
// ---------------------------------------------------------------------------

export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  if (__DEV__) {
    const data = properties ? stripPII(properties) : {};
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, data);
  }
}

export function trackScreen(screenName: string): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] screen', screenName);
  }
}

export function trackError(error: Error, context?: Record<string, string>): void {
  if (__DEV__) {
    const safe = context ? stripPII(context) : {};
    // eslint-disable-next-line no-console
    console.log('[analytics] error', error.message, safe);
  }
}

// ---------------------------------------------------------------------------
// Legacy event catalog (kept for backward-compat).
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  | { name: 'flag_created'; props: { category: string; severity: number; hasPhoto: boolean } }
  | { name: 'flag_viewed'; props: { flagId: string; source: 'map' | 'tasks' } }
  | { name: 'flag_status_changed'; props: { flagId: string; from: string; to: string } }
  | { name: 'user_signed_in'; props: { method: 'email'; isNewUser: boolean } }
  | { name: 'push_notification_received'; props: { type: string } }
  | { name: 'tile_cache_hit'; props: { zoom: number } }
  | { name: 'tile_cache_miss'; props: { zoom: number } };

export function track<E extends AnalyticsEvent>(
  event: E['name'],
  props: Extract<AnalyticsEvent, { name: E['name'] }>['props'],
): void {
  trackEvent(event, props as unknown as Record<string, string | number | boolean>);
}

// ---------------------------------------------------------------------------
// User identity — intentionally not sent anywhere.
// ---------------------------------------------------------------------------

export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] identify (not sent — PII)', userId, traits);
  }
}

export function resetUser(): void {
  // No-op: nothing identifying was ever sent.
}
