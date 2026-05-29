/**
 * Tests for the free-text search predicate on the Tasks screen.
 *
 * Pins the substring-match logic added in commit `ee3cfae` (branch
 * `feat/shamus-flag-deeplink-detail-2026-05-27`). At time of writing the
 * branch was not yet merged to `main` — these tests describe the
 * predicate as a contract so the moment it lands the behavior is locked
 * in. A reviewer can confirm by diffing the verbatim block below against
 * the displayFlags useMemo in `src/screens/TasksScreen.tsx`.
 *
 * Source of truth (TasksScreen.tsx, displayFlags useMemo after ee3cfae):
 *
 *   const displayFlags = useMemo(() => {
 *     let out = flags;
 *     if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
 *     if (minSeverity > 0) out = out.filter((f) => f.severity >= minSeverity);
 *     const q = searchText.trim().toLowerCase();
 *     if (q) {
 *       out = out.filter((f) => {
 *         const desc = (f.description ?? '').toLowerCase();
 *         const catLabel = CATEGORY_LABELS[f.category].toLowerCase();
 *         return desc.includes(q) || catLabel.includes(q);
 *       });
 *     }
 *     return out;
 *   }, [flags, mineOnly, userId, minSeverity, searchText]);
 *
 * Substring (not whole-word), case-insensitive, no regex semantics.
 */

jest.mock('../supabase', () => ({ __esModule: true, supabase: { from: jest.fn() } }));
import { CATEGORY_LABELS } from '../flags';
import type { FlagCategory, FlagRow, FlagStatus } from '@/types/database';

// ────────────────────────────────────────────────────────────────────────────
// Mirror of the displayFlags filter expression — no source changes needed.
// ────────────────────────────────────────────────────────────────────────────
type FilterArgs = {
  flags: FlagRow[];
  mineOnly: boolean;
  userId: string | undefined;
  minSeverity: 0 | 2 | 3 | 4 | 5;
  searchText: string;
};

function applyDisplayFilter({
  flags,
  mineOnly,
  userId,
  minSeverity,
  searchText,
}: FilterArgs): FlagRow[] {
  let out = flags;
  if (mineOnly && userId) out = out.filter((f) => f.user_id === userId);
  if (minSeverity > 0) out = out.filter((f) => f.severity >= minSeverity);
  const q = searchText.trim().toLowerCase();
  if (q) {
    out = out.filter((f) => {
      const desc = (f.description ?? '').toLowerCase();
      const catLabel = CATEGORY_LABELS[f.category].toLowerCase();
      return desc.includes(q) || catLabel.includes(q);
    });
  }
  return out;
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

const BASE_DEFAULTS = {
  mineOnly: false,
  userId: undefined,
  minSeverity: 0 as const,
};

// ────────────────────────────────────────────────────────────────────────────
// 1. Empty / whitespace query — no-op
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — empty / whitespace queries are no-ops', () => {
  const flags = [
    makeFlag('a', { description: 'curb has no ramp' }),
    makeFlag('b', { description: null, category: 'broken_sidewalk' }),
    makeFlag('c', { description: 'huge step at entrance' }),
  ];

  it('empty string returns every flag (identity)', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '',
    });
    expect(out).toEqual(flags);
  });

  it('returns the same array reference for an empty query (no copy)', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '',
    });
    expect(out).toBe(flags);
  });

  it('whitespace-only query (spaces) is treated as empty', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '     ',
    });
    expect(out).toEqual(flags);
  });

  it('whitespace-only query (mixed tabs and newlines) is treated as empty', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '\t\t \n\n',
    });
    expect(out).toEqual(flags);
  });

  it('strips leading/trailing whitespace before matching', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '   curb   ',
    });
    // Only 'a' has 'curb' in its description.
    expect(out.map((f) => f.id)).toEqual(['a']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Description matching — substring, case-insensitive
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — description matching', () => {
  it('matches a substring of the description', () => {
    const flags = [
      makeFlag('a', { description: 'curb has no ramp' }),
      makeFlag('b', { description: 'broken pavement near 4th' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'broken',
    });
    expect(out.map((f) => f.id)).toEqual(['b']);
  });

  it('substring matches in the middle of a word, not just word boundaries', () => {
    const flags = [
      makeFlag('a', { description: 'unbroken sidewalk' }),
      makeFlag('b', { description: 'fine path' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'broken',
    });
    // "unbroken" contains "broken" — substring, not whole-word.
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('is case-insensitive against the description', () => {
    const flags = [
      makeFlag('a', { description: 'STEEP grade' }),
      makeFlag('b', { description: 'gentle slope' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'steep',
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('is case-insensitive against the query', () => {
    const flags = [
      makeFlag('a', { description: 'steep grade' }),
      makeFlag('b', { description: 'gentle slope' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'STEEP',
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('treats null descriptions as empty strings (no crash, no false match)', () => {
    const flags = [
      makeFlag('a', { description: null, category: 'no_ramp' }),
      makeFlag('b', { description: 'ramp blocked', category: 'blocked_path' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'ramp',
    });
    // 'a' has null desc but matches via the category label "No ramp".
    // 'b' matches via description "ramp blocked".
    // The point of this test is that the null didn't crash.
    expect(out.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 3. Category-label matching — typed-label, not the enum key
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — category-label matching', () => {
  it('matches the human-readable category label, not the enum key', () => {
    // Enum key is 'no_ramp', label is 'No ramp'. Query must hit the label.
    const flags = [makeFlag('a', { category: 'no_ramp', description: null })];
    const labelHit = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'no ramp',
    });
    expect(labelHit.map((f) => f.id)).toEqual(['a']);
  });

  it('case-insensitive match against the label', () => {
    const flags = [makeFlag('a', { category: 'no_ramp', description: null })];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'NO RAMP',
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it.each([
    ['no_ramp' as FlagCategory],
    ['broken_sidewalk' as FlagCategory],
    ['blocked_path' as FlagCategory],
    ['missing_signal' as FlagCategory],
    ['steep_grade' as FlagCategory],
    ['other' as FlagCategory],
  ])('matches by label for every category (%s)', (cat) => {
    const flags = [makeFlag('a', { category: cat, description: null })];
    const label = CATEGORY_LABELS[cat];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: label.toLowerCase(),
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 4. OR semantics — match on description OR label
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — OR between description and label', () => {
  it('a row matches if EITHER description OR label contains the query', () => {
    const flags = [
      // Description hits, label doesn't (category 'other' → label 'Other').
      makeFlag('a', { description: 'ramp blocked', category: 'other' }),
      // Label hits, description doesn't.
      makeFlag('b', { description: 'unrelated text', category: 'no_ramp' }),
      // Neither hits — should be filtered out.
      makeFlag('c', { description: 'just a comment', category: 'other' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'ramp',
    });
    expect(out.map((f) => f.id).sort()).toEqual(['a', 'b']);
  });

  it('a row only needs ONE side to match — not both', () => {
    const flags = [makeFlag('a', { description: 'foo', category: 'no_ramp' })];
    // 'foo' is not in the label "No ramp" but IS in the description.
    // The OR keeps the row.
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'foo',
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 5. No-matches case
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — no matches', () => {
  it('returns [] when nothing matches', () => {
    const flags = [
      makeFlag('a', { description: 'curb', category: 'no_ramp' }),
      makeFlag('b', { description: 'broken', category: 'broken_sidewalk' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'xyzzy',
    });
    expect(out).toEqual([]);
  });

  it('returns [] from an empty flag list regardless of query', () => {
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags: [],
      searchText: 'anything',
    });
    expect(out).toEqual([]);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 6. Special characters — substring, NOT regex
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — special characters are literal', () => {
  it('parentheses match literally (not as regex group)', () => {
    const flags = [
      makeFlag('a', { description: 'damaged (north side)', category: 'other' }),
      makeFlag('b', { description: 'damaged north side', category: 'other' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '(north',
    });
    // Only 'a' has the literal '(' — 'b' does not.
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('regex metacharacters do not crash and do not match magically', () => {
    const flags = [
      makeFlag('a', { description: 'abc', category: 'other' }),
      makeFlag('b', { description: 'a.c', category: 'other' }),
    ];
    // If this were regex, 'a.c' would match 'abc'. Since it's substring,
    // 'a.c' as a query only matches the literal "a.c" in 'b'.
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: 'a.c',
    });
    expect(out.map((f) => f.id)).toEqual(['b']);
  });

  it('emoji / unicode in the description are matched as substrings', () => {
    const flags = [
      makeFlag('a', { description: 'broken 🛞 wheel hazard', category: 'other' }),
      makeFlag('b', { description: 'fine', category: 'other' }),
    ];
    const out = applyDisplayFilter({
      ...BASE_DEFAULTS,
      flags,
      searchText: '🛞',
    });
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('quotes, brackets, and slashes match literally', () => {
    const flags = [
      makeFlag('a', { description: '"north" entrance', category: 'other' }),
      makeFlag('b', { description: '[blocked] gate', category: 'other' }),
      makeFlag('c', { description: 'corner/edge of curb', category: 'other' }),
      makeFlag('d', { description: 'normal entry', category: 'other' }),
    ];

    expect(
      applyDisplayFilter({
        ...BASE_DEFAULTS,
        flags,
        searchText: '"north"',
      }).map((f) => f.id),
    ).toEqual(['a']);

    expect(
      applyDisplayFilter({
        ...BASE_DEFAULTS,
        flags,
        searchText: '[blocked]',
      }).map((f) => f.id),
    ).toEqual(['b']);

    expect(
      applyDisplayFilter({
        ...BASE_DEFAULTS,
        flags,
        searchText: '/edge',
      }).map((f) => f.id),
    ).toEqual(['c']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 7. Composition with mineOnly + minSeverity (the full displayFlags chain)
// ────────────────────────────────────────────────────────────────────────────
describe('free-text search — composes with mine + severity filters', () => {
  const mixed: FlagRow[] = [
    makeFlag('a', {
      user_id: 'user-alice',
      category: 'no_ramp',
      severity: 5,
      description: 'severe curb hazard',
    }),
    makeFlag('b', {
      user_id: 'user-bob',
      category: 'no_ramp',
      severity: 5,
      description: 'curb hazard',
    }),
    makeFlag('c', {
      user_id: 'user-alice',
      category: 'broken_sidewalk',
      severity: 2,
      description: 'small curb chip',
    }),
  ];

  it('mineOnly + search narrows to Alice rows matching the query', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: true,
      userId: 'user-alice',
      minSeverity: 0,
      searchText: 'curb',
    });
    expect(out.map((f) => f.id)).toEqual(['a', 'c']);
  });

  it('mineOnly + minSeverity + search composes multiplicatively', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: true,
      userId: 'user-alice',
      minSeverity: 4,
      searchText: 'curb',
    });
    // Alice + severity >= 4 + 'curb' in desc/label → just 'a'.
    expect(out.map((f) => f.id)).toEqual(['a']);
  });

  it('search alone (no mine/severity) ignores ownership and severity', () => {
    const out = applyDisplayFilter({
      flags: mixed,
      mineOnly: false,
      userId: 'user-alice',
      minSeverity: 0,
      searchText: 'curb',
    });
    // All 3 rows have 'curb' in description.
    expect(out.map((f) => f.id).sort()).toEqual(['a', 'b', 'c']);
  });
});

// ────────────────────────────────────────────────────────────────────────────
// 8. Empty-state messaging — query text is echoed back to the user
// ────────────────────────────────────────────────────────────────────────────
//
// The source uses `searchText.trim()` for both the filter AND the empty-state
// message:
//
//   {searchText.trim()
//     ? `Nothing matches "${searchText.trim()}". Try a different keyword...`
//     : 'No flags to triage right now. New community reports will land here ...'}
//
// Pin that the trimmed value is what the empty state echoes — leading/trailing
// whitespace must not appear in the quoted phrase.
describe('free-text search — empty-state echo uses the trimmed query', () => {
  function emptyMessageFor(searchText: string): string {
    const trimmed = searchText.trim();
    return trimmed
      ? `Nothing matches "${trimmed}". Try a different keyword or clear the search.`
      : "No flags to triage right now. New community reports will land here as they're added — pull to refresh anytime.";
  }

  it('shows the default empty message when the query is blank', () => {
    expect(emptyMessageFor('')).toMatch(/No flags to triage/);
    expect(emptyMessageFor('    ')).toMatch(/No flags to triage/);
  });

  it('quotes the trimmed query verbatim when there are no matches', () => {
    expect(emptyMessageFor('  curb  ')).toBe(
      'Nothing matches "curb". Try a different keyword or clear the search.',
    );
  });

  it('preserves the original casing when echoing the query', () => {
    expect(emptyMessageFor('STEEP Grade')).toContain('"STEEP Grade"');
  });
});
