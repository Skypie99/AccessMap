/**
 * Shared user-facing copy strings.
 *
 * Home, Map, and Tasks each render the same "you're offline, showing the saved
 * cache" banner. They had drifted into three slightly different wordings; keeping
 * the one true string here means a future copy tweak lives in exactly one place
 * and every screen stays in sync (same idea as a11yText.ts, but for visible copy).
 */

/** Banner shown when a screen is serving the saved offline cache. */
export const OFFLINE_BANNER_TEXT = 'Showing saved data — connect for the latest.';
