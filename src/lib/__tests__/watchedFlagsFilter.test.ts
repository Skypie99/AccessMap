import { filterWatchedFlags } from '../watchedFlagsFilter';
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
    created_at: new Date(2026, 4, 25).toISOString(),
    ...partial,
  };
}

describe('filterWatchedFlags', () => {
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
      status: 'open',
    }),
  ];

  // 1. Empty query → all flags returned (same reference so FlatList won't churn)
  it('returns the input list reference unchanged for an empty query', () => {
    const result = filterWatchedFlags(flags, '', labelOf);
    expect(result).toBe(flags);
  });

  // 2. Query matches category label → filtered correctly
  it('matches against the category label produced by the callback', () => {
    const result = filterWatchedFlags(flags, 'broken sidewalk', labelOf);
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  // 3. Query matches description → filtered correctly
  it('matches a single token against description', () => {
    const result = filterWatchedFlags(flags, 'curb', labelOf);
    expect(result.map((f) => f.id)).toEqual(['b']);
  });

  // 4. Case-insensitive → works
  it('is case-insensitive', () => {
    expect(filterWatchedFlags(flags, 'CURB', labelOf).map((f) => f.id)).toEqual(['b']);
    expect(filterWatchedFlags(flags, 'SiDeWaLk', labelOf).map((f) => f.id)).toEqual(['a']);
  });

  // 5. No match → empty array
  it('returns an empty list when nothing matches', () => {
    const result = filterWatchedFlags(flags, 'zebra', labelOf);
    expect(result).toEqual([]);
  });

  // 6. Null description → no crash
  it('handles flags with null descriptions safely', () => {
    expect(() => filterWatchedFlags(flags, 'blocked', labelOf)).not.toThrow();
    // Flag c has null description but category "Blocked path" — still found.
    expect(filterWatchedFlags(flags, 'blocked', labelOf).map((f) => f.id)).toEqual(['c']);
  });

  // 7. Multi-token AND semantics
  it('requires ALL tokens to match (AND semantics)', () => {
    // 'ramp' hits flag b's category label "No ramp" and flag a's description
    // "ramp access"; 'curb' only hits flag b's description.
    const result = filterWatchedFlags(flags, 'ramp curb', labelOf);
    expect(result.map((f) => f.id)).toEqual(['b']);
  });

  // 8. Whitespace-only → treated like empty → full list reference
  it('treats whitespace-only queries as empty and returns the input reference', () => {
    expect(filterWatchedFlags(flags, '   ', labelOf)).toBe(flags);
    expect(filterWatchedFlags(flags, '\n\t', labelOf)).toBe(flags);
  });

  // 9. NFC normalization
  it('matches across Unicode NFC vs NFD normalizations', () => {
    const nfd = makeFlag('nfd', {
      // 'cafe' + U+0301 COMBINING ACUTE ACCENT → "café" rendered, NFD-encoded.
      description: 'café entrance has steps, no ramp.',
    });
    const flagsWithNfd = [...flags, nfd];
    // NFC query (typed naturally on most keyboards) should still hit.
    const result = filterWatchedFlags(flagsWithNfd, 'café', labelOf);
    expect(result.map((f) => f.id)).toContain('nfd');
  });

  // 10. Description substring match
  it('matches a substring inside a longer description', () => {
    // 'audible' only in flag d's description
    const result = filterWatchedFlags(flags, 'audible', labelOf);
    expect(result.map((f) => f.id)).toEqual(['d']);
  });

  // 11. Category label decoupling — caller controls the label source
  it('lets the caller swap the label source — proves decoupling', () => {
    const customLabel = (c: FlagCategory): string =>
      c === 'no_ramp' ? 'Missing kerb cut' : FAKE_CATEGORY_LABELS[c];
    // The real default label "No ramp" should no longer match…
    expect(filterWatchedFlags(flags, 'no ramp', customLabel).map((f) => f.id)).toEqual([]);
    // …but the custom label "Missing kerb cut" does.
    expect(filterWatchedFlags(flags, 'kerb', customLabel).map((f) => f.id)).toEqual(['b']);
  });
});
