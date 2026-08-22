import { computeOverflowHasMore } from '../useOverflowFade';

// The S16 / T14 fade-mount rule, pinned headlessly on three numbers (mirrors
// isCompactLayout's pure-fn test idiom). Every chip rail AND the retrofitted Map
// action bar route through this one fn, so this single suite covers all seven
// fade sites: "fade mounts iff content overflows the viewport, and hides at
// end-of-scroll (within a 1px tolerance)".
describe('computeOverflowHasMore — the S16/T14 fade-mount rule', () => {
  it.each([
    // contentW, viewW, offsetX, expected
    [300, 375, 0, false], // fits within the viewport — no overflow, no fade
    [376, 375, 0, false], // 1px over — below the >1 threshold, no fade
    [425, 375, 0, true], // overflows, scrolled to the start — fade
    [425, 375, 20, true], // overflows, mid-scroll — fade
    [425, 375, 49, false], // within 1px of the end — hides (tolerance)
    [425, 375, 50, false], // exactly at the end — hides
    [425, 375, 80, false], // past the end (rubber-band) — hides
  ])('content=%i view=%i offset=%i -> %s', (contentW, viewW, offsetX, expected) => {
    expect(computeOverflowHasMore(contentW, viewW, offsetX)).toBe(expected);
  });
});
