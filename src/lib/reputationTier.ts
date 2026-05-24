/**
 * Reputation tier — pure derivation from the user's existing `points`
 * count. No new schema columns, no server work: a tier is "reached" iff
 * the user's current points cross its threshold.
 *
 * Tier ladder:
 *   • Bronze    0+ pts  🥉
 *   • Silver   10+ pts  🥈
 *   • Gold     50+ pts  🥇
 *   • Platinum 200+ pts 💎
 *
 * `getTier(points)` returns the tier the user currently sits in.
 * `pointsToNextTier(points)` returns how many more points they need to
 * climb to the next tier, or 0 if they're already at Platinum.
 *
 * Both functions defensively clamp negative or non-finite input to 0 so
 * a transient bad value from the DB never throws or returns a bogus tier.
 */

export type ReputationTierName = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface ReputationTier {
  name: ReputationTierName;
  /** Human-readable label, e.g. 'Bronze'. */
  label: string;
  /** Emoji glyph rendered as the visual badge. Decorative — hide from SR. */
  emoji: string;
  /** Minimum points needed to reach this tier. */
  threshold: number;
  /** Points needed to reach the next tier — null if this is the top tier. */
  nextThreshold: number | null;
}

// Ordered low → high. getTier walks from the top down and returns the
// first tier whose threshold the user's points meet or exceed, so adding
// a new tier means slotting it into this array in sort order — no other
// edits needed.
export const REPUTATION_TIERS: ReadonlyArray<ReputationTier> = [
  { name: 'bronze', label: 'Bronze', emoji: '🥉', threshold: 0, nextThreshold: 10 },
  { name: 'silver', label: 'Silver', emoji: '🥈', threshold: 10, nextThreshold: 50 },
  { name: 'gold', label: 'Gold', emoji: '🥇', threshold: 50, nextThreshold: 200 },
  { name: 'platinum', label: 'Platinum', emoji: '💎', threshold: 200, nextThreshold: null },
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
