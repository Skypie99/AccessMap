/**
 * MapScreenHeatEmpty.test.ts — B7-A (L7-11) source invariants.
 *
 * The map keeps one visible Heat Zone notice: the top k-anonymity disclaimer.
 * The former lower "no zones qualify" companion was a duplicate information
 * surface that crowded the controls at large Dynamic Type and is intentionally
 * absent. A full MapScreen render pulls maps/navigation/context, so these are
 * SOURCE-LEVEL invariants on stable semantic anchors.
 */
import * as fs from 'fs';
import * as path from 'path';

const map = fs.readFileSync(path.join(__dirname, '..', 'MapScreen.tsx'), 'utf8');

function around(haystack: string, anchor: string, len = 1400): string {
  const i = haystack.indexOf(anchor);
  if (i < 0) throw new Error(`anchor not found: ${anchor}`);
  return haystack.slice(i, i + len);
}

describe('Map Heat — one top informational notice', () => {
  it('keeps the top k-anonymity notice', () => {
    expect(map).toContain('heatmapEnabled && !heatNoticeDismissed && (');
    expect(map).toContain('Heat zones only appear where at least {DEFAULT_K_FLOOR} flags have been reported.');
  });

  it('removes the lower duplicate and its layout style', () => {
    expect(map).not.toContain('emptyHeatNoticeDismissed');
    expect(map).not.toContain('No heat zones qualify yet');
    expect(map).not.toContain('emptyHeatNotice:');
    expect(map).not.toContain('Dismiss empty heat map notice');
  });

  it('retains the top notice live region and 44pt dismissal', () => {
    const block = around(map, 'heatmapEnabled && !heatNoticeDismissed && (');
    expect(block).toContain('accessibilityLiveRegion="polite"');
    expect(block).toContain('accessibilityLabel="Dismiss heat map notice"');
    expect(map).toContain('width: a11y.minTargetSize');
    expect(map).toContain('height: a11y.minTargetSize');
  });

  it('places the retained Heat card above the unchanged location card', () => {
    const heatAt = map.indexOf('heatmapEnabled && !heatNoticeDismissed && (');
    const locationAt = map.indexOf('style={[styles.bannerText, !axRecompose && styles.bannerInlineText]}');
    expect(heatAt).toBeGreaterThan(-1);
    expect(locationAt).toBeGreaterThan(-1);
    expect(heatAt).toBeLessThan(locationAt);
  });

  it('keeps a compact inline Settings action below recomposition size', () => {
    expect(map).toContain('style={[styles.banner, !axRecompose && styles.bannerInline]}');
    expect(map).toContain('style={[styles.bannerText, !axRecompose && styles.bannerInlineText]}');
    expect(map).toContain('!axRecompose && styles.bannerLinkInline');
    expect(map).toContain('bannerInline:');
    expect(map).toContain('bannerLinkInline:');
  });
});
