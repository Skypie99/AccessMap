import { searchFlags, tokenizeQuery } from '../flagSearch';
import type { FlagRow, FlagCategory, FlagStatus } from '@/types/database';

function makeFlag(
  id: string,
  partial: Partial<FlagRow> = {},
): FlagRow {
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

describe('tokenizeQuery', () => {
  it('returns empty array for empty / whitespace-only', () => {
    expect(tokenizeQuery('')).toEqual([]);
    expect(tokenizeQuery('   ')).toEqual([]);
    expect(tokenizeQuery('\n\t')).toEqual([]);
  });

  it('lowercases and trims', () => {
    expect(tokenizeQuery('  BROKEN  ')).toEqual(['broken']);
  });

  it('splits on whitespace', () => {
    expect(tokenizeQuery('broken sidewalk near')).toEqual([
      'broken',
      'sidewalk',
      'near',
    ]);
  });

  it('collapses multiple spaces', () => {
    expect(tokenizeQuery('broken   sidewalk\t\tnear')).toEqual([
      'broken',
      'sidewalk',
      'near',
    ]);
  });
});

describe('searchFlags', () => {
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

  it('returns the input list unchanged for empty query', () => {
    const result = searchFlags(flags, '');
    expect(result).toBe(flags); // identity — same reference
  });

  it('matches a single token against description', () => {
    const result = searchFlags(flags, 'curb');
    expect(result.map((f) => f.id)).toEqual(['b']);
  });

  it('matches a single token against category label', () => {
    // "Broken sidewalk" is the label for broken_sidewalk
    const result = searchFlags(flags, 'broken');
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('matches a single token against status label', () => {
    // "Resolved" → flag c (no description, but status matches)
    const result = searchFlags(flags, 'resolved');
    expect(result.map((f) => f.id)).toEqual(['c']);
  });

  it('is case-insensitive', () => {
    const result = searchFlags(flags, 'CURB');
    expect(result.map((f) => f.id)).toEqual(['b']);
  });

  it('requires ALL tokens to match (AND semantics)', () => {
    // "broken" + "ramp" — flag a has "Broken sidewalk" category AND
    // "ramp access" in the description.
    const result = searchFlags(flags, 'broken ramp');
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('returns empty when no flag matches all tokens', () => {
    // "broken" matches a; "audible" matches d. No flag has both.
    const result = searchFlags(flags, 'broken audible');
    expect(result).toEqual([]);
  });

  it('handles flags with null descriptions safely', () => {
    // Flag c has null description but status="resolved" — searching
    // "resolved" should still find it without throwing.
    expect(() => searchFlags(flags, 'resolved')).not.toThrow();
    expect(searchFlags(flags, 'resolved').map((f) => f.id)).toEqual(['c']);
  });

  it('matches across multiple fields in a single token', () => {
    // "rejected" only appears in the status of flag d.
    const result = searchFlags(flags, 'rejected');
    expect(result.map((f) => f.id)).toEqual(['d']);
  });

  it('matches substring within a word', () => {
    // "side" → "Broken sidewalk" → flag a.
    const result = searchFlags(flags, 'side');
    expect(result.map((f) => f.id)).toEqual(['a']);
  });

  it('returns an empty list for empty input', () => {
    expect(searchFlags([], 'anything')).toEqual([]);
  });

  it('preserves input order in results', () => {
    const all = searchFlags(flags, 'a'); // letter 'a' appears in multiple
    // Order should match input order.
    expect(all.map((f) => f.id)).toEqual(
      flags.filter((f) => all.includes(f)).map((f) => f.id),
    );
  });
});
