import { Platform } from 'react-native';
import { supabase } from './supabase';
import {
  cancelFlagPhotoUpload,
  commitFlagPhotoUpload,
  removeUploadedFlagPhotos,
  uploadFlagPhoto,
} from './flags';
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
 * supported before the upload-intent system existed. The strict `flag_photos:
 * authenticated insert` policy requires the user's own Storage folder, an
 * existing account, and ownership of the related flag.
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
 * FDA-019 orphan repair (Phase 04A, 2026-09-21): every photo passed in here
 * already has real bytes sitting in Storage (uploadFlagPhoto already ran).
 * When one fails to attach, every OTHER photo that is not yet a confirmed
 * `flag_photos` row is just as orphaned as the one that failed — a later
 * photo in the array was never even attempted, but it is exactly as
 * pointer-less as the one whose insert was denied. Cleans up:
 *   - intent-based uploads (`intentId` set): cancelFlagPhotoUpload marks the
 *     durable server-side intent ambiguous for reconciliation — mirrors
 *     ReportFlagModal's own pre-createFlag failure handling. Never client-
 *     inferred absence, so a cancel failure here is swallowed (best-effort;
 *     the intent hold is what actually protects the object).
 *   - legacy uploads (`intentId: null`): removeUploadedFlagPhotos deletes the
 *     real Storage object directly — there is no server-side intent tracking
 *     it, so best-effort client cleanup is the only cleanup there is.
 * Already-attached photos (before the failing position) are never touched.
 * The CURRENTLY failing legacy entry is deliberately excluded from this
 * helper's input by its one caller below — insertLegacyFlagPhoto already
 * cleans up its own object on its own failure; passing it again here would
 * just be a redundant remove call, not a behavior difference.
 */
async function cleanupUnattachedFlagPhotos(
  photos: { intentId: string | null; path?: string }[],
): Promise<void> {
  const intentIds = photos.filter((p) => p.intentId).map((p) => p.intentId as string);
  const legacyPaths = photos.filter((p) => !p.intentId && p.path).map((p) => p.path as string);
  await Promise.allSettled([
    ...intentIds.map((id) => cancelFlagPhotoUpload(id)),
    legacyPaths.length > 0 ? removeUploadedFlagPhotos(legacyPaths) : Promise.resolve(),
  ]);
}

/**
 * Commit prepared intents after the report exists. A client does not insert a
 * public URL for the intent path: the server verifies exact object key,
 * bucket, and owner_id. `intentId: null` entries are the FDA-019 legacy
 * fallback (see uploadFlagPhoto) and are inserted directly instead.
 *
 * On a failure at any position, every photo from that position onward —
 * the one that just failed AND every one after it that was never even
 * attempted — gets cleaned up before the error propagates (FDA-019). Photos
 * before that position already succeeded and are left alone.
 */
export async function batchInsertFlagPhotos(
  flagId: string,
  photos: { intentId: string | null; url?: string; path?: string; alt?: string | null }[],
): Promise<void> {
  if (photos.length === 0) return;
  for (const [position, photo] of photos.entries()) {
    try {
      if (photo.intentId) {
        await commitFlagPhotoUpload(photo.intentId, flagId, position, photo.alt, position === 0);
        continue;
      }
      if (!photo.url || !photo.path) {
        throw new Error('Legacy photo upload is missing its Storage location.');
      }
      await insertLegacyFlagPhoto(flagId, photo.url, photo.path, position, photo.alt ?? null);
    } catch (err) {
      // The photo AT `position` needs its own cleanup here only when it's
      // intent-based (nothing else cancels it); a legacy failure already
      // cleaned itself inside insertLegacyFlagPhoto (or never had a path to
      // clean). Every later photo was never even attempted — clean all of
      // those regardless of kind.
      const current = photo.intentId ? [photo] : [];
      await cleanupUnattachedFlagPhotos([...current, ...photos.slice(position + 1)]);
      throw err;
    }
  }
}
