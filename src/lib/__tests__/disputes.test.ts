/**
 * Fork 5 / W1 — dispute counter client half.
 *
 * The first three cases are the F38 regression guard: only "the function does
 * not exist" may degrade to null. Everything else must throw, because the
 * failure this protects against already happened once on the reopen counter —
 * every error collapsed to null, and the UI cheerfully reported success for a
 * vote that never reached the server.
 */
import { DISPUTE_ENABLED, DISPUTE_THRESHOLD, requestFlagDispute } from '../disputes';

const mockRpc = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

describe('requestFlagDispute', () => {
  it('returns the new count on success', async () => {
    mockRpc.mockResolvedValue({ data: 3, error: null });
    await expect(requestFlagDispute('flag-1')).resolves.toBe(3);
    expect(mockRpc).toHaveBeenCalledWith('increment_dispute_request', { p_flag_id: 'flag-1' });
  });

  it('degrades to null when the RPC is missing from the schema cache (PGRST202)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'not found' } });
    await expect(requestFlagDispute('flag-1')).resolves.toBeNull();
  });

  it('degrades to null when the function is undefined (42883)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42883', message: 'undefined function' } });
    await expect(requestFlagDispute('flag-1')).resolves.toBeNull();
  });

  it('THROWS on any other error — never a silent success (the F38 lesson)', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } });
    await expect(requestFlagDispute('flag-1')).rejects.toMatchObject({ code: 'PGRST301' });
  });

  it('THROWS on an RLS denial rather than reporting a recorded doubt', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });
    await expect(requestFlagDispute('flag-1')).rejects.toMatchObject({ code: '42501' });
  });

  it('returns null when the RPC answers with a non-number', async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    await expect(requestFlagDispute('flag-1')).resolves.toBeNull();
  });
});

describe('fork discipline — the feature stays off until Sky applies the migration', () => {
  it('DISPUTE_ENABLED is false', () => {
    // Verified read-only against the live DB on 2026-07-26: no
    // dispute_requests column, no increment_dispute_request function. Flipping
    // this without applying
    // supabase/migrations/2026-07-16_fork5_dispute_counter_PROPOSED.sql ships
    // an affordance that throws on every press.
    expect(DISPUTE_ENABLED).toBe(false);
  });

  it('the threshold matches the migration comment (additive signal at 2)', () => {
    expect(DISPUTE_THRESHOLD).toBe(2);
  });
});
