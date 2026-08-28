import { getOrCreateAccountDeletionReceipt, type AccountDeletionReceipt } from './accountDeletionReceipt';
import { signOut, supabase } from './supabase';

/** The request is durable, but this device could not finish the local sign-out.
 * Callers must not describe that as a failed deletion request. */
export class AccountDeletionRequestSignOutPendingError extends Error {
  constructor() {
    super('Your deletion request was received, but this device could not finish signing out. Please restart the app.');
    this.name = 'AccountDeletionRequestSignOutPendingError';
  }
}

export type AccountDeletionRequest = { receipt: AccountDeletionReceipt; requestedAt: string | null };

// Success means Transaction A committed REQUESTED only. The stateless worker
// performs Transaction B, cleanup, verification, and Auth deletion later.
export async function deleteAccount(userId: string): Promise<AccountDeletionRequest> {
  const receipt = await getOrCreateAccountDeletionReceipt(userId);
  const { data, error } = await supabase.functions.invoke('delete-account', {
    method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
  });
  if (error) throw error;
  if (!data || data.status !== 'requested') throw new Error('Deletion request was not accepted.');

  // Sign out locally only after the server has committed its durable write
  // fence. SecureStore retains the receipt after Auth removal for completion.
  const result = await signOut(userId);
  if (result?.error) throw new AccountDeletionRequestSignOutPendingError();
  return { receipt, requestedAt: typeof data.requestedAt === 'string' ? data.requestedAt : null };
}
