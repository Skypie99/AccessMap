/**
 * Pure category filter for the "My Feedback" modal.
 *
 * MyFeedbackModal renders a row of chips (All / Bug / Idea / Love / Other)
 * above the feedback list. Tap a chip → list narrows to that category.
 *
 * Kept pure (no React, no state) so:
 *  - The filter contract is unit-tested without mounting a modal.
 *  - The modal stays a thin "wire data + chips → component" shell.
 *
 * The filter set is bug/idea/love/other (mirrors FEEDBACK_CATEGORIES in
 * src/lib/feedback.ts and the `category` column in
 * supabase/migrations/2026-05-23_feedback_table.sql), plus 'all' as the
 * pass-through default.
 */

import type { FeedbackCategoryRow } from '@/types/database';

/**
 * The full filter set the chip row offers — 'all' first because it's the
 * default and the only one that returns the unfiltered list.
 */
export type FeedbackCategoryFilter = 'all' | FeedbackCategoryRow;

/**
 * Render order for the chip row. 'all' goes first so the user's eye lands
 * on the default. The rest match the order in FEEDBACK_CATEGORIES so the
 * compose modal and the history modal stay visually aligned.
 */
export const FEEDBACK_CATEGORY_FILTERS: ReadonlyArray<FeedbackCategoryFilter> =
  ['all', 'bug', 'idea', 'love', 'other'];

/**
 * Short labels for each chip. Kept here (not pulled from feedback.ts) so
 * the 'all' label has a home — FEEDBACK_CATEGORY_LABELS only covers the
 * four real categories.
 */
export const FEEDBACK_CATEGORY_FILTER_LABELS: Readonly<
  Record<FeedbackCategoryFilter, string>
> = {
  all: 'All',
  bug: 'Bug',
  idea: 'Idea',
  love: 'Love',
  other: 'Other',
};

/**
 * Filter a list of feedback rows by category.
 *
 * - 'all' is a pass-through (returns the same list reference is NOT
 *   guaranteed — callers should treat it as a new array slice). In
 *   practice we return the input directly when filter === 'all' so the
 *   FlatList doesn't re-render its full data array.
 * - Any other filter returns only rows whose `category` matches exactly.
 *
 * Generic over `T extends { category: FeedbackCategoryRow }` so it works
 * for both the canonical FeedbackRow and any local test fixture that
 * carries the same shape.
 */
export function filterFeedback<T extends { category: FeedbackCategoryRow }>(
  items: T[],
  filter: FeedbackCategoryFilter,
): T[] {
  if (filter === 'all') return items;
  return items.filter((item) => item.category === filter);
}
