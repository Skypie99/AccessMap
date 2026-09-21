import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  AccountDeletionReceiptUnavailableError,
  AccountDeletionStatusUnavailableError,
  clearAccountDeletionReceipt,
  clearConfirmedAccountDeletionReceipts,
  getAccountDeletionStatus,
  getOrCreateAccountDeletionReceipt,
  isConfirmedAccountDeletionReceipt,
  loadAccountDeletionReceipt,
  loadAccountDeletionReceipts,
  markAccountDeletionReceiptConfirmed,
} from '../accountDeletionReceipt';

const mockRandomUUID = jest.fn();
const mockRandomBytes = jest.fn();
const mockInvoke = jest.fn();
let mockAsyncStatusAvailable = false;
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
jest.mock('../accountDeletionAvailability', () => ({
  ...jest.requireActual('../accountDeletionAvailability'),
  accountDeletionAsyncStatusAvailable: () => mockAsyncStatusAvailable,
}));

function setPlatformOS(value: string): void {
  Object.defineProperty(Platform, 'OS', { configurable: true, value });
}

beforeEach(async () => {
  setPlatformOS(nativePlatform);
  await clearAccountDeletionReceipt();
  jest.clearAllMocks();
  mockAsyncStatusAvailable = false;
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

  it('uses only the capability endpoint to recover generic completion status (Phase 05 capability present)', async () => {
    mockAsyncStatusAvailable = true;
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

// FDA-003 / Phase 04B: the async status route is absent from the deployed
// backend (archived Phase 02A capture), and deployed v4 confirms deletion
// synchronously. These pin the capability gate and the terminal receipt.
describe('Phase 04B — absent async status capability', () => {
  it('fails closed without any network call to account-deletion-status', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    await expect(getAccountDeletionStatus(receipt)).rejects.toBeInstanceOf(AccountDeletionStatusUnavailableError);
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});

describe('Phase 04B — server-confirmed (terminal) receipts', () => {
  it('records the confirmation on the same opaque operation record, never a subject-keyed one', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    (SecureStore.setItemAsync as jest.Mock).mockClear();

    await markAccountDeletionReceiptConfirmed(receipt);

    const writes = (SecureStore.setItemAsync as jest.Mock).mock.calls.map(([key]) => key as string);
    expect(writes.some((key) => key.includes(receipt.operationId))).toBe(true);
    expect(writes.every((key) => !key.includes(SUBJECT_A))).toBe(true);
    const stored = await loadAccountDeletionReceipt(SUBJECT_A);
    expect(stored).toMatchObject(receipt);
    expect(isConfirmedAccountDeletionReceipt(stored)).toBe(true);
  });

  it('hands the same confirmed receipt back to a later attempt, so it can never be sent again', async () => {
    const receipt = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    await markAccountDeletionReceiptConfirmed(receipt);

    const again = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    expect(again.operationId).toBe(receipt.operationId);
    expect(isConfirmedAccountDeletionReceipt(again)).toBe(true);
    expect(mockRandomUUID).toHaveBeenCalledTimes(1);
  });

  it('is never offered to the signed-out status surface', async () => {
    mockRandomUUID.mockReturnValueOnce(OPERATION_A).mockReturnValueOnce(OPERATION_B);
    const confirmed = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    await markAccountDeletionReceiptConfirmed(confirmed);
    await expect(loadAccountDeletionReceipt()).resolves.toBeNull();

    const pending = await getOrCreateAccountDeletionReceipt(SUBJECT_B);
    await expect(loadAccountDeletionReceipt()).resolves.toMatchObject(pending);
  });

  it('clears only confirmed receipts and keeps every unconfirmed one', async () => {
    mockRandomUUID.mockReturnValueOnce(OPERATION_A).mockReturnValueOnce(OPERATION_B);
    const confirmed = await getOrCreateAccountDeletionReceipt(SUBJECT_A);
    const pending = await getOrCreateAccountDeletionReceipt(SUBJECT_B);
    await markAccountDeletionReceiptConfirmed(confirmed);

    await clearConfirmedAccountDeletionReceipts();

    await expect(loadAccountDeletionReceipt(SUBJECT_A)).resolves.toBeNull();
    await expect(loadAccountDeletionReceipt(SUBJECT_B)).resolves.toMatchObject(pending);
    expect((await loadAccountDeletionReceipts()).map((receipt) => receipt.operationId)).toEqual([OPERATION_B]);
  });

  it('does not treat a missing or malformed marker as a confirmation', () => {
    const base = { operationId: OPERATION_A, receiptSecret: '0'.repeat(64), subjectId: SUBJECT_A, createdAt: 'x' };
    expect(isConfirmedAccountDeletionReceipt(base)).toBe(false);
    expect(isConfirmedAccountDeletionReceipt({ ...base, confirmedDeletedAt: '' } as never)).toBe(false);
    expect(isConfirmedAccountDeletionReceipt({ ...base, confirmedDeletedAt: 123 } as never)).toBe(false);
    expect(isConfirmedAccountDeletionReceipt(null)).toBe(false);
  });

  it('does not touch secure storage on web', async () => {
    setPlatformOS('web');
    await markAccountDeletionReceiptConfirmed({
      operationId: OPERATION_A, receiptSecret: '0'.repeat(64), subjectId: SUBJECT_A, createdAt: 'x',
    });
    await clearConfirmedAccountDeletionReceipts();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.getItemAsync).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
