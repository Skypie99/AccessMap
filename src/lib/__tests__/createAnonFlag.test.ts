/**
 * Tests for createAnonFlag in src/lib/flags.ts.
 *
 * What we lock in:
 *  - Coordinate validation: NaN / Infinity / out-of-range values throw before
 *    any DB call is made.
 *  - The Supabase insert payload omits user_id (the DB stores NULL — critical
 *    for the RLS WITH CHECK that enforces anon-row integrity).
 *  - photo_url is always null (Storage RLS requires auth.uid in the path).
 *  - description is forwarded as-is, defaulting to null when absent.
 *  - On success the resolved FlagRow equals the Supabase response.
 *  - On Supabase error the error is rethrown.
 *
 * NOTE — rate-limit enforcement:
 *   createAnonFlag does NOT call checkAnonRateLimit internally; the JSDoc
 *   explicitly designates that as the caller's responsibility. The rate limit
 *   is therefore tested independently in anonRateLimit.test.ts.
 *
 * The Supabase client is fully mocked — chain:
 *   supabase.from('flags').insert(payload).select().single()
 */

// expo-image-manipulator is imported by flags.ts; the moduleNameMapper in
// jest.config.js points to __mocks__/expo-image-manipulator.js automatically,
// but jest.mock here is belt-and-suspenders so the factory path is explicit.
import { createAnonFlag } from '../flags';
import { CONTENT_BLOCKED_MESSAGE } from '../copy';
import type { FlagRow } from '@/types/database';

jest.mock('expo-image-manipulator', () => ({
  __esModule: true,
  manipulateAsync: jest.fn(),
  SaveFormat: { JPEG: 'jpeg', PNG: 'png' },
}));

// Supabase builder-chain mock: from → insert → select → single
// Each mock is declared before jest.mock() so the factory closure captures
// a live reference (jest.mock is hoisted above const declarations).
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

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_INPUT = {
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp' as const,
  severity: 3 as const,
};

const SAMPLE_ROW: FlagRow = {
  id: 'flag-anon-1',
  user_id: null,
  lat: 49.28,
  lng: -123.12,
  category: 'no_ramp',
  severity: 3,
  description: null,
  photo_url: null,
  status: 'open',
  created_at: '2026-05-30T00:00:00Z',
  context_tags: null,
};

// Helper: read the payload passed to .insert() on the first call.
function firstInsertPayload(): Record<string, unknown> {
  const call = mockInsert.mock.calls[0];
  if (!call) throw new Error('expected at least one insert call');
  return call[0] as Record<string, unknown>;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockSingle.mockResolvedValue({ data: SAMPLE_ROW, error: null });
});

// ---------------------------------------------------------------------------
// Coordinate validation — all checks fire before any Supabase call
// ---------------------------------------------------------------------------

describe('coordinate validation', () => {
  it('throws for NaN lat', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: NaN }),
    ).rejects.toThrow(/finite/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws for Infinity lat', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: Infinity }),
    ).rejects.toThrow(/finite/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws for NaN lng', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lng: NaN }),
    ).rejects.toThrow(/finite/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws when lat > 90', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: 91 }),
    ).rejects.toThrow(/lat/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws when lat < -90', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: -91 }),
    ).rejects.toThrow(/lat/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws when lng > 180', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lng: 181 }),
    ).rejects.toThrow(/lng/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('throws when lng < -180', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lng: -181 }),
    ).rejects.toThrow(/lng/i);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('accepts boundary values (lat=90, lng=180)', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: 90, lng: 180 }),
    ).resolves.toBeDefined();
  });

  it('accepts boundary values (lat=-90, lng=-180)', async () => {
    await expect(
      createAnonFlag({ ...VALID_INPUT, lat: -90, lng: -180 }),
    ).resolves.toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Insert payload — the critical RLS / privacy contract
// ---------------------------------------------------------------------------

describe('insert payload', () => {
  it('does NOT include user_id in the payload (anon row must have NULL user_id)', async () => {
    await createAnonFlag(VALID_INPUT);
    const payload = firstInsertPayload();
    expect(payload).not.toHaveProperty('user_id');
  });

  it('always sets photo_url to null (Storage RLS blocks anon uploads)', async () => {
    await createAnonFlag(VALID_INPUT);
    const payload = firstInsertPayload();
    expect(payload).toHaveProperty('photo_url', null);
  });

  it('includes lat, lng, category, and severity from the input', async () => {
    await createAnonFlag(VALID_INPUT);
    const payload = firstInsertPayload();
    expect(payload).toMatchObject({
      lat: VALID_INPUT.lat,
      lng: VALID_INPUT.lng,
      category: VALID_INPUT.category,
      severity: VALID_INPUT.severity,
    });
  });

  it('forwards description when provided', async () => {
    await createAnonFlag({ ...VALID_INPUT, description: 'Broken ramp near entrance' });
    const payload = firstInsertPayload();
    expect(payload).toHaveProperty('description', 'Broken ramp near entrance');
  });

  it('defaults description to null when not provided', async () => {
    await createAnonFlag(VALID_INPUT);
    const payload = firstInsertPayload();
    expect(payload).toHaveProperty('description', null);
  });

  it('coerces an explicit undefined description to null', async () => {
    await createAnonFlag({ ...VALID_INPUT, description: undefined });
    const payload = firstInsertPayload();
    expect(payload).toHaveProperty('description', null);
  });

  it("inserts into the 'flags' table", async () => {
    await createAnonFlag(VALID_INPUT);
    expect(mockFrom).toHaveBeenCalledWith('flags');
  });
});

// ---------------------------------------------------------------------------
// Supabase response handling
// ---------------------------------------------------------------------------

describe('Supabase response', () => {
  it('resolves with the FlagRow returned by Supabase on success', async () => {
    const result = await createAnonFlag(VALID_INPUT);
    expect(result).toEqual(SAMPLE_ROW);
  });

  it('throws when Supabase returns an error', async () => {
    const dbError = { message: 'new row violates row-level security policy', code: '42501' };
    mockSingle.mockResolvedValueOnce({ data: null, error: dbError });
    await expect(createAnonFlag(VALID_INPUT)).rejects.toEqual(dbError);
  });

  it('calls .select().single() after insert to retrieve the stored row', async () => {
    await createAnonFlag(VALID_INPUT);
    expect(mockSelect).toHaveBeenCalledTimes(1);
    expect(mockSingle).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// Submit-time content filter (Apple 1.2(a))
// ---------------------------------------------------------------------------
//
// The anonymous path used to insert with no filter call at all, while
// `createFlag` and the edit path both screened the description. That made the
// least accountable route the least moderated one, and it is the route App
// Review reaches for first. Sky's ratified policy (14_MODERATION_TEXTS_v1.md
// §2) is unqualified by auth state, so these pin the deviation closed.
//
// The matcher itself (case folding, word boundaries, the tier split) is proven
// in moderation/__tests__/blockedTerms.test.ts. These only prove it is WIRED,
// that it fires before the network, and that D-2 survives here too.

describe('submit-time content filter', () => {
  it('rejects a blocked term without ever calling Supabase', async () => {
    // Same fixture the moderation MUST-FAIL pins and the edit-path test use
    // (a disability slur — the class LDNOOBW lacks and CURATED_EXTRA exists for).
    await expect(
      createAnonFlag({ ...VALID_INPUT, description: 'the staff are retarded' }),
    ).rejects.toThrow(CONTENT_BLOCKED_MESSAGE);

    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('fires at the same trust boundary as the authenticated path, before insert', async () => {
    // Not a duplicate of the above: this pins the ORDER. A filter that ran
    // after the insert would still throw and still look green, while the row
    // was already public.
    await expect(
      createAnonFlag({ ...VALID_INPUT, description: 'retarded' }),
    ).rejects.toThrow(CONTENT_BLOCKED_MESSAGE);

    expect(mockFrom).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSingle).not.toHaveBeenCalled();
  });

  it('lets ordinary frustration through — D-2 holds on the anonymous path too', async () => {
    // D-2 is deliberate: "the damn ramp is still broken" is a real barrier
    // report from a frustrated disabled person, and blocking it would silence
    // the exact user this app is for. Ordinary profanity is NOT screened.
    const result = await createAnonFlag({
      ...VALID_INPUT,
      description: 'the damn ramp is still broken',
    });
    expect(result).toEqual(SAMPLE_ROW);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('a clean description submits normally', async () => {
    const result = await createAnonFlag({ ...VALID_INPUT, description: 'no ramp at the side door' });
    expect(result).toEqual(SAMPLE_ROW);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('an absent description is not treated as blocked content', async () => {
    const { description: _omitted, ...noDescription } = VALID_INPUT;
    const result = await createAnonFlag(noDescription);
    expect(result).toEqual(SAMPLE_ROW);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });
});
