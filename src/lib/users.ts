import { supabase } from './supabase';
import { Platform } from 'react-native';
import type { UserRow } from '@/types/database';
import { stripExifNative, stripExifWeb, verifyExifStripped, detectMimeFromBytes } from './flags';

// Same bucket as flag photos — Storage RLS requires path to start with
// auth.uid(), which <userId>/avatar/<timestamp>.<ext> satisfies.
const FLAG_PHOTOS_BUCKET = 'flag-photos';
const ALLOWED_AVATAR_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);
const MAX_AVATAR_BYTES = 10 * 1024 * 1024; // 10 MB

export interface UserProfilePatch {
  display_name?: string | null;
  avatar_url?: string | null;
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
    .select('id, display_name, avatar_url, points, created_at')
    .single();
  if (error) throw error;
  return data as UserRow;
}

/**
 * Uploads a new avatar image and returns its public URL.
 * Path: <userId>/avatar/<timestamp>.<ext> — satisfies the flag-photos
 * Storage RLS policy (split_part(name,'/',1) = auth.uid()).
 */
export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  if (!ALLOWED_AVATAR_EXTS.has(ext)) {
    throw new Error('Avatar must be a JPG, PNG, WEBP, or HEIC image.');
  }

  const response = await fetch(localUri);
  let arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error('Photo file is empty.');
  if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error('Photo is too large. Please pick one under 10 MB.');
  }

  const detectedMime = detectMimeFromBytes(arrayBuffer);
  if (!detectedMime) {
    throw new Error('File does not appear to be a valid image.');
  }

  if (Platform.OS === 'web') {
    // D8: stripExifWeb returns null on ANY failure (no canvas, decode failure
    // such as a HEIC the browser can't render). Fail-closed — avatar selfies
    // very likely carry the user's home GPS, so never upload original bytes.
    const stripped = await stripExifWeb(arrayBuffer, ext);
    if (stripped === null) {
      throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
    }
    arrayBuffer = stripped;
  } else {
    // D8: stripExifNative returns null on failure; abort rather than upload
    // original bytes that may contain GPS/home-location metadata from avatar selfies.
    const stripped = await stripExifNative(arrayBuffer, ext);
    if (stripped === null) {
      throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
    }
    arrayBuffer = stripped;
  }

  const exifCheckPassed = verifyExifStripped(arrayBuffer);
  if (!exifCheckPassed) {
    // D8 privacy gate: abort upload if EXIF markers are still present.
    // Mirrors uploadFlagPhoto behavior in src/lib/flags.ts — same gate, same
    // rationale (avatar selfies likely contain the user's home GPS coordinates).
    throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
  }

  // Derive extension + Content-Type from the ACTUAL post-strip bytes (the
  // strip re-encodes HEIC/WEBP to JPEG/PNG) so name, MIME, and content agree.
  // Mirrors uploadFlagPhoto in src/lib/flags.ts.
  const strippedMime = detectMimeFromBytes(arrayBuffer);
  const contentType = strippedMime === 'image/png' ? 'image/png' : 'image/jpeg';
  const finalExt = strippedMime === 'image/png' ? 'png' : 'jpg';
  const filePath = `${userId}/avatar/${Date.now()}.${finalExt}`;

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, { contentType, upsert: false });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(FLAG_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
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
 * live backend yet. When the function is absent, PostgREST returns 42883 /
 * PGRST202 ("could not find the function" / "does not exist"); we warn once and
 * return [] so the UI shows the friendly empty state instead of an error.
 * Mirrors the degrade-gracefully pattern in src/lib/photos.ts listFlagPhotos.
 * Any OTHER error is a real failure and is re-thrown for the caller to surface.
 */
export async function listMonthlyLeaderboard(limit = 20): Promise<MonthlyLeaderboardEntry[]> {
  const { data, error } = await supabase.rpc('list_monthly_leaderboard', { p_limit: limit });

  if (error) {
    const isMissingFn =
      error.code === '42883' ||
      error.code === 'PGRST202' ||
      /does not exist|Could not find the function/i.test(error.message ?? '');
    if (isMissingFn) {
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
