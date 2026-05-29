/**
 * Tests for src/lib/feedbackStore.ts — the Supabase wrapper used by the
 * FeedbackModal's dual-write path and the My Feedback list.
 *
 * What this protects against:
 *  - submitFeedback() throwing if the table doesn't exist yet (the
 *    Modal MUST never block the mailto flow on this).
 *  - submitFeedback() forgetting to attach the Platform tag — the
 *    maintainer relies on that to debug platform-specific reports.
 *  - listFeedbackByUser() bubbling an "unknown table" error to the UI
 *    instead of silently returning [] so the empty state shows.
 *  - A signed-out caller crashing the modal — userId is undefined and
 *    must serialize as null on the insert.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

// The supabase client builder pattern: from() returns an object with
// .insert / .select / .eq / .order / .limit / .single, each returning
// `this` to allow chaining, with the terminal call resolving to
// { data, error }. We model only the calls feedbackStore.ts uses.
const mockInsert = jest.fn();
const mockSelectAfterInsert = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: jest.fn((_table: string) => ({
      insert: mockInsert,
      select: mockSelect,
    })),
  },
}));

import { submitFeedback, listFeedbackByUser } from '../feedbackStore';

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockReturnValue({ select: mockSelectAfterInsert });
  mockSelectAfterInsert.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockEq.mockReturnValue({ order: mockOrder });
  mockOrder.mockReturnValue({ limit: mockLimit });
});

describe('submitFeedback', () => {
  it('returns "inserted" with the new row on a clean insert', async () => {
    const row = {
      id: 'r1',
      user_id: 'u1',
      category: 'idea' as const,
      body: 'hello',
      contact_email: null,
      platform: 'ios',
      created_at: '2026-05-23T00:00:00Z',
    };
    mockSingle.mockResolvedValueOnce({ data: row, error: null });

    const result = await submitFeedback({
      body: 'hello',
      category: 'idea',
      userId: 'u1',
    });

    expect(result.status).toBe('inserted');
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'u1',
      category: 'idea',
      body: 'hello',
      contact_email: null,
      platform: 'ios',
    });
    if (result.status === 'inserted') {
      expect(result.row).toEqual(row);
    }
  });

  it('returns "skipped" when supabase returns an error (e.g. table missing)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "public.feedback" does not exist' },
    });

    const result = await submitFeedback({
      body: 'x',
      category: 'bug',
      userId: 'u1',
    });

    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') {
      expect(result.reason).toContain('does not exist');
    }
  });

  it('returns "skipped" when the supabase client throws (network error)', async () => {
    mockSingle.mockRejectedValueOnce(new Error('Network down'));

    const result = await submitFeedback({
      body: 'x',
      category: 'love',
      userId: 'u1',
    });

    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') {
      expect(result.reason).toBe('Network down');
    }
  });

  it('serializes a missing userId as null (anonymous insert)', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'r2',
        user_id: null,
        category: 'other',
        body: 'anon',
        contact_email: null,
        platform: 'ios',
        created_at: '2026-05-23T00:00:00Z',
      },
      error: null,
    });

    await submitFeedback({ body: 'anon', category: 'other' });

    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: null }));
  });

  it('trims and caps the body before sending to supabase', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'r3',
        user_id: 'u1',
        category: 'idea',
        body: 'x',
        contact_email: null,
        platform: 'ios',
        created_at: '2026-05-23T00:00:00Z',
      },
      error: null,
    });

    const huge = '  ' + 'a'.repeat(6000) + '  ';
    await submitFeedback({ body: huge, category: 'idea', userId: 'u1' });

    const sent = mockInsert.mock.calls[0]?.[0];
    expect(sent).toBeDefined();
    // 5000-char cap matches the DB-side CHECK constraint.
    expect(sent.body.length).toBeLessThanOrEqual(5000);
    expect(sent.body.startsWith('a')).toBe(true);
  });

  it('attaches the Platform tag so the maintainer can debug per-OS issues', async () => {
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'r4',
        user_id: 'u1',
        category: 'bug',
        body: 'x',
        contact_email: null,
        platform: 'ios',
        created_at: '2026-05-23T00:00:00Z',
      },
      error: null,
    });

    await submitFeedback({ body: 'x', category: 'bug', userId: 'u1' });
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ platform: 'ios' }));
  });
});

describe('listFeedbackByUser', () => {
  it('returns the data array when the query succeeds', async () => {
    const rows = [
      {
        id: 'a',
        user_id: 'u1',
        category: 'idea' as const,
        body: 'one',
        contact_email: null,
        platform: 'ios',
        created_at: '2026-05-23T00:00:00Z',
      },
    ];
    mockLimit.mockResolvedValueOnce({ data: rows, error: null });

    const result = await listFeedbackByUser('u1');
    expect(result).toEqual(rows);
    expect(mockEq).toHaveBeenCalledWith('user_id', 'u1');
  });

  it('returns [] when supabase returns an error (missing table)', async () => {
    mockLimit.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "public.feedback" does not exist' },
    });

    expect(await listFeedbackByUser('u1')).toEqual([]);
  });

  it('returns [] when the supabase client throws', async () => {
    mockLimit.mockRejectedValueOnce(new Error('boom'));
    expect(await listFeedbackByUser('u1')).toEqual([]);
  });
});
