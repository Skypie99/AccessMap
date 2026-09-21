// FDA-003 / Phase 04B account-deletion client contract.
//
// Deployed `delete-account` v4 deletes synchronously and answers
// 200 {status:'deleted'} or 500 {status:'error'} (archived Phase 02A capture).
// Only a validated `deleted` reply is a confirmed success: it signs out, clears
// the receipt, and is never reported as a failure. Every other reply is
// UNCONFIRMED: never a success, never retried automatically, and never a
// sign-out. The async REQUESTED protocol (D1F4, Phase 05) is exercised only
// behind an explicitly enabled capability.
//
// Replaced test (was: "does not sign out when the server did not acknowledge
// REQUESTED"): it fed the deployed v4 success reply {status:'deleted'} and
// asserted a rejection with no sign-out. That assertion WAS the FDA-003 defect
// (a completed deletion reported as failed, session left alive); it is now
// asserted the other way round below.
import {
  AccountDeletedSignOutPendingError,
  AccountDeletionNotStartedError,
  AccountDeletionRequestSignOutPendingError,
  AccountDeletionUnconfirmedError,
  completeConfirmedAccountDeletion,
  deleteAccount,
  type AccountDeletionUnconfirmedReason,
} from '../account';
import { AccountDeletionReceiptUnavailableError } from '../accountDeletionReceipt';

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockReceipt = jest.fn();
const mockMark = jest.fn();
const mockClear = jest.fn();
const mockLoad = jest.fn();
let mockAsyncStatusAvailable = false;

const USER_ID = 'a921b42e-4953-4f0b-a42e-55d2fa5a7710';
const receipt = {
  operationId: '94cd495b-d74a-45c3-8ca0-89548ec9e3ef',
  receiptSecret: '0'.repeat(64),
  subjectId: USER_ID,
  createdAt: '2026-08-27T00:00:00.000Z',
};
const confirmedReceipt = { ...receipt, confirmedDeletedAt: '2026-09-21T00:00:00.000Z' };

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(), getRandomBytesAsync: jest.fn() }));
jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('../accountDeletionAvailability', () => ({
  ...jest.requireActual('../accountDeletionAvailability'),
  accountDeletionAsyncStatusAvailable: () => mockAsyncStatusAvailable,
}));
jest.mock('../accountDeletionReceipt', () => {
  const actual = jest.requireActual('../accountDeletionReceipt');
  return {
    AccountDeletionReceiptUnavailableError: actual.AccountDeletionReceiptUnavailableError,
    isConfirmedAccountDeletionReceipt: actual.isConfirmedAccountDeletionReceipt,
    getOrCreateAccountDeletionReceipt: (...args: unknown[]) => mockReceipt(...args),
    markAccountDeletionReceiptConfirmed: (...args: unknown[]) => mockMark(...args),
    clearAccountDeletionReceipt: (...args: unknown[]) => mockClear(...args),
    loadAccountDeletionReceipt: (...args: unknown[]) => mockLoad(...args),
  };
});

// functions-js reports failures in `error` rather than throwing; these mirror
// the exact names and `context` shapes it produces.
const httpError = (status: number) => ({
  name: 'FunctionsHttpError',
  message: 'Edge Function returned a non-2xx status code',
  context: { status },
});
const fetchError = (cause: string) => ({
  name: 'FunctionsFetchError',
  message: 'Failed to send a request to the Edge Function',
  context: { name: cause },
});
const relayError = { name: 'FunctionsRelayError', message: 'Relay Error invoking the Edge Function', context: {} };

const edgeCalls = () => mockInvoke.mock.calls.map(([name]) => name);

async function unconfirmedReason(): Promise<AccountDeletionUnconfirmedReason> {
  const error = await deleteAccount(USER_ID).catch((e: unknown) => e);
  expect(error).toBeInstanceOf(AccountDeletionUnconfirmedError);
  return (error as AccountDeletionUnconfirmedError).reason;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAsyncStatusAvailable = false;
  mockReceipt.mockResolvedValue(receipt);
  mockMark.mockResolvedValue(undefined);
  mockClear.mockResolvedValue(undefined);
  mockLoad.mockResolvedValue(null);
  mockSignOut.mockResolvedValue({ error: null });
});

describe('deleteAccount() — deployed v4 status=deleted is a confirmed success', () => {
  it('sends one request carrying the already-persisted receipt, then resolves deleted', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });

    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockReceipt).toHaveBeenCalledWith(USER_ID);
    expect(mockReceipt.mock.invocationCallOrder[0]).toBeLessThan(mockInvoke.mock.invocationCallOrder[0]);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      method: 'POST',
      body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
    });
  });

  it('terminalizes the receipt, signs out, then clears the receipt — in that order', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });

    await deleteAccount(USER_ID);
    expect(mockMark).toHaveBeenCalledWith(receipt);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockClear).toHaveBeenCalledWith(receipt);
    const [mark] = mockMark.mock.invocationCallOrder;
    const [signOut] = mockSignOut.mock.invocationCallOrder;
    const [clear] = mockClear.mock.invocationCallOrder;
    expect(mark).toBeLessThan(signOut);
    expect(signOut).toBeLessThan(clear);
  });

  it('accepts the same reply when it arrives as JSON text without a JSON content type', async () => {
    mockInvoke.mockResolvedValueOnce({ data: '{"status":"deleted"}', error: null });
    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('never calls the absent async status or review routes on the way to success', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    await deleteAccount(USER_ID);
    expect(edgeCalls()).toEqual(['delete-account']);
  });

  it('still succeeds when the terminal marker cannot be written (the server result stands)', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockMark.mockRejectedValueOnce(new Error('SecureStore unavailable'));

    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockClear).toHaveBeenCalledWith(receipt);
  });

  it('still succeeds when the receipt cannot be cleared after sign-out', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockClear.mockRejectedValueOnce(new Error('SecureStore unavailable'));
    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
  });
});

describe('deleteAccount() — local cleanup failure after a confirmed deletion', () => {
  it('reports the account as deleted-but-signed-in, never as a failed deletion, when sign-out returns an error', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });

    const error = await deleteAccount(USER_ID).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AccountDeletedSignOutPendingError);
    expect(error).not.toBeInstanceOf(AccountDeletionUnconfirmedError);
    expect((error as Error).message).toMatch(/^Your account was deleted, but this device could not finish signing out\./);
    // The confirmation stays recorded on the device so a relaunch knows the truth.
    expect(mockMark).toHaveBeenCalledWith(receipt);
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });

  it('treats a throwing sign-out the same way', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    mockSignOut.mockRejectedValueOnce(new Error('auth lock timeout'));
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletedSignOutPendingError);
    expect(mockClear).not.toHaveBeenCalled();
  });
});

describe('deleteAccount() — relaunch after a confirmed deletion', () => {
  it('finishes locally from the terminal receipt and never sends the destructive request again', async () => {
    mockReceipt.mockResolvedValueOnce(confirmedReceipt);

    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockClear).toHaveBeenCalledWith(confirmedReceipt);
  });

  it('keeps reporting deleted-but-signed-in (not failure) while sign-out still fails', async () => {
    mockReceipt.mockResolvedValueOnce(confirmedReceipt);
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });

    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletedSignOutPendingError);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });
});

describe('deleteAccount() — unconfirmed replies are never success and never retried', () => {
  it.each([
    ['explicit v4 error reply (500 {status:"error"})', { data: null, error: httpError(500) }, 'server'],
    ['explicit error in a success envelope', { data: { status: 'error' }, error: null }, 'server'],
    ['gateway/relay failure', { data: null, error: relayError }, 'server'],
    ['401 — the session could not be verified', { data: null, error: httpError(401) }, 'auth'],
    ['403 — the session could not be verified', { data: null, error: httpError(403) }, 'auth'],
    ['timeout after the request may have completed', { data: null, error: fetchError('TimeoutError') }, 'network'],
    ['dropped connection', { data: null, error: fetchError('TypeError') }, 'network'],
    ['null body', { data: null, error: null }, 'malformed'],
    ['empty object', { data: {}, error: null }, 'malformed'],
    ['non-string status', { data: { status: 5 }, error: null }, 'malformed'],
    ['array body', { data: [{ status: 'deleted' }], error: null }, 'malformed'],
    ['unreadable text body', { data: '<html>502</html>', error: null }, 'malformed'],
    ['success status whose JSON could not be parsed', { data: null, error: { name: 'SyntaxError', message: 'Unexpected token' } }, 'malformed'],
    ['unknown status string', { data: { status: 'queued' }, error: null }, 'unexpected_status'],
    ['status=requested while the async capability is absent', { data: { status: 'requested', requestedAt: '2026-09-21T00:00:00Z' }, error: null }, 'async_unavailable'],
    ['unclassifiable error', { data: null, error: new Error('boom') }, 'unknown'],
  ] as const)('%s → unconfirmed(%#)', async (_label, reply, reason) => {
    mockInvoke.mockResolvedValueOnce(reply);

    await expect(unconfirmedReason()).resolves.toBe(reason);
    // Exactly one destructive request: no automatic retry of any kind.
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(edgeCalls()).toEqual(['delete-account']);
    // No success side effects: the session and the receipt stay as they were.
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('treats a thrown invoke (the response was lost) as network ambiguity and keeps the receipt', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network request failed'));

    await expect(unconfirmedReason()).resolves.toBe('network');
    expect(mockReceipt.mock.invocationCallOrder[0]).toBeLessThan(mockInvoke.mock.invocationCallOrder[0]);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('gives every unconfirmed reason its own truthful, non-success message', async () => {
    const replies: [AccountDeletionUnconfirmedReason, unknown][] = [
      ['network', { data: null, error: fetchError('TypeError') }],
      ['server', { data: null, error: httpError(500) }],
      ['auth', { data: null, error: httpError(401) }],
      ['malformed', { data: null, error: null }],
      ['unexpected_status', { data: { status: 'queued' }, error: null }],
      ['async_unavailable', { data: { status: 'requested' }, error: null }],
      ['unknown', { data: null, error: new Error('boom') }],
    ];
    const messages = new Set<string>();
    for (const [reason, reply] of replies) {
      mockInvoke.mockResolvedValueOnce(reply);
      const error = (await deleteAccount(USER_ID).catch((e: unknown) => e)) as AccountDeletionUnconfirmedError;
      expect(error.reason).toBe(reason);
      expect(error.message).toContain("can't confirm whether your account was deleted");
      expect(error.message).toContain('It did not try again.');
      expect(error.message).not.toMatch(/has been deleted|was deleted, but/);
      messages.add(error.message);
    }
    expect(messages.size).toBe(replies.length);
  });

  it('a later, deliberate user attempt sends a new request (only automatic retries are forbidden)', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: fetchError('TypeError') });
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionUnconfirmedError);

    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
  });

  it('does not read a later "account not found" style error as proof that an earlier attempt succeeded', async () => {
    mockInvoke.mockResolvedValueOnce({ data: null, error: fetchError('TypeError') });
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionUnconfirmedError);
    // v4 cannot find the caller once the account is gone; that is still unconfirmed.
    mockInvoke.mockResolvedValueOnce({ data: null, error: httpError(401) });
    await expect(unconfirmedReason()).resolves.toBe('auth');
    expect(mockSignOut).not.toHaveBeenCalled();
  });
});

describe('deleteAccount() — duplicate activation', () => {
  it('shares one in-flight request between concurrent calls for the same account', async () => {
    let resolveInvoke: (value: unknown) => void = () => undefined;
    mockInvoke.mockReturnValueOnce(new Promise((resolve) => { resolveInvoke = resolve; }));

    const first = deleteAccount(USER_ID);
    const second = deleteAccount(USER_ID);
    const third = deleteAccount(USER_ID);
    expect(second).toBe(first);
    expect(third).toBe(first);

    resolveInvoke({ data: { status: 'deleted' }, error: null });
    await expect(Promise.all([first, second, third])).resolves.toEqual([
      { status: 'deleted' }, { status: 'deleted' }, { status: 'deleted' },
    ]);
    expect(mockReceipt).toHaveBeenCalledTimes(1);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('shares an unconfirmed outcome too, without a second request', async () => {
    let resolveInvoke: (value: unknown) => void = () => undefined;
    mockInvoke.mockReturnValueOnce(new Promise((resolve) => { resolveInvoke = resolve; }));

    const first = deleteAccount(USER_ID);
    const second = deleteAccount(USER_ID);
    resolveInvoke({ data: null, error: fetchError('TypeError') });
    await expect(first).rejects.toBeInstanceOf(AccountDeletionUnconfirmedError);
    await expect(second).rejects.toBeInstanceOf(AccountDeletionUnconfirmedError);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
  });
});

describe('deleteAccount() — nothing sent when the receipt cannot be prepared', () => {
  it('reports a not-started request, never an unconfirmed one', async () => {
    mockReceipt.mockRejectedValueOnce(new Error('SecureStore unavailable'));
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionNotStartedError);
    expect(mockInvoke).not.toHaveBeenCalled();
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('keeps the browser-unavailable error as-is', async () => {
    mockReceipt.mockRejectedValueOnce(new AccountDeletionReceiptUnavailableError());
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionReceiptUnavailableError);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('completeConfirmedAccountDeletion() — "Finish signing out"', () => {
  it('signs out and clears a terminal receipt without any deletion request', async () => {
    mockLoad.mockResolvedValueOnce(confirmedReceipt);
    await expect(completeConfirmedAccountDeletion(USER_ID)).resolves.toBeUndefined();
    expect(mockLoad).toHaveBeenCalledWith(USER_ID);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockClear).toHaveBeenCalledWith(confirmedReceipt);
    expect(mockInvoke).not.toHaveBeenCalled();
  });

  it('never clears a receipt the server did not confirm', async () => {
    mockLoad.mockResolvedValueOnce(receipt);
    await completeConfirmedAccountDeletion(USER_ID);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('keeps the deleted-but-signed-in state when sign-out fails again', async () => {
    mockLoad.mockResolvedValueOnce(confirmedReceipt);
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(completeConfirmedAccountDeletion(USER_ID)).rejects.toBeInstanceOf(AccountDeletedSignOutPendingError);
    expect(mockClear).not.toHaveBeenCalled();
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('deleteAccount() — no deletion payload reaches the logs', () => {
  it('logs nothing that contains the receipt secret, operation id, or account id', async () => {
    const spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
      jest.spyOn(console, level).mockImplementation(() => undefined),
    );
    try {
      mockInvoke
        .mockResolvedValueOnce({ data: null, error: fetchError('TypeError') })
        .mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
      mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });
      await deleteAccount(USER_ID).catch(() => undefined);
      await deleteAccount(USER_ID).catch(() => undefined);

      const logged = JSON.stringify(spies.flatMap((spy) => spy.mock.calls));
      expect(logged).not.toContain(receipt.receiptSecret);
      expect(logged).not.toContain(receipt.operationId);
      expect(logged).not.toContain(USER_ID);
    } finally {
      spies.forEach((spy) => spy.mockRestore());
    }
  });
});

describe('Phase 05 async protocol — only behind an explicitly proven capability', () => {
  beforeEach(() => {
    mockAsyncStatusAvailable = true;
  });

  it('accepts REQUESTED, signs out after the durable acknowledgement, and keeps the receipt', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'requested', requestedAt: '2026-08-27T00:01:00.000Z' }, error: null });

    await expect(deleteAccount(USER_ID)).resolves.toEqual({
      status: 'requested', receipt, requestedAt: '2026-08-27T00:01:00.000Z',
    });
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
    expect(mockMark).not.toHaveBeenCalled();
    expect(mockClear).not.toHaveBeenCalled();
  });

  it('reports a local sign-out failure without denying the durable request', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'requested' }, error: null });
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionRequestSignOutPendingError);
  });

  it('still treats v4 status=deleted as the confirmed synchronous success', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    await expect(deleteAccount(USER_ID)).resolves.toEqual({ status: 'deleted' });
    expect(mockClear).toHaveBeenCalledWith(receipt);
  });
});
