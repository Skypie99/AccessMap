/**
 * remoteImageUrl — is this image URL safe to hand to <Image src>?
 *
 * WHY THIS EXISTS (security audit 2026-07-31, findings TB-3 / IO-3 / IO-1):
 *
 * `flags.photo_url` and `users.avatar_url` are plain `text` columns with no
 * CHECK constraint. Any signed-in user can PATCH their own row and put ANY
 * URL there — including one pointing at a server they control. Those columns
 * are then rendered as images on ~12 surfaces, several of them guest-visible.
 *
 * The attack is not XSS: <Image src> never executes `javascript:` or
 * `data:text/html`. It is a BEACON. An attacker points their own flag's photo
 * at their own server and harvests the IP address and timestamp of every
 * person who opens a barrier report near them. For an app whose users are
 * disabled people reporting where they personally go, that is the worst
 * available leak.
 *
 * The real fix is a CHECK constraint on the column — that is a server change
 * and lives in the Sky-applied artifact packet. This module is the other half:
 * defence-in-depth for rows ALREADY in the table, and for the window before
 * the constraint is applied. Neither alone is sufficient — the constraint does
 * not clean existing rows, and a client check cannot stop a hostile client's
 * *write*.
 *
 * WHAT IS ALLOWED — exactly the two places a legitimate image URL comes from:
 *
 *   1. This project's Supabase Storage public object endpoint. That is what
 *      `getPublicUrl()` returns (see `uploadStrippedImage` in flags.ts), so it
 *      is what every honestly-uploaded photo and avatar looks like.
 *   2. Local device / in-memory schemes — `file://`, `content://`, `ph://`,
 *      `assets-library://`, `data:`, `blob:`. These are just-picked photos
 *      being previewed before upload. They originate on the device, never from
 *      the database, so they are not an attacker-controlled channel.
 *
 * Everything else — notably arbitrary `http(s)://` to a third-party host — is
 * rejected. That set is precisely the beacon vector and contains no legitimate
 * value.
 *
 * HOW IT FAILS: a rejected URL is treated exactly like a dead one. RemoteImage
 * already renders an accessible fallback for null/broken URLs, so a blocked
 * image degrades into the same neutral box a 404 produces. No new UX, no new
 * screen-reader surface, nothing for a legitimate user to notice.
 *
 * Note the deliberate contrast with `ALLOWED_PHOTO_SCHEMES` in `flags.ts`:
 * that one is the *inverse* guard (local schemes only, http(s) REJECTED) and
 * runs on the way IN, deciding what may be uploaded. This one runs on the way
 * OUT, deciding what may be rendered. They are not interchangeable.
 */

/**
 * Local/in-memory schemes produced by expo-image-picker and the web file
 * input. Mirrors `ALLOWED_PHOTO_SCHEMES` in flags.ts — kept as its own list
 * because that one is module-private and semantically inverted (see header).
 */
const LOCAL_IMAGE_SCHEMES = [
  'file://',
  'content://',
  'ph://',
  'assets-library://',
  'data:',
  'blob:',
];

/**
 * Supabase Storage public-object path prefix.
 *
 * ⚑ THIS IS THE ONE DEFINITION OF THIS SHAPE IN THE CODEBASE (DECISIONS §SKY-6a).
 * `storagePathFromPublicUrl` in `flags.ts` imports it from here rather than
 * restating it, and `sr050DeleteFlagPhotos.test.ts` enforces that no second
 * copy of the literal appears anywhere in `src/`. It lives in this module
 * because this module is a leaf with no imports — `flags.ts` is free to depend
 * on it, but not the reverse. If you need this string, import it; do not retype
 * it, or the guard test will (correctly) fail.
 */
export const STORAGE_PUBLIC_PREFIX = '/storage/v1/object/public/';

/**
 * The origin of this project's Supabase instance, or null if the env var is
 * missing/unparseable. Computed once at module load — the value is baked into
 * the bundle at build time and cannot change at runtime.
 */
const SUPABASE_ORIGIN: string | null = (() => {
  const raw = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!raw) return null;
  try {
    return new URL(raw).origin;
  } catch {
    return null;
  }
})();

/**
 * True if `uri` is safe to render as a remote image.
 *
 * Returns false for null/undefined/empty so callers can use it as a single
 * gate. Exact ORIGIN comparison, never a substring test — `.includes('supabase.co')`
 * would happily match `https://evil-supabase.co.attacker.test/`.
 */
export function isAllowedImageUrl(uri: string | null | undefined): boolean {
  if (!uri) return false;

  const trimmed = uri.trim();
  if (!trimmed) return false;

  // Local previews: scheme match is sufficient — these never come from the DB.
  if (LOCAL_IMAGE_SCHEMES.some((scheme) => trimmed.toLowerCase().startsWith(scheme))) {
    return true;
  }

  // Remote: must be this project's Supabase storage public endpoint, exactly.
  if (!SUPABASE_ORIGIN) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.origin === SUPABASE_ORIGIN && parsed.pathname.startsWith(STORAGE_PUBLIC_PREFIX);
  } catch {
    // Not an absolute URL — nothing legitimate reaches here.
    return false;
  }
}

/**
 * Convenience for render sites: returns the URI if it is allowed, else null.
 * Passing null into RemoteImage (or an <img src>) yields the existing
 * broken/empty fallback, which is exactly the intended degradation.
 */
export function safeImageUrl(uri: string | null | undefined): string | null {
  return isAllowedImageUrl(uri) ? (uri as string).trim() : null;
}
