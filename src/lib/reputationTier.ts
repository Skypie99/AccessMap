/**
 * Reputation tier — pure derivation from the user's existing `points`
 * count. No new schema columns, no server work: a tier is "reached" iff
 * the user's current points cross its threshold.
 *
 * Tier ladder (Phase 7 thresholds — see docs/TRUST_SCORE_SPEC.md §2.1):
 *   • Bronze      0–99 pts  🥉  reopen requires 3 votes
 *   • Silver   100–499 pts  🥈  reopen requires 2 votes
 *   • Gold     500–1499 pts 🥇  reopen requires 1 vote
 *   • Platinum  1500+ pts   💎  reopen requires 1 vote
 *
 * `getTier(points)` returns the tier the user currently sits in.
 * `pointsToNextTier(points)` returns how many more points they need to
 * climb to the next tier, or 0 if they're already at Platinum.
 * `matchesTier(tierName, points)` returns true if the user's current tier
 * exactly matches the given tier name — useful for exact feature gates.
 *
 * All functions defensively clamp negative or non-finite input to 0 so
 * a transient bad value from the DB never throws or returns a bogus tier.
 */

export type ReputationTierName = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ReputationTier {
  name: ReputationTierName;
  /** Human-readable label, e.g. 'Bronze'. */
  label: string;
  /** Emoji glyph (retained for back-compat / tests — no longer rendered). */
  emoji: string;
  /** Lucide icon name for the tier badge (replaces the emoji for rendering). */
  icon: 'medal' | 'gem';
  /** Badge tint for the tier icon (metal / gem color). */
  color: string;
  /** Short description shown when a user taps their tier badge. */
  description: string;
  /** Minimum points needed to reach this tier. */
  threshold: number;
  /** Points needed to reach the next tier — null if this is the top tier. */
  nextThreshold: number | null;
  /**
   * Number of community reopen votes required when a user at this tier
   * initiates or contributes to a reopen request. Lower for higher tiers
   * because their track record earns faster action.
   */
  reopen_threshold: number;
}

// Ordered low → high. getTier walks from the top down and returns the
// first tier whose threshold the user's points meet or exceed, so adding
// a new tier means slotting it into this array in sort order — no other
// edits needed.
export const REPUTATION_TIERS: ReadonlyArray<ReputationTier> = [
  {
    name: 'bronze',
    label: 'Bronze',
    emoji: '🥉',
    icon: 'medal',
    color: '#C0884F',
    description: 'New contributor — keep reporting barriers to build trust.',
    threshold: 0,
    nextThreshold: 100,
    reopen_threshold: 3,
  },
  {
    name: 'silver',
    label: 'Silver',
    emoji: '🥈',
    icon: 'medal',
    color: '#9AA7B5',
    description: 'Trusted contributor — your reports are verified more quickly.',
    threshold: 100,
    nextThreshold: 500,
    reopen_threshold: 2,
  },
  {
    name: 'gold',
    label: 'Gold',
    emoji: '🥇',
    icon: 'medal',
    color: '#FBB024',
    description: 'Community leader — your verifications carry extra weight.',
    threshold: 500,
    nextThreshold: 1500,
    reopen_threshold: 1,
  },
  {
    name: 'platinum',
    label: 'Platinum',
    emoji: '💎',
    icon: 'gem',
    color: '#5AA9E6',
    description: "Anchor contributor — you're one of our most trusted voices.",
    threshold: 1500,
    nextThreshold: null,
    reopen_threshold: 1,
  },
];

/**
 * Coerce any incoming `points` value to a safe non-negative integer.
 * Handles null/undefined (treat as 0) and negative values (clamp to 0).
 * Non-finite (NaN, ±Infinity) also collapses to 0 — defensive against a
 * malformed `profile?.points` value bubbling up from the DB.
 */
function safePoints(points: number | null | undefined): number {
  if (points === null || points === undefined) return 0;
  if (!Number.isFinite(points)) return 0;
  if (points < 0) return 0;
  return points;
}

/**
 * Return the tier the user currently sits in based on their points.
 * Walks the ladder from highest to lowest and returns the first tier the
 * user qualifies for — guaranteed to return a tier because Bronze
 * starts at 0.
 */
export function getTier(points: number | null | undefined): ReputationTier {
  const p = safePoints(points);
  // Walk top → bottom: the first tier whose threshold we meet is ours.
  // noUncheckedIndexedAccess is on, so indexing returns `T | undefined`;
  // the explicit guard keeps the type narrowed even though Bronze (the
  // 0-threshold floor) makes the undefined branch unreachable in practice.
  for (let i = REPUTATION_TIERS.length - 1; i >= 0; i--) {
    const tier = REPUTATION_TIERS[i];
    if (tier && p >= tier.threshold) return tier;
  }
  // Unreachable: Bronze threshold is 0 and safePoints clamps to 0.
  // Return Bronze as a defensive fallback so the function is total.
  return REPUTATION_TIERS[0] as ReputationTier;
}

/**
 * Return how many more points the user needs to reach the next tier.
 * Returns 0 if they're already at the top tier (Platinum) — UI uses
 * that to render "you've reached the top" copy instead of a gap.
 */
export function pointsToNextTier(points: number | null | undefined): number {
  const p = safePoints(points);
  const tier = getTier(p);
  if (tier.nextThreshold === null) return 0;
  return tier.nextThreshold - p;
}

/**
 * Return true if the user's current tier exactly matches `tierName`.
 * Use for exact feature gates: e.g. `matchesTier('bronze', points)` to
 * detect Bronze-only state. For "Silver or above" gates, use
 * `!matchesTier('bronze', points)` or compare tier thresholds directly.
 */
export function matchesTier(
  tierName: ReputationTierName,
  points: number | null | undefined,
): boolean {
  return getTier(points).name === tierName;
}

/**
 * Return how far through the current tier the user is, as a 0–1 ratio.
 * Used to render the tier progress bar in ProfileScreen.
 *
 *   0.0 = just entered the tier (points === tier.threshold)
 *   1.0 = at or past the top of the tier; Platinum always returns 1.0
 *
 * Example: Silver spans 100–499 (band = 400).
 *   At 300 pts → (300-100)/400 = 0.5
 */
export function getNextTierProgress(points: number | null | undefined): number {
  const p = safePoints(points);
  const tier = getTier(p);
  if (tier.nextThreshold === null) return 1.0;
  const bandWidth = tier.nextThreshold - tier.threshold;
  if (bandWidth === 0) return 1.0;
  return (p - tier.threshold) / bandWidth;
}
