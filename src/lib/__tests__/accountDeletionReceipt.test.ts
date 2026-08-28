import * as SecureStore from 'expo-secure-store';
import {
  clearAccountDeletionReceipt,
  getAccountDeletionStatus,
  getOrCreateAccountDeletionReceipt,
  loadAccountDeletionReceipt,
} from '../accountDeletionReceipt';

const mockRandomUUID = jest.fn();
const mockRandomBytes = jest.fn();
const mockInvoke = jest.fn();
const SUBJECT_ID = 'a921b42e-4953-4f0b-a42e-55d2fa5a7710';

jest.mock('expo-crypto', () => ({
  randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
  getRandomBytesAsync: (...args: unknown[]) => mockRandomBytes(...args),
}));
jest.mock('../supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));

beforeEach(async () => {
  jest.clearAllMocks();
  await SecureStore.deleteItemAsync('flagstone.accountDeletionReceipt.v1');
  mockRandomUUID.mockReturnValue('94cd495b-d74a-45c3-8ca0-89548ec9e3ef');
  mockRandomBytes.mockResolvedValue(Uint8Array.from({ length: 32 }, (_, index) => index));
});

describe('D1F4 deletion receipt', () => {
  it('creates and securely stores a 256-bit recovery capability before it returns', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_ID);
    expect(receipt.receiptSecret).toBe(Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, '0')).join(''));
    expect(await loadAccountDeletionReceipt()).toMatchObject(receipt);
  });

  it('reuses the same receipt after a lost request response', async () => {
    const first = await getOrCreateAccountDeletionReceipt(SUBJECT_ID);
    const second = await getOrCreateAccountDeletionReceipt(SUBJECT_ID);
    expect(second).toEqual(first);
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
  });

  it('uses only the capability endpoint to recover generic completion status', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_ID);
    mockInvoke.mockResolvedValueOnce({ data: { status: 'COMPLETE', requestedAt: '2026-08-27T00:00:00Z', completedAt: '2026-08-27T00:05:00Z' }, error: null });
    await expect(getAccountDeletionStatus(receipt)).resolves.toEqual({
      status: 'COMPLETE', requestedAt: '2026-08-27T00:00:00Z', completedAt: '2026-08-27T00:05:00Z',
    });
    expect(mockInvoke).toHaveBeenCalledWith('account-deletion-status', {
      method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
    });
  });

  it('retains the receipt until completion is intentionally dismissed', async () => {
    await getOrCreateAccountDeletionReceipt(SUBJECT_ID);
    await clearAccountDeletionReceipt();
    await expect(loadAccountDeletionReceipt()).resolves.toBeNull();
  });
});
