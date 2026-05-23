import { supabase } from './supabase';
import type { UserRow } from '@/types/database';

/**
 * Updates the current user's editable profile fields on `public.users`.
 * Only the columns we explicitly support are accepted — adding new editable
 * fields here keeps the ProfileScreen edit surface honest with the schema.
 *
 * Returns the updated row so callers can refresh their local copy without a
 * second round-trip.
 */
export interface UserProfilePatch {
  display_name?: string | null;
}

export async function updateUserProfile(
  userId: string,
  patch: UserProfilePatch,
): Promise<UserRow> {
  const { data, error } = await supabase
    .from('users')
    .update(patch)
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data as UserRow;
}
