import { filterFaqs } from '../helpSearch';

// Tiny helper so the test body stays readable. The generic constraint on
// filterFaqs is { q: string; a: string } — anything else passed through.
function faq(q: string, a: string, id?: string) {
  return id ? { id, q, a } : { q, a };
}

describe('filterFaqs', () => {
  const items = [
    faq(
      'How do I report a place?',
      'Tap the plus Report button at the bottom right of the Map tab.',
      'report',
    ),
    faq(
      'How do points work?',
      'You earn 5 points when a report is verified, and 10 when resolved.',
      'points',
    ),
    faq(
      'Are my photos and location private?',
      'Photos and the flag location are public, but your email is never attached.',
      'privacy',
    ),
    faq(
      'I use a screen reader — what should I know?',
      'The Map opens an accessible list when a screen reader is active.',
      'a11y',
    ),
  ];

  it('returns the input list unchanged for an empty query', () => {
    const result = filterFaqs(items, '');
    // Identity — same reference, not a copy, so the caller can rely on it
    // for cheap referential-equality memoization downstream.
    expect(result).toBe(items);
  });

  it('returns the input list unchanged for a whitespace-only query', () => {
    const result = filterFaqs(items, '   \t\n  ');
    expect(result).toBe(items);
  });

  it('matches a single token across question text', () => {
    const result = filterFaqs(items, 'points');
    expect(result.map((i: any) => i.id)).toEqual(['points']);
  });

  it('matches a single token across answer text', () => {
    // "verified" appears only in the points answer.
    const result = filterFaqs(items, 'verified');
    expect(result.map((i: any) => i.id)).toEqual(['points']);
  });

  it('is case-insensitive', () => {
    const result = filterFaqs(items, 'POINTS');
    expect(result.map((i: any) => i.id)).toEqual(['points']);
  });

  it('requires ALL tokens to match (AND semantics) across q+a', () => {
    // "screen" + "reader" → both appear in the a11y entry.
    const result = filterFaqs(items, 'screen reader');
    expect(result.map((i: any) => i.id)).toEqual(['a11y']);
  });

  it('AND across tokens that match different entries yields nothing', () => {
    // "photos" appears only in the privacy entry (a).
    // "verified" appears only in the points entry (a). No single FAQ
    // contains both → AND-result is empty.
    const result = filterFaqs(items, 'photos verified');
    expect(result).toEqual([]);
  });

  it('AND can match across q text + a text on the same entry', () => {
    // The a11y entry contains "screen reader" in q and "Map" in a.
    // Combining a q-only token with an a-only token from the same entry
    // should still hit (combined haystack is searched as one).
    const result = filterFaqs(items, 'reader Map');
    expect(result.map((i: any) => i.id)).toEqual(['a11y']);
  });

  it('returns an empty list when nothing matches', () => {
    const result = filterFaqs(items, 'kangaroo');
    expect(result).toEqual([]);
  });

  it('normalizes Unicode NFC — precomposed vs decomposed é match', () => {
    // NFD-encoded "café" — the haystack — using 'cafe' + U+0301 (combining
    // acute accent). Without .normalize('NFC') on BOTH sides, a query of
    // "café" (precomposed U+00E9) would compare code-unit-by-code-unit and
    // never match.
    const nfd = faq(
      'Coffee questions',
      'Is there a café nearby that is accessible?',
      'nfd',
    );
    const list = [...items, nfd];

    // Query is precomposed NFC (what most keyboards produce).
    const result = filterFaqs(list, 'café');
    expect(result.map((i: any) => i.id)).toContain('nfd');
  });

  it('normalizes Unicode NFC in the reverse direction too', () => {
    // Haystack is precomposed; query is decomposed. Should still match.
    const nfc = faq(
      'Coffee questions',
      'Is there a café nearby that is accessible?',
      'nfc',
    );
    const list = [...items, nfc];

    // Decomposed query: 'cafe' + U+0301.
    const result = filterFaqs(list, 'café');
    expect(result.map((i: any) => i.id)).toContain('nfc');
  });

  it('preserves input order in the result', () => {
    // 'a' appears in every entry — result should keep input order.
    const result = filterFaqs(items, 'a');
    expect(result.map((i: any) => i.id)).toEqual([
      'report',
      'points',
      'privacy',
      'a11y',
    ]);
  });

  it('handles an empty input list', () => {
    expect(filterFaqs([], 'anything')).toEqual([]);
  });

  it('handles multiple internal whitespace runs in the query', () => {
    // Collapses "  screen   reader  " to two tokens, not many empty ones.
    const result = filterFaqs(items, '  screen   reader  ');
    expect(result.map((i: any) => i.id)).toEqual(['a11y']);
  });

  it('trims a multi-token query with leading/trailing whitespace', () => {
    // Leading/trailing whitespace shouldn't produce empty tokens that
    // accidentally narrow the result (an empty-string .includes() is
    // always true, which would silently disable AND filtering).
    const result = filterFaqs(items, '  points verified  ');
    expect(result.map((i: any) => i.id)).toEqual(['points']);
  });
});
