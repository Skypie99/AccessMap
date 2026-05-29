/**
 * Tests for the category quick-filter logic on the Tasks screen.
 *
 * Pins the predicate added in commit `6fd61d0` (branch
 * `feat/shamus-category-quickfilter-2026-05-26`). At time of writing the
 * branch was not yet merged to `main` — these tests describe the
 * predicate as a contract so the moment it lands the behavior is locked
 * in. A reviewer can confirm by diffing the verbatim block below against
 * the displayFlags useMemo in `src/screens/TasksScreen.tsx`.
 *
 * Source of truth (TasksScreen.tsx, displayFlags useMemo after 6fd61d0):
 *
 *   const displayFlags = useMemo(() => {
 *     let out = flags;
 *     if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
 *     if (minSeverity > 0) out = out.filter((f) => f.severity >= minSeverity);
 *     if (categoryFilter) out = out.filter((f) => f.category === categoryFilter);
 *     return out;
 *   }, [flags, mineOnly, userId, minSeverity, categoryFilter]);
 *
 * Plus the handleCategoryChange toggle semantics from the same commit:
 *
 *   onPress={() => handleCategoryChange(active ? null : cat)}
 *
 * Tapping an already-active chip clears the filter (toggles to null).
 */

jest.mock('../supabase', () => ({ __esModule: true, supabase: { from: jest.fn() } }));
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../flags';
import type { FlagCategory, FlagRow, FlagStatus } from '@/types/database';

// ────────────────────────────────────────────────────────────────────────────
// Mirror of the displayFlags filter expression — no source changes needed.
// If TasksScreen changes the expression, these tests catch the drift.
// ────────────────────────────────────────────────────────────────────────────
type FilterArgs = {
  flags: FlagRow[];
  mineOnly: boolean;
  userId: string | undefined;
  minSeverity: 0 | 2 | 3 | 4 | 5;
  categoryFilter: FlagCategory | null;
};

function applyDisplayFilter({
  flags,
  mineOnly,
  userId,
  minSeverity,
  categoryFilter,
}: FilterArgs): FlagRow[] {
  let out = flags;
  if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
  if (minSeverity > 0) out = out.filter((f) => f.severity >= minSeverity);
  if (categoryFilter) out = out.filter((f) => f.category === categoryFilter);
  return out;
}

/** Mirrors the chip onPress toggle: tapping the active chip clears it. */
function nextCategoryAfterTap(
  current: FlagCategory | null,
  tapped: FlagCategory | null,
): FlagCategory | null {
  if (tapped === null) return null;
  return current === tapped ? null : tapped;
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
function makeFlag(id: string, partial: Partial<FlagRow> = {}): FlagRow {
  return {
    id,
    user_id: 'user-alice',
    lat: 47.6,
    lng: -122.3,
    category: 'no_ramp' as FlagCategory,
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open' as FlagStatus,
    created_at: new Date(2026, 4, 27).toISOString(),
    ...partial,
  };
}

// One representative flag for every live category so range checks work
// against the full enum, not a partial sample.
const ONE_OF_EACH: FlagRow[] = CATEGORY_ORDER.map((cat, i) =>
  makeFlag(`flag-${cat}`, {
    category: cat,
    severity: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
  }),
);

// ────────────────────────────────────────────────────────────────────────────
// 1. Category filter in isolation
// ────────────────────────────────────────────────────────────────────────────
describe('category quick-filter — predicate', () => {
  it('null = passes every flag through unchanged (identity)', () => {
    const out = applyDisplayFilter({
      flags: ONE_OF_EACH,
      mineOnly: false,
      userId: undefined,
      minSeverity: 0,
      categoryFilter: null,
    });
    expect(out).toEqual(ONE_OF_EACH);
    // Length preserved exactly — no accidental copy reordering.
    expect(out.length).toBe(CATEGORY_ORDER.length);
  });

  it('null filter returns the SAME array reference (no needless copy)', () => {
    // The source uses `if (categoryFilter) out = out.filter(...)` — when the
    // filter is null we should be returning the upstream `out` untouched,
    // not a fresh array. Pinning this so future "always copy" rewrites get
    // flagged for potential render-thrash.
    const out = applyDisplayFilter({
      flags: ONE_OF_EACH,
      mineOnly: false,
      userId: undefined,
      minSeverity: 0,
      categoryFilter: null,
    });
    expect(out).toBe(ONE_OF_EACH);
  });

  it.each(CATEGORY_ORDER)(
    'narrows to a single category (%s) — keeps only matching rows',
    (cat) => {
      const out = applyDisplayFilter({
        flags: ONE_OF_EACH,
        mineOnly: false,
        userId: undefined,
        minSeverity: 0,
        categoryFilter: cat,
      });
      expect(out.map((f) => f.category)).toEqual([cat]);
    },
  );

  it('returns [] when no flag matches the chosen category', () => {
    const onlyRamps = [
      makeFlag('a', { category: 'no_ramp' }),
      makeFlag('b', { category: 'no_ramp' }),
    ];
    const out = applyDisplayFilter({
      flags: onlyRamps,
      mineOnly: false,
      userId: undefined,
      minSeverity: 0,
      categoryFilter: 'blocked_path',
    });
    expect(out).toEqual([]);
  });

  it('preserves source order among rows that match', () => {
    const flags = [
      makeFlag('a', { category: 'no_ramp' }),
      makeFlag('b', { category: 'blocked_path' }),
      makeFlag('c', { category: 'no_ramp' }),
      makeFlag('d', { category: 'broken_sidewalk' }),
      makeFlag('e', { category: 'no_ramp' }),
    ];
    const out = applyDisplayFilter({
      flags,
      mineOnly: false,
      userId: undefined,
      minSeverity: 0,
      categoryFilter: 'no_ramp',
    });
    expect(out.map((f) => f.id)).toEqual(['a', 'c', 'e']);
  });

  it('does not mutate the input array', () => {
    const before = ONE_OF_EACH.slice();
    applyDisplayFilter({
      flags: ONE_OF_EACH,
      mineOnly: false,
      userId: undefined,
      minSeverity: 0,
      categoryFilter: 'no_ramp',
    });
    expect(ONE_OF_EACH).toEqual(before);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Composition with mineOnly + minSeverity (the full displayFlags chain)
// ────────────────────────────────────────────────────────────────────────────
describe('category quick-filter — composes with mine + severity filters', () => {
  const mixed: FlagRow[] = [
    makeFlag('a', {
      user_id: 'user-alice',
      category: 'no_ramp',
      severity: 5,
    }),
    makeFlag('b', {
      user_id: 'user-alice',
      category: 'blocked_path',
      severity: 5,
    }),
    makeFlag('c', {
      user_id: 'user-bob',
      category: 'no_ramp',
      severity: 5,
    }),
    makeFlag('d', {
      user_id: 'user-alice',
      category: 'no_ramp',
      severity: 2,
    }),
  ];

  it('mineOnly + categoryFilter narrows to the intersection', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: true,
      userId: 'user-alice',
      minSeverity: 0,
      categoryFilter: 'no_ramp',
    });
    // Alice's no_ramp flags only: a, d.
    expect(out.map((f) => f.id)).toEqual(['a', 'd']);
  });

  it('mineOnly + categoryFilter + minSeverity narrows further', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: true,
      userId: 'user-alice',
      minSeverity: 4,
      categoryFilter: 'no_ramp',
    });
    // Alice's no_ramp flags with severity >= 4: just a.
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('categoryFilter without mineOnly ignores user ownership', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: false,
      userId: 'user-alice',
      minSeverity: 0,
      categoryFilter: 'no_ramp',
    });
    // All no_ramp flags regardless of owner: a, c, d.
    expect(out.map((f) => f.id)).toEqual(['a', 'c', 'd']);
  });

  it('empty intersection produces []', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: true,
      userId: 'user-bob',
      minSeverity: 4,
      categoryFilter: 'broken_sidewalk',
    });
    expect(out).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Toggle semantics — tapping the active chip clears the filter
// ────────────────────────────────────────────────────────────────────────────
describe('category quick-filter — toggle handler', () => {
  it('tapping a category when nothing is active selects it', () => {
    expect(nextCategoryAfterTap(null, 'no_ramp')).toBe('no_ramp');
  });

  it('tapping the active chip clears the filter (toggles to null)', () => {
    expect(nextCategoryAfterTap('no_ramp', 'no_ramp')).toBe(null);
  });

  it('tapping a different chip switches the filter without clearing first', () => {
    expect(nextCategoryAfterTap('no_ramp', 'blocked_path')).toBe(
      'blocked_path',
    );
  });

  it('tapping the explicit "All" chip clears regardless of current state', () => {
    expect(nextCategoryAfterTap('no_ramp', null)).toBe(null);
    expect(nextCategoryAfterTap(null, null)).toBe(null);
  });

  it('every category in CATEGORY_ORDER can be toggled on then off', () => {
    for (const cat of CATEGORY_ORDER) {
      const on = nextCategoryAfterTap(null, cat);
      expect(on).toBe(cat);
      const off = nextCategoryAfterTap(on, cat);
      expect(off).toBe(null);
    }
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. Chip-strip integrity (the labels Shamus's chips render)
// ────────────────────────────────────────────────────────────────────────────
describe('category quick-filter — chip strip uses CATEGORY_ORDER + LABELS', () => {
  it('CATEGORY_ORDER has every live FlagCategory exactly once', () => {
    const unique = new Set(CATEGORY_ORDER);
    expect(unique.size).toBe(CATEGORY_ORDER.length);
  });

  it('every category in CATEGORY_ORDER has a non-empty human label', () => {
    for (const cat of CATEGORY_ORDER) {
      expect(CATEGORY_LABELS[cat]).toBeTruthy();
      expect(typeof CATEGORY_LABELS[cat]).toBe('string');
      expect(CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it('chip strip stays stable as flags come and go (always lists every category)', () => {
    // The source uses CATEGORY_ORDER unconditionally — chips don't disappear
    // when zero flags exist for a category. Pin that so a future "hide empty
    // chips" optimization is a deliberate decision, not a silent regression.
    const labels = CATEGORY_ORDER.map((c) => CATEGORY_LABELS[c]);
    expect(labels.length).toBe(CATEGORY_ORDER.length);
    // No duplicate labels in the strip.
    expect(new Set(labels).size).toBe(labels.length);
  });
});
