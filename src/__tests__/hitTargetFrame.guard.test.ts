/**
 * The ACCESSIBILITY FRAME of a control must clear 44pt — not just its touch area.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * The Flagstone sim walk (2026-08-19/20) censused every interactive element on
 * both an iPhone 17 Pro Max and a 17e and measured, in points:
 *
 *   Home  "Report a barrier" FAB ............ 105 x 42   (primary CTA, 2pt under)
 *   Home  search summary (labelled node) .... 358 x 20   (inside a 48pt bar)
 *   Tasks card title ........................ 376 x 22   (326 x 22 on the 17e)
 *   MyReports row title ..................... 318 x 21
 *   ActivityFeed row title .................. 320 x 29
 *   Profile display-name field .............. 286 x 39   (236 x 40 on the 17e)
 *   FlagDetail copy-coordinates .............  21 x 24
 *   ReportFlag remove-photo badge ...........  28 x 29
 *   MyWatched "All" status chip .............  41 x 45
 *
 * ─── WHY THE REPO DID NOT ALREADY CATCH THIS ──────────────────────────────
 * The house small-target idiom is "small glyph box + hitSlop = 44 effective"
 * (MapScreen.tsx `heatNoticeClose`, HeatmapLegend.tsx `close`), and it is a
 * legitimate way to meet WCAG 2.5.5/2.5.8, which are about the POINTER target.
 *
 * But hitSlop does not appear in the accessibility frame. Proven on the tier
 * pill: ProfileScreen's Pressable carries hitSlop={8} on an 87x33 pill — 49pt
 * effective — and the census still reports 87x33. That frame is what VoiceOver
 * draws its focus rectangle around and what touch-to-explore hit-tests, so a
 * 20pt-tall labelled node is a real barrier even when a finger tap works.
 *
 * So this guard covers the cases where hitSlop was NOT the answer:
 *   1. controls with no slop and no height floor at all, and
 *   2. two controls where the slop math silently failed — see below.
 *
 * ─── DELIBERATELY NOT COVERED (Sky's call, 2026-08-20) ────────────────────
 * SW-09 clear-search (guard-pinned at hitSlop={14} by A11Y-223), SW-33 the
 * filter-panel collapse (32+16=48), the SW-40 tier pill (33+16=49), and SW-29's
 * 38x40 map markers all stay on the documented idiom. The 63x28 Switch elements
 * and the map's 29x11 "Legal" link are native iOS controls, not ours to size.
 *
 * House idiom: static source scan (cf. bottomInsetSafety.guard.test.ts,
 * tasksFilterSheet.test.ts) — geometry is invisible to jest, so this pins the
 * structural properties that produce the geometry.
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/**
 * Pull one `name: { ... }` style block out of a StyleSheet source by balancing
 * braces — the repo writes these both multi-line and on a single line, so a
 * line-anchored regex silently returns '' for half of them and every assertion
 * against it passes vacuously.
 */
function styleBlock(src: string, key: string): string {
  const open = src.search(new RegExp(`\\n\\s*${key}: \\{`));
  if (open === -1) return '';
  const start = src.indexOf('{', open);
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return '';
}

/** A height floor, written either as the token or as the literal. */
const HAS_MIN_HEIGHT = /minHeight: (a11y\.minTargetSize|4[4-9]|[5-9]\d)/;
const HAS_MIN_WIDTH = /minWidth: (a11y\.minTargetSize|4[4-9]|[5-9]\d)/;

describe('SW-12 — the primary CTA measured 42pt', () => {
  const src = read('screens/HomeScreen.tsx');

  it('the Report FAB carries a height floor', () => {
    const block = styleBlock(src, 'reportPill');
    // Non-vacuity: a renamed style would make the block empty and every
    // assertion below pass forever while checking nothing.
    expect(block).toContain('borderRadius');
    expect(HAS_MIN_HEIGHT.test(block)).toBe(true);
  });

  it('still rides color.brand — brandInkAA.guard pins this and the fix must not move it', () => {
    expect(styleBlock(src, 'reportPill')).toContain('backgroundColor: color.brand');
  });
});

describe('SW-10 — the labelled search node was 20pt tall inside a 48pt bar', () => {
  const src = read('screens/HomeScreen.tsx');

  it('the height is on searchText, which is the element carrying the label', () => {
    const block = styleBlock(src, 'searchText');
    expect(block).toContain('flex: 1');
    expect(HAS_MIN_HEIGHT.test(block)).toBe(true);
  });

  it('searchText — and not the bar — is the accessible, role="button" element', () => {
    // This is A11Y-214/SR-040's structure and the reason the frame was short.
    // If a later edit moves `accessible` back onto the bar, the height above
    // stops being the thing VoiceOver measures and this guard is a lie.
    expect(src).toMatch(/style=\{\[styles\.searchText[\s\S]{0,200}accessibilityRole="button"/);
  });

  it('the bar still resolves to 48, so nothing moved visually', () => {
    expect(styleBlock(src, 'searchInner')).toMatch(/minHeight: 48/);
  });
});

describe('SW-22 + SW-43 — the tappable row title was 21-29pt on every list surface', () => {
  const cases: [string, string][] = [
    ['screens/TasksScreen.tsx', 'cardHeader'],
    ['components/MyReportsModal.tsx', 'rowSummary'],
    ['components/ActivityFeedModal.tsx', 'rowSummary'],
    ['components/MyWatchedModal.tsx', 'rowSummary'],
  ];

  it.each(cases)('%s → %s clears 44', (file, key) => {
    const block = styleBlock(read(file), key);
    expect(block).toContain("flexDirection: 'row'");
    expect(`${file} ${key}: ${HAS_MIN_HEIGHT.test(block)}`).toBe(`${file} ${key}: true`);
  });

  it('the "Show on the map" button beside it is still a real 44x44 circle', () => {
    // The reference the finding leaned on: these were correct all along, which
    // is what made the 21pt title read as an oversight rather than a style.
    for (const file of ['components/MyReportsModal.tsx', 'components/ActivityFeedModal.tsx']) {
      const block = styleBlock(read(file), 'viewOnMapBtn');
      expect(`${file}: ${/width: 44/.test(block) && /height: 44/.test(block)}`).toBe(`${file}: true`);
    }
  });
});

describe('SW-40 — every Input reported ~39pt because the frame is the inner TextInput', () => {
  const src = read('components/ui/Input.tsx');

  it('the wrapper keeps its floor', () => {
    expect(HAS_MIN_HEIGHT.test(styleBlock(src, 'row'))).toBe(true);
  });

  it('the TextInput — the accessible element — has one too', () => {
    const block = styleBlock(src, 'input');
    expect(block).toContain('flex: 1');
    expect(HAS_MIN_HEIGHT.test(block)).toBe(true);
  });

  it('the TextInput is what carries `accessible` and the label', () => {
    expect(src).toMatch(/<TextInput[\s\S]{0,400}accessible\n/);
  });
});

describe('SW-25 — copy-coordinates reached 44 tall by slop but only 41 wide', () => {
  it('has a width floor rather than more slop', () => {
    const src = read('components/FlagDetailModal.tsx');
    const block = styleBlock(src, 'coordsCopyBtn');
    expect(block).toContain('padding: 4');
    expect(HAS_MIN_WIDTH.test(block)).toBe(true);
  });
});

describe('census sweep — the "All" status chip was 41 wide', () => {
  it('MyWatched statusChip floors BOTH axes', () => {
    const block = styleBlock(read('components/MyWatchedModal.tsx'), 'statusChip');
    expect(HAS_MIN_HEIGHT.test(block)).toBe(true);
    expect(HAS_MIN_WIDTH.test(block)).toBe(true);
  });
});

describe('SW-50 — the remove badge sat inside the lightbox target, and its slop was clipped', () => {
  const src = read('components/PhotoGallery.tsx');

  it('Remove is a real 44pt box, not 28 plus slop', () => {
    const block = styleBlock(src, 'removeBtn');
    expect(block).toContain("position: 'absolute'");
    expect(HAS_MIN_HEIGHT.test(block) || /height: a11y\.minTargetSize/.test(block)).toBe(true);
    expect(/width: a11y\.minTargetSize/.test(block)).toBe(true);
  });

  it('the visible disc is still 28 and still in the corner', () => {
    const block = styleBlock(src, 'removeDisc');
    expect(block).toContain('width: 28');
    expect(styleBlock(src, 'removeBtn')).toContain('padding: 4');
  });

  it('it is NOT rendered inside the thumbnail Pressable any more', () => {
    // The whole defect: nested inside the lightbox's tap area, a miss on the
    // badge opened the photo instead of removing it. The thumb Pressable must
    // close before the Remove button opens.
    const image = src.indexOf('accessibilityHint="Tap to view full screen"');
    const removeBtn = src.indexOf('accessibilityLabel={`Remove photo');
    expect(image).toBeGreaterThan(-1);
    expect(removeBtn).toBeGreaterThan(-1);
    // The thumbnail's own Pressable must CLOSE between the lightbox image and
    // the Remove button, i.e. they are siblings, not parent and child.
    const thumbClose = src.indexOf('</Pressable>', image);
    expect(thumbClose).toBeGreaterThan(-1);
    expect(thumbClose).toBeLessThan(removeBtn);
    expect(src).toContain('styles.thumbWrap');
  });

  it('and it no longer leans on hitSlop that overflow:hidden would clip', () => {
    const start = src.indexOf('onPress={() => onRemovePhoto(index)}');
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(start, start + 300)).not.toContain('hitSlop');
  });
});

describe('SW-35 — the legend close spent 10pt of its slop outside the GlassSurface', () => {
  const src = read('components/HeatmapLegend.tsx');

  it('the touch box is a real 44 anchored inside the surface', () => {
    const block = styleBlock(src, 'close');
    expect(block).toContain('top: 0');
    expect(block).toContain('right: 0');
    expect(/width: a11y\.minTargetSize/.test(block)).toBe(true);
    expect(/height: a11y\.minTargetSize/.test(block)).toBe(true);
  });

  it('the glyph did not move — a 24pt box at 2pt of padding', () => {
    expect(styleBlock(src, 'close')).toContain('padding: 2');
    expect(styleBlock(src, 'closeGlyph')).toContain('width: 24');
  });

  it('the out-of-bounds hitSlop is gone', () => {
    const start = src.indexOf('accessibilityLabel="Collapse heat map legend"');
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(Math.max(0, start - 400), start)).not.toContain('hitSlop');
  });
});

describe('the sibling that stays on the house idiom — must NOT be "fixed" by reflex', () => {
  it('MapScreen heatNoticeClose keeps its 24pt box + hitSlop 10', () => {
    // In-bounds, so the idiom holds here. Sky ruled on 2026-08-20 that the
    // documented slop controls stay as they are; this pins that decision so a
    // later sweep does not quietly convert them.
    const src = read('screens/MapScreen.tsx');
    expect(styleBlock(src, 'heatNoticeClose')).toContain('width: 24');
    expect(src).toMatch(/accessibilityLabel="Dismiss heat map notice"/);
  });

  it('HomeScreen clear-search keeps hitSlop={14} (A11Y-223)', () => {
    expect(read('screens/HomeScreen.tsx')).toContain('hitSlop={14}');
  });
});
