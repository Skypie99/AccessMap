/**
 * SW-39 — the Profile headline tiles must all answer the SAME question.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * Measured on a real account in the authed pass (2026-08-20):
 *
 *     RECENT POINT ACTIVITY   "Your report was verified · +10 pts"   (x2)
 *     6 REPORTED   ·   0 VERIFIED   ·   3 RESOLVED
 *
 * `reported` was a lifetime total (Math.max(statusRows.length, statusSum)),
 * while `verified`/`resolved` read `flags.status` — a current-status snapshot.
 * A report verified and then resolved leaves the verified bucket, so the tile
 * was technically true and read as false. And because `rejected` (3) was not on
 * the row at all, 0 + 3 never reached 6 and nothing accounted for the gap.
 *
 * Not a data bug. A semantics bug — which is why the fix is NOT in the trigger.
 *
 * ─── WHAT THIS ENFORCES ───────────────────────────────────────────────────
 *   1. All three tiles read lifetime fields. If any goes back to `byStatus`,
 *      the row silently mixes metrics again and nothing else would notice.
 *   2. The spoken summary reads the same numbers as the visible tiles.
 *   3. The per-status pill row — which shows all FOUR buckets including
 *      rejected — is untouched, because that is where the snapshot lives now.
 *   4. The points trigger is not consulted for display. The brief was explicit:
 *      do not "fix" this by changing what awards points.
 *
 * House idiom: static source scan (cf. bottomInsetSafety.guard.test.ts). The
 * screen needs Supabase, navigation, a tab bar and auth to mount; the property
 * that broke is which field each tile reads, and that is readable here.
 */
import fs from 'fs';
import path from 'path';

const src = fs.readFileSync(
  path.join(__dirname, '..', 'ProfileScreen.tsx'),
  'utf8',
);

/** The `<View ...>` open tag that carries the stats-row summary. */
const summaryTag = (() => {
  const marker = src.indexOf('`Your stats: ');
  if (marker === -1) return '';
  const open = src.lastIndexOf('<View', marker);
  const close = src.indexOf('>', src.indexOf('}', marker));
  return open === -1 ? '' : src.slice(open, close);
})();

/** Everything between the summary View and its closing tag. */
const statsRow = (() => {
  const marker = src.indexOf('<Stat label="Reported"');
  if (marker === -1) return '';
  return src.slice(marker, src.indexOf('</View>', marker));
})();

describe('SW-39 — the three tiles', () => {
  it('are all present (non-vacuity for everything below)', () => {
    expect(statsRow).toContain('<Stat label="Reported"');
    expect(statsRow).toContain('<Stat label="Verified"');
    expect(statsRow).toContain('<Stat label="Resolved"');
  });

  it('read LIFETIME counts, not the current-status snapshot', () => {
    expect(statsRow).toContain('value={stats.lifetime.verified}');
    expect(statsRow).toContain('value={stats.lifetime.resolved}');
    // This is the whole defect: `byStatus` is the snapshot, and no tile may
    // read it while the tile beside it is a lifetime total.
    expect(`stats row reads byStatus: ${statsRow.includes('byStatus')}`).toBe(
      'stats row reads byStatus: false',
    );
  });

  it('the spoken summary says the same numbers the tiles show', () => {
    expect(summaryTag).toContain('accessibilityRole="summary"');
    expect(summaryTag).toContain('${stats.lifetime.verified} verified');
    expect(summaryTag).toContain('${stats.lifetime.resolved} resolved');
    expect(summaryTag).not.toContain('byStatus');
  });
});

describe('SW-39 — what the fix must NOT disturb', () => {
  it('the per-status pill row still shows all four buckets, rejected included', () => {
    // The tiles gave up the snapshot; this row is where it lives, and it was
    // already correct. Losing it would trade one incomplete row for another.
    expect(src).toMatch(/\['open', 'verified', 'resolved', 'rejected'\] as FlagStatus\[\]/);
    expect(src).toContain('stats.byStatus[status]');
  });

  it('`reported` is still the lifetime total it always was', () => {
    expect(src).toContain('reported: Math.max(statusRows.length, statusSum)');
  });

  it('falls back to the snapshot when the ledger is unavailable', () => {
    // point_events starts at the 2026-05-30 trust-score migration and was not
    // backfilled. A confident "0 verified" would be a worse answer than the
    // imprecise one this screen already gave.
    expect(src).toMatch(/lifetime: lifetimeOutcomes \?\? \{/);
  });
});
