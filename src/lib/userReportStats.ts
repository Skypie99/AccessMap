// Aggregate counts of a single user's own flags, grouped by category and
// by severity. Used by the Profile screen's "Your reports — at a glance"
// breakdown card.
//
// Lives here (rather than inline in ProfileScreen) so the same shape can
// later feed other surfaces — e.g. a Settings export, an achievements
// rule, or a /stats deep link — without coupling to ProfileScreen's
// component state.

import { supabase } from './supabase';
import { CATEGORY_ORDER, SEVERITY_ORDER } from './flags';
import type { FlagCategory, FlagSeverity } from '@/types/database';

export interface UserReportStats {
  /** Total flags this user has ever submitted (any status). */
  total: number;
  /** Count keyed by category. Missing categories stay at 0. */
  byCategory: Record<FlagCategory, number>;
  /** Count keyed by severity. Missing severities stay at 0. */
  bySeverity: Record<FlagSeverity, number>;
}

/**
 * Build a zeroed Record<FlagCategory, number>. Exported so callers can
 * use it as a placeholder shape without recreating the keys (and risking
 * a key/typo divergence when CATEGORY_ORDER changes).
 */
export function emptyCategoryCounts(): Record<FlagCategory, number> {
  const out = {} as Record<FlagCategory, number>;
  for (const c of CATEGORY_ORDER) out[c] = 0;
  return out;
}

/**
 * Build a zeroed Record<FlagSeverity, number>. Exported for the same
 * reason as emptyCategoryCounts.
 */
export function emptySeverityCounts(): Record<FlagSeverity, number> {
  const out = {} as Record<FlagSeverity, number>;
  for (const s of SEVERITY_ORDER) out[s] = 0;
  return out;
}

export const EMPTY_USER_REPORT_STATS: UserReportStats = {
  total: 0,
  byCategory: emptyCategoryCounts(),
  bySeverity: emptySeverityCounts(),
};

/**
 * Fetch only the columns we need (`category`, `severity`) — server-side
 * GROUP BY isn't worth the round-trip complexity at the small per-user
 * row counts AccessMap deals with. Aggregating client-side keeps this
 * compatible with the existing RLS read policy too.
 *
 * Rows whose category or severity drifted outside the live enum are
 * counted into `total` but not into the breakdowns — defensive against
 * future enum migrations leaving orphan rows.
 */
export async function fetchUserReportStats(userId: string): Promise<UserReportStats> {
  const { data, error } = await supabase
    .from('flags')
    .select('category, severity')
    .eq('user_id', userId);
  if (error) throw error;

  const byCategory = emptyCategoryCounts();
  const bySeverity = emptySeverityCounts();
  const rows = (data ?? []) as Array<{
    category: FlagCategory;
    severity: FlagSeverity;
  }>;
  for (const r of rows) {
    if (r.category in byCategory) byCategory[r.category]++;
    if (r.severity in bySeverity) bySeverity[r.severity]++;
  }
  return {
    total: rows.length,
    byCategory,
    bySeverity,
  };
}
