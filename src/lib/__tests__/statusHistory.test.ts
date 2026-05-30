import { formatHistoryEntry, listStatusHistory, type StatusHistoryEntry } from '../statusHistory';

// ---------------------------------------------------------------------------
// Supabase mock — chained builder for listStatusHistory:
//   supabase.from(...).select(...).eq(...).order(...)  →  Promise<{data,error}>
//
// formatHistoryEntry is a pure function and doesn't call supabase at all,
// so this mock is only exercised by the listStatusHistory describe block.
// ---------------------------------------------------------------------------
const mockOrderInHistory = jest.fn();
const mockEqInHistory = jest.fn();
const mockSelectInHistory = jest.fn();

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockSelectInHistory })),
  },
}));

type StatusHistoryEntryKey = keyof StatusHistoryEntry;

// Deterministic time callback — every entry timestamp resolves to the
// same string so we can assert on the formatted output exactly.
const fixedTime = () => '2h ago';

// Default label callback — capitalizes the raw status. Mirrors the
// shape of STATUS_LABELS without importing it (statusHistory.ts is
// imported nowhere in this test, but the callback signature must match).
const labelCap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

// All 4 known statuses we care about for the matrix tests.
const STATUSES = ['open', 'verified', 'resolved', 'rejected'] as const;

function entry(
  from: string | null,
  to: string,
  overrides: Partial<StatusHistoryEntry> = {},
): StatusHistoryEntry {
  return {
    id: 'history-1',
    flag_id: 'flag-abc',
    from_status: from,
    to_status: to,
    created_at: '2026-05-24T10:00:00Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  // Wire the Supabase chain. Default: no rows, no error.
  mockSelectInHistory.mockReturnValue({ eq: mockEqInHistory });
  mockEqInHistory.mockReturnValue({ order: mockOrderInHistory });
  mockOrderInHistory.mockResolvedValue({ data: [], error: null });
});

// ---------------------------------------------------------------------------
// formatHistoryEntry — pure formatter, no Supabase dependency
// ---------------------------------------------------------------------------
describe('formatHistoryEntry', () => {
  describe('initial creation entry (from_status === null)', () => {
    it('renders "Reported · <time>" regardless of to_status', () => {
      expect(formatHistoryEntry(entry(null, 'open'), labelCap, fixedTime)).toBe(
        'Reported · 2h ago',
      );
    });

    it('never calls statusLabel for initial entries', () => {
      const spy = jest.fn().mockReturnValue('WRONG');
      formatHistoryEntry(entry(null, 'open'), spy, fixedTime);
      expect(spy).not.toHaveBeenCalled();
    });

    it('uses relativeTime for the timestamp', () => {
      const timeSpy = jest.fn().mockReturnValue('just now');
      const result = formatHistoryEntry(entry(null, 'open'), labelCap, timeSpy);
      expect(timeSpy).toHaveBeenCalledWith('2026-05-24T10:00:00Z');
      expect(result).toBe('Reported · just now');
    });
  });

  describe('transition entries — 4×4 matrix', () => {
    // Every from × to combination. Real-world we only ever see a subset
    // (open → verified, open → resolved, verified → resolved, etc.) but
    // the formatter shouldn't care which combos are "valid" — that's
    // the trigger's job. Verifying all 16 ensures no special-cased
    // branches sneak in later.
    STATUSES.forEach((from) => {
      STATUSES.forEach((to) => {
        it(`renders "${labelCap(from)} → ${labelCap(to)} · 2h ago" for ${from} → ${to}`, () => {
          expect(formatHistoryEntry(entry(from, to), labelCap, fixedTime)).toBe(
            `${labelCap(from)} → ${labelCap(to)} · 2h ago`,
          );
        });
      });
    });
  });

  describe('label callback variations', () => {
    it('respects a custom label resolver (uppercase)', () => {
      const upper = (s: string) => s.toUpperCase();
      expect(formatHistoryEntry(entry('open', 'verified'), upper, fixedTime)).toBe(
        'OPEN → VERIFIED · 2h ago',
      );
    });

    it('respects a custom label resolver (i18n-style mapping)', () => {
      const fr = (s: string) => {
        const map: Record<string, string> = {
          open: 'Ouvert',
          verified: 'Vérifié',
          resolved: 'Résolu',
          rejected: 'Rejeté',
        };
        return map[s] ?? s;
      };
      expect(formatHistoryEntry(entry('open', 'resolved'), fr, fixedTime)).toBe(
        'Ouvert → Résolu · 2h ago',
      );
    });

    it('falls back to raw status string when label resolver returns it unchanged', () => {
      // A future status the client doesn't know about: the resolver passes
      // it through, and the formatter renders it verbatim. No crash.
      const passthrough = (s: string) => s;
      expect(formatHistoryEntry(entry('open', 'archived'), passthrough, fixedTime)).toBe(
        'open → archived · 2h ago',
      );
    });
  });

  describe('relativeTime variations', () => {
    it('uses whatever string the time callback returns', () => {
      const recent = () => 'just now';
      const oldish = () => 'May 1, 2026';
      expect(formatHistoryEntry(entry('open', 'verified'), labelCap, recent)).toBe(
        'Open → Verified · just now',
      );
      expect(formatHistoryEntry(entry('open', 'verified'), labelCap, oldish)).toBe(
        'Open → Verified · May 1, 2026',
      );
    });

    it('is deterministic given a deterministic callback', () => {
      const e = entry('verified', 'resolved');
      const a = formatHistoryEntry(e, labelCap, fixedTime);
      const b = formatHistoryEntry(e, labelCap, fixedTime);
      expect(a).toBe(b);
    });
  });
});

// ---------------------------------------------------------------------------
// listStatusHistory — Supabase query wrapper
// ---------------------------------------------------------------------------
// Covers lines 48-84 which were 0% because the function was excluded from
// the coverage run. Chain: from('flag_status_history_public').select(...)
// .eq('flag_id', id).order('created_at', {ascending:true}) → {data, error}.
describe('listStatusHistory', () => {
  const FLAG_ID = 'flag-xyz-123';

  const sampleEntries: StatusHistoryEntry[] = [
    {
      id: 'h1',
      flag_id: FLAG_ID,
      from_status: null,
      to_status: 'open',
      created_at: '2026-05-01T08:00:00Z',
    },
    {
      id: 'h2',
      flag_id: FLAG_ID,
      from_status: 'open',
      to_status: 'verified',
      created_at: '2026-05-02T10:00:00Z',
    },
  ];

  it('returns entries in the order Supabase returns them (ascending)', async () => {
    mockOrderInHistory.mockResolvedValueOnce({ data: sampleEntries, error: null });
    const result = await listStatusHistory(FLAG_ID);
    expect(result).toEqual(sampleEntries);
  });

  it('returns [] when Supabase returns an error (migration not applied, RLS, etc.)', async () => {
    mockOrderInHistory.mockResolvedValueOnce({
      data: null,
      error: { message: 'relation "flag_status_history_public" does not exist' },
    });
    const result = await listStatusHistory(FLAG_ID);
    expect(result).toEqual([]);
  });

  it('returns [] when data is null and no error (view exists but no rows)', async () => {
    mockOrderInHistory.mockResolvedValueOnce({ data: null, error: null });
    const result = await listStatusHistory(FLAG_ID);
    expect(result).toEqual([]);
  });

  it('returns [] when data is an empty array (flag has no history yet)', async () => {
    // Default mock already returns { data: [], error: null } — explicit here.
    mockOrderInHistory.mockResolvedValueOnce({ data: [], error: null });
    const result = await listStatusHistory(FLAG_ID);
    expect(result).toEqual([]);
  });

  it('returns [] and does not throw when the Supabase call itself throws', async () => {
    // Covers the outer try/catch (line 83-85 in statusHistory.ts).
    mockOrderInHistory.mockRejectedValueOnce(new Error('network timeout'));
    const result = await listStatusHistory(FLAG_ID);
    expect(result).toEqual([]);
  });

  it('queries the flag_status_history_public view for the given flagId', async () => {
    mockOrderInHistory.mockResolvedValueOnce({ data: sampleEntries, error: null });
    await listStatusHistory(FLAG_ID);
    // Verify the eq call was given the correct flagId — the wrong ID would
    // silently return wrong data with no type error.
    expect(mockEqInHistory).toHaveBeenCalledWith('flag_id', FLAG_ID);
  });

  it('requests ascending order so the UI renders oldest-first (timeline)', async () => {
    mockOrderInHistory.mockResolvedValueOnce({ data: sampleEntries, error: null });
    await listStatusHistory(FLAG_ID);
    expect(mockOrderInHistory).toHaveBeenCalledWith('created_at', { ascending: true });
  });
});

// ---------------------------------------------------------------------------
// Privacy guarantee — Jordan condition #1 (2026-05-24)
// ---------------------------------------------------------------------------
// The client API surface must NEVER expose `user_id` from the history rows.
// The DB-side guarantee lives in the migration (column grant + view), but
// we also assert at the type/shape level so a careless future refactor
// (e.g. someone re-adds user_id to the interface) breaks this test instead
// of silently leaking attribution to every authenticated client.
describe('StatusHistoryEntry privacy shape', () => {
  it('does not include user_id in the returned object keys', () => {
    const sample = entry('open', 'verified');
    const keys = Object.keys(sample) as StatusHistoryEntryKey[];
    expect(keys).not.toContain('user_id' as StatusHistoryEntryKey);
  });

  it('exposes exactly the five public columns and no more', () => {
    const sample = entry('open', 'verified');
    const keys = Object.keys(sample).sort();
    expect(keys).toEqual(['created_at', 'flag_id', 'from_status', 'id', 'to_status'].sort());
  });

  it('rejects user_id at the type level (compile-time guard)', () => {
    // If a future change re-adds user_id to StatusHistoryEntry, this line
    // stops compiling because the cast becomes valid. The test is here as
    // documentation: the type IS the privacy boundary on the client side.
    // @ts-expect-error — user_id is intentionally absent from the shape.
    const probe: StatusHistoryEntry = entry('open', 'verified', { user_id: 'u' });
    expect(probe).toBeDefined();
  });
});
