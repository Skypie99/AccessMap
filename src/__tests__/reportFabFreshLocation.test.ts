/**
 * FIX C source invariants — fresh GPS on the Report FAB (Decision 6, Option A).
 *
 * The Report FAB's onPress fires a fire-and-forget requestLocation() before
 * opening ReportFlagModal, so the GPS fix is fresh by the time the user
 * finishes the form (the modal reads its `location` prop live at submit —
 * pinned by ReportFlagModal.test.tsx "live location prop"). A long-press
 * drop pin overrides GPS, so the read is skipped when one is set.
 *
 * Like qaMergeConsolidation.test.ts, these are SOURCE-LEVEL invariants (full
 * MapScreen renders are deferred to Detox/Playwright) asserted on stable
 * semantic anchors, not line numbers — they survive refactors but trip if the
 * fix is reverted to a bare `onPress={() => setReportOpen(true)}`.
 */

import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Return a window of `len` chars starting at the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 500): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('FIX C — Report FAB requests a fresh GPS read before opening the modal', () => {
  const map = read('screens/MapScreen.tsx');
  // The Jordan Condition 2 comment sits directly above the auth-gated Report
  // FAB Pressable; a generous window covers the comment, the Pressable opener,
  // and the whole onPress body.
  const fab = around(map, 'Jordan Condition 2: hide Report FAB', 1600);

  it('onPress fires a fire-and-forget requestLocation when no drop pin is set', () => {
    expect(fab).toContain('if (!dropLocation) void requestLocation();');
  });

  it('onPress still opens the report modal (the read must not gate opening)', () => {
    expect(fab).toContain('setReportOpen(true)');
  });

  it('requests the fresh read BEFORE opening the modal', () => {
    const readIdx = fab.indexOf('void requestLocation()');
    const openIdx = fab.indexOf('setReportOpen(true)');
    expect(readIdx).toBeGreaterThan(-1);
    expect(openIdx).toBeGreaterThan(-1);
    expect(readIdx).toBeLessThan(openIdx);
  });

  it('the modal location prop keeps the drop-pin override (dropLocation ?? location)', () => {
    expect(map).toContain('location={dropLocation ?? location}');
  });
});
