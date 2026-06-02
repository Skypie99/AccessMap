import { supabase } from './supabase';
import { color as themeColor, severity as severityRamp } from '@/theme';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { trackEvent } from './analytics';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';

export const FLAG_PHOTOS_BUCKET = 'flag-photos';

// 10 MB. Bigger than any photo the picker will hand us at quality=0.7,
// small enough that a runaway upload can't burn the user's data plan or
// hog the device while we wait for arrayBuffer(). Tune up if real photos
// start hitting this cap.
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

// Only image extensions we're willing to upload. Anything else (svg, html,
// pdf, exe…) gets rejected with a clear message rather than landing in a
// public Storage bucket with an inferred MIME type that may or may not
// match the actual bytes.
const ALLOWED_PHOTO_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

// Schemes expo-image-picker produces. `file://` (most platforms),
// `content://` (Android storage URIs), `ph://` and `assets-library://`
// (iOS photo library). `data:` and `blob:` show up on web. We deliberately
// don't accept `http(s)://` here — those would fetch from the network and
// happily re-upload someone else's image. The whole point of this helper
// is "take this just-picked local photo and put it in Storage."
const ALLOWED_PHOTO_SCHEMES = [
  'file://',
  'content://',
  'ph://',
  'assets-library://',
  'data:',
  'blob:',
];

/**
 * Default page sizes used by listFlagsPage and FlagsProvider.
 * Exported here so flagsStore.tsx and TasksScreen.tsx can import them
 * without a circular dependency.
 */
export const INITIAL_PAGE_SIZE = 50;
export const NEXT_PAGE_SIZE = 20;

/**
 * Strip EXIF metadata (GPS, timestamps, camera info, thumbnails, IPTC, XMP)
 * from an image on iOS/Android using expo-image-manipulator re-encode.
 *
 * ImageManipulator.manipulateAsync re-encodes the image via the platform codec,
 * producing a new file with no metadata passthrough. The returned {uri} is a
 * fresh file:// URI that we fetch back as bytes.
 *
 * D8 privacy gate: returns null on failure so callers can abort the upload
 * rather than silently proceeding with GPS-bearing original bytes (fail-closed).
 * The previous expo-media-library implementation was a production no-op —
 * saveToLibraryAsync returns Promise<void>, so the stripped result was always
 * undefined and the original unstripped buffer was silently returned.
 */
export async function stripExifNative(
  arrayBuffer: ArrayBuffer,
  ext: string,
): Promise<ArrayBuffer | null> {
  try {
    // Write the buffer to a temporary data URI so ImageManipulator can read it.
    const bytes = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(bytes)
      .map((b) => String.fromCharCode(b))
      .join('');
    const base64 = btoa(binaryString);
    const mimeType =
      ext === 'png'
        ? 'image/png'
        : ext === 'webp'
          ? 'image/webp'
          : ext === 'heic' || ext === 'heif'
            ? 'image/heic'
            : 'image/jpeg';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Re-encode with no transform actions. This forces the platform codec to
    // write a fresh image — EXIF/GPS/IPTC/XMP are not carried through.
    // SaveFormat.JPEG is used for JPEG/HEIC/HEIF; PNG stays PNG.
    const saveFormat =
      ext === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.JPEG;
    const result = await ImageManipulator.manipulateAsync(
      dataUrl,
      [], // no transform — re-encode only
      { compress: 0.9, format: saveFormat },
    );
    // result.uri is a fresh file:// URI with no metadata.
    const strippedResponse = await fetch(result.uri);
    const strippedBuffer = await strippedResponse.arrayBuffer();
    if (strippedBuffer.byteLength === 0) {
      console.warn('[EXIF] ImageManipulator output is empty; stripping failed.');
      return null;
    }

    if (__DEV__) {
      console.debug(
        `[EXIF] Native re-encode: ${arrayBuffer.byteLength} → ${strippedBuffer.byteLength} bytes`,
      );
    }
    return strippedBuffer;
  } catch (e) {
    console.warn('[EXIF] ImageManipulator transcode failed:', e);
    return null;
  }
}

/**
 * Strip EXIF metadata from an image on web using canvas re-encoding.
 * This draws the image onto a canvas and exports it as a new JPEG/PNG,
 * which discards all metadata. Quality may be slightly reduced (acceptable).
 *
 * Post-strip verification checks the output bytes.
 */
export function stripExifWeb(arrayBuffer: ArrayBuffer, ext: string): Promise<ArrayBuffer> {
  return new Promise((resolve) => {
    try {
      // Avoid calling web-only APIs if not in a browser environment.
      if (typeof document === 'undefined') {
        console.warn('[EXIF] Not in web environment; using original.');
        return resolve(arrayBuffer);
      }

      // Convert arrayBuffer to a blob and then to an object URL.
      const blob = new Blob([arrayBuffer], {
        type:
          ext === 'png'
            ? 'image/png'
            : ext === 'webp'
              ? 'image/webp'
              : ext === 'heic' || ext === 'heif'
                ? 'image/heic'
                : 'image/jpeg',
      });
      const objectUrl = URL.createObjectURL(blob);

      // Create a canvas and draw the image onto it. This strips metadata.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('[EXIF] Canvas context unavailable; using original.');
        return resolve(arrayBuffer);
      }

      const img = new Image();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      img.onload = (() => {
        // Set canvas size to match image (respects orientation).
        canvas.width = img.width;
        canvas.height = img.height;

        // Draw the image onto the canvas (bakes orientation into pixels).
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(objectUrl);

        // Export the canvas back to bytes. Use 0.8 quality to balance size/fidelity.
        // For PNG, quality is ignored and lossless compression is used.
        canvas.toBlob(
          (outBlob: Blob | null) => {
            if (!outBlob) {
              console.warn('[EXIF] Canvas toBlob failed; using original.');
              return resolve(arrayBuffer);
            }

            // Convert the blob back to arrayBuffer.
            const reader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reader.onload = ((_event: any) => {
              const result = reader.result;
              if (!(result instanceof ArrayBuffer)) {
                console.warn('[EXIF] Canvas result not ArrayBuffer; using original.');
                return resolve(arrayBuffer);
              }
              if (__DEV__) {
                console.debug(
                  `[EXIF] Web re-encode: ${arrayBuffer.byteLength} → ${result.byteLength} bytes`,
                );
              }
              resolve(result);
            }) as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reader.onerror = ((_error: any) => {
              console.warn('[EXIF] FileReader error; using original.');
              resolve(arrayBuffer);
            }) as any;
            reader.readAsArrayBuffer(outBlob);
          },
          ext === 'png' ? 'image/png' : 'image/jpeg',
          ext === 'png' ? undefined : 0.8, // PNG quality is ignored; JPEG uses 0.8
        );
      }) as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      img.onerror = ((_event: any) => {
        console.warn('[EXIF] Image load failed; using original.');
        URL.revokeObjectURL(objectUrl);
        resolve(arrayBuffer);
      }) as any;

      // Trigger load from the object URL.
      img.src = objectUrl;
    } catch (e) {
      console.warn('[EXIF] Web re-encode failed:', e);
      resolve(arrayBuffer);
    }
  });
}

/**
 * Post-strip verification: check if the output bytes still contain EXIF markers.
 * This is a heuristic check (not a full EXIF parser). We look for common
 * EXIF headers: EXIF marker (0xFFE1), IPTC (0xFFED), XMP (0xFFE9), GPS (0x8825).
 *
 * Returns true if EXIF signatures are NOT found (safe to upload).
 * Returns false if EXIF markers ARE detected (stripping may have failed).
 */
export function verifyExifStripped(arrayBuffer: ArrayBuffer): boolean {
  const view = new Uint8Array(arrayBuffer);

  // Check for JPEG markers that indicate metadata: FFE1 (EXIF), FFED (IPTC), FFE9 (XMP).
  // GPS is stored inside EXIF (0x8825 tag). We don't need a full parser — just
  // check that common metadata markers are absent.
  const exifMarker = 0xffe1; // EXIF
  const iptcMarker = 0xffed; // IPTC
  const xmpMarker = 0xffe9; // XMP

  for (let i = 0; i < view.length - 1; i++) {
    const byte1 = view[i];
    const byte2 = view[i + 1];
    if (byte1 !== undefined && byte2 !== undefined) {
      const marker = (byte1 << 8) | byte2;
      if (marker === exifMarker || marker === iptcMarker || marker === xmpMarker) {
        if (__DEV__) console.debug('[EXIF] Found metadata marker 0x' + marker.toString(16));
        return false;
      }
    }
  }

  if (__DEV__) console.debug('[EXIF] Post-strip verification passed (no markers found).');
  return true;
}

/**
 * Inspect the first 12 bytes of an ArrayBuffer to identify the image format.
 * Returns the detected MIME type, or null if the bytes don't match any known
 * image magic sequence. Guards against files that pass the extension check
 * but contain non-image bytes (e.g. a file named evil.jpg with HTML content).
 *
 * Handles: JPEG (FF D8 FF), PNG (89 50 4E 47), WEBP (RIFF....WEBP),
 * HEIC/HEIF (ISO Base Media ftyp box with heic/heix/mif1/... brand).
 */
export function detectMimeFromBytes(buffer: ArrayBuffer): string | null {
  if (buffer.byteLength < 12) return null;
  const view = new Uint8Array(buffer, 0, 12);
  const b = (i: number) => view[i] ?? 0;

  // JPEG: FF D8 FF
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47
  if (b(0) === 0x89 && b(1) === 0x50 && b(2) === 0x4e && b(3) === 0x47) return 'image/png';
  // WEBP: RIFF at bytes 0-3, WEBP at bytes 8-11
  if (
    b(0) === 0x52 && b(1) === 0x49 && b(2) === 0x46 && b(3) === 0x46 &&
    b(8) === 0x57 && b(9) === 0x45 && b(10) === 0x42 && b(11) === 0x50
  )
    return 'image/webp';
  // HEIC/HEIF: ISO Base Media ftyp box — 'ftyp' at bytes 4-7, brand at bytes 8-11
  if (b(4) === 0x66 && b(5) === 0x74 && b(6) === 0x79 && b(7) === 0x70) {
    const brand = String.fromCharCode(b(8), b(9), b(10), b(11));
    const heicBrands = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1'];
    if (heicBrands.includes(brand.toLowerCase())) return 'image/heic';
  }
  return null;
}

/**
 * Upload a local image (file:// URI from expo-image-picker) to the
 * flag-photos Supabase bucket and return its public URL.
 *
 * EXIF stripping: Before upload, strips GPS, timestamps, camera info,
 * thumbnails, IPTC, and XMP metadata to protect user location privacy.
 * Uses platform-specific approaches:
 *   - iOS/Android: expo-media-library native transcode (HEIC → JPEG on iOS)
 *   - Web: Canvas re-encoding (some quality loss, acceptable)
 *   - Error handling: if stripping fails, uploads original (fail-safe)
 *
 * Validates the URI scheme, the extension, and the byte size before
 * touching Storage so a malformed pick or a runaway file fails loudly
 * here instead of silently filling the bucket with garbage.
 */
export async function uploadFlagPhoto(userId: string, localUri: string): Promise<string> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('No photo selected.');
  }
  if (!ALLOWED_PHOTO_SCHEMES.some((s) => localUri.startsWith(s))) {
    throw new Error('Unsupported photo source.');
  }
  // Pick an extension from the uri; default to jpg for schemes that
  // don't carry one (data:, blob:, some content:// uris).
  const match = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(localUri);
  const ext = (match?.[1] ?? 'jpg').toLowerCase();
  if (!ALLOWED_PHOTO_EXTS.has(ext)) {
    throw new Error('Photo must be a JPG, PNG, WEBP, or HEIC image.');
  }

  const response = await fetch(localUri);
  let arrayBuffer = await response.arrayBuffer();
  if (arrayBuffer.byteLength === 0) {
    throw new Error('Photo file is empty.');
  }
  if (arrayBuffer.byteLength > MAX_PHOTO_BYTES) {
    throw new Error('Photo is too large. Please pick one under 10 MB.');
  }

  const detectedMime = detectMimeFromBytes(arrayBuffer);
  if (!detectedMime) {
    throw new Error('File does not appear to be a valid image.');
  }

  // EXIF stripping: platform-specific approach.
  // On iOS/Android, use ImageManipulator re-encode (D8 privacy gate — fail-closed).
  // On web, use canvas re-encoding.
  if (Platform.OS === 'web') {
    arrayBuffer = await stripExifWeb(arrayBuffer, ext);
  } else {
    // D8: stripExifNative returns null on failure; abort rather than upload
    // original bytes that may contain GPS/camera metadata.
    const stripped = await stripExifNative(arrayBuffer, ext);
    if (stripped === null) {
      throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
    }
    arrayBuffer = stripped;
  }

  // Post-strip verification: check that EXIF markers are not present.
  const exifCheckPassed = verifyExifStripped(arrayBuffer);
  if (!exifCheckPassed) {
    // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
    throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
  }

  const contentType =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic' || ext === 'heif'
          ? 'image/heic'
          : 'image/jpeg';
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(FLAG_PHOTOS_BUCKET).getPublicUrl(filePath);
  return data.publicUrl;
}

export interface CreateFlagInput {
  lat: number;
  lng: number;
  category: FlagCategory;
  severity: FlagSeverity;
  description?: string | null;
  photo_url?: string | null;
  // Optional context tags — see src/lib/contextTags.ts for the vocabulary.
  // Sent to the `context_tags` column added by
  // supabase/migrations/2026-05-24_flag_context_tags.sql. Until that
  // migration is applied, the insert below detects the unknown-column
  // error and retries without this field (tags are silently dropped
  // server-side; the chip UI still works).
  context_tags?: string[];
}

/**
 * Fetch flags matching the given statuses. Capped at 500 rows so a runaway
 * table can't lock up the Map/Tasks screens. The shared FlagsProvider now
 * uses listFlagsPage() for the default open+verified set; this function is
 * kept for one-shot filtered queries (e.g. Map filter when toggling Resolved).
 *
 * PRIVACY: lat+lng+category is sensitive (location + disability context).
 * user_id is included because the Map callout and Tasks card show ownership
 * context (e.g. "your flag", edit/delete affordances). RLS on the flags
 * table ensures only authenticated users can read rows; PostgREST enforces
 * this before the data reaches the client.
 */
export async function listFlags(statuses: FlagStatus[] = ['open', 'verified']) {
  const { data, error } = await supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

export interface ListFlagsPageOptions {
  limit?: number;
  /**
   * Cursor: when set, fetch rows whose created_at is strictly less than this
   * ISO timestamp. Pair with the previous page's `nextCursor`.
   */
  before?: string;
}

export interface ListFlagsPageResult {
  rows: FlagRow[];
  /**
   * `created_at` of the last row when a full page was returned — implies more
   * may exist. `null` once the server returned fewer than `limit` rows.
   */
  nextCursor: string | null;
}

/**
 * Cursor-paginated fetch over the flags table. Used by FlagsProvider for the
 * default open+verified feed so the first page arrives fast and the user
 * loads more on demand. Cursor is the `created_at` value of the last row in
 * the previous page.
 *
 * Returns `{ rows, nextCursor }`. `nextCursor` is only set when a full page
 * was returned; once a short page comes back we know we've reached the end.
 *
 * Note on ties: two rows with identical `created_at` could be skipped at a
 * page boundary (strict `lt` cursor). Postgres `now()` is microsecond
 * resolution so collisions are very unlikely in practice.
 *
 * PRIVACY: same rationale as listFlags — lat+lng+category+user_id are all
 * required for map rendering, triage affordances, and ownership checks.
 * Explicit column list prevents future schema additions from leaking here.
 */
export async function listFlagsPage(
  statuses: FlagStatus[] = ['open', 'verified'],
  opts: ListFlagsPageOptions = {},
): Promise<ListFlagsPageResult> {
  const limit = opts.limit ?? INITIAL_PAGE_SIZE;
  let query = supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .in('status', statuses)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (opts.before) {
    query = query.lt('created_at', opts.before);
  }
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as FlagRow[];
  const nextCursor = rows.length === limit ? (rows[rows.length - 1]?.created_at ?? null) : null;
  return { rows, nextCursor };
}

/**
 * Fetch every flag a single user has submitted, newest first. Used by the
 * "My Reports" view on Profile. Capped at 200 — same reasoning as listFlags:
 * a runaway user shouldn't lock up the screen. If someone hits the cap we'll
 * add cursor pagination here too (tracked alongside listFlags in P1).
 *
 * PRIVACY: RLS on the flags table ensures this query only returns rows where
 * user_id = auth.uid() — the caller can only read their own flags. The
 * lat+lng+category combination is legitimately shown back to the owner for
 * their own report history (not exposed to other users via this path).
 */
export async function listFlagsByUser(userId: string) {
  const { data, error } = await supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

// Heuristic: did this PostgREST error come from sending a column the schema
// cache doesn't know about? PostgREST returns code 'PGRST204' for
// "column 'X' of relation 'Y' does not exist" (schema-cache miss). On older
// Supabase deployments the message-only path is the fallback. Used by
// createFlag to gracefully degrade when the context_tags migration hasn't
// been applied yet.
function isUnknownColumnError(err: unknown, columnName: string): boolean {
  if (!err || typeof err !== 'object') return false;
  const code = (err as { code?: string }).code;
  const message = (err as { message?: string }).message;
  if (code === 'PGRST204') return true;
  if (typeof message === 'string' && message.includes(columnName)) {
    // "could not find the 'context_tags' column" or "column ... does not exist".
    return /not (find|exist)/i.test(message);
  }
  return false;
}

// Capability gate for the `flags.context_tags` column. Starts 'unknown' on
// app launch. Each successful insert WITH tags flips it to 'available'.
// Each PGRST204-style failure flips it to 'unavailable' — the UI watches
// this so the chip picker can disable itself + show a "coming soon" hint
// instead of letting the user pick tags that will be silently dropped.
//
// Why module-level state and not React state: createFlag is a pure helper
// called from a screen, and we want the capability cached for the lifetime
// of the JS bundle (re-probing every submit would be wasteful). The
// `__resetContextTagsCapabilityForTests` export below lets test files
// reset between cases.
export type ContextTagsCapability = 'unknown' | 'available' | 'unavailable';
let contextTagsCapability: ContextTagsCapability = 'unknown';
const capabilityListeners = new Set<(cap: ContextTagsCapability) => void>();

export function getContextTagsCapability(): ContextTagsCapability {
  return contextTagsCapability;
}

/**
 * Subscribe to capability changes. Returns an unsubscribe function. The
 * listener fires once immediately with the current value so a freshly-
 * mounted UI doesn't have to read + subscribe separately.
 */
export function subscribeContextTagsCapability(
  listener: (cap: ContextTagsCapability) => void,
): () => void {
  capabilityListeners.add(listener);
  listener(contextTagsCapability);
  return () => {
    capabilityListeners.delete(listener);
  };
}

function setContextTagsCapability(next: ContextTagsCapability) {
  if (next === contextTagsCapability) return;
  contextTagsCapability = next;
  for (const l of capabilityListeners) l(next);
}

// Test-only: reset module state between cases. Not part of the public API.
export function __resetContextTagsCapabilityForTests() {
  contextTagsCapability = 'unknown';
  capabilityListeners.clear();
}

/**
 * Returned by createFlag so the caller can tell the user when tags they
 * picked were dropped server-side. `tagsAccepted=false` means we fell back
 * to the legacy no-tags insert because the column isn't there yet.
 */
export interface CreateFlagResult {
  row: FlagRow;
  tagsAccepted: boolean;
}

const MAX_FLAG_DESCRIPTION_LENGTH = 2000;

/**
 * Defense-in-depth validation shared by createFlag + createAnonFlag. The DB
 * CHECK constraints (severity 1-5, category whitelist) and the Report form's
 * maxLength are the primary guards; validating here too gives a clean
 * client-side error and protects any future or untyped caller.
 */
function assertValidCategoryAndSeverity(category: FlagCategory, severity: FlagSeverity): void {
  if (!Object.prototype.hasOwnProperty.call(CATEGORY_LABELS, category)) {
    throw new Error('Please choose a valid category.');
  }
  if (!Number.isInteger(severity) || severity < 1 || severity > 5) {
    throw new Error('Severity must be a whole number from 1 to 5.');
  }
}

/** Trim, collapse empty/whitespace-only to null, and cap the description length. */
function normalizeFlagDescription(description: string | null | undefined): string | null {
  if (description == null) return null;
  const trimmed = description.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length > MAX_FLAG_DESCRIPTION_LENGTH) {
    throw new Error(`Description must be ${MAX_FLAG_DESCRIPTION_LENGTH} characters or fewer.`);
  }
  return trimmed;
}

export async function createFlag(
  userId: string,
  input: CreateFlagInput,
): Promise<CreateFlagResult> {
  // Validate coordinates at the trust boundary before hitting the DB.
  // Supabase/PostgREST accepts any double precision value, so NaN, Infinity,
  // and out-of-range values would silently land in the table without this
  // check. The Map picker and location hook produce valid values in practice,
  // but a future code path or test could pass garbage.
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    throw new Error('Invalid coordinates: lat and lng must be finite numbers.');
  }
  if (input.lat < -90 || input.lat > 90) {
    throw new Error('Invalid coordinates: lat must be between -90 and 90.');
  }
  if (input.lng < -180 || input.lng > 180) {
    throw new Error('Invalid coordinates: lng must be between -180 and 180.');
  }
  assertValidCategoryAndSeverity(input.category, input.severity);

  const basePayload = {
    user_id: userId,
    lat: input.lat,
    lng: input.lng,
    category: input.category,
    severity: input.severity,
    description: normalizeFlagDescription(input.description),
    photo_url: input.photo_url ?? null,
  };
  // Try the insert WITH context_tags first. If the column isn't there yet
  // (migration 2026-05-24_flag_context_tags.sql hasn't been applied), retry
  // without it so the report still lands. Tags are silently dropped in that
  // case — the chip UI keeps working, the user just doesn't get a
  // server-side record of which contexts they picked until the migration
  // runs. Once the column exists, this single round-trip succeeds.
  const tagsToSend = input.context_tags;
  // Only attempt the tagged insert when (a) the caller actually has tags
  // AND (b) we haven't already learned the column is missing on this
  // backend. This avoids the wasted round-trip + the silent drop.
  const shouldTryTagged = tagsToSend !== undefined && contextTagsCapability !== 'unavailable';
  if (shouldTryTagged) {
    // The Database type in src/types/database.ts doesn't list context_tags
    // yet (we're keeping the migration propose-only), so cast the payload
    // to escape the typed Insert shape. Once the migration lands and the
    // type is updated, this cast can come off.
    const withTags = { ...basePayload, context_tags: tagsToSend } as Record<string, unknown>;
    const { data, error } = await supabase
      .from('flags')
      .insert(withTags as never)
      .select()
      .single();
    if (!error) {
      setContextTagsCapability('available');
      return { row: data as FlagRow, tagsAccepted: true };
    }
    if (!isUnknownColumnError(error, 'context_tags')) throw error;
    // Mark capability unavailable so future submits skip the doomed
    // tagged path AND so the UI can disable the picker.
    setContextTagsCapability('unavailable');
    // Fall through to the legacy-shape insert below.
  }
  const { data, error } = await supabase.from('flags').insert(basePayload).select().single();
  if (error) throw error;
  // tagsAccepted is true only when the user didn't try to send any in the
  // first place. If they tried and we fell back, surface that to the caller.
  const tagsAccepted = tagsToSend === undefined || tagsToSend.length === 0;
  return { row: data as FlagRow, tagsAccepted };
}

// ---------------------------------------------------------------------------
// Anonymous flag helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when a flag was submitted without an account.
 * Use this wherever the UI needs to branch on anon vs. attributed.
 */
export function isAnon(flag: { user_id: string | null }): boolean {
  return flag.user_id === null;
}

// ---------------------------------------------------------------------------
// Anonymous flag submission (no auth required)
// ---------------------------------------------------------------------------

export interface CreateAnonFlagInput {
  lat: number;
  lng: number;
  category: FlagCategory;
  severity: FlagSeverity;
  description?: string | null;
  // Photos are not supported for anon submissions — Storage RLS requires
  // auth.uid() in the upload path. See docs/ANON_REPORTING_SPEC.md §6.
  // Context tags are also disabled: the capability probe requires an auth
  // session and silently dropping tags would confuse anon users.
}


export type FlagContentPatch = {
  description?: string | null;
  category?: FlagCategory;
  severity?: FlagSeverity;
};

export async function updateFlagContent(flagId: string, patch: FlagContentPatch) {
  const { data, error } = await supabase
    .from('flags')
    .update(patch)
    .eq('id', flagId)
    .select()
    .single();
  if (error) throw error;
  return data as FlagRow;
}

export async function updateFlagStatus(flagId: string, status: FlagStatus) {
  const { data, error } = await supabase
    .from('flags')
    .update({ status })
    .eq('id', flagId)
    .select()
    .single();
  if (error) throw error;

  // Analytics chokepoint: every status change flows through here, so this is
  // the one place to instrument it. We log only the destination status +
  // platform — never the flag_id or user_id. See src/lib/analytics.ts.
  trackEvent('flag_status_updated', { to_status: status, platform: Platform.OS });

  return data as FlagRow;
}

// RLS allows delete only when user_id = auth.uid(), so the caller does not
// need to re-check ownership — Supabase will reject any other user's row.
export async function deleteFlag(flagId: string) {
  const { error } = await supabase.from('flags').delete().eq('id', flagId);
  if (error) throw error;
}

/**
 * Fetch a single flag by id. Used when arriving via a deep link
 * (`accessmap://flag/{id}`) where the URL only carries the id — we need
 * the lat/lng to animate the map and pop the callout.
 *
 * Returns null on not-found instead of throwing, so a stale share link
 * doesn't surface an alarming error to the user — the Map just opens
 * normally without focusing on anything.
 *
 * PRIVACY: Explicit column list rather than select('*') so future schema
 * columns (e.g. internal moderation fields) don't leak to clients
 * automatically. lat+lng are needed to animate the map; user_id for
 * ownership checks in the detail modal.
 */
export async function fetchFlagById(flagId: string): Promise<FlagRow | null> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .eq('id', flagId)
    .maybeSingle();
  if (error) throw error;
  return (data as FlagRow | null) ?? null;
}

/**
 * Fetch many flags by ids in a single round-trip. Used by the Watched
 * Flags view to re-read each watched flag's current state (status may
 * have changed since the user last saw it).
 *
 * Returns [] for empty input (skips the round-trip). Missing ids
 * (e.g. a flag the user watched then someone deleted) are silently
 * dropped — the caller decides whether to prune them from the
 * watched list.
 *
 * PRIVACY: Explicit column list rather than select('*') prevents future
 * schema columns from leaking automatically. The caller (Watched Flags)
 * needs status, lat/lng, category, and severity for the detail modal and
 * map navigation; user_id for ownership affordances.
 */
export async function fetchFlagsByIds(flagIds: string[]): Promise<FlagRow[]> {
  if (flagIds.length === 0) return [];
  const { data, error } = await supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .in('id', flagIds);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

/**
 * Fetch the most recent flags across ALL statuses, newest first. Powers the
 * Activity Feed, which wants a chronological "what's been happening
 * community-wide" view (not filtered down to triage like listFlags).
 *
 * Limit defaults to 100 — enough for ~a week of activity at typical density,
 * small enough to render without virtualization headaches. Bump if needed
 * once usage tells us more.
 *
 * PRIVACY (HIGHEST SENSITIVITY): This query combines lat+lng+category+user_id
 * across ALL statuses, including resolved and rejected flags — the most
 * privacy-sensitive query in this file. Each row links a specific user to a
 * precise disability-barrier location they personally reported.
 *
 * Safeguards already in place:
 *   - RLS on `flags` requires auth.uid() to be non-null (authenticated read).
 *   - The Activity Feed renderer MUST NOT display raw user_id; it should show
 *     only display_name (resolved separately) or no identity at all.
 *   - This query does NOT filter out rejected flags — the Activity Feed is
 *     community-wide. If the feed later adds "rejected" suppression for
 *     reporter privacy, add `.not('status', 'eq', 'rejected')` here.
 *
 * Do not add email or other PII to this select without a fresh privacy review.
 */
export async function listRecentFlags(limit = 100): Promise<FlagRow[]> {
  const { data, error } = await supabase
    .from('flags')
    .select('id, user_id, lat, lng, category, description, severity, photo_url, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FlagRow[];
}

export const CATEGORY_LABELS: Record<FlagCategory, string> = {
  no_ramp: 'No ramp',
  broken_sidewalk: 'Broken sidewalk',
  blocked_path: 'Blocked path',
  missing_signal: 'Missing signal',
  steep_grade: 'Steep grade',
  other: 'Other',
};

export const CATEGORY_ORDER: FlagCategory[] = [
  'no_ramp',
  'broken_sidewalk',
  'blocked_path',
  'missing_signal',
  'steep_grade',
  'other',
];

// Plain-language descriptions for the in-app legend. Kept short enough to
// render in a single bottom-sheet row without truncation at large dynamic type.
export const CATEGORY_DESCRIPTIONS: Record<FlagCategory, string> = {
  no_ramp: 'A curb, step, or entrance with no ramp or accessible alternative.',
  broken_sidewalk: 'Cracked, heaved, or uneven pavement that blocks wheels.',
  blocked_path: 'A path obstructed by debris, vehicles, scaffolding, or other obstacles.',
  missing_signal: 'A crossing missing audible or visual pedestrian signals.',
  steep_grade: 'A slope too steep to roll up safely.',
  other: 'Anything else that blocks or limits accessibility.',
};

// A small glyph for each category. Used as a visual aid alongside the label;
// labels still carry the meaning (screen readers skip these decorative chars).
export const CATEGORY_ICONS: Record<FlagCategory, string> = {
  no_ramp: '↥',
  broken_sidewalk: '▦',
  blocked_path: '⛔',
  missing_signal: '🚦',
  steep_grade: '⛰',
  other: '•',
};

export const SEVERITY_ORDER: FlagSeverity[] = [1, 2, 3, 4, 5];

// Marker / severity-bar hex tints. Used everywhere a severity needs to show
// up visually: the map pin, the Tasks card dot, the LegendModal swatch, etc.
// Kept here (not in a screen file) so it's the single source of truth — every
// surface tints from the same palette. Pair with SEVERITY_COLOR_NAMES below
// so screen readers can name the color out loud.
//
// The `default` branch is defensive: if a future row carries an unexpected
// severity (dirty data, schema widening), return a neutral gray instead of
// `undefined` so the marker/severity bar still renders something.
export function severityColor(s: FlagSeverity): string {
  // Single source of truth: the design-system severity ramp in theme.ts
  // (Claude Design yellow→red). Reading the token here keeps the map pins,
  // Tasks dots, and LegendModal swatches in lockstep with SeverityBadge.
  return severityRamp[s]?.color ?? themeColor.textSubtle;
}

// Short human label and color name for each severity. The color name is read
// aloud so meaning isn't carried by color alone.
export const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  1: 'Minor',
  2: 'Mild',
  3: 'Moderate',
  4: 'Significant',
  5: 'Severe',
};

export const SEVERITY_COLOR_NAMES: Record<FlagSeverity, string> = {
  1: 'yellow',
  2: 'amber',
  3: 'orange',
  4: 'deep orange',
  5: 'red',
};

export const SEVERITY_DESCRIPTIONS: Record<FlagSeverity, string> = {
  1: 'Inconvenient but usable.',
  2: 'Doable with effort or help.',
  3: 'Hard for many users.',
  4: 'Hard or unsafe for most users.',
  5: 'Impassable. Needs a detour.',
};

export const STATUS_LABELS: Record<FlagStatus, string> = {
  open: 'Open',
  verified: 'Verified',
  resolved: 'Resolved',
  rejected: 'Rejected',
};

// Tinted-background + darker-foreground palette for the status badges.
// Updated to design system 2026-05-31. Mirrors color.statusOpen/Verified/Resolved/RejectedBg/Fg
// in src/theme.ts. Each pair clears WCAG AA 4.5:1 between `fg` and `bg`.
// Keep these in sync with ThemeContext.tsx dark-mode equivalents.
export const STATUS_COLORS: Record<FlagStatus, { bg: string; fg: string }> = {
  open:     { bg: '#E7F0FD', fg: '#1A5FB4' },
  verified: { bg: '#DCF6EC', fg: '#067A56' },
  resolved: { bg: '#D6F1E6', fg: '#047054' },
  rejected: { bg: '#EEF0F3', fg: '#4B5563' },
};

// Order shown in the Map filter and elsewhere — chronological lifecycle.
export const STATUS_ORDER: FlagStatus[] = ['open', 'verified', 'resolved', 'rejected'];

// What listFlags() falls back to when no statuses are passed — also the
// default set the Map's status filter starts with, so a default-state
// filter row matches the historical fetch behavior.
export const DEFAULT_STATUSES: FlagStatus[] = ['open', 'verified'];

/**
 * One entry from the flag_status_history table. Each row records a single
 * status transition for a flag (who changed it, from what, to what, when).
 *
 * Used by the "Status history" timeline in FlagDetailModal and any future
 * surfaces (activity feed, notifications).
 *
 * `old_status === null` means this is the initial "reported" entry —
 * the flag entered 'open' for the first time with no prior status.
 */
export interface FlagStatusHistoryEntry {
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_at: string;
}

/**
 * Fetch the status history for a single flag, oldest entry first.
 *
 * Reads from the `flag_status_history` table added by migration
 * `supabase/migrations/2026-05-24_status_history_table.sql`. That
 * migration is propose-only (Sky applies it); until then this function
 * returns `[]` and the caller renders nothing — graceful degradation.
 *
 * If the query errors for any reason (table missing, RLS rejection, network)
 * the error is swallowed and an empty array is returned. The caller MUST
 * treat an empty result as "no history available yet" rather than an error.
 */
export async function listFlagStatusHistory(flagId: string): Promise<FlagStatusHistoryEntry[]> {
  try {
    const { data, error } = await supabase
      .from('flag_status_history')
      .select('old_status, new_status, changed_by, changed_at')
      .eq('flag_id', flagId)
      .order('changed_at', { ascending: true });
    if (error) return []; // Graceful degradation — table may not exist yet
    return (data ?? []) as FlagStatusHistoryEntry[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Community leaderboard
// ---------------------------------------------------------------------------

export interface LeaderboardEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

// SECURITY / PRIVACY (W6-1): do NOT add a `verified_count` (or any
// verifier-activity metric) back to the leaderboard. Surfacing how many flags a
// user has verified/resolved publicly identifies who is acting as a verifier,
// which lets bad actors single out and target moderators. The leaderboard
// intentionally exposes only display_name + points. If you need verify stats,
// keep them private to the user's own profile — never in a public ranking.

/**
 * Returns the top `limit` users by points, highest first.
 */
export async function listLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, display_name, avatar_url, points')
    .order('points', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as LeaderboardEntry[];
}

/**
 * Returns the current user's rank (1-indexed) and points.
 * Used when the user isn't in the top-20 — the rank is computed by counting
 * users with strictly more points.
 *
 * Note: deliberately does NOT return a verified flag count — see the
 * SECURITY / PRIVACY note on LeaderboardEntry above (W6-1).
 */
export async function getUserLeaderboardRank(
  userId: string,
): Promise<{ rank: number; points: number }> {
  const { data: me, error: me_err } = await supabase
    .from('users')
    .select('points')
    .eq('id', userId)
    .single();
  if (me_err) throw me_err;
  const userPoints = (me as { points: number }).points;

  const { count: above, error: rank_err } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .gt('points', userPoints);
  if (rank_err) throw rank_err;

  return { rank: (above ?? 0) + 1, points: userPoints };
}

// ---------------------------------------------------------------------------
// Anonymous flag creation
// ---------------------------------------------------------------------------

export interface AnonFlagInput {
  lat: number;
  lng: number;
  category: FlagCategory;
  severity: FlagSeverity;
  description?: string;
}

/**
 * Submit a flag without a signed-in user.
 *
 * Privacy contract (enforced here AND by DB RLS WITH CHECK):
 *   - user_id is never sent — the DB stores NULL.
 *   - photo_url is always null — Storage RLS requires auth.uid() in the path.
 *
 * Rate-limit enforcement is the CALLER's responsibility: call
 * checkAnonRateLimit() before this function; this function does not call it
 * internally so that callers (UI, tests) can control timing independently.
 */
export async function createAnonFlag(input: AnonFlagInput): Promise<FlagRow> {
  const { lat, lng, category, severity, description } = input;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    throw new Error('lat and lng must be finite numbers');
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`lat ${lat} is out of range [-90, 90]`);
  }
  if (lng < -180 || lng > 180) {
    throw new Error(`lng ${lng} is out of range [-180, 180]`);
  }
  assertValidCategoryAndSeverity(category, severity);

  const payload = {
    lat,
    lng,
    category,
    severity,
    description: normalizeFlagDescription(description),
    photo_url: null,
    status: 'open' as const,
  };

  const { data, error } = await supabase
    .from('flags')
    .insert(payload)
    .select()
    .single();

  if (error) throw error;
  return data as FlagRow;
}
