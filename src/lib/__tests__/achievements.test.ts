import { ACHIEVEMENTS_CATALOG, computeAchievements, countEarned } from '../achievements';

describe('catalog', () => {
  it('has at least one badge per category', () => {
    const categories = new Set(ACHIEVEMENTS_CATALOG.map((a) => a.category));
    expect(categories.has('reporting')).toBe(true);
    expect(categories.has('resolution')).toBe(true);
    expect(categories.has('points')).toBe(true);
    expect(categories.has('streak')).toBe(true);
  });

  it('has unique ids', () => {
    const ids = ACHIEVEMENTS_CATALOG.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all thresholds are positive integers', () => {
    for (const a of ACHIEVEMENTS_CATALOG) {
      expect(a.threshold).toBeGreaterThan(0);
      expect(Number.isInteger(a.threshold)).toBe(true);
    }
  });
});

describe('computeAchievements', () => {
  it('returns the full catalog with no badges earned for a blank user', () => {
    const result = computeAchievements({
      reported: 0,
      resolved: 0,
      points: 0,
      longestStreak: 0,
    });
    expect(result).toHaveLength(ACHIEVEMENTS_CATALOG.length);
    expect(result.every((a) => !a.earned)).toBe(true);
  });

  it('marks a badge earned exactly when progress >= threshold', () => {
    const result = computeAchievements({
      reported: 1,
      resolved: 0,
      points: 0,
      longestStreak: 0,
    });
    const firstSteps = result.find((a) => a.id === 'first_steps');
    expect(firstSteps?.earned).toBe(true);
    expect(firstSteps?.progress).toBe(1);
    // Active Reporter (threshold 10) should still be unearned.
    const active = result.find((a) => a.id === 'active_reporter');
    expect(active?.earned).toBe(false);
    expect(active?.progress).toBe(1);
  });

  it('treats progress equal to threshold as earned (boundary case)', () => {
    const result = computeAchievements({
      reported: 0,
      resolved: 0,
      points: 25, // exactly the Welcome Aboard threshold
      longestStreak: 0,
    });
    expect(result.find((a) => a.id === 'welcome_aboard')?.earned).toBe(true);
  });

  it('does not earn a badge for progress one short of the threshold', () => {
    const result = computeAchievements({
      reported: 0,
      resolved: 0,
      points: 24,
      longestStreak: 0,
    });
    expect(result.find((a) => a.id === 'welcome_aboard')?.earned).toBe(false);
  });

  it('earns badges across all four categories independently', () => {
    const result = computeAchievements({
      reported: 12,
      resolved: 11,
      points: 150,
      longestStreak: 3,
    });
    const earnedIds = result.filter((a) => a.earned).map((a) => a.id);
    expect(earnedIds).toContain('first_steps');
    expect(earnedIds).toContain('active_reporter');
    expect(earnedIds).toContain('first_resolution');
    expect(earnedIds).toContain('resolution_hero');
    expect(earnedIds).toContain('welcome_aboard');
    expect(earnedIds).toContain('engaged');
    expect(earnedIds).toContain('two_day_streak');
    // Still unearned:
    expect(earnedIds).not.toContain('prolific_reporter'); // needs 50 reports
    expect(earnedIds).not.toContain('week_streak'); // needs 7 days
    expect(earnedIds).not.toContain('dedicated'); // needs 500 pts
  });

  it('earns all badges for a power user', () => {
    const result = computeAchievements({
      reported: 999,
      resolved: 999,
      points: 99999,
      longestStreak: 999,
    });
    expect(result.every((a) => a.earned)).toBe(true);
  });

  it('preserves catalog order in the output', () => {
    const result = computeAchievements({
      reported: 0,
      resolved: 0,
      points: 0,
      longestStreak: 0,
    });
    expect(result.map((a) => a.id)).toEqual(ACHIEVEMENTS_CATALOG.map((a) => a.id));
  });

  it('is pure — same input yields same output', () => {
    const input = {
      reported: 5,
      resolved: 2,
      points: 50,
      longestStreak: 3,
    };
    const a = computeAchievements(input);
    const b = computeAchievements(input);
    expect(a).toEqual(b);
    expect(a).not.toBe(b); // different array references — defensive copy
  });
});

describe('countEarned', () => {
  it('returns 0 / total for a blank user', () => {
    const { earned, total } = countEarned({
      reported: 0,
      resolved: 0,
      points: 0,
      longestStreak: 0,
    });
    expect(earned).toBe(0);
    expect(total).toBe(ACHIEVEMENTS_CATALOG.length);
  });

  it('counts earned badges across all categories', () => {
    const { earned } = countEarned({
      reported: 1, // first_steps
      resolved: 1, // first_resolution
      points: 25, // welcome_aboard
      longestStreak: 2, // two_day_streak
    });
    expect(earned).toBe(4);
  });

  it('matches the number computed via computeAchievements', () => {
    const stats = {
      reported: 50,
      resolved: 10,
      points: 100,
      longestStreak: 7,
    };
    const fromCompute = computeAchievements(stats).filter((a) => a.earned).length;
    const { earned } = countEarned(stats);
    expect(earned).toBe(fromCompute);
  });
});
