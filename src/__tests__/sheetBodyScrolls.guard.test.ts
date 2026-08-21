/**
 * A sheet that can shrink must SCROLL its body, never clip it.
 *
 * ─── THE BUG THIS PINS ────────────────────────────────────────────────────
 * The profile sheet family is built on Recipe F: `backdrop(flex:1) → KAV →
 * cardWrap → card`, with the percentage cap on the KAV (G6/SR-099) and the card
 * free to `flexShrink` into it. That shrink is deliberate. What it means, and
 * what two sheets forgot, is that the card is NOT guaranteed to be as tall as
 * its content — and the card also sets `overflow: 'hidden'`, so anything that
 * does not fit is CLIPPED rather than scrolled.
 *
 * Measured on the sim walk, signed in, keyboard closed, 440x956:
 *
 *   C9  Achievements   card 692pt   no KAV   content fine (its body scrolls)
 *   C10 ActivityFeed   card 692pt   no KAV   content fine (its body scrolls)
 *   C11 MyReports      card 500pt   KAV      list viewport 198pt, ~1.5 of 6 cards
 *   C12 MyWatched      card 352pt   KAV      empty-state instruction 100% invisible
 *
 * C12 is the one that lost content outright. Its empty state was a bare <View>,
 * so "Open any flag on the map or in Tasks and tap Watch to track it here."
 * rendered at y836 while the card ended at y822 — present in the accessibility
 * tree, invisible on screen, on the one screen whose entire job is to explain
 * how to get out of being empty. Identical on the 390x844 17e, where the card
 * measured 354pt against 352pt on the larger phone: essentially CONSTANT across
 * a 112pt difference in screen height, which is what shrink-to-fit looks like
 * and what a mis-evaluated percentage does not.
 *
 * C11 degraded instead of breaking, for one reason: its states live inside a
 * FlatList (empty via ListEmptyComponent), and a FlatList scrolls. Same cause,
 * different outcome — which is the clearest evidence for the rule below.
 *
 * ─── THE REFERENCE ────────────────────────────────────────────────────────
 * FeedbackModal is Recipe F's pinned reference implementation and carries the
 * SAME four-layer stack, including cardWrap. It never clipped, because its body
 * is a ScrollView with `flexShrink: 1`. So this is not a new pattern — it is the
 * house pattern, applied to the two sheets that skipped it.
 *
 * ─── WHAT THIS TEST ENFORCES ──────────────────────────────────────────────
 * For each sheet that shrinks: a body scroller exists, it can shrink
 * (flexShrink), and the virtualized list is NOT nested inside it (that is its
 * own bug). Geometry itself is invisible to jest, so this pins the structure
 * that produces it.
 *
 * House idiom: static source scan (cf. keyboardClass.guard.test.ts, whose
 * docblock explains why the cap lives on the KAV in the first place).
 */
import fs from 'fs';
import path from 'path';

const SRC = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(SRC, rel), 'utf8');

/** Blank out comments, preserving line numbers, so prose never matches. */
function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/\/\/[^\n]*/g, blank);
}

const SHRINKING_SHEETS = [
  ['MyWatchedModal', 'components/MyWatchedModal.tsx'],
  ['MyReportsModal', 'components/MyReportsModal.tsx'],
] as const;

describe('SW-42 — a shrinking sheet scrolls its body instead of clipping it', () => {
  it.each(SHRINKING_SHEETS)('%s still has the shape that makes this necessary', (_n, rel) => {
    // Non-vacuity. If a sheet stops shrinking, or stops clipping its overflow,
    // the rule below is pinning a hazard that no longer exists and should be
    // re-derived rather than left passing for the wrong reason.
    const src = stripComments(read(rel));
    expect(src).toMatch(/flexShrink:\s*1/);
    expect(src).toMatch(/overflow:\s*'hidden'/);
  });

  it.each(SHRINKING_SHEETS)('%s gives its body a scroller that can shrink', (_n, rel) => {
    const src = stripComments(read(rel));
    expect(src).toContain('styles.stateBody');
    // flexShrink is the load-bearing half: a scroller that cannot shrink still
    // overflows the card, and overflow:'hidden' still eats it.
    expect(src).toMatch(/stateBody:\s*\{[^}]*flexShrink:\s*1/);
  });

  it('MyWatched routes EVERY non-list state through that scroller', () => {
    // The empty state is the one that lost content, so name it directly.
    const src = stripComments(read('components/MyWatchedModal.tsx'));
    const scroller = src.indexOf('styles.stateBody');
    expect(scroller).toBeGreaterThan(-1);
    const empty = src.indexOf('No watched flags yet');
    expect(empty).toBeGreaterThan(scroller);
  });

  it.each(SHRINKING_SHEETS)('%s does NOT nest its VirtualizedList in that scroller', (_n, rel) => {
    // Wrapping a FlatList in a ScrollView trades a clipping bug for a
    // virtualization one. The list already scrolls; it never needed wrapping.
    // The two sheets order these differently — MyWatched hoists the list above
    // the scroller, MyReports' scroller is its loading branch and comes first —
    // so this asserts CONTAINMENT, not order.
    const src = stripComments(read(rel));
    const open = src.indexOf('styles.stateBody');
    expect(open).toBeGreaterThan(-1);
    const close = src.indexOf('</ScrollView>', open);
    expect(close).toBeGreaterThan(open);
    const list = src.indexOf('<FlatList');
    expect(list).toBeGreaterThan(-1);
    expect(list > open && list < close).toBe(false);
  });
});

describe('SW-45 — every sheet in the family clears the tab bar', () => {
  it('the leaderboard sheet reserves the tab bar height', () => {
    // It ran flush to the screen bottom and painted list rows over a ghosted
    // "Home / Tasks / Profile", red Tasks badge and all, while its four sibling
    // sheets stopped above the bar. Sky's call: all sheets clear it.
    const src = stripComments(read('screens/LeaderboardScreen.tsx'));
    expect(src).toMatch(/paddingBottom:\s*Math\.max\([^)]*tabBarHeight/);
  });

  it('it reads that height the non-throwing way', () => {
    // useBottomTabBarHeight() throws with no navigator above it, and the render
    // tests mount this sheet standalone — the same reason this file already
    // reads SafeAreaInsetsContext through useContext with a fallback.
    const src = stripComments(read('screens/LeaderboardScreen.tsx'));
    expect(src).toMatch(/useContext\(BottomTabBarHeightContext\)\s*\?\?\s*0/);
    expect(src).not.toContain('useBottomTabBarHeight()');
  });
});
