/**
 * Tests for src/lib/contextTags.ts — the pure context-tag vocabulary and
 * helpers powering the chip picker in ReportFlagModal.
 *
 * What we lock in:
 *  - The vocabulary list (CONTEXT_TAGS) and its labels stay aligned and frozen.
 *  - `isValidTag` accepts every known tag and rejects unknown strings, empty
 *    strings, non-strings, null, and undefined.
 *  - `toggleTag` adds an absent tag, removes a present one, preserves the
 *    order of remaining tags, never mutates the input, and is its own inverse.
 *  - `sanitizeTagList` strips invalids, dedupes, preserves first-seen order,
 *    and tolerates anything (null, undefined, non-array) without throwing.
 */

import {
  CONTEXT_TAGS,
  CONTEXT_TAG_LABELS,
  isValidTag,
  sanitizeTagList,
  toggleTag,
  type ContextTag,
} from '../contextTags';

describe('contextTags vocabulary', () => {
  it('exposes exactly 9 tags', () => {
    expect(CONTEXT_TAGS.length).toBe(9);
  });

  it('every tag has a label', () => {
    for (const tag of CONTEXT_TAGS) {
      expect(CONTEXT_TAG_LABELS[tag]).toBeDefined();
      expect(CONTEXT_TAG_LABELS[tag].length).toBeGreaterThan(0);
    }
  });

  it('label keys match the tag list exactly', () => {
    const labelKeys = Object.keys(CONTEXT_TAG_LABELS).sort();
    const tagKeys = [...CONTEXT_TAGS].sort();
    expect(labelKeys).toEqual(tagKeys);
  });

  it('CONTEXT_TAGS is frozen', () => {
    expect(Object.isFrozen(CONTEXT_TAGS)).toBe(true);
  });

  it('CONTEXT_TAG_LABELS is frozen', () => {
    expect(Object.isFrozen(CONTEXT_TAG_LABELS)).toBe(true);
  });
});

describe('isValidTag', () => {
  it('accepts every known tag', () => {
    for (const tag of CONTEXT_TAGS) {
      expect(isValidTag(tag)).toBe(true);
    }
  });

  it('accepts each tag by literal name', () => {
    // Pin each expected value individually so a typo in a constant blows up
    // a single test rather than silently passing the for-loop above.
    expect(isValidTag('morning_rush')).toBe(true);
    expect(isValidTag('evening_rush')).toBe(true);
    expect(isValidTag('after_dark')).toBe(true);
    expect(isValidTag('school_hours')).toBe(true);
    expect(isValidTag('high_tide')).toBe(true);
    expect(isValidTag('when_wet')).toBe(true);
    expect(isValidTag('snow_or_ice')).toBe(true);
    expect(isValidTag('event_day')).toBe(true);
    expect(isValidTag('construction')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(isValidTag('lunchtime')).toBe(false);
    expect(isValidTag('MORNING_RUSH')).toBe(false); // case-sensitive
    expect(isValidTag(' high_tide')).toBe(false); // leading space
    expect(isValidTag('')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidTag(null)).toBe(false);
    expect(isValidTag(undefined)).toBe(false);
    expect(isValidTag(0)).toBe(false);
    expect(isValidTag(1)).toBe(false);
    expect(isValidTag(true)).toBe(false);
    expect(isValidTag(false)).toBe(false);
    expect(isValidTag({})).toBe(false);
    expect(isValidTag([])).toBe(false);
    expect(isValidTag(['high_tide'])).toBe(false);
  });
});

describe('toggleTag', () => {
  it('adds a tag when absent', () => {
    const result = toggleTag([], 'high_tide');
    expect(result).toEqual(['high_tide']);
  });

  it('appends an added tag to the end', () => {
    const result = toggleTag(['morning_rush', 'when_wet'], 'high_tide');
    expect(result).toEqual(['morning_rush', 'when_wet', 'high_tide']);
  });

  it('removes a tag when present', () => {
    const result = toggleTag(['morning_rush', 'high_tide', 'when_wet'], 'high_tide');
    expect(result).toEqual(['morning_rush', 'when_wet']);
  });

  it('preserves the order of remaining tags after a removal', () => {
    const result = toggleTag(
      ['morning_rush', 'evening_rush', 'after_dark', 'school_hours'],
      'evening_rush',
    );
    expect(result).toEqual(['morning_rush', 'after_dark', 'school_hours']);
  });

  it('is its own inverse (twice = original contents)', () => {
    const start: ContextTag[] = ['morning_rush', 'when_wet'];
    const once = toggleTag(start, 'high_tide');
    const twice = toggleTag(once, 'high_tide');
    expect(twice).toEqual(start);
  });

  it('does not mutate the input array (add)', () => {
    const input: ContextTag[] = ['morning_rush'];
    const snapshot = [...input];
    toggleTag(input, 'high_tide');
    expect(input).toEqual(snapshot);
  });

  it('does not mutate the input array (remove)', () => {
    const input: ContextTag[] = ['morning_rush', 'high_tide'];
    const snapshot = [...input];
    toggleTag(input, 'high_tide');
    expect(input).toEqual(snapshot);
  });

  it('returns a fresh array reference even on remove', () => {
    const input: ContextTag[] = ['morning_rush', 'high_tide'];
    const result = toggleTag(input, 'high_tide');
    expect(result).not.toBe(input);
  });

  it('returns a fresh array reference on add', () => {
    const input: ContextTag[] = [];
    const result = toggleTag(input, 'high_tide');
    expect(result).not.toBe(input);
  });

  it('dedupes by removing an already-present tag (not double-adding)', () => {
    // Calling toggleTag with an already-present tag should remove it once,
    // not add a duplicate. This is what makes the chip UI feel "on/off".
    const input: ContextTag[] = ['high_tide'];
    const result = toggleTag(input, 'high_tide');
    expect(result).toEqual([]);
  });
});

describe('sanitizeTagList', () => {
  it('returns [] for non-array input', () => {
    expect(sanitizeTagList(null)).toEqual([]);
    expect(sanitizeTagList(undefined)).toEqual([]);
    expect(sanitizeTagList('high_tide')).toEqual([]);
    expect(sanitizeTagList(42)).toEqual([]);
    expect(sanitizeTagList({ high_tide: true })).toEqual([]);
  });

  it('returns [] for an empty array', () => {
    expect(sanitizeTagList([])).toEqual([]);
  });

  it('keeps valid tags as-is', () => {
    expect(sanitizeTagList(['high_tide', 'morning_rush'])).toEqual([
      'high_tide',
      'morning_rush',
    ]);
  });

  it('strips unknown tag strings', () => {
    expect(sanitizeTagList(['high_tide', 'lunch_break', 'morning_rush'])).toEqual([
      'high_tide',
      'morning_rush',
    ]);
  });

  it('strips null and undefined values', () => {
    expect(sanitizeTagList(['high_tide', null, undefined, 'when_wet'])).toEqual([
      'high_tide',
      'when_wet',
    ]);
  });

  it('strips non-string values', () => {
    expect(sanitizeTagList(['high_tide', 0, true, {}, [], 'when_wet'])).toEqual([
      'high_tide',
      'when_wet',
    ]);
  });

  it('dedupes while preserving first-seen order', () => {
    expect(
      sanitizeTagList(['when_wet', 'high_tide', 'when_wet', 'morning_rush', 'high_tide']),
    ).toEqual(['when_wet', 'high_tide', 'morning_rush']);
  });

  it('preserves the caller-supplied order across a mixed-validity list', () => {
    expect(
      sanitizeTagList([
        'evening_rush',
        'unknown',
        'morning_rush',
        null,
        'after_dark',
      ]),
    ).toEqual(['evening_rush', 'morning_rush', 'after_dark']);
  });

  it('rejects everything when nothing is valid', () => {
    expect(sanitizeTagList(['lunch', null, 42, {}, 'MORNING_RUSH'])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = ['high_tide', 'unknown', 'when_wet'];
    const snapshot = [...input];
    sanitizeTagList(input);
    expect(input).toEqual(snapshot);
  });
});
