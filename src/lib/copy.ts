/**
 * Shared user-facing copy strings.
 *
 * Home, Map, and Tasks each render the same "you're offline, showing the saved
 * cache" banner. They had drifted into three slightly different wordings; keeping
 * the one true string here means a future copy tweak lives in exactly one place
 * and every screen stays in sync (same idea as a11yText.ts, but for visible copy).
 */
import { relativeTime } from './relativeTime';

/** Banner shown when a screen is serving the saved offline cache. */
export const OFFLINE_BANNER_TEXT = 'Showing saved data — connect for the latest.';

/**
 * B9 (L7-02): the offline banner, now stating the data's AGE when we know it.
 * The one fact that changes a decision offline is *how old* the saved data is —
 * `cachedAt` already exists in the cache entry, so read it and say it. Falls
 * back to the plain string when the timestamp is unknown (e.g. a screen that
 * hasn't surfaced it yet), so nothing regresses.
 */
export function offlineBannerText(cachedAt?: string | null): string {
  return cachedAt
    ? `Showing saved data from ${relativeTime(cachedAt)} — connect for the latest.`
    : OFFLINE_BANNER_TEXT;
}

/**
 * BP13 (T9): the one true retry verb. A read-failure banner appends it so Home,
 * Map, and Tasks speak ONE failure register instead of three drifting dialects.
 * A second sentence (not a "state — next step" em-dash status line). PROPOSED
 * (BP13, S-8) — Sky's final wording lands in DECISIONS §A / BP16.
 */
export const RETRY_VERB = 'Tap to retry.';

/**
 * BP13 (T9, F5-05/09): single-source the read-failure banner text (provider
 * message + retry verb). Home / Map / Tasks route the SAME presentation contract
 * through this — NOT a shared component; each screen keeps its own container.
 * Mirrors Tasks' original inline recipe: append the verb unless the provider
 * message already carries it, so a double "Tap to retry." never appears.
 */
export function failureBannerText(providerMessage: string): string {
  return providerMessage.toLowerCase().includes('tap to retry')
    ? providerMessage
    : `${providerMessage}. ${RETRY_VERB}`;
}
