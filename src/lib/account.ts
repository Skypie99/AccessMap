import { signOut, supabase } from './supabase';

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
  await signOut(userId);
}
