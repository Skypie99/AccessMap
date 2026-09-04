// D1F4 account deletion client contract: the local receipt exists before the
// request, a 202 response means REQUESTED (not completion), and local sign-out
// happens only after that durable acknowledgement.
import {
  AccountDeletionRequestSignOutPendingError,
  deleteAccount,
} from '../account';

const mockInvoke = jest.fn();
const mockSignOut = jest.fn();
const mockReceipt = jest.fn();
const USER_ID = 'a921b42e-4953-4f0b-a42e-55d2fa5a7710';
const receipt = {
  operationId: '94cd495b-d74a-45c3-8ca0-89548ec9e3ef',
  receiptSecret: '0'.repeat(64),
  subjectId: USER_ID,
  createdAt: '2026-08-27T00:00:00.000Z',
};

jest.mock('../supabase', () => ({
  __esModule: true,
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));
jest.mock('../accountDeletionReceipt', () => ({
  getOrCreateAccountDeletionReceipt: (...args: unknown[]) => mockReceipt(...args),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockReceipt.mockResolvedValue(receipt);
});

describe('deleteAccount() — durable request', () => {
  it('uses the already-persisted client receipt in its request body', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'requested', requestedAt: '2026-08-27T00:01:00.000Z' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);

    await expect(deleteAccount(USER_ID)).resolves.toEqual({ receipt, requestedAt: '2026-08-27T00:01:00.000Z' });
    expect(mockReceipt).toHaveBeenCalledWith(USER_ID);
    expect(mockInvoke).toHaveBeenCalledWith('delete-account', {
      method: 'POST',
      body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
    });
  });

  it('signs out locally only after REQUESTED is acknowledged', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'requested' }, error: null });
    mockSignOut.mockResolvedValueOnce(undefined);
    await deleteAccount(USER_ID);
    expect(mockSignOut).toHaveBeenCalledWith(USER_ID);
  });

  it('keeps the receipt and does not sign out when the first response is lost', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('Network request failed'));
    await expect(deleteAccount(USER_ID)).rejects.toThrow('Network request failed');
    expect(mockReceipt.mock.invocationCallOrder[0]).toBeLessThan(mockInvoke.mock.invocationCallOrder[0]);
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('does not sign out when the server did not acknowledge REQUESTED', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'deleted' }, error: null });
    await expect(deleteAccount(USER_ID)).rejects.toThrow('Deletion request was not accepted.');
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it('reports a local sign-out failure without denying the durable request', async () => {
    mockInvoke.mockResolvedValueOnce({ data: { status: 'requested' }, error: null });
    mockSignOut.mockResolvedValueOnce({ error: new Error('offline') });
    await expect(deleteAccount(USER_ID)).rejects.toBeInstanceOf(AccountDeletionRequestSignOutPendingError);
  });
});
