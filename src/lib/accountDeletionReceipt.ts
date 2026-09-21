import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { accountDeletionAsyncStatusAvailable } from './accountDeletionAvailability';
import { supabase } from './supabase';

const RECEIPT_INDEX_STORAGE_KEY = 'flagstone.accountDeletionReceipt.index.v2';
const RECEIPT_STORAGE_PREFIX = 'flagstone.accountDeletionReceipt.v2.';

export type AccountDeletionReceipt = {
  operationId: string;
  receiptSecret: string;
  // Kept inside native secure storage only. Storage keys use an opaque
  // operation id rather than a subject identifier, so one device can retain
  // multiple in-progress receipts without account-key leakage or overwrite.
  subjectId: string;
  createdAt: string;
};
export type AccountDeletionReceiptStatus = 'REQUESTED' | 'DELETING' | 'REVIEWING' | 'COMPLETE';
export type AccountDeletionStatus = {
  status: AccountDeletionReceiptStatus;
  requestedAt: string | null;
  completedAt: string | null;
};

export class AccountDeletionReceiptUnavailableError extends Error {
  constructor() {
    super('Account-deletion recovery is not available in a browser because this app cannot securely store its recovery receipt there. Use the Flagstone iOS app.');
    this.name = 'AccountDeletionReceiptUnavailableError';
  }
}

const pendingBySubject = new Map<string, Promise<AccountDeletionReceipt>>();
let indexMutation: Promise<void> = Promise.resolve();

/** Persist a native-only recovery capability before the first network call.
 * A retry intentionally reuses this account's existing operation/secret pair
 * after a lost response, while other accounts retain distinct receipt records. */
export async function getOrCreateAccountDeletionReceipt(subjectId: string): Promise<AccountDeletionReceipt> {
  requireNativeReceiptStorage();
  const pending = pendingBySubject.get(subjectId);
  if (pending) return pending;

  const task = getOrCreateNativeReceipt(subjectId).finally(() => pendingBySubject.delete(subjectId));
  pendingBySubject.set(subjectId, task);
  return task;
}

async function getOrCreateNativeReceipt(subjectId: string): Promise<AccountDeletionReceipt> {
  const existing = await loadAccountDeletionReceipt(subjectId);
  if (existing) return existing;
  const receipt: AccountDeletionReceipt = {
    operationId: Crypto.randomUUID(),
    receiptSecret: toHex(await Crypto.getRandomBytesAsync(32)),
    subjectId,
    createdAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(receiptStorageKey(receipt.operationId), JSON.stringify(receipt));
  await mutateReceiptIndex((operationIds) => [...new Set([...operationIds, receipt.operationId])]);
  return receipt;
}

/** Returns a receipt for the supplied account when one is known; without a
 * subject it returns the first recoverable native receipt for the signed-out
 * status surface. Web deliberately has no receipt recovery path. */
export async function loadAccountDeletionReceipt(subjectId?: string): Promise<AccountDeletionReceipt | null> {
  if (Platform.OS === 'web') return null;
  const receipts = await loadNativeReceipts();
  return subjectId ? receipts.find((receipt) => receipt.subjectId === subjectId) ?? null : receipts.find(isUnconfirmedReceipt) ?? null;
}

export async function loadAccountDeletionReceipts(): Promise<AccountDeletionReceipt[]> {
  if (Platform.OS === 'web') return [];
  return loadNativeReceipts();
}

/** Removes only the chosen terminal receipt. Omitting it retains the original
 * clear-all behavior for recovery reset, while multi-operation callers can
 * dismiss one completed or unavailable operation without overwriting others. */
export async function clearAccountDeletionReceipt(receipt?: Pick<AccountDeletionReceipt, 'operationId'>): Promise<void> {
  if (Platform.OS === 'web') return;
  const operationIds = receipt ? [receipt.operationId] : await loadReceiptIndex();
  await Promise.all(operationIds.map((operationId) => SecureStore.deleteItemAsync(receiptStorageKey(operationId))));
  await mutateReceiptIndex((existing) => existing.filter((operationId) => !operationIds.includes(operationId)));
}

async function requestAccountDeletionStatus(receipt: AccountDeletionReceipt): Promise<AccountDeletionStatus> {
  const { data, error } = await supabase.functions.invoke('account-deletion-status', {
    method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
  });
  if (error || !data || !isStatus(data.status)) throw error ?? new Error('Deletion status is unavailable.');
  return {
    status: data.status,
    requestedAt: typeof data.requestedAt === 'string' ? data.requestedAt : null,
    completedAt: typeof data.completedAt === 'string' ? data.completedAt : null,
  };
}

/** Thrown instead of a network call while the async status route is absent. */
export class AccountDeletionStatusUnavailableError extends Error {
  constructor() {
    super('Account-deletion status is not available in this version of Flagstone.');
    this.name = 'AccountDeletionStatusUnavailableError';
  }
}

/** FDA-003 / Phase 04B: the only way to read async deletion status. While the
 * Phase 05 capability is absent this fails closed WITHOUT contacting the
 * network, so no caller can reach the undeployed `account-deletion-status`
 * route by accident. */
export async function getAccountDeletionStatus(receipt: AccountDeletionReceipt): Promise<AccountDeletionStatus> {
  if (!accountDeletionAsyncStatusAvailable()) throw new AccountDeletionStatusUnavailableError();
  return requestAccountDeletionStatus(receipt);
}

/** A receipt whose deletion the server already CONFIRMED (deployed
 * `delete-account` v4 answered `status: 'deleted'`). It is terminal: it must
 * never drive another deletion request or a status call. It is kept only so a
 * device that could not finish signing out still knows the truth after a
 * relaunch, and it is cleared once local sign-out completes. */
export type ConfirmedAccountDeletionReceipt = AccountDeletionReceipt & { confirmedDeletedAt: string };

export function isConfirmedAccountDeletionReceipt(
  receipt: AccountDeletionReceipt | null | undefined,
): receipt is ConfirmedAccountDeletionReceipt {
  const confirmedDeletedAt = (receipt as { confirmedDeletedAt?: unknown } | null | undefined)?.confirmedDeletedAt;
  return typeof confirmedDeletedAt === 'string' && confirmedDeletedAt.length > 0;
}

/** Records the server's confirmation on this operation's own secure record
 * (same opaque key, no new identifier) before local sign-out starts. */
export async function markAccountDeletionReceiptConfirmed(receipt: AccountDeletionReceipt): Promise<void> {
  if (Platform.OS === 'web') return;
  const confirmed: ConfirmedAccountDeletionReceipt = { ...receipt, confirmedDeletedAt: new Date().toISOString() };
  await SecureStore.setItemAsync(receiptStorageKey(receipt.operationId), JSON.stringify(confirmed));
  await mutateReceiptIndex((operationIds) => [...new Set([...operationIds, receipt.operationId])]);
}

/** Drops every terminal (server-confirmed) receipt. The signed-out surface
 * calls this: each confirmation was already shown once when deletion
 * finished, and an unconfirmed receipt is never touched here. */
export async function clearConfirmedAccountDeletionReceipts(): Promise<void> {
  if (Platform.OS === 'web') return;
  const confirmed = (await loadNativeReceipts()).filter(isConfirmedAccountDeletionReceipt);
  for (const receipt of confirmed) await clearAccountDeletionReceipt(receipt);
}

function isUnconfirmedReceipt(receipt: AccountDeletionReceipt): boolean {
  return !isConfirmedAccountDeletionReceipt(receipt);
}

async function loadNativeReceipts(): Promise<AccountDeletionReceipt[]> {
  const operationIds = await loadReceiptIndex();
  const values = await Promise.all(operationIds.map(async (operationId) => {
    const raw = await SecureStore.getItemAsync(receiptStorageKey(operationId));
    return parseReceipt(raw, operationId);
  }));
  return values.filter((receipt): receipt is AccountDeletionReceipt => receipt !== null);
}

const OPERATION_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function loadReceiptIndex(): Promise<string[]> {
  const raw = await SecureStore.getItemAsync(RECEIPT_INDEX_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? [...new Set(parsed.filter((value): value is string => typeof value === 'string' && OPERATION_ID_RE.test(value)))]
      : [];
  } catch {
    return [];
  }
}

async function mutateReceiptIndex(update: (operationIds: string[]) => string[]): Promise<void> {
  const mutation = indexMutation.then(async () => {
    const next = [...new Set(update(await loadReceiptIndex()))];
    await SecureStore.setItemAsync(RECEIPT_INDEX_STORAGE_KEY, JSON.stringify(next));
  });
  indexMutation = mutation.catch(() => undefined);
  return mutation;
}

function parseReceipt(raw: string | null, expectedOperationId: string): AccountDeletionReceipt | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AccountDeletionReceipt>;
    if (value.operationId !== expectedOperationId || typeof value.receiptSecret !== 'string'
      || !/^[0-9a-f]{64}$/i.test(value.receiptSecret) || typeof value.subjectId !== 'string'
      || typeof value.createdAt !== 'string') return null;
    return value as AccountDeletionReceipt;
  } catch {
    return null;
  }
}

function receiptStorageKey(operationId: string): string {
  return `${RECEIPT_STORAGE_PREFIX}${operationId}`;
}

function requireNativeReceiptStorage(): void {
  if (Platform.OS === 'web') throw new AccountDeletionReceiptUnavailableError();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function isStatus(value: unknown): value is AccountDeletionReceiptStatus {
  return value === 'REQUESTED' || value === 'DELETING' || value === 'REVIEWING' || value === 'COMPLETE';
}
