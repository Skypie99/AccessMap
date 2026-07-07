/**
 * copy.test.ts — B9 (L7-02): the offline banner now states the saved data's AGE.
 *
 * `offlineBannerText(cachedAt)` composes the age via the shared `relativeTime`
 * formatter (covered exhaustively in relativeTime.test.ts). Here we only pin the
 * banner's contract:
 *   - no timestamp  → the plain string (nothing regresses)
 *   - a timestamp   → the age is stated, and the "connect" tail is preserved
 */
import { OFFLINE_BANNER_TEXT, offlineBannerText } from '../copy';

/** An ISO string `seconds` in the past relative to real now. */
function ago(seconds: number): string {
  return new Date(Date.now() - seconds * 1000).toISOString();
}

describe('offlineBannerText (B9 / L7-02)', () => {
  it('falls back to the ageless banner when cachedAt is missing', () => {
    expect(offlineBannerText()).toBe(OFFLINE_BANNER_TEXT);
    expect(offlineBannerText(null)).toBe(OFFLINE_BANNER_TEXT);
    expect(offlineBannerText(undefined)).toBe(OFFLINE_BANNER_TEXT);
  });

  it('states the age for a known cachedAt (e.g. "from 2h ago")', () => {
    // 2h + a margin keeps us comfortably inside relativeTime's hour bucket.
    const text = offlineBannerText(ago(2 * 3600 + 30));
    expect(text).toContain('Showing saved data from 2h ago');
    // The decision-changing tail ("connect for the latest") is preserved.
    expect(text).toContain('connect for the latest');
  });

  it('says "just now" for a very fresh cache rather than an empty age', () => {
    expect(offlineBannerText(ago(5))).toContain('from just now');
  });

  it('never returns an empty or age-less string when a timestamp is present', () => {
    const text = offlineBannerText(ago(3 * 24 * 3600));
    expect(text).toContain('Showing saved data from 3d ago');
  });
});
