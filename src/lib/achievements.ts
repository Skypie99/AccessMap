/**
 * Achievement badges — pure derivation from existing stats. No new data,
 * no server columns: a badge is "earned" iff the user's current counters
 * cross the threshold.
 *
 * Catalog axes:
 *   • Reporting    — how many flags you've submitted
 *   • Resolution   — how many of your flags reached "resolved"
 *   • Points       — total points (verify/resolve actions on any flag)
 *   • Streak       — longest consecutive-day Profile visit run
 *
 * `computeAchievements(stats)` returns the full catalog with each badge's
 * `earned` flag set. Easy to render either way (show all, show earned
 * only, etc.) without re-computing.
 */

export type AchievementCategory = 'reporting' | 'resolution' | 'points' | 'streak';

export interface AchievementStats {
  /** Total flags the user has reported (any status). */
  reported: number;
  /** Of those, how many reached 'resolved'. */
  resolved: number;
  /** Lifetime points (verify/resolve actions). */
  points: number;
  /** Longest consecutive-day visit run ever recorded. */
  longestStreak: number;
}

export interface Achievement {
  id: string;
  category: AchievementCategory;
  title: string;
  description: string;
  /** Emoji glyph rendered as the visual badge. */
  icon: string;
  /** The numeric threshold the relevant stat must reach. */
  threshold: number;
  /** Stat name this badge tracks — used by the UI to show progress. */
  statKey: keyof AchievementStats;
  /** Set by computeAchievements based on the supplied stats. */
  earned: boolean;
  /** Current value of the relevant stat — useful for "X / Y" progress display. */
  progress: number;
}

const CATALOG: Omit<Achievement, 'earned' | 'progress'>[] = [
  // Reporting
  {
    id: 'first_steps',
    category: 'reporting',
    title: 'First Steps',
    description: 'Report your first flag.',
    icon: 'footprints',
    threshold: 1,
    statKey: 'reported',
  },
  {
    id: 'active_reporter',
    category: 'reporting',
    title: 'Active Reporter',
    description: 'Report 10 flags.',
    icon: 'pen-line',
    threshold: 10,
    statKey: 'reported',
  },
  {
    id: 'prolific_reporter',
    category: 'reporting',
    title: 'Prolific Reporter',
    description: 'Report 50 flags.',
    icon: 'folder-open',
    threshold: 50,
    statKey: 'reported',
  },
  // Resolution
  {
    id: 'first_resolution',
    category: 'resolution',
    title: 'First Resolution',
    description: 'Have one of your reports resolved.',
    icon: 'circle-check',
    threshold: 1,
    statKey: 'resolved',
  },
  {
    id: 'resolution_hero',
    category: 'resolution',
    title: 'Resolution Hero',
    description: 'Have 10 of your reports resolved.',
    icon: 'trophy',
    threshold: 10,
    statKey: 'resolved',
  },
  {
    id: 'community_pillar',
    category: 'resolution',
    title: 'Community Pillar',
    description: 'Have 25 of your reports resolved.',
    icon: 'landmark',
    threshold: 25,
    statKey: 'resolved',
  },
  // Points
  {
    id: 'welcome_aboard',
    category: 'points',
    title: 'Welcome Aboard',
    description: 'Earn 25 points.',
    icon: 'party-popper',
    threshold: 25,
    statKey: 'points',
  },
  {
    id: 'engaged',
    category: 'points',
    title: 'Engaged',
    description: 'Earn 100 points.',
    icon: 'star',
    threshold: 100,
    statKey: 'points',
  },
  {
    id: 'dedicated',
    category: 'points',
    title: 'Dedicated',
    description: 'Earn 500 points.',
    icon: 'sparkles',
    threshold: 500,
    statKey: 'points',
  },
  {
    id: 'devoted',
    category: 'points',
    title: 'Devoted',
    description: 'Earn 1000 points.',
    icon: 'gem',
    threshold: 1000,
    statKey: 'points',
  },
  // Streak
  {
    id: 'two_day_streak',
    category: 'streak',
    title: 'Two-Day Streak',
    description: 'Visit two days in a row.',
    icon: 'flame',
    threshold: 2,
    statKey: 'longestStreak',
  },
  {
    id: 'week_streak',
    category: 'streak',
    title: 'Week-Long Streak',
    description: 'Visit seven days in a row.',
    icon: 'flame',
    threshold: 7,
    statKey: 'longestStreak',
  },
  {
    id: 'month_streak',
    category: 'streak',
    title: 'Month-Long Streak',
    description: 'Visit thirty days in a row.',
    icon: 'flame',
    threshold: 30,
    statKey: 'longestStreak',
  },
];

/**
 * Returns the full catalog with `earned` + `progress` filled in for the
 * given stats. Stable output — same input yields same output, with
 * catalog order preserved (the UI uses that for grouping/section order).
 */
export function computeAchievements(stats: AchievementStats): Achievement[] {
  return CATALOG.map((def) => {
    const progress = stats[def.statKey];
    return {
      ...def,
      progress,
      earned: progress >= def.threshold,
    };
  });
}

/**
 * Point milestones for the Profile hero progress bar, derived straight
 * from the points-category badges above so the bar and the badge catalog
 * can never drift apart (the screen used to keep its own hand-written
 * list). Returns ascending `{ at, label }` entries, e.g.
 * `{ at: 25, label: 'Welcome Aboard badge' }`.
 */
export function pointsMilestones(): { at: number; label: string }[] {
  return CATALOG.filter((def) => def.category === 'points')
    .map((def) => ({ at: def.threshold, label: `${def.title} badge` }))
    .sort((a, b) => a.at - b.at);
}

/**
 * Convenience: count of earned badges out of total. Used by the
 * Profile row that opens the modal ("Achievements · 3 / 13").
 */
export function countEarned(stats: AchievementStats): {
  earned: number;
  total: number;
} {
  let earned = 0;
  for (const def of CATALOG) {
    if (stats[def.statKey] >= def.threshold) earned++;
  }
  return { earned, total: CATALOG.length };
}

export { CATALOG as ACHIEVEMENTS_CATALOG };
