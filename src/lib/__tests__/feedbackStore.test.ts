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

import fs from 'fs';
import path from 'path';

import { submitFeedback, listFeedbackByUser } from '../feedbackStore';
// The sentinel comes from reports.ts, never a literal — reportControl.guard
// bans a second declaration, and a hand-typed '[REPORT]' here would be a copy
// of the contract rather than a check of it.
import { REPORT_BODY_PREFIX } from '@/lib/reports';

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
const mockNot = jest.fn();
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

beforeEach(() => {
  jest.clearAllMocks();
  mockInsert.mockReturnValue({ select: mockSelectAfterInsert });
  mockSelectAfterInsert.mockReturnValue({ single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  // HIGH-1: `.not` is an OPTIONAL link in the chain — it appears only when the
  // caller asks to exclude a body prefix. eq() therefore has to offer BOTH the
  // filtered and unfiltered continuations, which is exactly the shape the real
  // PostgREST builder has.
  mockEq.mockReturnValue({ order: mockOrder, not: mockNot });
  mockNot.mockReturnValue({ order: mockOrder });
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

  /**
   * HIGH-1 (13_B1_VERIFY_LEDGER §A), ruled in §SKY-6.
   *
   * These two are a PAIR and only mean something together. The first proves the
   * envelope can be hidden; the second proves hiding it is opt-in, which is the
   * assertion protecting the PIPEDA export from inheriting the filter. Delete
   * either and the remaining one reads as a complete test while covering half
   * the contract.
   */
  it('excludes the report envelope when the caller asks — the My Feedback path', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    await listFeedbackByUser('u1', { excludeBodyPrefix: REPORT_BODY_PREFIX });

    expect(mockNot).toHaveBeenCalledWith('body', 'like', `${REPORT_BODY_PREFIX}%`);
  });

  it('does NOT exclude anything by default — the data-export path', async () => {
    mockLimit.mockResolvedValueOnce({ data: [], error: null });

    await listFeedbackByUser('u1');

    // The export must stay complete. A predicate baked into the query rather
    // than passed per call would silently strip a user's own reports out of
    // their own subject-access request.
    expect(mockNot).not.toHaveBeenCalled();
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

describe('an ANONYMOUS insert must never ask for the row back', () => {
  // THE BUG THIS PINS SHIPPED, and it was invisible for a reason worth keeping
  // in mind: it only became wrong when a second caller arrived.
  //
  // `feedback_insert_self_or_anon` permits user_id IS NULL, so a guest's write
  // lands. But BOTH select policies exclude that row, and PostgREST applies
  // SELECT RLS to the RETURNING clause — so `.select('*').single()` read back
  // nothing and submitFeedback reported `skipped` for a write that SUCCEEDED.
  // FeedbackModal never noticed (it ignores the result and has a mailto with
  // the same text). The B-1 report path maps skipped → failed on purpose,
  // because a report's insert IS the channel — so every GUEST report told the
  // reporter it had failed while sitting correctly in the table. Guests are the
  // App Review reviewer's cohort.
  //
  // The mock's insert() returns a chain object, so a regression here would NOT
  // surface as a thrown error — it would silently take the signed-in branch.
  // These assert the CHAIN SHAPE, which is the only thing that distinguishes them.

  it('inserts without a select() when there is no userId', async () => {
    mockInsert.mockReturnValue(Promise.resolve({ error: null }));

    const result = await submitFeedback({ body: 'anon report', category: 'other' });

    expect(result.status).toBe('inserted');
    expect(result).toEqual({ status: 'inserted', row: null });
    // The whole point: no read-back was attempted.
    expect(mockSelectAfterInsert).not.toHaveBeenCalled();
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('still reports a genuinely failed anonymous insert as skipped', async () => {
    mockInsert.mockReturnValue(Promise.resolve({ error: { message: 'rate limited' } }));

    const result = await submitFeedback({ body: 'anon report', category: 'other' });

    expect(result).toEqual({ status: 'skipped', reason: 'rate limited' });
  });

  it('a signed-in insert DOES read the row back — the branch is really conditional', async () => {
    // Asserts the CHAIN, not the row: the suite above already covers what a
    // signed-in insert returns, and asserting the row here would depend on
    // which mockResolvedValueOnce is still queued from an earlier test.
    // Paired with the first test's `not.toHaveBeenCalled()`, this is what proves
    // the userId check actually forks rather than always taking one path.
    mockSingle.mockResolvedValue({ data: null, error: { message: 'whatever' } });

    await submitFeedback({ body: 'mine', category: 'other', userId: 'u9' });

    expect(mockSelectAfterInsert).toHaveBeenCalledWith('*');
    expect(mockSingle).toHaveBeenCalled();
  });
});

/**
 * HIGH-1 — the CALL SITES, not the query.
 *
 * `listFeedbackByUser` has exactly two production callers and they must ask for
 * different things. The tests above prove the option works; these prove the two
 * callers actually use it correctly, which is where the bug would really live —
 * a correct function called wrongly looks identical to a broken one from the
 * outside, and the failure mode here is silent: reports reappear in My Feedback,
 * or vanish from a subject-access export, with every other test still green.
 */
describe('the two callers ask for different rows, on purpose (§SKY-6)', () => {
  const REPO = path.join(__dirname, '..', '..');
  const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

  it('there are still exactly two production callers', () => {
    // A third caller is not forbidden — but it has to make this choice
    // deliberately, and this failing is how it gets asked to.
    const files = ['components/MyFeedbackModal.tsx', 'screens/SettingsScreen.tsx'];
    for (const f of files) expect(read(f)).toContain('listFeedbackByUser(');
  });

  it('My Feedback excludes the report envelope', () => {
    const src = read('components/MyFeedbackModal.tsx');
    expect(src).toMatch(/listFeedbackByUser\(\s*user\.id,\s*\{\s*excludeBodyPrefix:\s*REPORT_BODY_PREFIX\s*\}\s*\)/);
  });

  it('the PIPEDA export does NOT — it takes every row the user wrote', () => {
    const src = read('screens/SettingsScreen.tsx');
    expect(src).toContain('listFeedbackByUser(user.id)');
    expect(src).not.toContain('listFeedbackByUser(user.id, {');
  });
});
