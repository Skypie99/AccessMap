import { Platform } from 'react-native';
import { supabase } from './supabase';
import { commitFlagPhotoUpload, uploadFlagPhoto } from './flags';
import { trackEvent } from './analytics';
// SLOP-3 (code-qa 2026-08-06): this file's local isTableMissingError lacked
// the SR-092 embed early-out — a broken join whose message says "does not
// exist" was misread as "table missing". The canonical embed-aware check
// lives in postgrestErrors.ts now.
import { isRelationMissing } from './postgrestErrors';

export type FlagPhoto = {
  id: string;
  flag_id: string;
  url: string;
  position: number;
  created_at: string;
  // Optional VoiceOver description written by the uploader (≤200 chars).
  // Nullable/absent on rows created before 2026-08-19_photo_alt_text_APPLIED.
  alt_text?: string | null;
  object_key?: string | null;
};

/**
 * Fetch all photos for a flag ordered by position.
 * Returns [] ONLY when the flag_photos table doesn't exist yet (migration
 * pending). Any other failure throws — COR-3 (code-qa 2026-08-06): the old
 * swallow-all [] made a transient failure render as "this flag has no photos"
 * and let addFlagPhoto compute position 0 from a failed read.
 */
export async function listFlagPhotos(
  flagId: string,
): Promise<{ url: string; position: number; alt_text?: string | null }[]> {
  try {
    const { data, error } = await supabase
      .from('flag_photos')
      .select('url, object_key, position, alt_text')
      .eq('flag_id', flagId)
      .order('position', { ascending: true });

    if (error) {
      if (isRelationMissing(error)) return [];
      throw error;
    }

    return (data ?? []).map((photo) => ({
      url: photo.object_key
        ? supabase.storage.from('flag-photos').getPublicUrl(photo.object_key).data.publicUrl
        : photo.url,
      position: photo.position,
      alt_text: photo.alt_text,
    })) as { url: string; position: number; alt_text?: string | null }[];
  } catch (e) {
    if (isRelationMissing(e)) return [];
    throw e;
  }
}

/**
 * Upload a photo from a local URI and insert a junction row.
 * The next position is determined from the current count.
 */
export async function addFlagPhoto(
  flagId: string,
  localUri: string,
  srcWidth?: number,
  srcHeight?: number,
  // Optional VoiceOver description. Trimmed; empty becomes null.
  altText?: string | null,
): Promise<FlagPhoto> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await listFlagPhotos(flagId);
  const position = existing.length;

  const prepared = await uploadFlagPhoto(user.id, localUri, srcWidth, srcHeight);
  const alt = altText?.trim().slice(0, 200) || null;
  await commitFlagPhotoUpload(prepared.intentId, flagId, position, alt, false);

  // Analytics: a photo was added. photo_count is the new total; no flag_id or
  // URL is logged (both are PII-adjacent). See src/lib/analytics.ts.
  trackEvent('photo_added', { photo_count: position + 1, platform: Platform.OS });

  return {
    id: prepared.intentId,
    flag_id: flagId,
    url: prepared.url,
    position,
    created_at: new Date().toISOString(),
    alt_text: alt,
    object_key: prepared.path,
  };
}

/**
 * Commit prepared intents after the report exists. A client does not insert a
 * public URL: the server verifies exact object key, bucket, and owner_id.
 */
export async function batchInsertFlagPhotos(
  flagId: string,
  photos: { intentId: string; alt?: string | null }[],
): Promise<void> {
  if (photos.length === 0) return;
  for (const [position, photo] of photos.entries()) {
    await commitFlagPhotoUpload(photo.intentId, flagId, position, photo.alt, position === 0);
  }
}
