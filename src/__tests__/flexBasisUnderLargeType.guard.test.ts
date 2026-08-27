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
 *   1. None of them renders the severity PILL that amplified SW-36 — a control
 *      whose digit capped at 1.6 while its word scaled uncapped, so it grew
 *      without bound and took the width from the title beside it. They use
 *      fixed-size discs and dots, which do not balloon with fontScale.
 *      (2026-08-21: the pill is now retired app-wide, so the amplifier is gone
 *      from the whole app rather than merely absent from these four rows —
 *      which makes this reason stronger, not weaker.)
 *   2. All three modal rows already carry `minWidth: 0` on the row itself,
 *      which the Tasks header did not.
 *   3. NearbyFlagsModal `cardTitle` has since left this list by adoption
 *      rather than by sweep: that card renders `FlagCard` now, so its title is
 *      the very block the first describe below pins.
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
import { font } from '@/theme';
import { stripComments } from './support/stripComments';

const SRC = path.join(__dirname, '..');
const fontSizeXl = font.size.xl;

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

/**
 * RE-PINNED 2026-08-21 (Phase 2a) — same rule, new address.
 *
 * The Tasks card's header is now drawn by the shared `FlagCard`, which Home,
 * Nearby and Tasks all render. Two things follow, and the second is the reason
 * this had to be re-pinned rather than left alone:
 *
 *   1. The two badges that did the crushing are retired (Q20). But the SHAPE
 *      that produced SW-36 is not: a title beside a fixed disc, and in Nearby
 *      beside a non-shrinking distance, is the same geometry with different
 *      furniture. So the rule travels with the composition.
 *   2. `styleBlock` returns '' for a key that no longer exists in a file, and
 *      every assertion below passes vacuously against ''. Left pointed at
 *      TasksScreen, this suite would have gone green while checking nothing —
 *      which is the failure mode its own docblock warns about.
 *
 * The assertions themselves are unchanged, including the minWidth floor that
 * only the device found.
 */
describe('SW-36 — the flag card title must fit its own word', () => {
  const src = read('components/ui/FlagCard.tsx');

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

/**
 * SW-36's OTHER half — "the severity pill scaled on a different rule than its
 * own digit" — is gone from this file because the pill is gone from the app
 * (Q20, Phase 2a). It was the amplifier: a digit capped at 1.6 beside a word
 * that was uncapped by contract, so the pill grew without bound and took the
 * width from the title beside it.
 *
 * Severity is now a disc and a word inside one census sentence. A disc is a
 * fixed box that caps by its box, and the sentence is one text node in one
 * content block, so there is no longer a control whose two halves CAN scale
 * apart — the defect class is designed out rather than guarded.
 *
 * What replaced the pill's suite: components/ui/__tests__/FlagCard.dynamicType.test.tsx.
 */

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
    // RE-PINNED (GSP-06 token pass): the literal 18 became `font.size.xl`,
    // which IS 18. The non-vacuity check is the same one — that this block is
    // really the title's style and not an empty match — expressed against the
    // token now that the file states its sizes as tokens.
    expect(block).toContain('fontSize: font.size.xl'); // non-vacuity
    expect(fontSizeXl).toBe(18);
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
    const field = styleBlock(src, 'searchField');
    expect(field).toContain('minHeight: a11y.minTargetSize + 2'); // non-vacuity
    // flex:1 is basis 0 — without a floor the non-shrinking sibling button can
    // squeeze the field to a sliver instead of being pushed to its own line.
    expect(field).toMatch(/minWidth:\s*\d+/);
  });
});

describe('T5 / D4 + D20 — onboarding gives width back instead of capping the text', () => {
  const src = read('components/OnboardingCards.tsx');

  /**
   * RE-PINNED 2026-08-22 (Phase 2b, board 05). The rule did not change; the
   * layout it lives in did. The three assertions below used to name
   * `cardScrollContent` / `cardScrollContentWide` / `bodyWide` / the wrapping
   * `actions` row — every one of those belonged to the centred glass card that
   * this phase deleted. Left as they were they would have failed on a screen
   * that satisfies T5 BETTER than the one they were written for, which is the
   * one thing a guard must never do.
   *
   * What the same rule looks like on the new template:
   *   widen first ....... `hero` -> `heroWide` gives the side padding back
   *   then cap .......... ONBOARDING_BODY_MAX_FONT_SCALE, derived from the
   *                       widened column, replaces the `maxWidth: 360` measure
   *                       (the column IS the measure now — there is no card)
   *   and recompose ..... the CTA row STACKS rather than wrapping, which is the
   *                       stronger answer to the same overflow
   */
  it('the copy column widens at the recomposition point rather than shrinking the body', () => {
    // T5 prefers a wider column over a smaller multiplier. The default column is
    // ~342pt on a 390pt screen, which is narrower than "accessibility" needs
    // above ~2x — that is the "accessibili / ty" break captured at 3XL.
    expect(styleBlock(src, 'hero')).toContain('paddingHorizontal: spacing.xxl');
    expect(styleBlock(src, 'heroWide')).toContain('paddingHorizontal: spacing.lg');
    expect(src).toContain('const wide = isAxRecompose(fontScale);');
    expect(src).toContain('wide && styles.heroWide');
  });

  it('the body carries the width-derived cap, and it is the widened column that set it', () => {
    // The second half of T5, and it must be a NAMED number: a raw multiplier at
    // a call site is how the per-role caps drifted in the first place.
    expect(src).toContain('export const ONBOARDING_BODY_MAX_FONT_SCALE = 2;');
    expect(src).toContain('maxFontSizeMultiplier={ONBOARDING_BODY_MAX_FONT_SCALE}');
    // …and the heading above it is capped HIGHER, or T3's inversion is back on
    // the one screen where the title is the biggest thing in the app.
    expect(src).toContain('export const ONBOARDING_TITLE_MAX_FONT_SCALE = TYPE_BLOCK.header;');
    expect(src).toContain('maxFontSizeMultiplier={ONBOARDING_TITLE_MAX_FONT_SCALE}');
  });

  it('the CTA row stacks at the recomposition point (D20 — it used to overflow)', () => {
    const block = styleBlock(src, 'ctaRow');
    expect(block).toContain('paddingHorizontal: spacing.xxl'); // non-vacuity
    expect(block).toContain("flexDirection: 'row'");
    // Back + a 200pt primary cannot both hold their line at AX sizes. Stacking
    // is what wrapping was reaching for; the primary also has to give up its
    // fixed width or it stacks and stays 200pt wide in a full-bleed column.
    expect(styleBlock(src, 'ctaRowStacked')).toContain("flexDirection: 'column-reverse'");
    expect(src).toContain('primaryBtnWide: { width: undefined');
    expect(src).toContain('wide && styles.primaryBtnWide');
  });
});

/**
 * F4 — the status-bar ledge fades to its OWN colour, never to 'transparent'.
 *
 * Found on the device, not in review (2026-08-21). `'transparent'` in RN is
 * rgba(0,0,0,0), so a gradient ending there interpolates through BLACK and lays
 * a grey veil over whatever it covers: Home's stage measured #A6C8FB before the
 * ledge and #89A0C1 under it. The fix is the eight-digit twin — same colour,
 * zero alpha — and it is invisible only in that form.
 */
describe('F4 — the status ledge is invisible, not a grey veil', () => {
  it.each(['screens/HomeScreen.tsx', 'screens/SettingsScreen.tsx'])(
    '%s fades stage0 to its own zero-alpha twin',
    (rel) => {
      const src = read(rel);
      // Non-vacuity: the ledge has to exist.
      expect(src).toContain('styles.statusLedge');
      expect(src).toContain('colors={[color.stage0, `${color.stage0}00`]}');
      expect(src).not.toMatch(/colors=\{\[color\.stage0, 'transparent'\]\}/);
    },
  );

  it.each(['screens/HomeScreen.tsx', 'screens/SettingsScreen.tsx'])(
    '%s keeps the ledge pointer-inert and out of the a11y tree',
    (rel) => {
      const src = read(rel);
      const at = src.indexOf('styles.statusLedge');
      const block = src.slice(at, at + 200);
      expect(block).toContain('pointerEvents="none"');
      expect(block).toContain('decorativeProps');
    },
  );
});

/**
 * THE LAST TWO ROWS IN THE CLASS (art-direction Phase 3, 2026-08-22).
 *
 * The Phase 1a sweep took four rows (`tierHeaderRow`, `filterTriggerRow`,
 * `searchRow`, onboarding's actions) and the Phase 2a card work took the fifth.
 * Two were left, and they are the two shapes the earlier passes did not cover:
 * a chip rail that had nowhere to overflow TO, and a button row whose escape
 * hatch was shrinking type rather than changing shape.
 *
 * The docblock's central lesson applies to both, which is why each is pinned in
 * BOTH halves: a wrap that cannot fire, and a stack nothing opts into, are
 * changes that read as fixes and are not ones.
 */
describe('C10 — the activity filter rail can overflow onto a second line', () => {
  const src = read('components/ActivityFeedModal.tsx');

  it('the row may wrap', () => {
    const block = styleBlock(src, 'filterRow');
    // Non-vacuity: a renamed style empties the block and passes forever.
    expect(block).toContain("flexDirection: 'row'");
    expect(block).toContain("flexWrap: 'wrap'");
  });

  it('and the chip refuses to shrink, which is what MAKES it wrap', () => {
    // The half that is easy to miss. A chip that can shrink satisfies the row
    // by getting narrower than its own word — the character-breaking defect —
    // instead of moving to the next line. Same lesson as SW-36's minWidth
    // floor, in the shape a content-sized chip takes.
    const block = styleBlock(src, 'filterChip');
    expect(block).toContain('minHeight: 44');
    expect(block).toContain('flexShrink: 0');
    // …and it must stay content-sized. A numeric basis would pin it at one
    // width while its glyphs scale past 2x.
    expect(NUMERIC_FLEX_BASIS.test(block)).toBe(false);
    expect(BARE_FLEX_ONE.test(block)).toBe(false);
  });
});

describe('SW-36 class — the bulk-action bar stacks instead of shrinking its type', () => {
  const src = read('screens/TasksScreen.tsx');

  it('the four verbs are basis-zero in a row, which is why they need a fallback', () => {
    // Non-vacuity, and the statement of the hazard: this row IS the shape the
    // guard exists for. It is allowed to keep it, because it now has an exit.
    const block = styleBlock(src, 'bulkBtn');
    expect(block).toContain('minHeight: 44');
    expect(NUMERIC_FLEX_BASIS.test(block)).toBe(true);
  });

  it('and takes a real stack at the threshold, not a narrower row', () => {
    expect(styleBlock(src, 'bulkButtonRow')).toContain("flexDirection: 'row'");
    // A column: no flexDirection at all is RN's default, and adding 'row' here
    // would silently undo the whole fix, so assert the absence explicitly.
    const stack = styleBlock(src, 'bulkButtonStack');
    expect(stack).not.toContain("flexDirection: 'row'");
    expect(stack).toContain('gap');
    // In a column `flexBasis` means HEIGHT, so full width comes from
    // alignSelf — exactly what the cards' actionBtnFull does.
    expect(styleBlock(src, 'bulkBtnFull')).toContain("alignSelf: 'stretch'");
  });

  it('every one of the four buttons opts in, not just the two that clipped', () => {
    // Three of four would leave a stack with one button still sized by a
    // basis of zero in a column — a 0pt-tall control. Count, do not sample.
    expect((src.match(/compactActions && styles\.bulkBtnFull/g) ?? []).length).toBe(4);
    expect(src).toContain('compactActions ? styles.bulkButtonStack : styles.bulkButtonRow');
  });

  it('at the SAME threshold the cards use, so the screen changes shape at once', () => {
    // The bar and the cards disagreeing about how wide the device is would be
    // a worse bug than the one being fixed: a stacked bar under a tiered card
    // row, or the reverse, at one specific text size.
    expect(src).toContain('const compactActions = isCompactLayout(windowWidth, fontScale);');
    expect(src).toContain('compactActions ? styles.cardActionsStack : styles.cardActionsRow');
  });
});
