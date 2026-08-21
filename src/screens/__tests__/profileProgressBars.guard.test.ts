/**
 * SW-41 — the two Profile progress bars, and the one that lied about itself.
 *
 * ─── WHAT THE WALK SAW ────────────────────────────────────────────────────
 * On a real account at 90 points, Profile showed two bars stacked 46pt apart,
 * both filled to ~90%, reading as one bar accidentally drawn twice:
 *
 *     "Bronze tier, 90 of 100 points to Silver"
 *     "Progress toward Engaged badge, 90 of 100 points"
 *
 * ─── THE PREMISE DID NOT HOLD ─────────────────────────────────────────────
 * The obvious remedy — collapse them into one bar — would be wrong, and this
 * suite pins WHY so a later sweep does not do it by reflex.
 *
 *     tier cutoffs   0 -> 100 -> 500 -> 1500     (REPUTATION_TIERS)
 *     badge cutoffs  25 -> 100 -> 500 -> 1000    (points-category achievements)
 *
 * They coincide only in the 25-499 band, which happens to be the band the walk
 * observed. Below 25 and above 500 they target different numbers entirely.
 * Two tracks, genuinely different, that looked identical at one point on them.
 *
 * ─── THE REAL DEFECT, FOUND BESIDE IT ─────────────────────────────────────
 * The badge bar FILLS from the previous milestone — deliberate, so a user at 60
 * sees the 50->100 segment half full rather than a sliver — but it ANNOUNCED
 * `accessibilityValue={{ min: 0, ... }}`. At 300 points the bar was drawn at
 * (300-100)/(500-100) = 50% and announced as 300/500 = 60%. The picture and the
 * value disagreed everywhere past the first milestone (WCAG 1.3.1). The tier
 * bar beside it always reported its own band correctly; this one did not.
 *
 * House idiom: static source scan (cf. profileStatsSemantics.guard.test.ts).
 * ProfileScreen needs Supabase, navigation, a tab bar and auth to mount; the
 * property that broke is which value the progressbar reports, which is readable
 * here. The divergence half below is pure data and is checked for real.
 */
import fs from 'fs';
import path from 'path';
import { pointsMilestones } from '@/lib/achievements';
import { REPUTATION_TIERS } from '@/lib/reputationTier';
import { stripComments } from '../../__tests__/support/stripComments';

const src = stripComments(
  fs.readFileSync(path.join(__dirname, '..', 'ProfileScreen.tsx'), 'utf8'),
);

describe('SW-41 — the badge bar announces the range it draws', () => {
  it('milestoneProgress returns the segment start it fills from', () => {
    // The fill has always been computed from prevAt; the fix was to stop
    // throwing that number away so the announced range can use it too.
    expect(src).toContain('from: prevAt');
    // Non-vacuity: the fraction is still segment-relative, which is the whole
    // reason min cannot be 0.
    expect(src).toContain('const progress = span === 0 ? 0 : (points - prevAt) / span;');
  });

  it('the progressbar reports min as the segment start, never 0', () => {
    expect(src).toContain(
      'accessibilityValue={{ min: milestoneFrom, max: nextMilestone, now: points }}',
    );
    expect(src).not.toContain('accessibilityValue={{ min: 0, max: nextMilestone');
  });

  it('the tier bar still reports ITS own band — it was never the broken one', () => {
    // Must-not-regress: passes before and after. Pinned so a later "make them
    // consistent" edit cannot level the correct bar down to the broken one.
    expect(src).toContain(
      'accessibilityValue={{ min: tier.threshold, max: tier.nextThreshold, now: points }}',
    );
  });

  it('both bars are still rendered — this was not fixed by deleting one', () => {
    expect(src).toContain('accessibilityRole="progressbar"');
    expect(src.match(/accessibilityRole="progressbar"/g)).toHaveLength(2);
  });
});

describe('SW-41 — the two tracks are not duplicates, so they must not be merged', () => {
  const badgeCutoffs = pointsMilestones().map((m) => m.at);
  const tierCutoffs = REPUTATION_TIERS.map((t) => t.threshold).filter((t) => t > 0);

  it('the walk observed the one band where the two targets coincide', () => {
    // At 90 points: next tier threshold 100, next badge 100. Identical, which
    // is why the bars looked like duplicates in that screenshot.
    const nextBadge = badgeCutoffs.find((c) => c > 90);
    const nextTier = REPUTATION_TIERS.find((t) => (t.nextThreshold ?? Infinity) > 90)
      ?.nextThreshold;
    expect(nextBadge).toBe(100);
    expect(nextTier).toBe(100);
  });

  it('they diverge outside it — a single bar could not tell the truth', () => {
    // Below the first badge, and again above 500, the two answer differently.
    expect(badgeCutoffs.find((c) => c > 0)).toBe(25);
    expect(tierCutoffs.find((t) => t > 0)).toBe(100);

    const nextBadgeAt600 = badgeCutoffs.find((c) => c > 600);
    const nextTierAt600 = REPUTATION_TIERS.find((t) => (t.nextThreshold ?? Infinity) > 600)
      ?.nextThreshold;
    expect(nextBadgeAt600).toBe(1000);
    expect(nextTierAt600).toBe(1500);
    expect(nextBadgeAt600).not.toBe(nextTierAt600);
  });
});
