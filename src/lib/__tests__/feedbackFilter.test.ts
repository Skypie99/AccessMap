/**
 * Tests for the pure category filter behind the My Feedback chip row.
 *
 * What this protects against:
 *  - 'all' silently dropping rows (it must be a true pass-through).
 *  - A category typo on the filter side (e.g. 'idea' filter not matching
 *    rows whose category is 'idea') going un-noticed.
 *  - Empty list / no-match cases throwing instead of returning [].
 *  - The exported FEEDBACK_CATEGORY_FILTERS list drifting from the
 *    real category enum (a missing chip = a category the user can't
 *    filter to).
 */

import {
  filterFeedback,
  FEEDBACK_CATEGORY_FILTERS,
  FEEDBACK_CATEGORY_FILTER_LABELS,
  type FeedbackCategoryFilter,
} from '../feedbackFilter';
import type { FeedbackRow } from '@/types/database';

function makeRow(
  id: string,
  category: FeedbackRow['category'],
  partial: Partial<FeedbackRow> = {},
): FeedbackRow {
  return {
    id,
    user_id: 'u1',
    category,
    body: `body for ${id}`,
    contact_email: null,
    platform: 'ios',
    created_at: new Date(2026, 4, 24).toISOString(),
    ...partial,
  };
}

describe('FEEDBACK_CATEGORY_FILTERS', () => {
  it('lists exactly the 5 filter options in render order', () => {
    expect(FEEDBACK_CATEGORY_FILTERS).toEqual([
      'all',
      'bug',
      'idea',
      'love',
      'other',
    ]);
  });

  it('has a label for every filter', () => {
    for (const f of FEEDBACK_CATEGORY_FILTERS) {
      expect(FEEDBACK_CATEGORY_FILTER_LABELS[f]).toBeTruthy();
    }
  });
});

describe('filterFeedback', () => {
  const rows: FeedbackRow[] = [
    makeRow('r1', 'bug'),
    makeRow('r2', 'bug'),
    makeRow('r3', 'idea'),
    makeRow('r4', 'love'),
    makeRow('r5', 'other'),
    makeRow('r6', 'other'),
    makeRow('r7', 'other'),
  ];

  it("'all' returns the full list unchanged", () => {
    const result = filterFeedback(rows, 'all');
    expect(result).toHaveLength(rows.length);
    expect(result.map((r) => r.id)).toEqual([
      'r1',
      'r2',
      'r3',
      'r4',
      'r5',
      'r6',
      'r7',
    ]);
  });

  it("'bug' returns only bug rows", () => {
    const result = filterFeedback(rows, 'bug');
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.category === 'bug')).toBe(true);
    expect(result.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  it("'idea' returns only idea rows", () => {
    const result = filterFeedback(rows, 'idea');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('r3');
  });

  it("'love' returns only love rows", () => {
    const result = filterFeedback(rows, 'love');
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe('r4');
  });

  it("'other' returns only other rows", () => {
    const result = filterFeedback(rows, 'other');
    expect(result).toHaveLength(3);
    expect(result.every((r) => r.category === 'other')).toBe(true);
  });

  it('returns [] on an empty list, for every filter', () => {
    for (const f of FEEDBACK_CATEGORY_FILTERS) {
      expect(filterFeedback([], f)).toEqual([]);
    }
  });

  it('returns [] when no rows match the filter', () => {
    const onlyBugs = [makeRow('b1', 'bug'), makeRow('b2', 'bug')];
    expect(filterFeedback(onlyBugs, 'idea')).toEqual([]);
    expect(filterFeedback(onlyBugs, 'love')).toEqual([]);
    expect(filterFeedback(onlyBugs, 'other')).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const original = [makeRow('r1', 'bug'), makeRow('r2', 'idea')];
    const snapshot = original.map((r) => r.id);
    filterFeedback(original, 'bug');
    expect(original.map((r) => r.id)).toEqual(snapshot);
  });

  it("filterFeedback with 'all' returns the SAME array reference (identity)", () => {
    // FlatList's reconciliation hinges on referential identity of the
    // `data` prop (and `extraData`). If 'all' ever started cloning the
    // input (e.g. `items.slice()`), every chip toggle to 'all' would
    // re-render the full list and lose scroll position. Pin it.
    const items: FeedbackRow[] = [
      makeRow('r1', 'bug'),
      makeRow('r2', 'idea'),
    ];
    const result = filterFeedback(items, 'all');
    expect(result).toBe(items); // referential identity, not just deep equal
  });

  it('works with any object that has a matching category field (generic)', () => {
    type LiteRow = { id: string; category: FeedbackRow['category'] };
    const lite: LiteRow[] = [
      { id: 'a', category: 'bug' },
      { id: 'b', category: 'love' },
    ];
    const result = filterFeedback<LiteRow>(lite, 'love');
    expect(result).toEqual([{ id: 'b', category: 'love' }]);
  });

  it('every filter option (incl. all) is reachable as a valid argument', () => {
    // Compile-time guard: if FeedbackCategoryFilter ever drifts from
    // FEEDBACK_CATEGORY_FILTERS, this loop won't type-check.
    for (const filter of FEEDBACK_CATEGORY_FILTERS) {
      const typed: FeedbackCategoryFilter = filter;
      expect(() => filterFeedback(rows, typed)).not.toThrow();
    }
  });
});
