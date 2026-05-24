import { dayBucketTitle, groupByDay } from '../dayGroup';

// Fixed reference moment so the tests don't drift with the real clock.
// 2026-05-23 is a Saturday, 12:00 local — gives us safe Today/Yesterday math
// without time-zone edge cases.
const NOW = new Date(2026, 4, 23, 12, 0, 0);

describe('dayBucketTitle', () => {
  it('returns "Today" for the same calendar day', () => {
    expect(dayBucketTitle(new Date(2026, 4, 23, 9, 0, 0), NOW)).toBe('Today');
    expect(dayBucketTitle(new Date(2026, 4, 23, 23, 59, 0), NOW)).toBe('Today');
  });

  it('returns "Yesterday" for the previous calendar day', () => {
    expect(dayBucketTitle(new Date(2026, 4, 22, 9, 0, 0), NOW)).toBe('Yesterday');
  });

  it('returns the weekday name for 2..6 days ago', () => {
    // 2026-05-22 is Friday, 2026-05-19 is Tuesday, 2026-05-18 is Monday.
    expect(dayBucketTitle(new Date(2026, 4, 21, 9, 0, 0), NOW)).toBe('Thursday');
    expect(dayBucketTitle(new Date(2026, 4, 19, 9, 0, 0), NOW)).toBe('Tuesday');
    expect(dayBucketTitle(new Date(2026, 4, 18, 9, 0, 0), NOW)).toBe('Monday');
  });

  it('returns "Month day" for older days within the same year', () => {
    const title = dayBucketTitle(new Date(2026, 0, 15), NOW);
    // Locale-dependent — accept any string that contains the day number
    // and the month name. Tests stay green across locales.
    expect(title).toMatch(/15/);
    expect(title.toLowerCase()).toMatch(/jan/);
  });

  it('includes the year for dates in a different year', () => {
    const title = dayBucketTitle(new Date(2024, 5, 10), NOW);
    expect(title).toMatch(/2024/);
  });
});

describe('groupByDay', () => {
  it('returns an empty array for an empty input', () => {
    expect(groupByDay([], (x: { d: string }) => x.d, NOW)).toEqual([]);
  });

  it('groups items by local calendar day', () => {
    const items = [
      { id: 'a', d: new Date(2026, 4, 23, 10, 0).toISOString() }, // Today
      { id: 'b', d: new Date(2026, 4, 23, 15, 0).toISOString() }, // Today
      { id: 'c', d: new Date(2026, 4, 22, 12, 0).toISOString() }, // Yesterday
    ];
    const sections = groupByDay(items, (x) => x.d, NOW);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('Today');
    expect(sections[0]!.data.map((x) => x.id)).toEqual(['a', 'b']);
    expect(sections[1]!.title).toBe('Yesterday');
    expect(sections[1]!.data.map((x) => x.id)).toEqual(['c']);
  });

  it('preserves input order within each bucket', () => {
    const items = [
      { id: 'newest', d: new Date(2026, 4, 23, 18, 0).toISOString() },
      { id: 'middle', d: new Date(2026, 4, 23, 12, 0).toISOString() },
      { id: 'oldest', d: new Date(2026, 4, 23, 6, 0).toISOString() },
    ];
    const sections = groupByDay(items, (x) => x.d, NOW);
    expect(sections[0]!.data.map((x) => x.id)).toEqual(['newest', 'middle', 'oldest']);
  });

  it('accepts Date instances directly', () => {
    const items = [{ id: 'a', d: new Date(2026, 4, 22, 12, 0) }];
    const sections = groupByDay(items, (x) => x.d, NOW);
    expect(sections[0]!.title).toBe('Yesterday');
  });

  it('shunts invalid dates to an "Unknown date" bucket at the end', () => {
    const items = [
      { id: 'good', d: new Date(2026, 4, 23, 9, 0).toISOString() },
      { id: 'bad', d: 'not a date' },
      { id: 'also-bad', d: '' },
    ];
    const sections = groupByDay(items, (x) => x.d, NOW);
    expect(sections).toHaveLength(2);
    expect(sections[0]!.title).toBe('Today');
    expect(sections[1]!.title).toBe('Unknown date');
    expect(sections[1]!.data.map((x) => x.id)).toEqual(['bad', 'also-bad']);
  });

  it('generates a stable key per bucket', () => {
    const items = [
      { id: 'a', d: new Date(2026, 4, 23).toISOString() },
      { id: 'b', d: new Date(2026, 4, 22).toISOString() },
    ];
    const sections = groupByDay(items, (x) => x.d, NOW);
    expect(sections[0]!.key).toBe('2026-05-23');
    expect(sections[1]!.key).toBe('2026-05-22');
  });
});
