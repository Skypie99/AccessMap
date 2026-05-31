import { REPUTATION_TIERS, getTier, matchesTier, pointsToNextTier } from '../reputationTier';

describe('reputationTier', () => {
  describe('REPUTATION_TIERS catalog', () => {
    it('contains all four tiers in ascending threshold order', () => {
      expect(REPUTATION_TIERS).toHaveLength(4);
      expect(REPUTATION_TIERS.map((t) => t.name)).toEqual(['bronze', 'silver', 'gold', 'platinum']);
    });

    it('has matching label/emoji/threshold for each tier', () => {
      expect(REPUTATION_TIERS[0]).toMatchObject({
        name: 'bronze',
        label: 'Bronze',
        emoji: '🥉',
        threshold: 0,
        nextThreshold: 100,
      });
      expect(REPUTATION_TIERS[1]).toMatchObject({
        name: 'silver',
        label: 'Silver',
        emoji: '🥈',
        threshold: 100,
        nextThreshold: 500,
      });
      expect(REPUTATION_TIERS[2]).toMatchObject({
        name: 'gold',
        label: 'Gold',
        emoji: '🥇',
        threshold: 500,
        nextThreshold: 1500,
      });
      expect(REPUTATION_TIERS[3]).toMatchObject({
        name: 'platinum',
        label: 'Platinum',
        emoji: '💎',
        threshold: 1500,
        nextThreshold: null,
      });
    });

    it('chains thresholds — each tier nextThreshold matches the next tier threshold', () => {
      for (let i = 0; i < REPUTATION_TIERS.length - 1; i++) {
        const cur = REPUTATION_TIERS[i];
        const nxt = REPUTATION_TIERS[i + 1];
        expect(cur).toBeDefined();
        expect(nxt).toBeDefined();
        expect(cur!.nextThreshold).toBe(nxt!.threshold);
      }
    });

    it('has correct reopen_threshold per tier', () => {
      expect(REPUTATION_TIERS[0]!.reopen_threshold).toBe(3); // bronze
      expect(REPUTATION_TIERS[1]!.reopen_threshold).toBe(2); // silver
      expect(REPUTATION_TIERS[2]!.reopen_threshold).toBe(1); // gold
      expect(REPUTATION_TIERS[3]!.reopen_threshold).toBe(1); // platinum
    });

    it('all tiers have a reopen_threshold > 0', () => {
      for (const t of REPUTATION_TIERS) {
        expect(t.reopen_threshold).toBeGreaterThan(0);
      }
    });
  });

  describe('getTier — boundary behavior', () => {
    it('returns Bronze at 0 points', () => {
      expect(getTier(0).name).toBe('bronze');
    });

    it('returns Bronze at 99 points (one below Silver)', () => {
      expect(getTier(99).name).toBe('bronze');
    });

    it('returns Silver at exactly 100 points (Silver threshold)', () => {
      expect(getTier(100).name).toBe('silver');
    });

    it('returns Silver at 499 points (one below Gold)', () => {
      expect(getTier(499).name).toBe('silver');
    });

    it('returns Gold at exactly 500 points (Gold threshold)', () => {
      expect(getTier(500).name).toBe('gold');
    });

    it('returns Gold at 1499 points (one below Platinum)', () => {
      expect(getTier(1499).name).toBe('gold');
    });

    it('returns Platinum at exactly 1500 points (Platinum threshold)', () => {
      expect(getTier(1500).name).toBe('platinum');
    });

    it('returns Platinum at 5000 points (well above threshold)', () => {
      expect(getTier(5000).name).toBe('platinum');
    });
  });

  describe('getTier — defensive input handling', () => {
    it('treats negative points as 0 (Bronze)', () => {
      expect(getTier(-5).name).toBe('bronze');
      expect(getTier(-9999).name).toBe('bronze');
    });

    it('treats undefined as 0 (Bronze)', () => {
      expect(getTier(undefined).name).toBe('bronze');
    });

    it('treats null as 0 (Bronze)', () => {
      expect(getTier(null).name).toBe('bronze');
    });

    it('treats NaN as 0 (Bronze)', () => {
      expect(getTier(NaN).name).toBe('bronze');
    });

    it('treats Infinity as 0 (Bronze) — defensive against bad DB data', () => {
      expect(getTier(Infinity).name).toBe('bronze');
      expect(getTier(-Infinity).name).toBe('bronze');
    });
  });

  describe('getTier — returns matching label and emoji', () => {
    it('Bronze tier: label "Bronze" + emoji "🥉"', () => {
      const t = getTier(50);
      expect(t.label).toBe('Bronze');
      expect(t.emoji).toBe('🥉');
    });

    it('Silver tier: label "Silver" + emoji "🥈"', () => {
      const t = getTier(250);
      expect(t.label).toBe('Silver');
      expect(t.emoji).toBe('🥈');
    });

    it('Gold tier: label "Gold" + emoji "🥇"', () => {
      const t = getTier(750);
      expect(t.label).toBe('Gold');
      expect(t.emoji).toBe('🥇');
    });

    it('Platinum tier: label "Platinum" + emoji "💎"', () => {
      const t = getTier(2000);
      expect(t.label).toBe('Platinum');
      expect(t.emoji).toBe('💎');
    });
  });

  describe('getTier — reopen_threshold via tier object', () => {
    it('Bronze user gets reopen_threshold 3', () => {
      expect(getTier(0).reopen_threshold).toBe(3);
      expect(getTier(99).reopen_threshold).toBe(3);
    });

    it('Silver user gets reopen_threshold 2', () => {
      expect(getTier(100).reopen_threshold).toBe(2);
      expect(getTier(499).reopen_threshold).toBe(2);
    });

    it('Gold user gets reopen_threshold 1', () => {
      expect(getTier(500).reopen_threshold).toBe(1);
      expect(getTier(1499).reopen_threshold).toBe(1);
    });

    it('Platinum user gets reopen_threshold 1', () => {
      expect(getTier(1500).reopen_threshold).toBe(1);
      expect(getTier(9999).reopen_threshold).toBe(1);
    });
  });

  describe('pointsToNextTier — gap to next tier', () => {
    it('returns 100 at 0 points (100 → Silver)', () => {
      expect(pointsToNextTier(0)).toBe(100);
    });

    it('returns 1 at 99 points (1 → Silver)', () => {
      expect(pointsToNextTier(99)).toBe(1);
    });

    it('returns 400 at 100 points (400 → Gold)', () => {
      expect(pointsToNextTier(100)).toBe(400);
    });

    it('returns 1 at 499 points (1 → Gold)', () => {
      expect(pointsToNextTier(499)).toBe(1);
    });

    it('returns 1000 at 500 points (1000 → Platinum)', () => {
      expect(pointsToNextTier(500)).toBe(1000);
    });

    it('returns 1 at 1499 points (1 → Platinum)', () => {
      expect(pointsToNextTier(1499)).toBe(1);
    });

    it('returns 0 at exactly 1500 points (Platinum — top tier)', () => {
      expect(pointsToNextTier(1500)).toBe(0);
    });

    it('returns 0 at 5000 points (well into Platinum)', () => {
      expect(pointsToNextTier(5000)).toBe(0);
    });
  });

  describe('pointsToNextTier — defensive input handling', () => {
    it('treats negative points as 0 — needs 100 to reach Silver', () => {
      expect(pointsToNextTier(-5)).toBe(100);
    });

    it('treats undefined as 0 — needs 100 to reach Silver', () => {
      expect(pointsToNextTier(undefined)).toBe(100);
    });

    it('treats null as 0 — needs 100 to reach Silver', () => {
      expect(pointsToNextTier(null)).toBe(100);
    });

    it('treats NaN as 0 — needs 100 to reach Silver', () => {
      expect(pointsToNextTier(NaN)).toBe(100);
    });
  });

  describe('matchesTier — exact tier match', () => {
    it('returns true when user is exactly at the specified tier', () => {
      expect(matchesTier('bronze', 0)).toBe(true);
      expect(matchesTier('bronze', 99)).toBe(true);
      expect(matchesTier('silver', 100)).toBe(true);
      expect(matchesTier('silver', 499)).toBe(true);
      expect(matchesTier('gold', 500)).toBe(true);
      expect(matchesTier('gold', 1499)).toBe(true);
      expect(matchesTier('platinum', 1500)).toBe(true);
      expect(matchesTier('platinum', 9999)).toBe(true);
    });

    it('returns false when user is at a different tier', () => {
      expect(matchesTier('silver', 0)).toBe(false);
      expect(matchesTier('gold', 0)).toBe(false);
      expect(matchesTier('platinum', 0)).toBe(false);
      expect(matchesTier('bronze', 100)).toBe(false);
      expect(matchesTier('gold', 100)).toBe(false);
      expect(matchesTier('bronze', 500)).toBe(false);
      expect(matchesTier('bronze', 1500)).toBe(false);
    });

    it('treats defensive inputs as Bronze (same as getTier)', () => {
      expect(matchesTier('bronze', null)).toBe(true);
      expect(matchesTier('bronze', undefined)).toBe(true);
      expect(matchesTier('bronze', NaN)).toBe(true);
      expect(matchesTier('bronze', -10)).toBe(true);
      expect(matchesTier('silver', null)).toBe(false);
    });

    it('boundary: 99 is still Bronze (not Silver)', () => {
      expect(matchesTier('bronze', 99)).toBe(true);
      expect(matchesTier('silver', 99)).toBe(false);
    });

    it('boundary: 100 is Silver (not Bronze)', () => {
      expect(matchesTier('silver', 100)).toBe(true);
      expect(matchesTier('bronze', 100)).toBe(false);
    });

    it('boundary: 1499 is still Gold (not Platinum)', () => {
      expect(matchesTier('gold', 1499)).toBe(true);
      expect(matchesTier('platinum', 1499)).toBe(false);
    });

    it('boundary: 1500 is Platinum (not Gold)', () => {
      expect(matchesTier('platinum', 1500)).toBe(true);
      expect(matchesTier('gold', 1500)).toBe(false);
    });
  });
});
