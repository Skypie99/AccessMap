/**
 * MapScreenHeatEmpty.test.ts — B7-A (L7-11) source invariants.
 *
 * The heat disclaimer states the k-threshold RULE but is silent about the
 * OUTCOME: when heat is on and there IS data but nothing clusters enough to
 * qualify, the tinted layer is simply blank — which reads as broken. B7-A adds
 * a complementary line naming that outcome so "on + empty" ≠ "broken".
 *
 * The empty-when-no-cluster DATA condition is already covered by the k-anonymity
 * tests in MapScreen.heatmap.test.tsx (cells with count < 3 are filtered out).
 * Here we pin the RENDER — a full MapScreen render pulls maps/navigation/context,
 * so these are SOURCE-LEVEL invariants on stable semantic anchors.
 */
import * as fs from 'fs';
import * as path from 'path';

const map = fs.readFileSync(path.join(__dirname, '..', 'MapScreen.tsx'), 'utf8');

function around(haystack: string, anchor: string, len = 700): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('B7-A — heat "no zones qualify yet" companion', () => {
  it('renders only when heat is on, there is data, and no cell qualifies', () => {
    // filteredFlags.length > 0 scopes it to the "data exists but blank" case —
    // an empty dataset has its own broader empty state.
    expect(map).toContain(
      'heatmapEnabled && heatCells.length === 0 && filteredFlags.length > 0',
    );
  });

  it('states the outcome (complements, not duplicates, the k-rule disclaimer)', () => {
    const block = around(map, 'heatmapEnabled && heatCells.length === 0 && filteredFlags.length > 0');
    expect(block).toContain('No heat zones qualify yet');
    expect(block).toContain('coverage grows as more reports come in');
  });

  it('is announced as a polite live region', () => {
    const block = around(map, 'heatmapEnabled && heatCells.length === 0 && filteredFlags.length > 0');
    expect(block).toContain('accessibilityLiveRegion="polite"');
  });
});
