import { initialExpanded } from '../changelogExpanded';

describe('initialExpanded', () => {
  it('returns empty map for empty releases', () => {
    expect(initialExpanded([])).toEqual({});
  });

  it('marks the first release expanded and rest collapsed', () => {
    const result = initialExpanded([
      { date: '2026-05-23' },
      { date: '2026-05-20' },
      { date: '2026-05-10' },
    ]);
    expect(result).toEqual({
      '2026-05-23-0': true,
      '2026-05-20-1': false,
      '2026-05-10-2': false,
    });
  });

  it('handles a single release (expanded)', () => {
    expect(initialExpanded([{ date: '2026-05-23' }])).toEqual({
      '2026-05-23-0': true,
    });
  });

  it('uses index in the key (allows duplicate dates)', () => {
    const result = initialExpanded([
      { date: '2026-05-23' },
      { date: '2026-05-23' },
    ]);
    expect(Object.keys(result)).toEqual(['2026-05-23-0', '2026-05-23-1']);
    expect(result['2026-05-23-0']).toBe(true);
    expect(result['2026-05-23-1']).toBe(false);
  });

  it('does not mutate input array', () => {
    const releases = [{ date: '2026-05-23' }, { date: '2026-05-20' }];
    const snapshot = JSON.stringify(releases);
    initialExpanded(releases);
    expect(JSON.stringify(releases)).toBe(snapshot);
  });
});
