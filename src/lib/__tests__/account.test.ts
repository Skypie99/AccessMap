// Tests for src/lib/account.ts — deleteAccount()
//
// Cases covered:
//   1. Success — Edge Function returns 200, signOut is called with userId
//   2. Error — Edge Function returns an error object, signOut is NOT called
//   3. Error — invoke itself rejects (network), signOut is NOT called

// ---------------------------------------------------------------------------
// Supabase mock — hoisted before any import.
// ---------------------------------------------------------------------------
import { AccountDeletedSignOutPendingError, deleteAccount } from '../account';

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: {
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

const USER_ID = 'user-test-uuid-1234';

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Success path
// ---------------------------------------------------------------------------

describe('deleteAccount() — success', () => {
  it('calls supabase.functions.invoke with the correct function name and method', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount(USER_ID);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', { method: 'POST' });
  });

  it('calls signOut with the userId after a successful deletion', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount(USER_ID);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
  });

  it('resolves without throwing on success', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await expect(deleteAccount(USER_ID)).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 2. Error path — Edge Function returns an error object
// ---------------------------------------------------------------------------

describe('deleteAccount() — Edge Function error', () => {
  it('throws the error returned by invoke', async () => {
    const edgeError = new Error('Deletion failed unexpectedly.');
    mockInvoke.mockResolvedValueOnce({ data: null, error: edgeError });

    await expect(deleteAccount(USER_ID)).rejects.toThrow('Deletion failed unexpectedly.');
  });

  it('does NOT call signOut when the Edge Function returns an error', async () => {
    const edgeError = new Error('Deletion failed unexpectedly.');
    mockInvoke.mockResolvedValueOnce({ data: null, error: edgeError });

    try {
      await deleteAccount(USER_ID);
    } catch {
      // expected
    }

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. Error path — network-level rejection (invoke itself rejects)
// ---------------------------------------------------------------------------

describe('deleteAccount() — network error', () => {
  it('propagates a network rejection from invoke', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(deleteAccount(USER_ID)).rejects.toThrow('Network request failed');
  });

  it('does NOT call signOut when invoke rejects at the network level', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network request failed'));

    try {
      await deleteAccount(USER_ID);
    } catch {
      // expected
    }

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 4. Full-deletion ordering contract
//
// The Edge Function creates a durable deletion lock, clears the account's
// Storage namespace, atomically purges the approved database scope, verifies
// the namespace again, and deletes auth.users last. From the client's
// perspective, those server steps remain implementation details — it invokes
// one function and receives success only after final Auth teardown.
//
// These tests verify the client-side contract:
//   - On success (all server steps ran), signOut is called (account is gone).
//   - If the Edge Function signals failure before Auth deletion, the
//     client receives an error and does NOT sign out, leaving the user logged in.
// ---------------------------------------------------------------------------

describe('deleteAccount() — full-deletion ordering', () => {
  it('calls signOut after invoke succeeds, confirming final Auth teardown ran', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount(USER_ID);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
  });

  it('does NOT call signOut when the Edge Function signals pre-auth cleanup failed', async () => {
    const cleanupError = new Error('Deletion failed unexpectedly.');
    mockInvoke.mockResolvedValueOnce({ data: null, error: cleanupError });

    try {
      await deleteAccount(USER_ID);
    } catch {
      // expected — caller stays logged in so the user can retry
    }

    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('truthfully reports when server deletion succeeded but local sign-out did not', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce({ error: new Error('Local logout failed') });

    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletedSignOutPendingError);
  });
});
