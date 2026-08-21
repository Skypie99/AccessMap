/**
 * BUG-2 empty-card glass guard (2026-08-13).
 *
 * The two map empty-state cards — the filtered "Nothing here right now" card and
 * the true-zero "No barriers reported here yet" card (IMG_7768) — must render the
 * app's REAL liquid glass: with the C-lite switch retired (2026-08-12, full wins
 * app-wide) they carry NO `forceEngineered` at all, so the primitive mounts a
 * true BlurView on iOS by default (mirroring the filter panel) and the map reads
 * THROUGH the card. The regression this guards against is ANY `forceEngineered`
 * (the old literal-true defect, or a re-threaded switch): it forces the
 * engineered no-blur path, which over light tiles composites to a near-opaque
 * white slab (GlassSurface.tsx material === 'engineered' → LinearGradient, no
 * BlurView; GLASS.md §12.5).
 *
 * It also pins that the true-zero card is `pointerEvents="none"` (it has no
 * interactive children, so it must not block map pan under its footprint) while
 * the filtered card is NOT (it holds the reset chips + "Reset all filters" — the
 * only zero-results recovery path, PROTECT-2).
 *
 * Source-scan idiom (cf. accessibleParentTrap.guard.test.ts): the MapScreen
 * render surface is far too heavy to mount, and what matters here is the wiring,
 * not pixels. Non-vacuity was proved by reverting `forceEngineered={glassLite}`
 * to literal `forceEngineered` and watching every material assertion fail.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');


/** The `<GlassSurface …>` open tag whose children contain `copy`. Walks back to
 *  the nearest `<GlassSurface` before the copy, then forward (brace-balanced) to
 *  the tag's closing `>`. */
function glassTagBeforeCopy(src: string, copy: string, file: string): string {
  const at = src.indexOf(copy);
  if (at === -1) throw new Error(`${file}: copy not found: ${copy}`);
  const start = src.lastIndexOf('<GlassSurface', at);
  if (start === -1) throw new Error(`${file}: no <GlassSurface before: ${copy}`);
  let depth = 0;
  let j = start;
  while (j < src.length) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}') depth--;
    else if (c === '>' && depth === 0) break;
    j++;
  }
  return src.slice(start, j + 1);
}

const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

describe('BUG-2 — map empty cards render the real liquid-glass primitive, not the opaque slab', () => {
  const src = read('screens/MapScreen.tsx');

  // Any `forceEngineered` (bare literal OR a re-threaded switch) forces the
  // no-blur path → the opaque slab. Real glass = NO forceEngineered (blur by
  // default on iOS, engineered on Android automatically).
  const hasAnyForceEngineered = (tag: string) => /forceEngineered/.test(tag);

  it('true-zero card ("No barriers reported here yet") carries NO forceEngineered — it blurs by default', () => {
    const tag = glassTagBeforeCopy(src, 'No barriers reported here yet', 'MapScreen');
    expect(hasAnyForceEngineered(tag)).toBe(false);
    expect(tag).toContain('variant="row"');
    expect(tag).toContain('overlayTint={color.glassMapWash}');
  });

  it('true-zero card is pointerEvents="none" so it never blocks map pan (no interactive children)', () => {
    const tag = glassTagBeforeCopy(src, 'No barriers reported here yet', 'MapScreen');
    expect(tag).toContain('pointerEvents="none"');
  });

  it('filtered card ("Nothing here right now") also renders real glass AND keeps its taps (PROTECT-2 reset path)', () => {
    const tag = glassTagBeforeCopy(src, 'Nothing here right now', 'MapScreen');
    expect(hasAnyForceEngineered(tag)).toBe(false);
    // It holds the reset chips + "Reset all filters" — it must remain tappable.
    expect(tag).not.toContain('pointerEvents="none"');
    expect(src).toContain('accessibilityLabel="Reset all filters"');
  });

  it('styles.emptyCard has no opaque backgroundColor — the material comes from the primitive', () => {
    const at = src.indexOf('emptyCard: {');
    expect(at).toBeGreaterThan(-1);
    const block = src.slice(at, src.indexOf('},', at));
    expect(block).not.toMatch(/backgroundColor/);
  });
});
