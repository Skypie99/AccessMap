import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  AccountDeletionReceiptUnavailableError,
  clearAccountDeletionReceipt,
  getAccountDeletionStatus,
  getOrCreateAccountDeletionReceipt,
  loadAccountDeletionReceipt,
  loadAccountDeletionReceipts,
} from '../accountDeletionReceipt';

const mockRandomUUID = jest.fn();
const mockRandomBytes = jest.fn();
const mockInvoke = jest.fn();
const SUBJECT_A = 'a921b42e-4953-4f0b-a42e-55d2fa5a7710';
const SUBJECT_B = 'b921b42e-4953-4f0b-a42e-55d2fa5a7710';
const OPERATION_A = '94cd495b-d74a-45c3-8ca0-89548ec9e3ef';
const OPERATION_B = '84cd495b-d74a-45c3-8ca0-89548ec9e3ef';
const nativePlatform = Platform.OS;

jest.mock('expo-crypto', () => ({
  randomUUID: (...args: unknown[]) => mockRandomUUID(...args),
  getRandomBytesAsync: (...args: unknown[]) => mockRandomBytes(...args),
}));
jest.mock('../supabase', () => ({ supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } } }));

function setPlatformOS(value: string): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
}

beforeEach(async () => {
  setPlatformOS(nativePlatform);
  await clearAccountDeletionReceipt();
  jest.clearAllMocks();
  mockRandomUUID.mockReturnValue(OPERATION_A);
  mockRandomBytes.mockResolvedValue(Uint8Array.from({ length: 32 }, (_, index) => index));
});

afterEach(() => setPlatformOS(nativePlatform));

describe('D1F4 deletion receipt', () => {
  it('creates and securely stores a 256-bit recovery capability before it returns', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    expect(receipt.receiptSecret).toBe(Array.from({ length: 32 }, (_, index) => index.toString(16).padStart(2, '0')).join(''));
    expect(await loadAccountDeletionReceipt(SUBJECT_A)).toMatchObject(receipt);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining(receipt.operationId),
      expect.stringContaining(receipt.receiptSecret),
    );
  });

  it('serializes same-account creation after a lost response and reuses one receipt', async () => {
    const [first, second] = await Promise.all([
      getOrCreateAccountDeletionReceipt(SUBJECT_A),
      getOrCreateAccountDeletionReceipt(SUBJECT_A),
    ]);
    expect(second).toEqual(first);
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
  });

  it('keeps concurrent account operations in distinct opaque secure-storage records', async () => {
    mockRandomUUID.mockReturnValueOnce(OPERATION_A).mockReturnValueOnce(OPERATION_B);
    const [first, second] = await Promise.all([
      getOrCreateAccountDeletionReceipt(SUBJECT_A),
      getOrCreateAccountDeletionReceipt(SUBJECT_B),
    ]);
    expect(first.operationId).toBe(OPERATION_A);
    expect(second.operationId).toBe(OPERATION_B);
    expect((await loadAccountDeletionReceipts()).map((receipt) => receipt.operationId).sort())
      .toEqual([OPERATION_A, OPERATION_B].sort());

    await clearAccountDeletionReceipt(first);
    await expect(loadAccountDeletionReceipt(SUBJECT_A)).resolves.toBeNull();
    await expect(loadAccountDeletionReceipt(SUBJECT_B)).resolves.toMatchObject(second);
  });

  it('does not emulate SecureStore on web or write a raw recovery capability to browser storage', async () => {
    setPlatformOS('web');
    await expect(getOrCreateAccountDeletionReceipt(SUBJECT_A)).rejects.toBeInstanceOf(AccountDeletionReceiptUnavailableError);
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('uses only the capability endpoint to recover generic completion status', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    mockInvoke.mockResolvedValueOnce({ data: { status: 'COMPLETE', requestedAt: '2026-08-27T00:00:00Z', completedAt: '2026-08-27T00:05:00Z' }, error: null });
    await expect(getAccountDeletionStatus(receipt)).resolves.toEqual({
      status: 'COMPLETE', requestedAt: '2026-08-27T00:00:00Z', completedAt: '2026-08-27T00:05:00Z',
    });
    expect(mockInvoke).toHaveBeenCalledWith('account-deletion-status', {
      method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
    });
  });

  it('allows a terminal receipt to be dismissed without deleting other operations', async () => {
    mockRandomUUID.mockReturnValueOnce(OPERATION_A).mockReturnValueOnce(OPERATION_B);
    const first = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    const second = await getOrCreateAccountDeletionReceipt(SUBJECT_B);
    await clearAccountDeletionReceipt(first);
    await expect(loadAccountDeletionReceipt(SUBJECT_A)).resolves.toBeNull();
    await expect(loadAccountDeletionReceipt(SUBJECT_B)).resolves.toMatchObject(second);
  });
});
