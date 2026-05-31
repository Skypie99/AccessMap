/**
 * Tests for src/lib/pointEvents.ts
 *
 * Covers:
 *  - Happy path: returns events from point_events table
 *  - Empty result: returns [] when no events
 *  - 42P01 guard: returns [] when table doesn't exist (migration not applied)
 *  - Other errors: throws so the caller can handle them
 *  - pointEventLabel: returns human-readable label for each event type
 */

const mockLimit = jest.fn();
const mockOrder = jest.fn(() => ({ limit: mockLimit }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import { getPointEventHistory, pointEventLabel } from '../pointEvents';
import type { PointEventType } from '../pointEvents';

const fakeEvents = [
  {
    id: 1,
    user_id: 'user-a',
    event_type: 'flag_verified_reporter',
    delta: 10,
    flag_id: 'flag-1',
    created_at: '2026-05-30T12:00:00Z',
  },
  {
    id: 2,
    user_id: 'user-a',
    event_type: 'flag_submitted',
    delta: 5,
    flag_id: 'flag-1',
    created_at: '2026-05-29T10:00:00Z',
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getPointEventHistory — happy path', () => {
  it('queries point_events for the given userId ordered newest-first, limit 50', async () => {
    mockLimit.mockResolvedValueOnce({ data: fakeEvents, error: null });

    const result = await getPointEventHistory('user-a');

    expect(mockFrom).toHaveBeenCalledWith('point_events');
    expect(mockSelect).toHaveBeenCalledWith(
      'id, user_id, event_type, delta, flag_id, created_at',
    );
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-a');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockLimit).toHaveBeenCalledWith(50);
    expect(result).toEqual(fakeEvents);
  });

  it('returns [] when data is null', async () => {
    mockLimit.mockResolvedValueOnce({ data: null, error: null });
    const result = await getPointEventHistory('user-a');
    expect(result).toEqual([]);
  });

  it('returns [] when data is an empty array', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });
    const result = await getPointEventHistory('user-a');
    expect(result).toEqual([]);
  });
});

describe('getPointEventHistory — 42P01 guard (migration not applied)', () => {
  it('returns [] when the point_events table does not exist (42P01)', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { code: '42P01', message: 'relation "point_events" does not exist' },
    });

    const result = await getPointEventHistory('user-a');

    expect(result).toEqual([]);
  });
});

describe('getPointEventHistory — other errors propagate', () => {
  it('throws on a non-42P01 Supabase error', async () => {
    const dbError = { code: 'PGRST301', message: 'permission denied' };
    mockLimit.mockResolvedValueOnce({ data: null, error: dbError });

    await expect(getPointEventHistory('user-a')).rejects.toEqual(dbError);
  });

  it('throws on a network error', async () => {
    const networkError = new Error('Failed to fetch');
    mockLimit.mockRejectedValueOnce(networkError);

    await expect(getPointEventHistory('user-a')).rejects.toThrow('Failed to fetch');
  });
});

describe('pointEventLabel — human-readable labels', () => {
  const cases: Array<[PointEventType, string]> = [
    ['flag_submitted', 'Reported a barrier'],
    ['flag_verified_reporter', 'Your report was verified'],
    ['flag_resolved_reporter', 'Your report was resolved'],
    ['flag_verified_actor', 'Helped verify a report'],
    ['flag_resolved_actor', 'Helped resolve a report'],
    ['flag_photo_added', 'Added a photo'],
    ['comment_added', 'Added a comment'],
    ['comment_upvoted', 'Your comment got a thumbs-up'],
    ['flag_spam_penalty', 'Report marked as spam'],
    ['streak_bonus', '7-day mapping streak'],
  ];

  it.each(cases)('pointEventLabel("%s") returns correct label', (type, expected) => {
    expect(pointEventLabel(type)).toBe(expected);
  });
});
