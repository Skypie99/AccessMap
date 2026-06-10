import { signOut, supabase } from './supabase';

/**
 * Thrown when the account WAS deleted server-side but this device couldn't
 * complete the local sign-out (e.g. connectivity dropped right after the
 * delete). Callers must NOT say "your account was not deleted".
 */
export class AccountDeletedSignOutPendingError extends Error {
  constructor() {
    super(
      'Your account was deleted, but this device could not finish signing out. Please restart the app.',
    );
    this.name = 'AccountDeletedSignOutPendingError';
  }
}

// Permanently deletes the current user's account via the delete-account
// Edge Function, then clears the local session.
//
// On success the auth context receives a SIGNED_OUT event and the app
// navigates to SignInScreen automatically — callers don't need to navigate.
//
// On failure this throws and the caller stays logged in so they can retry.
export async function deleteAccount(userId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('delete-account', {
    method: 'POST',
  });

  if (error) throw error;

  // Clear local session, offline cache, tile cache, and push token.
  // signOut() clears local storage before the server-side revoke call so it
  // succeeds even though the auth.users row is already gone.
  // F63: if the sign-out fails (network dropped after the successful delete),
  // no SIGNED_OUT event fires and the caller's spinner would hang forever —
  // throw a typed error so the UI can reset and explain honestly.
  const result = await signOut(userId);
  if (result?.error) {
    throw new AccountDeletedSignOutPendingError();
  }
}
