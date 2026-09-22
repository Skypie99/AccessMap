import { accountDeletionAsyncStatusAvailable } from './accountDeletionAvailability';
import {
  AccountDeletionReceiptUnavailableError,
  clearAccountDeletionReceipt,
  getOrCreateAccountDeletionReceipt,
  isConfirmedAccountDeletionReceipt,
  loadAccountDeletionReceipt,
  markAccountDeletionReceiptConfirmed,
  type AccountDeletionReceipt,
} from './accountDeletionReceipt';
import { signOut, supabase } from './supabase';

type DeleteAccountReply = { data: unknown; error: unknown; threw: boolean };

/** FDA-003: sends the ONE destructive request and reports the raw reply. It
 * never throws and never retries; classifyReply() decides what it proves. */
async function sendDeleteAccountRequest(receipt: AccountDeletionReceipt): Promise<DeleteAccountReply> {
  try {
    const { data, error } = await supabase.functions.invoke('delete-account', {
      // Deployed v4 ignores this body; the Phase 05 async protocol needs it.
      method: 'POST', body: { operationId: receipt.operationId, receiptSecret: receipt.receiptSecret },
    });
    return { data, error, threw: false };
  } catch (error) {
    // invoke() reports failures in `error`; a throw is just as unproven.
    return { data: null, error, threw: true };
  }
}

/** The server CONFIRMED the deletion (v4 `status: 'deleted'`), but this device
 * could not finish signing out. Callers must describe the account as deleted,
 * never as a failed deletion, and must not send another deletion request. */
export class AccountDeletedSignOutPendingError extends Error {
  constructor() {
    super('Your account was deleted, but this device could not finish signing out. Check your connection, then choose Finish signing out on this screen.');
    this.name = 'AccountDeletedSignOutPendingError';
  }
}

/** The request is durable, but this device could not finish the local sign-out.
 * Callers must not describe that as a failed deletion request. */
export class AccountDeletionRequestSignOutPendingError extends Error {
  constructor() {
    super('Your deletion request was received, but this device could not finish signing out. Please restart the app.');
    this.name = 'AccountDeletionRequestSignOutPendingError';
  }
}

/** Nothing reached the server: this device could not prepare the request. */
export class AccountDeletionNotStartedError extends Error {
  constructor() {
    super('No deletion request was made. Please try again.');
    this.name = 'AccountDeletionNotStartedError';
  }
}

/** Why a reply proved nothing. Kept distinct so no two failure shapes collapse
 * into one generic result. */
export type AccountDeletionUnconfirmedReason =
  | 'network' // no reply: the request may or may not have reached the server
  | 'server' // an explicit error reply (v4 answers 500 {status:'error'})
  | 'auth' // 401/403: the session could not be verified
  | 'malformed' // a success status whose body could not be read
  | 'unexpected_status' // a readable body with a status this client does not know
  | 'async_unavailable' // status=requested while the Phase 05 capability is absent
  | 'unknown';

const UNCONFIRMED_MESSAGES: Record<AccountDeletionUnconfirmedReason, string> = {
  network: "The connection dropped before Flagstone got a reply, so it can't confirm whether your account was deleted. It did not try again. Check your connection before you decide whether to retry.",
  server: "The deletion service reported an error, so Flagstone can't confirm whether your account was deleted. It did not try again.",
  auth: "Your sign-in could not be verified, so Flagstone can't confirm whether your account was deleted. It did not try again. Sign out and back in before you retry.",
  malformed: "Flagstone could not read the reply, so it can't confirm whether your account was deleted. It did not try again.",
  unexpected_status: "Flagstone did not recognize the reply, so it can't confirm whether your account was deleted. It did not try again.",
  async_unavailable: "The deletion service replied with a request this version of Flagstone can't track, so it can't confirm whether your account was deleted. It did not try again.",
  unknown: "Something went wrong, so Flagstone can't confirm whether your account was deleted. It did not try again.",
};

/** No reply proved the outcome. It is never a success, never a confirmed
 * failure, and never retried automatically. */
export class AccountDeletionUnconfirmedError extends Error {
  readonly reason: AccountDeletionUnconfirmedReason;

  constructor(reason: AccountDeletionUnconfirmedReason) {
    super(UNCONFIRMED_MESSAGES[reason]);
    this.name = 'AccountDeletionUnconfirmedError';
    this.reason = reason;
  }
}

export type AccountDeletionOutcome =
  | { status: 'deleted' }
  // Phase 05 async protocol only: unreachable while its capability is absent.
  | { status: 'requested'; receipt: AccountDeletionReceipt; requestedAt: string | null };

type ReplyVerdict =
  | { kind: 'deleted' }
  | { kind: 'requested'; requestedAt: string | null }
  | { kind: 'unconfirmed'; reason: AccountDeletionUnconfirmedReason };

const inFlightBySubject = new Map<string, Promise<AccountDeletionOutcome>>();

/** Deletes the signed-in account. Concurrent calls for one account share its
 * single in-flight request, so a repeated press can never send a second one.
 * Resolves only on a server-confirmed outcome; every other result rejects. */
export function deleteAccount(userId: string): Promise<AccountDeletionOutcome> {
  const pending = inFlightBySubject.get(userId);
  if (pending) return pending;
  const task = runAccountDeletion(userId).finally(() => inFlightBySubject.delete(userId));
  inFlightBySubject.set(userId, task);
  return task;
}

async function runAccountDeletion(userId: string): Promise<AccountDeletionOutcome> {
  let receipt: AccountDeletionReceipt;
  try {
    receipt = await getOrCreateAccountDeletionReceipt(userId);
  } catch (error) {
    if (error instanceof AccountDeletionReceiptUnavailableError) throw error;
    throw new AccountDeletionNotStartedError();
  }

  // The server already confirmed this account's deletion (for example, sign-out
  // failed and the app relaunched): finish locally, never send it again.
  if (isConfirmedAccountDeletionReceipt(receipt)) {
    await finishConfirmedDeletion(userId, receipt);
    return { status: 'deleted' };
  }

  const verdict = classifyReply(await sendDeleteAccountRequest(receipt));
  if (verdict.kind === 'unconfirmed') throw new AccountDeletionUnconfirmedError(verdict.reason);

  if (verdict.kind === 'deleted') {
    // Record the confirmation BEFORE sign-out, so an interrupted or failed
    // cleanup can never later read as an unconfirmed attempt.
    try {
      await markAccountDeletionReceiptConfirmed(receipt);
    } catch {
      // The server result stands; the marker only helps after a relaunch.
    }
    await finishConfirmedDeletion(userId, receipt);
    return { status: 'deleted' };
  }

  // Sign out locally only after the server has committed its durable write
  // fence. SecureStore retains the receipt after Auth removal for completion.
  const result = await signOut(userId);
  if (result?.error) throw new AccountDeletionRequestSignOutPendingError();
  return { status: 'requested', receipt, requestedAt: verdict.requestedAt };
}

/** The local half of a deletion the server already confirmed, for the Profile's
 * "Finish signing out" action. It never sends a deletion request. */
export async function completeConfirmedAccountDeletion(userId: string): Promise<void> {
  let receipt: AccountDeletionReceipt | null = null;
  try {
    receipt = await loadAccountDeletionReceipt(userId);
  } catch {
    receipt = null;
  }
  await finishConfirmedDeletion(userId, isConfirmedAccountDeletionReceipt(receipt) ? receipt : null);
}

async function finishConfirmedDeletion(userId: string, receipt: AccountDeletionReceipt | null): Promise<void> {
  let signedOut: boolean;
  try {
    signedOut = !(await signOut(userId))?.error;
  } catch {
    signedOut = false;
  }
  if (!signedOut) throw new AccountDeletedSignOutPendingError();
  if (!receipt) return;
  try {
    await clearAccountDeletionReceipt(receipt);
  } catch {
    // Already signed out; the signed-out surface drops leftover terminal receipts.
  }
}

/** Only a validated reply is a confirmed outcome. Deployed v4 answers
 * 200 {status:'deleted'} or 500 {status:'error'} (archived Phase 02A capture). */
function classifyReply(reply: DeleteAccountReply): ReplyVerdict {
  if (reply.threw) return { kind: 'unconfirmed', reason: 'network' };
  if (reply.error) return { kind: 'unconfirmed', reason: classifyInvokeError(reply.error) };
  const body = readReplyBody(reply.data);
  if (!body || typeof body.status !== 'string') return { kind: 'unconfirmed', reason: 'malformed' };
  if (body.status === 'deleted') return { kind: 'deleted' };
  if (body.status === 'error') return { kind: 'unconfirmed', reason: 'server' };
  if (body.status === 'requested') {
    if (!accountDeletionAsyncStatusAvailable()) return { kind: 'unconfirmed', reason: 'async_unavailable' };
    return { kind: 'requested', requestedAt: typeof body.requestedAt === 'string' ? body.requestedAt : null };
  }
  return { kind: 'unconfirmed', reason: 'unexpected_status' };
}

function classifyInvokeError(error: unknown): AccountDeletionUnconfirmedReason {
  const name = readField(error, 'name');
  if (name === 'FunctionsHttpError') {
    const status = readField(readField(error, 'context'), 'status');
    return status === 401 || status === 403 ? 'auth' : 'server';
  }
  if (name === 'FunctionsRelayError') return 'server';
  if (name === 'FunctionsFetchError') return 'network';
  // invoke() also returns the parse error of a success body it could not read.
  if (name === 'SyntaxError') return 'malformed';
  return 'unknown';
}

function readReplyBody(data: unknown): { status?: unknown; requestedAt?: unknown } | null {
  let value = data;
  if (typeof value === 'string') {
    // A JSON reply sent without a JSON content type arrives as text.
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function readField(value: unknown, key: string): unknown {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
}
