import { Platform } from 'react-native';
import { supabase } from './supabase';
import { uploadFlagPhoto } from './flags';
import { trackEvent } from './analytics';

export type FlagPhoto = {
  id: string;
  flag_id: string;
  url: string;
  position: number;
  created_at: string;
};

// 42P01 = "relation does not exist" (PostgreSQL). Returned when the
// flag_photos migration hasn't been applied yet on this backend.
function isTableMissingError(e: unknown): boolean {
  const msg = String((e as { message?: string })?.message ?? e ?? '');
  const code = String((e as { code?: string })?.code ?? '');
  return code === '42P01' || msg.includes('does not exist');
}

/**
 * Fetch all photos for a flag ordered by position.
 * Returns [] silently if the flag_photos table doesn't exist yet (migration pending).
 */
export async function listFlagPhotos(flagId: string): Promise<{ url: string; position: number }[]> {
  try {
    const { data, error } = await supabase
      .from('flag_photos')
      .select('url, position')
      .eq('flag_id', flagId)
      .order('position', { ascending: true });

    if (error) {
      if (isTableMissingError(error)) return [];
      throw error;
    }

    return (data ?? []) as { url: string; position: number }[];
  } catch (e) {
    if (isTableMissingError(e)) return [];
    console.warn('[photos] listFlagPhotos failed:', e);
    return [];
  }
}

/**
 * Upload a photo from a local URI and insert a junction row.
 * The next position is determined from the current count.
 */
export async function addFlagPhoto(flagId: string, localUri: string): Promise<FlagPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await listFlagPhotos(flagId);
  const position = existing.length;

  const url = await uploadFlagPhoto(user.id, localUri);

  const { data, error } = await supabase
    .from('flag_photos')
    .insert({ flag_id: flagId, url, position })
    .select()
    .single();

  if (error) throw error;

  // Analytics: a photo was added. photo_count is the new total; no flag_id or
  // URL is logged (both are PII-adjacent). See src/lib/analytics.ts.
  trackEvent('photo_added', { photo_count: position + 1, platform: Platform.OS });

  return data as FlagPhoto;
}

/**
 * Delete a junction row by ID.
 * Storage blob cleanup is deferred to an Edge Function.
 */
export async function deleteFlagPhoto(photoId: string): Promise<void> {
  const { error } = await supabase
    .from('flag_photos')
    .delete()
    .eq('id', photoId);
  if (error) throw error;
}

/**
 * Batch-insert pre-uploaded URLs as junction rows for a newly created flag.
 * Used by ReportFlagModal after createFlag() — avoids re-uploading.
 * Silent no-op if the table doesn't exist yet.
 */
export async function batchInsertFlagPhotos(flagId: string, urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  const rows = urls.map((url, i) => ({ flag_id: flagId, url, position: i }));
  try {
    const { error } = await supabase.from('flag_photos').insert(rows);
    if (error) {
      if (isTableMissingError(error)) return;
      throw error;
    }
  } catch (e) {
    if (isTableMissingError(e)) return;
    throw e;
  }
}
