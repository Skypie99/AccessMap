/**
 * Tests for the createFlag async helper in src/lib/flags.ts — specifically
 * the PGRST204 fallback path that lets the app keep working when the
 * propose-only `flags.context_tags` migration hasn't been applied yet on
 * a given Supabase backend.
 *
 * What we lock in:
 *  - Happy path: column exists, tags ride along, capability flips to
 *    'available', caller is told tagsAccepted=true.
 *  - Fallback path: column missing → PGRST204 → second insert without
 *    tags succeeds, capability flips to 'unavailable', caller is told
 *    tagsAccepted=false so it can warn the user.
 *  - Sticky gate: once capability=='unavailable', the next call skips
 *    the doomed tagged insert entirely (no wasted round-trip, no silent
 *    drop).
 *  - Real errors (not PGRST204) still throw — we don't swallow.
 *
 * The supabase client is fully mocked so this test never touches the
 * network or a real DB — matches the pattern used in
 * src/lib/__tests__/feedbackStore.test.ts.
 */

// Chain mocks: from(table).insert(payload).select().single() → { data, error }.
// Each insert call gets its own .select().single() leaf so we can stage
// distinct responses per call.
// Jest insists outer-scope mock vars start with "mock" (case-insensitive)
// because the jest.mock factory runs before the module's top-level code.
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ single: mockSingle }));
const mockInsert = jest.fn((_payload: unknown) => ({ select: mockSelect }));
const mockFrom = jest.fn((_table: string) => ({ insert: mockInsert }));

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

import {
  createFlag,
  getContextTagsCapability,
  __resetContextTagsCapabilityForTests,
} from '../flags';

// Helper: read the n-th insert payload safely under
// noUncheckedIndexedAccess (any expression x[k] might be undefined).
function insertPayload(n: number): Record<string, unknown> {
  const call = mockInsert.mock.calls[n];
  if (!call) throw new Error(`expected an insert call at index ${n}`);
  return call[0] as Record<string, unknown>;
}

const baseInput = {
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp' as const,
  severity: 3 as const,
  description: null,
  photo_url: null,
};

const fakeRow = {
  id: 'flag-1',
  user_id: 'user-1',
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp',
  severity: 3,
  description: null,
  photo_url: null,
  status: 'open',
  created_at: '2026-05-24T00:00:00Z',
};

beforeEach(() => {
  jest.clearAllMocks();
  __resetContextTagsCapabilityForTests();
});

describe('createFlag — happy path with tags column present', () => {
  it('inserts WITH context_tags, flips capability to available, returns tagsAccepted=true', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await createFlag('user-1', {
      ...baseInput,
      context_tags: ['morning_rush', 'high_tide'],
    });

    expect(result.row).toEqual(fakeRow);
    expect(result.tagsAccepted).toBe(true);
    expect(getContextTagsCapability()).toBe('available');

    // First (and only) insert should have carried the tags.
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const sentPayload = insertPayload(0);
    expect(sentPayload.context_tags).toEqual(['morning_rush', 'high_tide']);
    expect(sentPayload.user_id).toBe('user-1');
  });
});

describe('createFlag — PGRST204 fallback when context_tags column is missing', () => {
  it('falls back to a no-tags insert, flips capability to unavailable, returns tagsAccepted=false', async () => {
    // First call: schema cache says column is missing.
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST204', message: "Could not find the 'context_tags' column" },
    });
    // Second call: legacy-shape insert succeeds.
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await createFlag('user-1', {
      ...baseInput,
      context_tags: ['morning_rush'],
    });

    // The row still lands (the user's report is NOT lost).
    expect(result.row).toEqual(fakeRow);
    // But the caller is told the tags didn't make it — this is what
    // drives the in-app "Flag saved without context tags" alert.
    expect(result.tagsAccepted).toBe(false);
    // And the gate is now 'unavailable' so future calls skip the
    // doomed tagged path.
    expect(getContextTagsCapability()).toBe('unavailable');

    // We should have attempted TWO inserts: tagged then untagged.
    expect(mockInsert).toHaveBeenCalledTimes(2);

    const firstPayload = insertPayload(0);
    expect(firstPayload.context_tags).toEqual(['morning_rush']);

    const secondPayload = insertPayload(1);
    // The legacy insert must NOT carry the unknown field.
    expect(secondPayload.context_tags).toBeUndefined();
    expect(secondPayload.user_id).toBe('user-1');
  });

  it('also recognizes the message-only "not find/exist" shape', async () => {
    // Some Supabase versions return only a message string, no PGRST204
    // code. The heuristic in flags.ts handles that too.
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: {
        message: 'column flags.context_tags does not exist',
      },
    });
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await createFlag('user-1', {
      ...baseInput,
      context_tags: ['when_wet'],
    });

    expect(result.tagsAccepted).toBe(false);
    expect(result.row).toEqual(fakeRow);
    expect(getContextTagsCapability()).toBe('unavailable');
  });
});

describe('createFlag — capability gate is sticky after a failure', () => {
  it('once unavailable, skips the tagged insert on the next call entirely', async () => {
    // First call trips the gate.
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: 'PGRST204', message: 'context_tags missing' },
    });
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });
    await createFlag('user-1', { ...baseInput, context_tags: ['morning_rush'] });

    // Now the gate is closed. A second call should make exactly ONE
    // insert (the legacy-shape one), not two.
    jest.clearAllMocks();
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await createFlag('user-1', {
      ...baseInput,
      context_tags: ['high_tide'],
    });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = insertPayload(0);
    expect(payload.context_tags).toBeUndefined();
    expect(result.tagsAccepted).toBe(false);
    expect(result.row).toEqual(fakeRow);
  });
});

describe('createFlag — non-PGRST204 errors still bubble', () => {
  it('throws on a generic insert error (e.g. RLS denial) instead of swallowing', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '42501', message: 'new row violates row-level security policy' },
    });

    await expect(
      createFlag('user-1', { ...baseInput, context_tags: ['morning_rush'] }),
    ).rejects.toMatchObject({ code: '42501' });

    // Gate should NOT flip on an unrelated error.
    expect(getContextTagsCapability()).toBe('unknown');
    // Should NOT have attempted a second insert — the error wasn't the
    // missing-column shape, so no retry.
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});

describe('createFlag — no tags supplied', () => {
  it('skips the tagged insert path entirely and returns tagsAccepted=true', async () => {
    mockSingle.mockResolvedValueOnce({ data: fakeRow, error: null });

    const result = await createFlag('user-1', { ...baseInput });

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = insertPayload(0);
    expect(payload.context_tags).toBeUndefined();
    // No tags were sent, so trivially "all" of them landed.
    expect(result.tagsAccepted).toBe(true);
    // Capability shouldn't change just because we didn't probe.
    expect(getContextTagsCapability()).toBe('unknown');
  });
});
