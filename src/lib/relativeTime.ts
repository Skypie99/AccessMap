/**
 * relativeTime — converts an ISO 8601 date string (or Date) to a human-
 * readable relative string like "just now", "5m ago", "2h ago", "3d ago".
 *
 * Design choices:
 *  - No external dependency — pure arithmetic, tiny bundle.
 *  - Caps at "30d ago"; anything older returns the short locale date so
 *    users still see a real date for ancient flags rather than "47d ago".
 *  - Second-level granularity only for the first minute; after that the
 *    extra precision is noise.
 *  - Returns a string safe to use directly in Text + accessibilityLabel.
 *
 * Exported separately from flags.ts so it can be tested in isolation and
 * imported only where needed (no Supabase dep pulled in).
 */
export function relativeTime(input: string | Date, now: Date = new Date()): string {
  const date = typeof input === 'string' ? new Date(input) : input;
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 0) return 'just now'; // clock skew guard
  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) {
    const m = Math.floor(diffSec / 60);
    return `${m}m ago`;
  }
  if (diffSec < 86400) {
    const h = Math.floor(diffSec / 3600);
    return `${h}h ago`;
  }
  if (diffSec < 86400 * 30) {
    const d = Math.floor(diffSec / 86400);
    return `${d}d ago`;
  }
  // Older than 30 days — short locale date so users see a real anchor.
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
