import { filterMyReports } from '../myReportsFilter';
import type { FlagRow, FlagCategory, FlagStatus } from '@/types/database';

// Minimal CATEGORY_LABELS stand-in so the test doesn't depend on the real
// table. The filter is supposed to be decoupled — passing a fake here is
// exactly the API contract.
const FAKE_CATEGORY_LABELS: Record<FlagCategory, string> = {
  no_ramp: 'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path: 'Blocked path',
  missing_signal: 'Missing signal',
  steep_grade: 'Steep grade',
  other: 'Other',
};

const labelOf = (c: FlagCategory): string => FAKE_CATEGORY_LABELS[c];

function makeFlag(id: string, partial: Partial<FlagRow> = {}): FlagRow {
  return {
    id,
    user_id: 'u1',
    lat: 47,
    lng: -122,
    category: 'no_ramp' as FlagCategory,
    severity: 3,
    description: null,
    photo_url: null,
    status: 'open' as FlagStatus,
    created_at: new Date(2026, 4, 23).toISOString(),
    ...partial,
  };
}

describe('filterMyReports', () => {
  const flags = [
    makeFlag('a', {
      category: 'broken_sidewalk',
      description: 'Concrete heaved by tree roots, blocks ramp access.',
      status: 'open',
    }),
    makeFlag('b', {
      category: 'no_ramp',
      description: 'Curb has no cut at intersection.',
      status: 'verified',
    }),
    makeFlag('c', {
      category: 'blocked_path',
      description: null,
      status: 'resolved',
    }),
    makeFlag('d', {
      category: 'missing_signal',
      description: 'No audible signal at crossing.',
      status: 'rejected',
    }),
  ];

  // 1. Empty query → full list (and same reference, so React.memo / FlatList
  // don't churn).
  it('returns the input list reference unchanged for an empty query', () => {
    const result = filterMyReports(flags, '', labelOf);
    expect(result).toBe(flags);
  });

  // 2. Single token against description.
  it('matches a single token against description', () => {
    const result = filterMyReports(flags, 'curb', labelOf);
    expect(result.map((f) => f.id)).toEqual(['b']);
  });

  // 3. Multi-token AND.
  it('requires ALL tokens to match (AND semantics)', () => {
    // 'broken' hits flag a's category label "Broken sidewalk";
    // 'ramp' hits flag a's description "ramp access".
    const result = filterMyReports(flags, 'broken ramp', labelOf);
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  // 4. Status match.
  it('matches against the raw status (open / verified / resolved / rejected)', () => {
    expect(filterMyReports(flags, 'verified', labelOf).map((f) => f.id)).toEqual(['b']);
    expect(filterMyReports(flags, 'resolved', labelOf).map((f) => f.id)).toEqual(['c']);
    expect(filterMyReports(flags, 'rejected', labelOf).map((f) => f.id)).toEqual(['d']);
    expect(filterMyReports(flags, 'open', labelOf).map((f) => f.id)).toEqual(['a']);
  });

  // 5. Category match via the callback.
  it('matches against the category label produced by the callback', () => {
    // "Broken sidewalk" is the label for broken_sidewalk → flag a.
    const result = filterMyReports(flags, 'sidewalk', labelOf);
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('lets the caller swap the label source — proves decoupling', () => {
    // Custom label table — pretend broken_sidewalk is labeled "Cracked pavement".
    const customLabel = (c: FlagCategory): string =>
      c === 'broken_sidewalk' ? 'Cracked pavement' : FAKE_CATEGORY_LABELS[c];
    // The real default label "Broken sidewalk" should no longer match…
    expect(filterMyReports(flags, 'broken', customLabel).map((f) => f.id)).toEqual([]);
    // …but the custom label "Cracked pavement" does.
    expect(filterMyReports(flags, 'cracked', customLabel).map((f) => f.id)).toEqual(['a']);
  });

  // 6. Description match.
  it('matches a substring inside the description', () => {
    // 'audible' is only in flag d's description.
    const result = filterMyReports(flags, 'audible', labelOf);
    expect(result.map((f) => f.id)).toEqual(['d']);
  });

  // 7. No-match.
  it('returns an empty list when nothing matches', () => {
    const result = filterMyReports(flags, 'zebra', labelOf);
    expect(result).toEqual([]);
  });

  // 8. NFC normalization — café in NFD form should match café typed in NFC.
  it('matches across Unicode NFC vs NFD normalizations', () => {
    const nfd = makeFlag('nfd', {
      // 'cafe' + U+0301 COMBINING ACUTE ACCENT → "café" rendered, NFD-encoded.
      description: 'café entrance has steps, no ramp.',
    });
    const flagsWithNfd = [...flags, nfd];
    // NFC query (typed naturally on most keyboards) should still hit.
    const result = filterMyReports(flagsWithNfd, 'café', labelOf);
    expect(result.map((f) => f.id)).toContain('nfd');
  });

  // 9. Case-insensitivity.
  it('is case-insensitive', () => {
    expect(filterMyReports(flags, 'CURB', labelOf).map((f) => f.id)).toEqual(['b']);
    expect(filterMyReports(flags, 'SiDeWaLk', labelOf).map((f) => f.id)).toEqual(['a']);
  });

  // 10. Whitespace-only → treated like empty → full list reference.
  it('treats whitespace-only queries as empty and returns the input reference', () => {
    expect(filterMyReports(flags, '   ', labelOf)).toBe(flags);
    expect(filterMyReports(flags, '\n\t', labelOf)).toBe(flags);
  });

  // Extra safety: null description shouldn't throw.
  it('handles flags with null descriptions safely', () => {
    expect(() => filterMyReports(flags, 'resolved', labelOf)).not.toThrow();
    // Flag c has null description but status="resolved" — still found.
    expect(filterMyReports(flags, 'resolved', labelOf).map((f) => f.id)).toEqual(['c']);
  });

  // Negative test — pins the haystack down to exactly
  // description + category label + status. Future field additions to FlagRow
  // (or careless edits to filterMyReports) that leak id / user_id / lat / lng
  // / severity into the searched text would let "search by lat" silently
  // succeed — confusing for users and a privacy smell (user_id should never
  // be searchable). This guards that contract.
  it('does not match against severity, id, user_id, lat, or lng — only description+category+status', () => {
    const singleFlag = [
      makeFlag('unique-flag-uuid-12345', {
        user_id: 'user-uuid-67890',
        lat: 47.6062,
        lng: -122.3321,
        severity: 3,
        category: 'no_ramp',
        description: 'description-here',
        status: 'open',
      }),
    ];

    // Fields in the row but NOT in the searchable haystack must NOT match.
    expect(filterMyReports(singleFlag, 'unique-flag-uuid', labelOf)).toEqual([]);
    expect(filterMyReports(singleFlag, 'user-uuid', labelOf)).toEqual([]);
    expect(filterMyReports(singleFlag, '47.6062', labelOf)).toEqual([]);
    expect(filterMyReports(singleFlag, '-122', labelOf)).toEqual([]);
    expect(filterMyReports(singleFlag, '3', labelOf)).toEqual([]); // severity

    // Fields that ARE in the haystack must still match — proves the test
    // isn't broken by stricter filtering.
    expect(filterMyReports(singleFlag, 'description-here', labelOf)).toHaveLength(1);
    expect(filterMyReports(singleFlag, 'no ramp', labelOf)).toHaveLength(1); // category label
    expect(filterMyReports(singleFlag, 'open', labelOf)).toHaveLength(1); // status
  });
});
