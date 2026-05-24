import {
  DEFAULT_TASKS_SORT,
  TASKS_SORT_LABELS,
  TASKS_SORT_ORDER,
  loadTasksSort,
  saveTasksSort,
  sortFlags,
  type TasksSort,
} from '../tasksSort';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FlagRow } from '@/types/database';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

function makeFlag(
  id: string,
  severity: 1 | 2 | 3 | 4 | 5,
  createdAt: string,
): FlagRow {
  return {
    id,
    user_id: 'u1',
    lat: 47,
    lng: -122,
    category: 'no_ramp',
    severity,
    description: null,
    photo_url: null,
    status: 'open',
    created_at: createdAt,
  };
}

describe('TASKS_SORT_ORDER & labels', () => {
  it('has all 3 modes in a consistent order', () => {
    expect(TASKS_SORT_ORDER).toEqual(['newest', 'oldest', 'severity']);
  });

  it('has a non-empty label for every mode', () => {
    for (const m of TASKS_SORT_ORDER) {
      expect(TASKS_SORT_LABELS[m]).toBeTruthy();
      expect(typeof TASKS_SORT_LABELS[m]).toBe('string');
    }
  });

  it('exports the documented default', () => {
    expect(DEFAULT_TASKS_SORT).toBe('newest');
  });
});

describe('sortFlags', () => {
  // Three flags with increasing timestamps and varying severities.
  const a = makeFlag('a', 5, '2026-05-21T08:00:00Z'); // oldest, sev 5
  const b = makeFlag('b', 3, '2026-05-22T08:00:00Z'); // middle, sev 3
  const c = makeFlag('c', 4, '2026-05-23T08:00:00Z'); // newest, sev 4
  const flags = [a, b, c];

  it('newest: most recent created_at first', () => {
    expect(sortFlags(flags, 'newest').map((f) => f.id)).toEqual(['c', 'b', 'a']);
  });

  it('oldest: oldest created_at first', () => {
    expect(sortFlags(flags, 'oldest').map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('severity: highest first, newer wins on ties', () => {
    // a is sev 5, c is sev 4, b is sev 3 — so a, c, b.
    expect(sortFlags(flags, 'severity').map((f) => f.id)).toEqual([
      'a',
      'c',
      'b',
    ]);
  });

  it('severity tiebreaker prefers newer created_at', () => {
    const e = makeFlag('e', 5, '2026-05-20T08:00:00Z'); // sev 5, older than a
    const out = sortFlags([a, e], 'severity').map((f) => f.id);
    // Both sev 5 — a is newer, should come first.
    expect(out).toEqual(['a', 'e']);
  });

  it('does not mutate the input array', () => {
    const original = [...flags];
    sortFlags(flags, 'severity');
    expect(flags).toEqual(original);
  });

  it('is stable when both primary and secondary keys tie', () => {
    // Two flags with identical severity AND created_at — must keep input order.
    const same1 = makeFlag('x1', 3, '2026-05-22T08:00:00Z');
    const same2 = makeFlag('x2', 3, '2026-05-22T08:00:00Z');
    expect(sortFlags([same1, same2], 'severity').map((f) => f.id)).toEqual([
      'x1',
      'x2',
    ]);
    expect(sortFlags([same2, same1], 'severity').map((f) => f.id)).toEqual([
      'x2',
      'x1',
    ]);
  });

  it('returns a new array even for empty input', () => {
    const empty: FlagRow[] = [];
    const out = sortFlags(empty, 'newest');
    expect(out).toEqual([]);
    expect(out).not.toBe(empty);
  });
});

describe('loadTasksSort', () => {
  const getItem = AsyncStorage.getItem as jest.Mock;
  const setItem = AsyncStorage.setItem as jest.Mock;

  beforeEach(() => {
    getItem.mockReset();
    setItem.mockReset();
  });

  it('returns default when nothing stored', async () => {
    getItem.mockResolvedValueOnce(null);
    await expect(loadTasksSort()).resolves.toBe(DEFAULT_TASKS_SORT);
  });

  it('returns the stored value when valid', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify('severity'));
    await expect(loadTasksSort()).resolves.toBe('severity');
  });

  it('returns default when stored value is garbage', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify({ weird: 'shape' }));
    await expect(loadTasksSort()).resolves.toBe(DEFAULT_TASKS_SORT);
  });

  it('returns default when stored string is unknown', async () => {
    getItem.mockResolvedValueOnce(JSON.stringify('bogus' as TasksSort));
    await expect(loadTasksSort()).resolves.toBe(DEFAULT_TASKS_SORT);
  });

  it('fails soft if AsyncStorage throws', async () => {
    getItem.mockRejectedValueOnce(new Error('boom'));
    await expect(loadTasksSort()).resolves.toBe(DEFAULT_TASKS_SORT);
  });

  it('fails soft if stored JSON is malformed', async () => {
    getItem.mockResolvedValueOnce('{{{not-json}}}');
    await expect(loadTasksSort()).resolves.toBe(DEFAULT_TASKS_SORT);
  });
});

describe('saveTasksSort', () => {
  const setItem = AsyncStorage.setItem as jest.Mock;

  beforeEach(() => {
    setItem.mockReset();
  });

  it('persists the chosen mode as JSON', async () => {
    await saveTasksSort('oldest');
    expect(setItem).toHaveBeenCalledWith(
      '@accessmap/tasks_sort_v1',
      JSON.stringify('oldest'),
    );
  });

  it('fails soft on write error', async () => {
    setItem.mockRejectedValueOnce(new Error('disk full'));
    await expect(saveTasksSort('severity')).resolves.toBeUndefined();
  });
});
