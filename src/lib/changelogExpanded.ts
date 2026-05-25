export type ReleaseKey = string;

/**
 * Returns the initial expanded map for a list of releases.
 * The first release (most recent) is expanded; the rest are collapsed.
 * The key shape matches the component's render key: `${release.date}-${i}`.
 *
 * Extracted from ChangelogModal so it can be unit-tested. The helper
 * drives both the visible expand/collapse state AND the screen-reader
 * `accessibilityState.expanded` — silent breakage was too easy without
 * coverage.
 */
export function initialExpanded(
  releases: ReadonlyArray<{ date: string }>,
): Record<ReleaseKey, boolean> {
  const map: Record<string, boolean> = {};
  releases.forEach((release, i) => {
    map[`${release.date}-${i}`] = i === 0;
  });
  return map;
}
