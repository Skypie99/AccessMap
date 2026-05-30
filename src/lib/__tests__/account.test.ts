// Tests for src/lib/account.ts — deleteAccount()
//
// Cases covered:
//   1. Success — Edge Function returns 200, signOut is called with userId
//   2. Error — Edge Function returns an error object, signOut is NOT called
//   3. Error — invoke itself rejects (network), signOut is NOT called

// ---------------------------------------------------------------------------
// Supabase mock — hoisted before any import.
// ---------------------------------------------------------------------------
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

import { deleteAccount } from '../account';

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
// 4. Anonymisation ordering contract
//
// The anonymisation step (UPDATE flags SET user_id = NULL) runs inside the
// Edge Function BEFORE auth.users is deleted. From the client's perspective,
// this is an implementation detail of the delete-account function — the client
// calls invoke() and the server runs both steps in order.
//
// These tests verify the client-side contract:
//   - On success (both steps ran), signOut is called (account is gone).
//   - If the Edge Function signals failure (e.g. anonymise step threw), the
//     client receives an error and does NOT sign out, leaving the user logged in.
// ---------------------------------------------------------------------------

describe('deleteAccount() — anonymisation ordering', () => {
  it('calls signOut after invoke succeeds, confirming anonymise+delete both ran', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await deleteAccount(USER_ID);

    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
  });

  it('does NOT call signOut when the Edge Function signals anonymisation failed', async () => {
    const anonError = new Error('Failed to anonymise flags before deletion.');
    mockInvoke.mockResolvedValueOnce({ data: null, error: anonError });

    try {
      await deleteAccount(USER_ID);
    } catch {
      // expected — caller stays logged in so the user can retry
    }

    expect(mockSignOut).not.toHaveBeenCalled();
  });
});
