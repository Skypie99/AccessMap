// Analytics — a thin, no-PII wrapper over Sentry.
//
// Sprint 3 (Phase 5, Item 5): rather than add a second vendor (Amplitude /
// Mixpanel / PostHog), we ride on the Sentry SDK that's already wired up in
// src/lib/sentry.ts. Product events become Sentry *breadcrumbs* (so an error
// report carries "what the user did right before it broke") and the current
// screen becomes a Sentry *tag*.
//
// Why a wrapper at all: it's the single chokepoint where the "never log PII"
// rule is enforced in code. Every event flows through stripPII() below, so a
// callsite that accidentally passes user_id / flag_id / lat / lng / a name /
// free text has that field dropped before it ever leaves the device. Swap the
// backend here later (PostHog, etc.) without touching a single callsite.
//
// Everything here is synchronous and makes no network calls of its own —
// Sentry batches and flushes on its own schedule.

import { Sentry } from './sentry';

// ---------------------------------------------------------------------------
// PII guard — the load-bearing part of this file.
// ---------------------------------------------------------------------------

// Keys we drop no matter what. Two lists so we don't accidentally over-strip:
//
//  - EXACT: short, ambiguous names that would cause false positives as a
//    substring. e.g. matching the substring "lat" would wrongly strip
//    "platform"; matching "name" everywhere is fine, but "lat"/"lng" must be
//    whole-key only.
//  - SUBSTRING: long, unambiguous PII names that are safe to match anywhere
//    in a key (e.g. "user_id" inside "reporter_user_id").
//
// NOTE: "comment_length_bucket" deliberately survives — we match the exact key
// "comment"/"content" (the raw text), never the substring, so the length
// *bucket* is allowed through.
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
 *   - values that are a string, number, or boolean (objects / arrays / null /
 *     functions are dropped — they're a common way for nested PII to sneak in).
 *
 * Exported so the unit tests can assert the guard directly.
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
 * Bucket a comment's length so we can track engagement without ever logging
 * the comment text itself. Exported so comments.ts can reuse the exact bins.
 */
export function commentLengthBucket(length: number): 'short' | 'medium' | 'long' {
  if (length < 80) return 'short';
  if (length < 300) return 'medium';
  return 'long';
}

// ---------------------------------------------------------------------------
// Public API — the three functions every callsite uses.
// ---------------------------------------------------------------------------

/**
 * Record a product event as a Sentry breadcrumb. Properties are PII-scrubbed
 * before they leave the device.
 *
 * Only pass non-PII attributes: flag_category, flag_severity, photo_count,
 * comment_length_bucket, platform, etc. NEVER pass user_id, flag_id, lat/lng,
 * description text, or display_name — stripPII() will drop them, but don't
 * rely on that as a license to pass them.
 */
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean>,
): void {
  const data = properties ? stripPII(properties) : undefined;

  Sentry.addBreadcrumb({
    category: 'analytics',
    type: 'default',
    level: 'info',
    message: name,
    data,
  });

  if (__DEV__) {
    // Visible in the Metro console during local dev so you can confirm events fire.
    // eslint-disable-next-line no-console
    console.log('[analytics]', name, data ?? {});
  }
}

/**
 * Record which screen the user is on. Stored as a Sentry tag so error reports
 * are attributable to a screen, plus a navigation breadcrumb for the trail.
 * The screen name is a static route label (e.g. "Map") — never user content.
 */
export function trackScreen(screenName: string): void {
  Sentry.setTag('screen', screenName);
  Sentry.addBreadcrumb({
    category: 'navigation',
    type: 'navigation',
    level: 'info',
    message: screenName,
  });

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] screen', screenName);
  }
}

/**
 * Report a handled error to Sentry with optional, PII-scrubbed context.
 *
 * NOTE: this forwards the Error as-is. If an error *message* could itself
 * contain PII, that's scrubbed by Sentry's `beforeSend` config (a separate,
 * Jordan-reviewable concern — see PHASE5_STRATEGY §4), not here.
 */
export function trackError(error: Error, context?: Record<string, string>): void {
  const safe = context ? stripPII(context) : undefined;
  Sentry.captureException(error, safe ? { extra: safe } : undefined);

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[analytics] error', error.message, safe ?? {});
  }
}

// ---------------------------------------------------------------------------
// Legacy event catalog (kept for backward-compat).
//
// `track()` predates this wrapper (Phase 2 no-op scaffold). The existing
// callsites — SignInScreen, TasksScreen, ReportFlagModal, PlatformMap.web —
// keep working unchanged, but now route through trackEvent() so their events
// actually reach Sentry *and* get PII-scrubbed (the old catalog has flagId in
// a couple of events; stripPII drops it automatically).
// ---------------------------------------------------------------------------

export type AnalyticsEvent =
  | { name: 'flag_created'; props: { category: string; severity: number; hasPhoto: boolean } }
  | { name: 'flag_viewed'; props: { flagId: string; source: 'map' | 'tasks' } }
  | { name: 'flag_status_changed'; props: { flagId: string; from: string; to: string } }
  | { name: 'user_signed_in'; props: { method: 'email'; isNewUser: boolean } }
  | { name: 'push_notification_received'; props: { type: string } }
  // Tile cache instrumentation — measures offline map usage.
  // zoom: Leaflet zoom level at time of request (web only).
  // PRIVACY: only zoom allowed; x/y tile coords encode location bbox — do not add
  | { name: 'tile_cache_hit'; props: { zoom: number } }
  | { name: 'tile_cache_miss'; props: { zoom: number } };

export function track<E extends AnalyticsEvent>(
  event: E['name'],
  props: Extract<AnalyticsEvent, { name: E['name'] }>['props'],
): void {
  // Route through the chokepoint so legacy events get the same PII scrub +
  // Sentry breadcrumb as everything else.
  trackEvent(event, props as unknown as Record<string, string | number | boolean>);
}

// ---------------------------------------------------------------------------
// User identity — intentionally NOT sent to Sentry.
//
// Attaching a user id is exactly the PII we're avoiding. These stay dev-only
// console helpers so existing callers don't break; they never identify the
// user to the analytics backend.
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
