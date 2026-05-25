import {
  REPUTATION_TIERS,
  getTier,
  pointsToNextTier,
} from '../reputationTier';

describe('reputationTier', () => {
  describe('REPUTATION_TIERS catalog', () => {
    it('contains all four tiers in ascending threshold order', () => {
      expect(REPUTATION_TIERS).toHaveLength(4);
      expect(REPUTATION_TIERS.map((t) => t.name)).toEqual([
        'bronze',
        'silver',
        'gold',
        'platinum',
      ]);
    });

    it('has matching label/emoji/threshold for each tier', () => {
      expect(REPUTATION_TIERS[0]).toMatchObject({
        name: 'bronze',
        label: 'Bronze',
        emoji: '🥉',
        threshold: 0,
        nextThreshold: 10,
      });
      expect(REPUTATION_TIERS[1]).toMatchObject({
        name: 'silver',
        label: 'Silver',
        emoji: '🥈',
        threshold: 10,
        nextThreshold: 50,
      });
      expect(REPUTATION_TIERS[2]).toMatchObject({
        name: 'gold',
        label: 'Gold',
        emoji: '🥇',
        threshold: 50,
        nextThreshold: 200,
      });
      expect(REPUTATION_TIERS[3]).toMatchObject({
        name: 'platinum',
        label: 'Platinum',
        emoji: '💎',
        threshold: 200,
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
  });

  describe('getTier — boundary behavior', () => {
    it('returns Bronze at 0 points', () => {
      expect(getTier(0).name).toBe('bronze');
    });

    it('returns Bronze at 9 points (one below Silver)', () => {
      expect(getTier(9).name).toBe('bronze');
    });

    it('returns Silver at exactly 10 points (Silver threshold)', () => {
      expect(getTier(10).name).toBe('silver');
    });

    it('returns Silver at 49 points (one below Gold)', () => {
      expect(getTier(49).name).toBe('silver');
    });

    it('returns Gold at exactly 50 points (Gold threshold)', () => {
      expect(getTier(50).name).toBe('gold');
    });

    it('returns Gold at 199 points (one below Platinum)', () => {
      expect(getTier(199).name).toBe('gold');
    });

    it('returns Platinum at exactly 200 points (Platinum threshold)', () => {
      expect(getTier(200).name).toBe('platinum');
    });

    it('returns Platinum at 1000 points (well above threshold)', () => {
      expect(getTier(1000).name).toBe('platinum');
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
      const t = getTier(5);
      expect(t.label).toBe('Bronze');
      expect(t.emoji).toBe('🥉');
    });

    it('Silver tier: label "Silver" + emoji "🥈"', () => {
      const t = getTier(25);
      expect(t.label).toBe('Silver');
      expect(t.emoji).toBe('🥈');
    });

    it('Gold tier: label "Gold" + emoji "🥇"', () => {
      const t = getTier(100);
      expect(t.label).toBe('Gold');
      expect(t.emoji).toBe('🥇');
    });

    it('Platinum tier: label "Platinum" + emoji "💎"', () => {
      const t = getTier(500);
      expect(t.label).toBe('Platinum');
      expect(t.emoji).toBe('💎');
    });
  });

  describe('pointsToNextTier — gap to next tier', () => {
    it('returns 10 at 0 points (10 → Silver)', () => {
      expect(pointsToNextTier(0)).toBe(10);
    });

    it('returns 1 at 9 points (1 → Silver)', () => {
      expect(pointsToNextTier(9)).toBe(1);
    });

    it('returns 40 at 10 points (40 → Gold)', () => {
      expect(pointsToNextTier(10)).toBe(40);
    });

    it('returns 1 at 49 points (1 → Gold)', () => {
      expect(pointsToNextTier(49)).toBe(1);
    });

    it('returns 150 at 50 points (150 → Platinum)', () => {
      expect(pointsToNextTier(50)).toBe(150);
    });

    it('returns 1 at 199 points (1 → Platinum)', () => {
      expect(pointsToNextTier(199)).toBe(1);
    });

    it('returns 0 at exactly 200 points (Platinum — top tier)', () => {
      expect(pointsToNextTier(200)).toBe(0);
    });

    it('returns 0 at 1000 points (well into Platinum)', () => {
      expect(pointsToNextTier(1000)).toBe(0);
    });
  });

  describe('pointsToNextTier — defensive input handling', () => {
    it('treats negative points as 0 — needs 10 to reach Silver', () => {
      expect(pointsToNextTier(-5)).toBe(10);
    });

    it('treats undefined as 0 — needs 10 to reach Silver', () => {
      expect(pointsToNextTier(undefined)).toBe(10);
    });

    it('treats null as 0 — needs 10 to reach Silver', () => {
      expect(pointsToNextTier(null)).toBe(10);
    });

    it('treats NaN as 0 — needs 10 to reach Silver', () => {
      expect(pointsToNextTier(NaN)).toBe(10);
    });
  });
});
