import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

const RECEIPT_STORAGE_KEY = 'flagstone.accountDeletionReceipt.v1';

export type AccountDeletionReceipt = {
  operationId: string;
  receiptSecret: string;
  // Local-only binding prevents a previous account's capability on a shared
  // device from being submitted for a later signed-in account.
  subjectId: string;
  createdAt: string;
};
export type AccountDeletionReceiptStatus = 'REQUESTED' | 'DELETING' | 'REVIEWING' | 'COMPLETE';
export type AccountDeletionStatus = {
  status: AccountDeletionReceiptStatus;
  requestedAt: string | null;
  completedAt: string | null;
};

/** Persist the recovery capability before the first network call. A retry
 * intentionally reuses the same operation/secret pair after a lost response. */
export async function getOrCreateAccountDeletionReceipt(subjectId: string): Promise<AccountDeletionReceipt> {
  const existing = await loadAccountDeletionReceipt();
  if (existing?.subjectId === subjectId) return existing;
  const receipt: AccountDeletionReceipt = {
    operationId: Crypto.randomUUID(),
    receiptSecret: toHex(await Crypto.getRandomBytesAsync(32)),
    subjectId,
    createdAt: new Date().toISOString(),
  };
  await SecureStore.setItemAsync(RECEIPT_STORAGE_KEY, JSON.stringify(receipt));
  return receipt;
}

export async function loadAccountDeletionReceipt(): Promise<AccountDeletionReceipt | null> {
  const raw = await SecureStore.getItemAsync(RECEIPT_STORAGE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<AccountDeletionReceipt>;
    if (typeof value.operationId !== 'string' || typeof value.receiptSecret !== 'string'
      || !/^[0-9a-f]{64}$/i.test(value.receiptSecret) || typeof value.subjectId !== 'string'
      || typeof value.createdAt !== 'string') return null;
    return value as AccountDeletionReceipt;
  } catch {
    return null;
  }
}

export async function clearAccountDeletionReceipt(): Promise<void> {
  await SecureStore.deleteItemAsync(RECEIPT_STORAGE_KEY);
}

export async function getAccountDeletionStatus(receipt: AccountDeletionReceipt): Promise<AccountDeletionStatus> {
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

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}
function isStatus(value: unknown): value is AccountDeletionReceiptStatus {
  return value === 'REQUESTED' || value === 'DELETING' || value === 'REVIEWING' || value === 'COMPLETE';
}
