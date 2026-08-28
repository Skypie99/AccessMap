import { supabase } from './supabase';
import type { UserRow } from '@/types/database';
import { uploadStrippedImage } from './flags';
import { isFunctionMissing } from './postgrestErrors';
import { containsBlockedTerm } from '@/moderation/blockedTerms';
import { CONTENT_BLOCKED_MESSAGE } from './copy';

export interface UserProfilePatch {
  display_name?: string | null;
}

// Defense-in-depth cap on the free-text profile field. ProfileScreen
// already enforces maxLength=60 on the TextInput, but a malicious REST
// client can bypass the UI entirely, so we re-check at the boundary.
// Number matches the UI cap.
const MAX_DISPLAY_NAME_LEN = 60;

export async function updateUserProfile(userId: string, patch: UserProfilePatch): Promise<UserRow> {
  const clean: UserProfilePatch = {};
  if ('display_name' in patch) {
    const raw = patch.display_name;
    if (raw === null) {
      clean.display_name = null;
    } else if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if (trimmed.length === 0) {
        clean.display_name = null;
      } else if (trimmed.length > MAX_DISPLAY_NAME_LEN) {
        throw new Error(`Display name must be ${MAX_DISPLAY_NAME_LEN} characters or fewer.`);
      } else if (containsBlockedTerm(trimmed)) {
        // Apple 1.2(a), the leg this field was missing. The filter already runs
        // on flag descriptions (flags.ts createFlag / updateFlagContent /
        // createAnonFlag) and on comments (comments.ts), but NOT here — and a
        // display name is the one string in this app rendered under someone's
        // own byline on another person's barrier report (comments.ts joins it
        // onto every comment) and on the public leaderboard. A slur there is
        // seen by more people than a slur in any single report.
        //
        // Throws CONTENT_BLOCKED_MESSAGE, the same signal comments.ts and
        // flags.ts throw, so `isContentBlockedError` in blockedContent.ts
        // recognises it and callers can route to the guidelines identically.
        throw new Error(CONTENT_BLOCKED_MESSAGE);
      } else {
        clean.display_name = trimmed;
      }
    }
  }

  // Note: `email` is intentionally omitted from the select list.
  // The 2026-05-27 email-privacy migration revokes the `email` column from
  // the `authenticated` role (column-level grant), so selecting it would
  // return null. The UI sources email from `useAuth()` (auth.users JWT),
  // not from this row — omitting it keeps the select honest and avoids a
  // confusing null in the returned UserRow.
  const { data, error } = await supabase
    .from('users')
    .update(clean)
    .eq('id', userId)
    .select('id, display_name, avatar_url, avatar_object_key, points, created_at')
    .single();
  if (error) throw error;
  return withAvatarDisplayUrl(data as UserRow);
}

/**
 * Uploads a new avatar image and returns its public URL.
 * Path: <userId>/avatar/<timestamp>.<ext> — satisfies the flag-photos
 * Storage RLS policy (split_part(name,'/',1) = auth.uid()).
 *
 * Runs the SAME privacy-critical strip pipeline as uploadFlagPhoto via the
 * shared uploadStrippedImage helper in src/lib/flags.ts, so avatar uploads can
 * never drift from the flag-photo path. The shared helper enforces, in order:
 * the ALLOWED_PHOTO_SCHEMES guard (rejects http(s)://), the jpg/jpeg/png/webp/
 * heic/heif extension allowlist, the empty / 10 MB pre-checks, a magic-byte
 * MIME pre-check, the fail-closed strip gate on BOTH platforms (null => abort,
 * original bytes never uploaded — critical for avatar selfies that very likely
 * carry the user's home GPS), the byte-level metadata sanitizer (splices the
 * codec's own benign APP1 / eXIf out of the post-strip bytes), the structural
 * post-strip verifyExifStripped gate, post-strip MIME-derived
 * contentType/finalExt, and upsert:false.
 *
 * The avatar surface keeps its own `<uid>/avatar/<ts>.<ext>` object name (the
 * path is passed in, not hardcoded in the helper) and uses the generic web
 * strip-failure copy.
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
  srcWidth?: number,
  srcHeight?: number,
): Promise<{ url: string; profile: UserRow }> {
  let intentId = '';
  try {
    const upload = await uploadStrippedImage(
      userId,
      localUri,
      async (_userId, finalExt) => {
        const { data, error } = await supabase
          .rpc('prepare_flag_photo_upload', { p_extension: finalExt, p_kind: 'avatar' })
          .single();
        if (error || !data) throw error ?? new Error('Avatar upload could not be prepared.');
        intentId = data.intent_id;
        return data.object_key;
      },
      'Photo privacy check failed: EXIF stripping could not be completed. Please try again.',
      srcWidth,
      srcHeight,
    );
    if (!intentId) throw new Error('Avatar upload intent was not created.');
    const { data, error } = await supabase.rpc('commit_avatar_photo_upload', { p_intent_id: intentId }).single();
    if (error || !data) throw error ?? new Error('Avatar upload could not be verified.');
    return { url: upload.url, profile: { ...(data as UserRow), avatar_url: upload.url } };
  } catch (error) {
    if (intentId) {
      try {
        await supabase.rpc('cancel_flag_photo_upload', { p_intent_id: intentId });
      } catch {
        // A durable PREPARED/AMBIGUOUS intent is intentionally retained for review.
      }
    }
    throw error;
  }
}

/** Presentation only. Canonical object keys, not URL parsing, drive every
 * authorization, cleanup, and deletion decision. */
export function withAvatarDisplayUrl(row: UserRow): UserRow {
  if (!row.avatar_object_key) return row;
  return {
    ...row,
    avatar_url: supabase.storage.from('flag-photos').getPublicUrl(row.avatar_object_key).data.publicUrl,
  };
}

/**
 * UX #8: Monthly leaderboard entry. Shape-compatible with LeaderboardEntry in
 * src/lib/flags.ts (id, display_name, avatar_url, points) so the existing
 * leaderboard row renders it unchanged — `monthly_points` is mapped to `points`.
 */
export interface MonthlyLeaderboardEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

/**
 * Fetch the top `limit` contributors by THIS calendar month's points, highest
 * first, via the `list_monthly_leaderboard` RPC.
 *
 * GRACEFUL FALLBACK: the RPC migration is a FILE that may not be applied to the
 * live backend yet. When the function is absent (isFunctionMissing in
 * postgrestErrors.ts — 42883 / PGRST202 / the "could not find the function"
 * phrasing), we warn once and return [] so the UI shows the friendly empty
 * state instead of an error.
 * Mirrors the degrade-gracefully pattern in src/lib/photos.ts listFlagPhotos.
 * Any OTHER error is a real failure and is re-thrown for the caller to surface.
 */
export async function listMonthlyLeaderboard(limit = 20): Promise<MonthlyLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('list_monthly_leaderboard', { p_limit: limit });

  if (error) {
    if (isFunctionMissing(error)) {
      console.warn('[leaderboard] monthly RPC not applied yet:', error.message);
      return [];
    }
    throw error;
  }

  // Map monthly_points → points so the row renders identically to the all-time view.
  return (data ?? []).map((r) => ({
    id: r.id,
    display_name: r.display_name,
    avatar_url: r.avatar_url,
    points: r.monthly_points,
  }));
}

/** Returns up to 2 uppercase initials from a display name or email. */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  // F59 (re-sweep): index/slice operate on UTF-16 code UNITS — a display name
  // starting with an emoji (a surrogate pair) was split in half and rendered
  // as U+FFFD mojibake in the avatar fallback. Array.from iterates real code
  // points.
  if (parts.length >= 2) {
    const first = Array.from(parts[0] ?? '')[0] ?? '';
    const last = Array.from(parts[parts.length - 1] ?? '')[0] ?? '';
    return (first + last).toUpperCase();
  }
  // Single word — take first two code points (handles email like "sky@…" → "SK")
  const atIdx = trimmed.indexOf('@');
  const word = atIdx > 0 ? trimmed.slice(0, atIdx) : trimmed;
  return Array.from(word).slice(0, 2).join('').toUpperCase();
}
