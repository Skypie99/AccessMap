/**
 * A text box must never be narrower than the word inside it.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * The Flagstone sim walk censused both phones at content size
 * `accessibility-extra-large` and found text breaking MID-WORD in two places:
 *
 *   Tasks card header ....... "Broken sidewal / k"            (SW-36)
 *   Profile BY CATEGORY ..... "Broken sidewal / k"            (SW-51)
 *   Profile BY SEVERITY ..... "Modera / te", "Signific..."    (SW-51)
 *
 * Everything else on those screens reflowed correctly — rows grew, buttons
 * grew, nothing clipped or overlapped — which is what made this a
 * word-breaking defect rather than a layout failure.
 *
 * ─── THE MECHANISM, BECAUSE THE OBVIOUS FIX IS A NO-OP ────────────────────
 * Yoga decides both "where does this line break" and "how wide is this child"
 * from the child's flex BASE size, and it bounds that base by min/max width.
 *
 *   TasksScreen  cardTitle  had `flex: 1`      = grow 1 / shrink 1 / basis 0%
 *   ReportsBreakdownCard  barLabel  had `flexBasis: 130`
 *
 * A basis of 0% contributes NOTHING to the line-break test, so the title could
 * never trigger a wrap however large the glyphs got, and its width was purely
 * residual — whatever the two non-shrinking badges beside it left over. A basis
 * of 130 is the same bug written as a constant: a box pinned at 130pt at every
 * text size while the glyphs inside it scale past 2x. In both cases iOS is
 * handed a word wider than its container, and `NSLineBreakByWordWrapping`
 * character-breaks it.
 *
 * So `flexWrap: 'wrap'` ALONE FIXES NOTHING. With basis 0% the wrap can never
 * fire. The basis has to stop being a number that ignores the font — hence this
 * guard pins BOTH halves on both surfaces, because either one alone ships a
 * change that looks like a fix and is not one.
 *
 * ─── AND A THIRD HALF, FOUND ONLY ON THE DEVICE ───────────────────────────
 * Freeing the basis was still not enough for the Tasks header. `flexShrink: 1`
 * let the two non-shrinking badges squeeze the title below its own longest word
 * anyway, so it wrapped to a second line and STILL rendered "sidewal / k". A
 * `minWidth` floor is what finally makes the wrap fire and moves the badges to
 * their own line. Source review did not catch this and a screenshot did — which
 * is the argument for the device pass, not against it.
 *
 * ─── WHY NOT numberOfLines ────────────────────────────────────────────────
 * `numberOfLines={1}` on a title is the reflex fix and it is forbidden here —
 * dynamicTypeGuard.test.ts fails any line pairing it with a *Title style,
 * because truncating a title at large type is the defect, not the remedy.
 *
 * ─── DELIBERATELY NOT COVERED ─────────────────────────────────────────────
 * Four more rows share the basis-zero title shape: MyReportsModal `rowTitle`,
 * ActivityFeedModal `rowTitle`, MyWatchedModal `rowCategory`, and
 * NearbyFlagsModal `cardTitle`. They are NOT swept here, for two reasons that
 * are facts rather than caution:
 *
 *   1. None of them renders a SeverityBadge — that component has exactly one
 *      call site in the app (TasksScreen). They use fixed-size discs and dots,
 *      which do not balloon with fontScale, so the amplifier that produces
 *      SW-36 is structurally absent.
 *   2. All three modal rows already carry `minWidth: 0` on the row itself,
 *      which the Tasks header did not.
 *
 * None was reported defective by the walk, and all four are behind auth, so an
 * agent cannot render them on a device to check that a shrink-distribution
 * change does not push the 44x44 "Show on the map" button beside each one.
 * Recorded here so the class stays greppable rather than forgotten.
 *
 * House idiom: static source scan (cf. hitTargetFrame.guard.test.ts,
 * bottomInsetSafety.guard.test.ts) — jest cannot measure a glyph, so this pins
 * the structural properties that produce the geometry.
 */
import fs from 'fs';
import path from 'path';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');

/**
 * Comments are stripped before scanning, and that is not incidental here: the
 * style blocks this guard reads carry long notes explaining the very patterns
 * it forbids ("`flex: 1` is shorthand for ... basis 0%", "was `flexBasis: 130`").
 * Scanning raw source, this suite matched its own explanations and failed
 * against the FIXED tree — which is a neat demonstration of why the shared,
 * string-aware helper exists.
 */
const read = (rel: string) => stripComments(fs.readFileSync(path.join(SRC, rel), 'utf8'));

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

/**
 * The shorthand that sets basis 0%. `flexGrow:` / `flexShrink:` cannot match —
 * the character after "flex" is a letter, not a colon — which is the whole
 * point: spelling the parts out is the fix.
 */
const BARE_FLEX_ONE = /\bflex:\s*1\b/;

/** A flexBasis written as a number, which cannot track the font size. */
const NUMERIC_FLEX_BASIS = /flexBasis:\s*\d/;

describe('the regexes actually discriminate (self-test)', () => {
  it('BARE_FLEX_ONE catches the shorthand and ignores the spelled-out parts', () => {
    expect(BARE_FLEX_ONE.test('{ flex: 1, color: red }')).toBe(true);
    expect(BARE_FLEX_ONE.test('{ flexGrow: 1, flexShrink: 1 }')).toBe(false);
    expect(BARE_FLEX_ONE.test('{ flexBasis: 130 }')).toBe(false);
  });

  it('NUMERIC_FLEX_BASIS catches a number and ignores auto', () => {
    expect(NUMERIC_FLEX_BASIS.test('{ flexBasis: 130 }')).toBe(true);
    expect(NUMERIC_FLEX_BASIS.test("{ flexBasis: 'auto' }")).toBe(false);
  });

  it('styleBlock returns empty for a name that does not exist', () => {
    expect(styleBlock('const s = { real: { a: 1 } };', 'imaginary')).toBe('');
  });
});

describe('SW-36 — the Tasks card title was crushed between two badges', () => {
  const src = read('screens/TasksScreen.tsx');

  it('cardTitle measures its own text instead of taking a basis of zero', () => {
    const block = styleBlock(src, 'cardTitle');
    // Non-vacuity: a renamed style would empty the block and let every
    // assertion below pass forever while checking nothing.
    expect(block).toContain('fontSize: font.size.xl');

    expect(BARE_FLEX_ONE.test(block)).toBe(false);
    expect(block).toContain('flexGrow: 1');
    // Shrink stays, so a title alone on a line wraps at a word boundary
    // instead of overflowing the card.
    expect(block).toContain('flexShrink: 1');
    // flexBasis must stay UNWRITTEN — RN's default is 'auto', which is what
    // makes the box measure the text. Writing any number here reintroduces
    // the bug in its other form.
    expect(NUMERIC_FLEX_BASIS.test(block)).toBe(false);
    // ...and a floor, WITHOUT WHICH THE REST IS NOT A FIX. Found on the device:
    // freeing the basis let the title wrap to a second line, but flexShrink
    // still allowed the two non-shrinking badges to squeeze it below its own
    // longest word, and "Broken sidewalk" still rendered as "sidewal / k" at
    // accessibility-extra-large. The floor is what makes cardHeader's flexWrap
    // actually fire. Same reasoning, and the same number, as barLabel below.
    expect(block).toContain('minWidth: 130');
  });

  it('cardHeader may wrap, so the title can take a line of its own', () => {
    const block = styleBlock(src, 'cardHeader');
    expect(block).toContain("flexWrap: 'wrap'");
  });

  it('cardHeader keeps the row direction and height floor hitTargetFrame pins', () => {
    // Re-pinned from this side too: the SW-36 fix must not disturb the SW-22 /
    // SW-43 fix that gave this header its 44pt accessibility frame.
    const block = styleBlock(src, 'cardHeader');
    expect(block).toContain("flexDirection: 'row'");
    expect(block).toContain('minHeight: a11y.minTargetSize');
  });
});

describe('SW-36 — the severity pill scaled on a different rule than its own digit', () => {
  const src = read('components/SeverityBadge.tsx');

  it('the severity word carries a per-site cap', () => {
    // The digit is variant="label" (capped 1.6) and the word was "bodyMedium"
    // (uncapped by contract in AppText, because body copy must always scale).
    // One pill, two scaling rules — so the word outgrew its own digit and the
    // pill ate the width the title needed.
    expect(src).toContain('maxFontSizeMultiplier={1.6}');
  });

  it('the cap did NOT arrive as a variant swap', () => {
    // variant="label" would have capped it too, and also forced the 600SemiBold
    // face while styles.label still declares weight 500 — changing how the pill
    // LOOKS in order to fix how it SCALES. This pins the pill's weight fork.
    expect(src).toContain('variant="bodyMedium"');
    expect(styleBlock(src, 'label')).toContain('font.weight.medium');
    expect(styleBlock(src, 'number')).toContain('font.weight.bold');
  });
});

describe('SW-51 — the Profile breakdown label sat in a box pinned at 130pt', () => {
  const src = read('components/ReportsBreakdownCard.tsx');

  it('barLabel floors its width instead of fixing its basis', () => {
    const block = styleBlock(src, 'barLabel');
    // Non-vacuity.
    expect(block).toContain('fontSize: font.size.sm');

    expect(NUMERIC_FLEX_BASIS.test(block)).toBe(false);
    // max(text, 130): still exactly 130 at normal sizes, so the bars stay
    // column-aligned, and never narrower than its own word at large ones.
    expect(block).toContain('minWidth: 130');
    expect(block).toContain('flexShrink: 1');
  });

  it('barRow may wrap, so the label can take the row to itself', () => {
    const block = styleBlock(src, 'barRow');
    expect(block).toContain('minHeight: 28'); // non-vacuity
    expect(block).toContain("flexWrap: 'wrap'");
  });

  it('barTrack keeps a readable floor so the wrap beats a stub bar', () => {
    const block = styleBlock(src, 'barTrack');
    expect(block).toContain('height: 10'); // non-vacuity
    expect(block).toMatch(/minWidth:\s*\d/);
  });
});

/**
 * T5 — the width rule, applied to the four rows that had no escape.
 * (Added 2026-08-21, art-direction Phase 1a item 1.3.)
 *
 * These are the same geometry as SW-36 and SW-51 above, found by the cold walk
 * rather than by the device: a text box whose width is "whatever the sibling
 * left over", inside a row that cannot wrap. When that leftover is narrower than
 * the longest word, iOS character-breaks it. The fix is the same two-part shape
 * both times — wrap on the row, and a floor on the text so the wrap actually
 * fires — which is the part that was missed the first time SW-36 was "fixed".
 */
describe('T5 / D23 — the Profile tier-explainer header had no escape', () => {
  const src = read('screens/ProfileScreen.tsx');

  it('tierHeaderRow may wrap', () => {
    const block = styleBlock(src, 'tierHeaderRow');
    expect(block).toContain("justifyContent: 'space-between'"); // non-vacuity
    expect(block).toContain("flexWrap: 'wrap'");
  });

  it('the title floors its width instead of taking the button\'s leftovers', () => {
    const block = styleBlock(src, 'tierHeaderTitle');
    expect(block).toContain('fontSize: 18'); // non-vacuity
    expect(NUMERIC_FLEX_BASIS.test(block)).toBe(false);
    expect(block).toMatch(/minWidth:\s*\d+/);
    expect(block).toContain('flexShrink: 1');
  });
});

describe('T5 / D24 — the two Tasks chrome rows had no escape', () => {
  const src = read('screens/TasksScreen.tsx');

  it('filterTriggerRow may wrap (its chips already measure their own text)', () => {
    const block = styleBlock(src, 'filterTriggerRow');
    expect(block).toContain('paddingHorizontal: spacing.lg'); // non-vacuity
    expect(block).toContain("flexWrap: 'wrap'");
  });

  it('searchRow may wrap AND the field carries the floor that makes it fire', () => {
    expect(styleBlock(src, 'searchRow')).toContain("flexWrap: 'wrap'");
    const input = styleBlock(src, 'searchInput');
    expect(input).toContain('minHeight: a11y.minTargetSize + 2'); // non-vacuity
    // flex:1 is basis 0 — without a floor the non-shrinking sibling button can
    // squeeze the field to a sliver instead of being pushed to its own line.
    expect(input).toMatch(/minWidth:\s*\d+/);
  });
});

describe('T5 / D4 + D20 — onboarding gives width back instead of capping the text', () => {
  const src = read('components/OnboardingCards.tsx');

  it('the card column widens at the recomposition point rather than shrinking the body', () => {
    // T5 prefers a wider column over a smaller multiplier. The default column is
    // ~310pt on a 390pt screen, which is narrower than "accessibility" needs
    // above ~2x — that is the "accessibili / ty" break captured at 3XL.
    expect(styleBlock(src, 'cardScrollContent')).toContain('paddingHorizontal: spacing.xxxl');
    expect(styleBlock(src, 'cardScrollContentWide')).toContain('paddingHorizontal: spacing.lg');
    expect(src).toContain('const wideColumn = isAxRecompose(fontScale);');
    expect(src).toContain('wideColumn && styles.cardScrollContentWide');
  });

  it("the body's own measure cap lifts with it, or the extra width is swallowed", () => {
    expect(styleBlock(src, 'body')).toContain('maxWidth: 360');
    expect(src).toContain('bodyWide: { maxWidth: undefined }');
    expect(src).toContain('wideColumn && styles.bodyWide');
  });

  it('the actions row may wrap (D20 — the sibling modal already did)', () => {
    const block = styleBlock(src, 'actions');
    expect(block).toContain('paddingHorizontal: spacing.xxl'); // non-vacuity
    expect(block).toContain("flexWrap: 'wrap'");
  });
});
