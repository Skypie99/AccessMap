import { supabase } from './supabase';
import type { UserRow } from '@/types/database';

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

export async function updateUserProfile(
  userId: string,
  patch: UserProfilePatch,
): Promise<UserRow> {
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
        throw new Error(
          `Display name must be ${MAX_DISPLAY_NAME_LEN} characters or fewer.`,
        );
      } else {
        clean.display_name = trimmed;
      }
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update(clean)
    .eq('id', userId)
    .select('id, email, display_name, avatar_url, points, created_at')
    .single();
  if (error) throw error;
  return data as UserRow;
}

/**
 * Uploads a new avatar image and returns its public URL.
 * Path: <userId>/avatar/<timestamp>.<ext> — satisfies the flag-photos
 * Storage RLS policy (split_part(name,'/',1) = auth.uid()).
 */
export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<string> {
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  if (!ALLOWED_AVATAR_EXTS.has(ext)) {
    throw new Error('Avatar must be a JPG, PNG, WEBP, or HEIC image.');
  }

  const response = await fetch(localUri);
  const arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) throw new Error('Photo file is empty.');
  if (arrayBuffer.byteLength > MAX_AVATAR_BYTES) {
    throw new Error('Photo is too large. Please pick one under 10 MB.');
  }

  const contentType =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic' || ext === 'heif'
          ? 'image/heic'
          : 'image/jpeg';
  const filePath = `${userId}/avatar/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, { contentType, upsert: false });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .getPublicUrl(filePath);
  return data.publicUrl;
}

/** Returns up to 2 uppercase initials from a display name or email. */
export function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    const first = parts[0] ?? '';
    const last = parts[parts.length - 1] ?? '';
    return ((first[0] ?? '') + (last[0] ?? '')).toUpperCase();
  }
  // Single word — take first two chars (handles email like "sky@…" → "SK")
  const atIdx = trimmed.indexOf('@');
  const word = atIdx > 0 ? trimmed.slice(0, atIdx) : trimmed;
  return word.slice(0, 2).toUpperCase();
}
