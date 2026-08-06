/**
 * Unit tests for updateFlagContent in src/lib/flags.ts.
 *
 * updateFlagContent(flagId, patch) is the function that lets flag owners edit
 * the editable fields of their own open flags — description, category, and
 * severity. It MUST NOT send id, user_id, lat, lng, status, photo_url, or
 * created_at to Supabase. Since code-qa 2026-08-06 (COR-1) it also runs the
 * same description/category/severity trust-boundary guards as createFlag
 * BEFORE any network call — an edit must not land what a create would refuse.
 * (The blocked-term half of that parity is Sky-gated — Q-1 — and deliberately
 * not pinned here either way.)
 *
 * The Supabase client is fully mocked (no network). The builder chain is:
 *   from(table).update(patch).eq('id', flagId).select().single()
 * which resolves to { data, error }.
 */

// ---------------------------------------------------------------------------
// Supabase mock — hoisted by Jest before any import runs.
// Chain: from → update → eq → select → single
// ---------------------------------------------------------------------------
import { updateFlagContent } from '../flags';
import type { FlagRow } from '@/types/database';

const mockSingle = jest.fn();
const mockSelectAfterUpdate = jest.fn(() => ({ single: mockSingle }));
const mockEq = jest.fn(() => ({ select: mockSelectAfterUpdate }));
const mockUpdate = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn((_table: string) => ({ update: mockUpdate }));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    // Wrap in arrow so the factory closes over the live mockFrom reference
    // (jest.mock factories are hoisted before const declarations, so
    // referencing mockFrom directly would capture the TDZ undefined).
    from: (table: string) => mockFrom(table),
  },
}));

// Helper: extract the first argument of the n-th call to mockUpdate safely
// under noUncheckedIndexedAccess (mock.calls[n] may be undefined).
// Cast through unknown first because jest.fn() infers a zero-arg tuple for
// mock.calls when no explicit parameter type is given.
function updateArg(callIndex: number): Record<string, unknown> {
  const calls = mockUpdate.mock.calls as unknown as [unknown][];
  const call = calls[callIndex];
  if (!call) throw new Error(`expected a mockUpdate call at index ${callIndex}`);
  return call[0] as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------
const FLAG_ID = 'flag-abc-123';

const fakeRow: FlagRow = {
  id: FLAG_ID,
  user_id: 'user-1',
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp',
  severity: 3,
  description: 'Cracked curb near bus stop',
  photo_url: null,
  status: 'open',
  created_at: '2026-05-24T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Happy path — all editable fields supplied
// ---------------------------------------------------------------------------
describe('updateFlagContent — happy path', () => {
  it('returns the updated FlagRow on success', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await updateFlagContent(FLAG_ID, {
      description: 'Cracked curb near bus stop',
      category: 'no_ramp',
      severity: 3,
    });

    expect(result).toEqual(fakeRow);
  });

  it('calls from("flags") with the correct table name', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { description: 'Updated' });

    expect(mockFrom).toHaveBeenCalledWith('flags');
  });

  // Deliberate flip of the old "passes the patch object directly" pin
  // (code-qa 2026-08-06 TEST-3): the patch now goes through the createFlag
  // guards first. Already-normalized input must come out value-identical.
  it('passes an already-normalized patch through to .update() unchanged', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const patch = { description: 'New description', severity: 5 as const };
    await updateFlagContent(FLAG_ID, patch);

    expect(mockUpdate).toHaveBeenCalledWith(patch);
  });

  it('filters by the correct flag id in .eq()', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { category: 'broken_sidewalk' });

    expect(mockEq).toHaveBeenCalledWith('id', FLAG_ID);
  });

  it('calls .select() then .single() to get a single row back', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { severity: 1 });

    expect(mockSelectAfterUpdate).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 2. Only editable fields — patch must NOT contain protected columns
// ---------------------------------------------------------------------------
describe('updateFlagContent — only sends editable fields', () => {
  it('sends description, category, and severity when all three are in the patch', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const patch = {
      description: 'Better description',
      category: 'blocked_path' as const,
      severity: 4 as const,
    };

    await updateFlagContent(FLAG_ID, patch);

    const sentPatch = updateArg(0);
    // Editable fields present
    expect(sentPatch.description).toBe('Better description');
    expect(sentPatch.category).toBe('blocked_path');
    expect(sentPatch.severity).toBe(4);
    // Protected fields must not be present
    expect(sentPatch.id).toBeUndefined();
    expect(sentPatch.user_id).toBeUndefined();
    expect(sentPatch.lat).toBeUndefined();
    expect(sentPatch.lng).toBeUndefined();
    expect(sentPatch.status).toBeUndefined();
    expect(sentPatch.photo_url).toBeUndefined();
    expect(sentPatch.created_at).toBeUndefined();
  });

  it('can send a patch with only description (partial update)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { description: 'Just the description' });

    const sentPatch = updateArg(0);
    expect(sentPatch.description).toBe('Just the description');
    expect(sentPatch.category).toBeUndefined();
    expect(sentPatch.severity).toBeUndefined();
  });

  it('can send a patch with only category (partial update)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { category: 'steep_grade' });

    const sentPatch = updateArg(0);
    expect(sentPatch.category).toBe('steep_grade');
    expect(sentPatch.description).toBeUndefined();
    expect(sentPatch.severity).toBeUndefined();
  });

  it('can send a patch with only severity (partial update)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { severity: 2 });

    const sentPatch = updateArg(0);
    expect(sentPatch.severity).toBe(2);
    expect(sentPatch.description).toBeUndefined();
    expect(sentPatch.category).toBeUndefined();
  });

  it('can set description to null (clearing it)', async () => {
    const rowWithNullDesc: FlagRow = { ...fakeRow, description: null };
    mockSingle.mockResolvedValueOnce({ data: rowWithNullDesc, error: null });

    const result = await updateFlagContent(FLAG_ID, { description: null });

    const sentPatch = updateArg(0);
    expect(sentPatch.description).toBeNull();
    expect(result.description).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Error propagation — Supabase errors must bubble up as thrown exceptions
// ---------------------------------------------------------------------------
describe('updateFlagContent — error propagation', () => {
  it('throws the Supabase error object when error is non-null', async () => {
    const supabaseError = {
      code: '42501',
      message: 'new row violates row-level security policy',
    };
    mockSingle.mockResolvedValueOnce({ data: null, error: supabaseError });

    await expect(
      updateFlagContent(FLAG_ID, { description: 'Attempt by non-owner' }),
    ).rejects.toMatchObject({ code: '42501' });
  });

  it('throws a not-found-style error when the flag id does not match any row', async () => {
    const notFoundError = {
      code: 'PGRST116',
      message: 'The result contains 0 rows',
    };
    mockSingle.mockResolvedValueOnce({ data: null, error: notFoundError });

    await expect(updateFlagContent('nonexistent-flag-id', { severity: 1 })).rejects.toMatchObject({
      code: 'PGRST116',
    });
  });

  it('throws a network/generic error when the query fails', async () => {
    const networkError = new Error('Failed to fetch');
    mockSingle.mockResolvedValueOnce({ data: null, error: networkError });

    await expect(updateFlagContent(FLAG_ID, { category: 'other' })).rejects.toThrow(
      'Failed to fetch',
    );
  });

  it('does NOT throw when error is null (success case)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await expect(updateFlagContent(FLAG_ID, { description: 'Fine' })).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. Return value integrity
// ---------------------------------------------------------------------------
describe('updateFlagContent — return value', () => {
  it('returns exactly the data from the Supabase response (the updated row)', async () => {
    const updatedRow: FlagRow = {
      ...fakeRow,
      description: 'Edited description',
      category: 'missing_signal',
      severity: 5,
    };
    mockSingle.mockResolvedValueOnce({ data: updatedRow, error: null });

    const result = await updateFlagContent(FLAG_ID, {
      description: 'Edited description',
      category: 'missing_signal',
      severity: 5,
    });

    expect(result).toEqual(updatedRow);
    expect(result.id).toBe(FLAG_ID);
    expect(result.description).toBe('Edited description');
    expect(result.category).toBe('missing_signal');
    expect(result.severity).toBe(5);
    // Protected fields preserved from DB row
    expect(result.user_id).toBe('user-1');
    expect(result.status).toBe('open');
  });
});

// ---------------------------------------------------------------------------
// 5. Trust-boundary guards (code-qa 2026-08-06 COR-1) — the edit path must
//    enforce the same create-path guards, and must refuse BEFORE any network
//    call (mockUpdate never fires on a rejected patch).
// ---------------------------------------------------------------------------
describe('updateFlagContent — trust-boundary guards (COR-1)', () => {
  it('rejects a description over 2000 characters without calling Supabase', async () => {
    await expect(
      updateFlagContent(FLAG_ID, { description: 'a'.repeat(2001) }),
    ).rejects.toThrow('Description must be 2000 characters or fewer.');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('accepts a description of exactly 2000 characters', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });
    const max = 'a'.repeat(2000);

    await updateFlagContent(FLAG_ID, { description: max });

    expect(updateArg(0).description).toBe(max);
  });

  it('trims the description before sending it', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { description: '  padded edit  ' });

    expect(updateArg(0).description).toBe('padded edit');
  });

  it('normalizes a whitespace-only description to null (create-path contract)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { description: '   ' });

    expect(updateArg(0).description).toBeNull();
  });

  it('rejects an invalid category without calling Supabase', async () => {
    // Runtime guard test: the cast smuggles past compile-time checking on
    // purpose — this is exactly the "future or untyped caller" the guard
    // exists for.
    await expect(
      updateFlagContent(FLAG_ID, { category: 'not_a_category' as never }),
    ).rejects.toThrow('Please choose a valid category.');

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it.each([0, 6, 2.5])('rejects out-of-range severity %p without calling Supabase', async (bad) => {
    await expect(updateFlagContent(FLAG_ID, { severity: bad as never })).rejects.toThrow(
      'Severity must be a whole number from 1 to 5.',
    );

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('still omits absent fields from the guarded patch (partial update intact)', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    await updateFlagContent(FLAG_ID, { severity: 2 });

    const sentPatch = updateArg(0);
    expect(sentPatch.severity).toBe(2);
    expect(sentPatch.description).toBeUndefined();
    expect(sentPatch.category).toBeUndefined();
  });
});
