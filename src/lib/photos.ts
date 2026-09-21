import { Platform } from 'react-native';
import { supabase } from './supabase';
import { commitFlagPhotoUpload, removeUploadedFlagPhotos, uploadFlagPhoto } from './flags';
import { trackEvent } from './analytics';

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
 *
 * Throws every backend error — missing relation, missing column, auth,
 * network, malformed response, anything (Prompt B B2/Fable B-UX-002). A
 * missing-column failure was previously misclassified as "the table doesn't
 * exist yet" (via the broad `does not exist` match in isRelationMissing) and
 * swallowed into `[]`, which rendered a real backend failure as an empty
 * gallery — an evidence surface, so a false "No photos" is an active false
 * statement. flag_photos is a permanent table now; its own absence is no
 * longer an expected transitional state either. FlagDetailModal owns the
 * loading/error/Retry presentation — this helper's only job is to never lie
 * about what happened. `[]` here means what it says: zero rows, not a
 * failure in a trenchcoat.
 */
export async function listFlagPhotos(
  flagId: string,
): Promise<{ url: string; position: number; alt_text?: string | null }[]> {
  const { data, error } = await supabase
    .from('flag_photos')
    .select('url, object_key, position, alt_text')
    .eq('flag_id', flagId)
    .order('position', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((photo) => ({
    url: photo.object_key
      ? supabase.storage.from('flag-photos').getPublicUrl(photo.object_key).data.publicUrl
      : photo.url,
    position: photo.position,
    alt_text: photo.alt_text,
  })) as { url: string; position: number; alt_text?: string | null }[];
}

/**
 * FDA-019 legacy uid-folder fallback: insert the `flag_photos` row directly
 * instead of through the (absent) commit_flag_photo_upload RPC. `url` is a
 * NOT NULL column and `object_key` is server-guarded (enforce_flag_photos_
 * object_key_guard rejects a client-supplied non-null value), so this only
 * ever writes the legacy `url` shape — the exact row shape `flag_photos`
 * supported before the upload-intent system existed. The `flag_photos:
 * authenticated insert` policy (`WITH CHECK (true)`) already authorizes any
 * signed-in user to add community evidence photos, same privilege the RPC
 * would have exercised.
 *
 * The object was already written to Storage by uploadFlagPhoto before this
 * runs; unlike the RPC path there is no server-side intent tracking it, so a
 * refused/failed row insert must clean it up here rather than leave a
 * pointer-less object silently orphaned in the bucket.
 */
async function insertLegacyFlagPhoto(
  flagId: string,
  url: string,
  path: string,
  position: number,
  altText: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('flag_photos')
    .insert({ flag_id: flagId, url, position, alt_text: altText });
  if (error) {
    await removeUploadedFlagPhotos([path]);
    throw error;
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
  if (prepared.intentId) {
    await commitFlagPhotoUpload(prepared.intentId, flagId, position, alt, false);
  } else {
    // FDA-019: upload-intent RPCs absent on this backend — the legacy
    // uid-folder fallback already ran inside uploadFlagPhoto above.
    await insertLegacyFlagPhoto(flagId, prepared.url, prepared.path, position, alt);
  }

  // Analytics: a photo was added. photo_count is the new total; no flag_id or
  // URL is logged (both are PII-adjacent). See src/lib/analytics.ts.
  trackEvent('photo_added', { photo_count: position + 1, platform: Platform.OS });

  return {
    id: prepared.intentId ?? prepared.path,
    flag_id: flagId,
    url: prepared.url,
    position,
    created_at: new Date().toISOString(),
    alt_text: alt,
    object_key: prepared.intentId ? prepared.path : null,
  };
}

/**
 * Commit prepared intents after the report exists. A client does not insert a
 * public URL for the intent path: the server verifies exact object key,
 * bucket, and owner_id. `intentId: null` entries are the FDA-019 legacy
 * fallback (see uploadFlagPhoto) and are inserted directly instead.
 */
export async function batchInsertFlagPhotos(
  flagId: string,
  photos: { intentId: string | null; url?: string; path?: string; alt?: string | null }[],
): Promise<void> {
  if (photos.length === 0) return;
  for (const [position, photo] of photos.entries()) {
    if (photo.intentId) {
      await commitFlagPhotoUpload(photo.intentId, flagId, position, photo.alt, position === 0);
      continue;
    }
    if (!photo.url || !photo.path) {
      throw new Error('Legacy photo upload is missing its Storage location.');
    }
    await insertLegacyFlagPhoto(flagId, photo.url, photo.path, position, photo.alt ?? null);
  }
}
