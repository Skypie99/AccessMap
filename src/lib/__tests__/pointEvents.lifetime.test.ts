/**
 * SW-39 — getLifetimeReportOutcomes: "has one of my reports EVER been verified
 * or resolved", counted from the append-only point-event ledger.
 *
 * ─── THE BUG THIS EXISTS FOR ──────────────────────────────────────────────
 * The Profile headline tiles mixed two metrics. "Reported" is a lifetime total;
 * "Verified" and "Resolved" read `flags.status`, which is a CURRENT-STATUS
 * snapshot. A report that was verified and then resolved leaves the verified
 * bucket, so the screen showed
 *
 *     6 REPORTED · 0 VERIFIED · 3 RESOLVED
 *
 * two inches under an activity feed reading "Your report was verified · +10
 * pts" — twice. Confirmed live in the authed pass: the Verified tile went
 * 1 -> 0 the moment a flag moved verified -> resolved. Every number was true;
 * the row as a whole was not.
 *
 * ─── WHY THE LEDGER, AND WHAT THIS PINS ───────────────────────────────────
 * Point events are written on the transition and never revoked, which is the
 * exact shape of the question. Three things have to hold:
 *   1. counts come from the server (`head: true`), not from
 *      getPointEventHistory, which caps at 50 and would silently under-count;
 *   2. a missing `point_events` table returns null rather than a confident 0,
 *      so the caller can fall back to what it showed before;
 *   3. any OTHER error still throws — a network failure must not be laundered
 *      into "you have achieved nothing".
 */

import { getLifetimeReportOutcomes } from '../pointEvents';

/** Terminal `.eq()` of the chain — from().select().eq(user).eq(type) */
const mockEqType = jest.fn();
const mockEqUser = jest.fn(() => ({ eq: mockEqType }));
const mockSelect = jest.fn(() => ({ eq: mockEqUser }));
const mockFrom = jest.fn((_table: string) => ({ select: mockSelect }));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

beforeEach(() => jest.clearAllMocks());

describe('getLifetimeReportOutcomes — happy path', () => {
  it('counts verified and resolved reporter awards separately', async () => {
    mockEqType
      .mockResolvedValueOnce({ count: 4, error: null })
      .mockResolvedValueOnce({ count: 3, error: null });

    const result = await getLifetimeReportOutcomes('user-a');

    expect(result).toEqual({ verified: 4, resolved: 3 });
    expect(mockFrom).toHaveBeenCalledWith('point_events');
    expect(mockEqUser).toHaveBeenCalledWith('user_id', 'user-a');
    expect(mockEqType).toHaveBeenNthCalledWith(1, 'event_type', 'flag_verified_reporter');
    expect(mockEqType).toHaveBeenNthCalledWith(2, 'event_type', 'flag_resolved_reporter');
  });

  it('counts server-side — head:true, so no rows cross the wire', async () => {
    // This is what separates it from getPointEventHistory's 50-row cap. If a
    // later edit drops head/exact, a user past 50 events silently under-counts.
    mockEqType
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null });

    await getLifetimeReportOutcomes('user-a');

    expect(mockSelect).toHaveBeenCalledWith('id', { count: 'exact', head: true });
  });

  it('treats a null count as zero rather than propagating null', async () => {
    mockEqType
      .mockResolvedValueOnce({ count: null, error: null })
      .mockResolvedValueOnce({ count: 2, error: null });

    expect(await getLifetimeReportOutcomes('user-a')).toEqual({ verified: 0, resolved: 2 });
  });

  it('counts the REPORTER awards, never the actor ones', async () => {
    // Helping verify someone else's report is not one of YOUR reports being
    // verified. The tiles are about the user's own reports, and the ledger
    // distinguishes the two with separate event types.
    mockEqType
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 1, error: null });

    await getLifetimeReportOutcomes('user-a');

    const types = mockEqType.mock.calls.map((c) => c[1]);
    expect(types).not.toContain('flag_verified_actor');
    expect(types).not.toContain('flag_resolved_actor');
  });
});

describe('getLifetimeReportOutcomes — degradation', () => {
  it('returns null when point_events does not exist (42P01)', async () => {
    mockEqType
      .mockResolvedValueOnce({ count: null, error: { code: '42P01' } })
      .mockResolvedValueOnce({ count: null, error: { code: '42P01' } });

    // Null, NOT { verified: 0, resolved: 0 } — the caller shows what it showed
    // before rather than telling the user their reports were never verified.
    expect(await getLifetimeReportOutcomes('user-a')).toBeNull();
  });

  it('returns null if EITHER count is unavailable', async () => {
    mockEqType
      .mockResolvedValueOnce({ count: 4, error: null })
      .mockResolvedValueOnce({ count: null, error: { code: '42P01' } });

    // Half an answer would put a lifetime number beside a snapshot number —
    // the exact mixed-semantics row this whole change removes.
    expect(await getLifetimeReportOutcomes('user-a')).toBeNull();
  });

  it('throws on any other error instead of reporting zero', async () => {
    mockEqType
      .mockResolvedValueOnce({ count: null, error: { code: '08006', message: 'connection failure' } })
      .mockResolvedValueOnce({ count: 0, error: null });

    await expect(getLifetimeReportOutcomes('user-a')).rejects.toEqual(
      expect.objectContaining({ code: '08006' }),
    );
  });
});
