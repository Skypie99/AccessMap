/**
 * S4 — Honest arrival (L3-2, CRITICAL). Two guards:
 *
 *   1. The denied-banner gate is a pure, unit-tested predicate:
 *      arrivalPermissionDenied(status) is TRUE only for a genuine prior 'denied'.
 *      A first-run 'undetermined' arrival (never asked) must be FALSE so the app
 *      never claims "location is off" to a user who never turned it off.
 *
 *   2. Source-level invariants (this codebase defers full MapScreen renders to
 *      Detox/Playwright — see MapScreen.heatmap.test.tsx — so these are asserted
 *      on stable semantic anchors, like qaMergeConsolidation.test.ts):
 *        - the status pill no longer claims "nearby" (it's a global count);
 *        - the mount effect gates the banner on the RAW status via the helper;
 *        - the denied banner copy is FINDING-oriented + web-safe (no "device
 *          Settings", no "to report");
 *        - NearbyFlagsModal's open-announcement only claims "sorted by distance"
 *          when a location backs it (L3-8).
 *
 * FORK 1 (Sky): S4 is the UI/copy half only — flags.ts fetch scope and the SF
 * DEFAULT_REGION are untouched here by design.
 */

import * as fs from 'fs';
import * as path from 'path';
import { arrivalPermissionDenied } from '@/lib/location';

const SRC = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** A window of `len` chars from the first occurrence of `anchor`. */
function around(haystack: string, anchor: string, len = 320): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('arrivalPermissionDenied — the reconciled denied-banner gate', () => {
  it('surfaces the banner for a real prior denial', () => {
    expect(arrivalPermissionDenied('denied')).toBe(true);
  });

  it('does NOT surface it for a never-asked first-run user (undetermined)', () => {
    // The whole point of the RECONCILED gate: undetermined must make no claim.
    expect(arrivalPermissionDenied('undetermined')).toBe(false);
  });

  it('does NOT surface it when permission is granted', () => {
    expect(arrivalPermissionDenied('granted')).toBe(false);
  });

  it('stays false for any other / future / empty status (never a false claim)', () => {
    for (const s of ['', 'restricted', 'unknown', 'provisional']) {
      expect(arrivalPermissionDenied(s)).toBe(false);
    }
  });
});

describe('S4 source invariants — MapScreen', () => {
  const map = read('MapScreen.tsx');
  const pill = around(map, "'Loading flags…'", 320);

  it('the status pill states an honest count, not a "nearby" proximity claim', () => {
    expect(pill).toContain('Showing ${flags.length} flag');
    expect(pill).not.toContain('nearby');
    // the filtered branch keeps its already-honest "X of Y shown"
    expect(pill).toContain('of ${flags.length} shown');
  });

  it('the arrival banner is gated on the RAW status via arrivalPermissionDenied', () => {
    expect(map).toContain('if (arrivalPermissionDenied(status)) setPermissionDenied(true)');
    // initialLocationAction is still the spinner gate and is NOT the banner gate
    expect(map).toContain('initialLocationAction(status) === ');
  });

  it('the denied banner copy is FINDING-oriented and web-safe (no device Settings / "to report")', () => {
    expect(map).toContain('so the map shows the most recent flags, not ones near you');
    expect(map).not.toContain('device Settings');
    expect(map).not.toContain('to report barriers near you');
  });

  it('the Nearby-list trigger hint drops the false "sorted by distance" when there is no location', () => {
    const hint = around(map, 'Open nearby flags list', 320);
    expect(hint).toContain('Opens an accessible list of the most recent flags');
  });
});

describe('S4 source invariants — NearbyFlagsModal open-announcement (L3-8)', () => {
  const modal = read('NearbyFlagsModal.tsx');

  it('only claims "sorted by distance" when a location backs it', () => {
    expect(modal).toContain('location != null');
    expect(modal).toContain('Sorted by distance.');
    expect(modal).toContain('Showing the most recent first.');
  });
});
