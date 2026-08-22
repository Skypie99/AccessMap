/**
 * BOARD 08 — the signed-in Profile's hero and lists, pinned.
 *
 * ─── WHY A SOURCE SCAN ────────────────────────────────────────────────────
 * The house idiom for this file, for the reason its two sibling guards already
 * state: ProfileScreen needs Supabase, navigation, a tab bar and auth to mount,
 * and what is protected here is composition and token discipline — which a
 * source scan can see and a render test would need the whole provider stack to
 * reach. The ONE half that is real data (which points values make the two
 * progress bars diverge) is computed against the shipped tables below.
 *
 * ─── WHAT THE CRITIC PASS AND THE BOARD SAW ───────────────────────────────
 *  · 30+ raw sizes in one makeStyles, including an off-scale 56 for the hero
 *    numeral and a 10 for the status-pill label — a screen written in numbers
 *    while the rest of the app was written in tokens.
 *  · Two progress bars 46pt apart, both filled to ~90%, reading as one bar
 *    drawn twice (SW-41) — and only one of them animated.
 *  · Three stat cards and seven nav cards: ten floating panes where the
 *    content is one summary and two lists.
 *  · The tier pill — the screen's gamification object — wearing the brand
 *    tint, which is the app's UTILITY colour (C4).
 */
import fs from 'fs';
import path from 'path';
import { pointsMilestones } from '@/lib/achievements';
import { getTier, REPUTATION_TIERS } from '@/lib/reputationTier';
import { font, size } from '@/theme';
import { stripComments } from '../../__tests__/support/stripComments';

const src = stripComments(
  fs.readFileSync(path.join(__dirname, '..', 'ProfileScreen.tsx'), 'utf8'),
);
const styles = src.slice(src.indexOf('const makeStyles = (color: ColorTheme) =>'));

describe('T1 / T2 — the signature numeral is on the type scale', () => {
  it('reads the display token, through the size PROP so tracking derives', () => {
    expect(src).toMatch(/variant="monoBold"\s*\n\s*size=\{font\.size\.display\}/);
    expect(font.size.display).toBe(48);
  });

  it('the off-scale 56 and its hand-computed line box are gone', () => {
    expect(styles).not.toContain('fontSize: 56');
    expect(styles).not.toContain('lineHeight: 74');
    expect(styles).toContain('lineHeight: font.lineHeight.display');
  });

  it('and it is capped like a display numeral, not left to grow', () => {
    expect(src).toMatch(/size=\{font\.size\.display\}\s*\n\s*maxFontSizeMultiplier=\{1\.3\}/);
  });
});

describe('token discipline — makeStyles states sizes, weights and radii as tokens', () => {
  it('no raw fontSize, fontWeight, letterSpacing or borderRadius survives', () => {
    expect(styles).not.toMatch(/fontSize: \d/);
    expect(styles).not.toMatch(/fontWeight: '\d/);
    expect(styles).not.toMatch(/letterSpacing: -?\d/);
    expect(styles).not.toMatch(/borderRadius: \d/);
    // Non-vacuity: the block really is the stylesheet.
    expect(styles.length).toBeGreaterThan(10_000);
    expect(styles).toContain('fontSize: font.size.');
  });

  it('the status-pill label takes the caption token, not an off-scale 10', () => {
    expect(styles).toMatch(/statusPillLabel: \{[\s\S]{0,200}?fontSize: font\.size\.caption/);
    expect(font.size.caption).toBe(11);
  });
});

describe('C4 — gold is the gamification colour, and the tier is gamification', () => {
  it('the tier pill sits on the gold pair, not the brand tint', () => {
    expect(styles).toMatch(/tierPill: \{[\s\S]{0,600}?backgroundColor: color\.goldLight/);
    expect(styles).toMatch(/tierPillLabel: \{[\s\S]{0,200}?color: color\.goldDark/);
    expect(styles).not.toMatch(/tierPill: \{[\s\S]{0,600}?backgroundColor: color\.brandSofter/);
  });
});

describe('SW-41 — one bar at a time, unless they point somewhere different', () => {
  it('the render gates the milestone bar on a real divergence', () => {
    expect(src).toContain('const showMilestoneBar =');
    expect(src).toMatch(/nextMilestone !== tier\.nextThreshold/);
    expect(src).toContain('{showMilestoneBar ? (');
  });

  it('BOTH bars still exist — this is not the merge the sibling guard forbids', () => {
    expect(src.match(/accessibilityRole="progressbar"/g)).toHaveLength(2);
  });

  it('the divergence is real data, not a hypothesis', () => {
    // The predicate the render uses, evaluated against the shipped tables.
    const badgeCutoffs = pointsMilestones().map((m) => m.at);
    const nextBadge = (pts: number) => badgeCutoffs.find((c) => c > pts) ?? null;
    const diverges = (pts: number) => {
      const t = getTier(pts);
      const nb = nextBadge(pts);
      return nb !== null && (t.nextThreshold === null || nb !== t.nextThreshold);
    };
    // 90 points is the frame the walk photographed: both targets are 100, so
    // one bar is the honest picture.
    expect(diverges(90)).toBe(false);
    // Below the first badge and above 500 they answer different questions, so
    // both bars earn their place.
    expect(diverges(10)).toBe(true); // badge 25 vs tier 100
    expect(diverges(600)).toBe(true); // badge 1000 vs tier 1500
    // Non-vacuity on the tables themselves.
    expect(REPUTATION_TIERS.map((t) => t.threshold)).toContain(100);
    expect(badgeCutoffs).toContain(25);
  });

  it('both bars fill on the same driver, gated the same way', () => {
    expect(src).toContain('const milestoneProgressAnim = useRef(new Animated.Value(0)).current;');
    // One reduced-motion gate per driver, and no bar left snapping while the
    // other eases.
    expect(src.match(/if \(reduceMotion\) \{\s*\n\s*\w+ProgressAnim\.setValue/g)).toHaveLength(2);
    expect(src).not.toMatch(/styles\.progressFill, \{ width: progressBarWidth \}/);
  });
});

describe('board 08 — ten panes become three cards', () => {
  it('the stat trio is one card with three cells', () => {
    expect(src).toMatch(/<GlassSurface\s*\n\s*variant="row"\s*\n\s*style=\{styles\.statsRow\}/);
    expect(styles).toContain('statCell:');
    expect(styles).not.toContain('statCard:');
  });

  it('the seven nav rows are two grouped cards with hairline seams', () => {
    expect(src.match(/style=\{styles\.navGroup\}/g)).toHaveLength(2);
    expect(src.match(/style=\{styles\.navRow\}/g)).toHaveLength(7);
    expect(src.match(/style=\{styles\.navSep\}/g)).toHaveLength(5);
    expect(styles).toMatch(/navSep: \{\s*\n\s*height: StyleSheet\.hairlineWidth/);
  });

  it('no nav row grew its own material back', () => {
    expect(src).not.toContain('styles.myReportsBtn}');
  });

  it('S6 — the rows are the shared list-row height', () => {
    expect(styles).toMatch(/navRow: \{[\s\S]{0,400}?minHeight: size\.row/);
    expect(size.row).toBe(64);
  });
});

describe('T4 — the four commit controls answer the finger', () => {
  it('save name, avatar, the default-tab pills and the realtime toggle all tick', () => {
    expect(src.match(/hapticSelection\(\);/g)).toHaveLength(4);
  });
});
