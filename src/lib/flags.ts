import { supabase } from './supabase';
import { color as themeColor, severity as severityRamp } from '@/theme';
import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { trackEvent } from './analytics';
import { containsBlockedTerm } from '@/moderation/blockedTerms';
import { CONTENT_BLOCKED_MESSAGE } from './copy';
import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
import { STORAGE_PUBLIC_PREFIX } from '@/lib/remoteImageUrl';

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
 * B8 (L7-05): longest-edge cap applied to photos at ingest. Barrier-evidence
 * photos are shown at most full-screen (`resizeMode="contain"` in PhotoGallery /
 * PhotoLightboxModal — never larger than one device screen), so 2048px on the
 * long edge stays crisp on the largest phones while cutting a 12 MP (~4000px)
 * camera original to roughly a quarter of the pixels. Sky-chosen 2026-07-07.
 */
export const PHOTO_MAX_DIMENSION = 2048;

/**
 * Build the ImageManipulator `actions` array for the strip+resize pass.
 *
 * Downscale-only (never upscales a smaller pick) and single-axis (the codec
 * preserves aspect ratio), capping the LONGER edge at PHOTO_MAX_DIMENSION.
 * Returns `[]` when the source already fits, or when its dimensions are unknown
 * (e.g. a bytes-only unit-test call) — so the re-encode still strips EXIF but
 * changes no pixels.
 *
 * The returned action MUST ride in the SAME manipulateAsync pass as the strip
 * (see stripExifNative) so the emitted asset is BOTH resized and metadata-free —
 * never an earlier resize pass, never a path that copies the original.
 */
export function resizeActionFor(
  srcWidth?: number,
  srcHeight?: number,
): { resize: { width: number } | { height: number } }[] {
  if (
    typeof srcWidth !== 'number' ||
    typeof srcHeight !== 'number' ||
    !Number.isFinite(srcWidth) ||
    !Number.isFinite(srcHeight) ||
    srcWidth <= 0 ||
    srcHeight <= 0
  ) {
    return [];
  }
  if (Math.max(srcWidth, srcHeight) <= PHOTO_MAX_DIMENSION) return [];
  // Constrain the longer edge; the shorter one scales with it.
  return srcWidth >= srcHeight
    ? [{ resize: { width: PHOTO_MAX_DIMENSION } }]
    : [{ resize: { height: PHOTO_MAX_DIMENSION } }];
}

/**
 * Web analog of resizeActionFor: the target canvas dimensions for stripExifWeb's
 * re-encode, downscaled so the longer edge is at most PHOTO_MAX_DIMENSION.
 * Downscale-only (scale is clamped to 1) and aspect-preserving. Extracted as a
 * pure function so the web resize math is unit-tested without a canvas mock.
 */
export function scaledCanvasDims(
  srcWidth: number,
  srcHeight: number,
): { width: number; height: number } {
  const longest = Math.max(srcWidth, srcHeight) || 1;
  const scale = Math.min(1, PHOTO_MAX_DIMENSION / longest);
  return {
    width: Math.round(srcWidth * scale),
    height: Math.round(srcHeight * scale),
  };
}

/**
 * Strip EXIF metadata (GPS, timestamps, camera info, thumbnails, IPTC, XMP)
 * from an image on iOS/Android using expo-image-manipulator re-encode.
 *
 * ImageManipulator.manipulateAsync re-encodes the image via the platform
 * codec, discarding all SOURCE metadata. NOTE: the encoder may still write its
 * own benign APP1 (orientation/XMP) into the fresh file — Apple's
 * UIImage.jpegData always does — so the output is NOT guaranteed marker-free;
 * uploadStrippedImage splices those out via sanitizeImageMetadata before the
 * verifyExifStripped gate. The returned {uri} is a fresh file:// URI that we
 * fetch back as bytes.
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
  srcUri?: string,
  srcWidth?: number,
  srcHeight?: number,
): Promise<ArrayBuffer | null> {
  try {
    // Fail-closed empty-input guard: an empty buffer can't be a real image, so
    // there is nothing to strip — abort rather than hand undecodable bytes to
    // the codec (kept from the original contract).
    if (arrayBuffer.byteLength === 0) {
      console.warn('[EXIF] Empty input buffer; stripping failed.');
      return null;
    }

    // P3 perf: feed the source file URI straight into ImageManipulator instead
    // of materializing a per-byte ~10 MB JS string + base64 `data:` URI (the
    // old `Array.from(bytes).map(String.fromCharCode).join('')` + btoa was
    // O(n) allocations that briefly tripled peak memory for a large photo).
    // ImageManipulator reads file://, content://, ph://, etc. directly. We fall
    // back to a `data:` URI only when no source URI is available (e.g. a
    // direct unit-test call with bytes but no URI) so the fail-closed contract
    // and the test surface are preserved.
    let input: string;
    if (srcUri) {
      input = srcUri;
    } else {
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
      input = `data:${mimeType};base64,${base64}`;
    }

    // Re-encode (forces the platform codec to write a fresh image — SOURCE
    // EXIF/GPS/IPTC/XMP are not carried through, though the encoder may add
    // its own benign APP1; the sanitizer in uploadStrippedImage removes it)
    // AND, in the SAME pass, apply a
    // downscale-only longest-edge cap (B8/L7-05). Coupling resize to the strip
    // guarantees the emitted asset is BOTH resized and metadata-free — there is
    // no path that emits an un-stripped or un-resized file. `resizeActionFor`
    // returns [] when dims are unknown or already within the cap, so re-encode
    // semantics (compress/format untouched) are preserved for those inputs.
    // SaveFormat.JPEG is used for JPEG/HEIC/HEIF; PNG stays PNG.
    const saveFormat =
      ext === 'png'
        ? ImageManipulator.SaveFormat.PNG
        : ImageManipulator.SaveFormat.JPEG;
    const result = await ImageManipulator.manipulateAsync(
      input,
      resizeActionFor(srcWidth, srcHeight),
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
 * D8 privacy gate — FAIL-CLOSED: returns null on ANY failure (no browser
 * environment, no canvas context, image decode failure such as a HEIC the
 * browser can't render, toBlob/FileReader failure). Callers MUST treat null
 * as "could not strip" and abort the upload rather than send the original
 * bytes, which may still carry GPS/EXIF — previously these paths returned the
 * unstripped original, and verifyExifStripped (a JPEG-marker scan) could not
 * detect EXIF in a WEBP/HEIC container, so GPS bytes passed the gate.
 * Mirrors stripExifNative's fail-closed contract.
 */
export function stripExifWeb(arrayBuffer: ArrayBuffer, ext: string): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    // Hoisted so every exit path can revoke it — no leaked blob URLs even when
    // we bail before img load (canvas-context-unavailable path) or throw.
    let objectUrl: string | null = null;
    const revoke = () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
        objectUrl = null;
      }
    };
    try {
      // Avoid calling web-only APIs if not in a browser environment.
      if (typeof document === 'undefined') {
        // D8 fail-CLOSED: never resolve the original (unstripped) bytes.
        console.warn('[EXIF] Not in web environment; cannot strip — failing closed.');
        return resolve(null);
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
      objectUrl = URL.createObjectURL(blob);

      // Create a canvas and draw the image onto it. This strips metadata.
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.warn('[EXIF] Canvas context unavailable; failing closed.');
        revoke();
        return resolve(null);
      }

      const img = new Image();
       
      img.onload = (() => {
        // B8 (L7-05): downscale-only longest-edge cap in the SAME canvas pass
        // that strips metadata — the web analog of stripExifNative's resize
        // action. `img.width/height` are the true decoded dimensions, so the
        // scale is exact (guest web uploads carry no picker-reported dims).
        // Never upscales: scaledCanvasDims clamps the scale to 1.
        const dims = scaledCanvasDims(img.width, img.height);
        canvas.width = dims.width;
        canvas.height = dims.height;

        // Draw the image scaled to the canvas (bakes orientation into pixels
        // and applies the downscale in one draw).
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        revoke();

        // Export the canvas back to bytes. Use 0.8 quality to balance size/fidelity.
        // For PNG, quality is ignored and lossless compression is used.
        canvas.toBlob(
          (outBlob: Blob | null) => {
            if (!outBlob) {
              console.warn('[EXIF] Canvas toBlob failed; failing closed.');
              return resolve(null);
            }

            // Convert the blob back to arrayBuffer.
            const reader = new FileReader();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            reader.onload = ((_event: any) => {
              const result = reader.result;
              if (!(result instanceof ArrayBuffer)) {
                console.warn('[EXIF] Canvas result not ArrayBuffer; failing closed.');
                return resolve(null);
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
              console.warn('[EXIF] FileReader error; failing closed.');
              resolve(null);
            }) as any;
            reader.readAsArrayBuffer(outBlob);
          },
          ext === 'png' ? 'image/png' : 'image/jpeg',
          ext === 'png' ? undefined : 0.8, // PNG quality is ignored; JPEG uses 0.8
        );
      }) as any;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      img.onerror = ((_event: any) => {
        console.warn('[EXIF] Image load failed; failing closed.');
        revoke();
        resolve(null);
      }) as any;

      // Trigger load from the object URL.
      img.src = objectUrl;
    } catch (e) {
      console.warn('[EXIF] Web re-encode failed; failing closed:', e);
      revoke();
      resolve(null);
    }
  });
}

/**
 * Post-strip verification, format-aware (F29 re-sweep fix).
 *
 * The old implementation scanned the ENTIRE buffer for raw byte pairs
 * 0xFFE1/0xFFED/0xFFE9. Those pairs are only meaningful as JPEG segment
 * markers; inside PNG's DEFLATE-compressed IDAT data (or JPEG's own
 * entropy-coded scan data) they occur by chance roughly once per ~64 KB —
 * so virtually every photo-sized PNG (e.g. a screenshot) was rejected with
 * a false "privacy check failed" error, while the scan had no real power
 * to detect PNG metadata anyway.
 *
 * Post-strip bytes are always JPEG or PNG (stripExifNative re-encodes via
 * ImageManipulator as JPEG/PNG; stripExifWeb's canvas emits JPEG or PNG),
 * so this verifier checks each format STRUCTURALLY:
 *   - JPEG: walk the marker segments before SOS; an APP1/APP13/APP9
 *     (EXIF/IPTC/XMP) segment fails verification. Bytes inside the
 *     entropy-coded scan no longer false-positive.
 *   - PNG: walk the chunk list; an `eXIf` chunk (where PNG actually stores
 *     EXIF/GPS) fails verification — a check the old scan could not do.
 *   - Anything else (or a malformed structure): fail CLOSED — output that
 *     isn't well-formed JPEG/PNG means stripping didn't do what we expect.
 *
 * Returns true if no metadata containers are found (safe to upload).
 * Returns false if metadata is detected or the bytes can't be verified.
 *
 * In the upload pipeline this runs AFTER sanitizeImageMetadata, which splices
 * codec-emitted APP1/APP13/APP9 (JPEG) and eXIf (PNG) out of the post-strip
 * bytes — so this verifier is the unchanged fail-closed backstop, and a
 * `false` after sanitizing indicates a sanitizer bug.
 */
export function verifyExifStripped(arrayBuffer: ArrayBuffer): boolean {
  const view = new Uint8Array(arrayBuffer);

  // JPEG: FF D8
  if (view.length >= 4 && view[0] === 0xff && view[1] === 0xd8) {
    const clean = !jpegHasMetadataSegment(view);
    if (__DEV__ && !clean) console.debug('[EXIF] JPEG metadata segment found post-strip.');
    return clean;
  }

  // PNG: 89 50 4E 47
  if (
    view.length >= 16 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47
  ) {
    const clean = !pngHasExifChunk(view);
    if (__DEV__ && !clean) console.debug('[EXIF] PNG eXIf chunk found post-strip.');
    return clean;
  }

  // Unknown/truncated format: the strip step should only ever emit JPEG or
  // PNG, so anything else is unverifiable — fail closed.
  return false;
}

/**
 * Walk JPEG marker segments from SOI to SOS and report whether a metadata
 * segment (APP1 EXIF/XMP = FFE1, APP9 = FFE9, APP13 IPTC = FFED) is present.
 * Returns true on malformed structure too (caller treats that as unverifiable).
 */
function jpegHasMetadataSegment(view: Uint8Array): boolean {
  let i = 2; // skip SOI (FF D8)
  while (i + 1 < view.length) {
    if (view[i] !== 0xff) return true; // lost segment sync — can't verify
    let markerAt = i + 1;
    // Skip fill bytes (a marker may be preceded by any number of 0xFF).
    while (view[markerAt] === 0xff && markerAt + 1 < view.length) markerAt++;
    const marker = view[markerAt];
    if (marker === undefined) return true;
    // Standalone markers without a length field: TEM (01), RSTn (D0–D7).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i = markerAt + 1;
      continue;
    }
    // SOS (DA): entropy-coded data follows — no more metadata segments can
    // appear before EOI. EOI (D9): done.
    if (marker === 0xda || marker === 0xd9) return false;
    // All remaining markers carry a 2-byte big-endian length (incl. itself).
    if (markerAt + 3 >= view.length) return true; // truncated header
    const len = (((view[markerAt + 1] ?? 0) << 8) | (view[markerAt + 2] ?? 0)) >>> 0;
    if (len < 2 || markerAt + 1 + len > view.length) return true; // malformed
    if (marker === 0xe1 || marker === 0xed || marker === 0xe9) return true; // metadata segment
    i = markerAt + 1 + len;
  }
  // Ran off the end without reaching SOS/EOI — malformed, can't verify.
  return true;
}

/**
 * Walk PNG chunks and report whether an `eXIf` chunk is present.
 * Returns true on malformed structure too (caller treats that as unverifiable).
 */
function pngHasExifChunk(view: Uint8Array): boolean {
  let i = 8; // skip the 8-byte PNG signature
  while (i + 8 <= view.length) {
    const length =
      (((view[i] ?? 0) << 24) |
        ((view[i + 1] ?? 0) << 16) |
        ((view[i + 2] ?? 0) << 8) |
        (view[i + 3] ?? 0)) >>>
      0;
    const t0 = view[i + 4];
    const t1 = view[i + 5];
    const t2 = view[i + 6];
    const t3 = view[i + 7];
    // 'eXIf' — the chunk PNG uses to embed EXIF (incl. GPS).
    if (t0 === 0x65 && t1 === 0x58 && t2 === 0x49 && t3 === 0x66) return true;
    // 'IEND' — end of stream, no eXIf seen.
    if (t0 === 0x49 && t1 === 0x45 && t2 === 0x4e && t3 === 0x44) return false;
    const next = i + 8 + length + 4; // header + data + CRC
    if (next <= i || next > view.length) return true; // malformed/truncated
    i = next;
  }
  // Ran off the end without IEND — malformed, can't verify.
  return true;
}

/**
 * Splice metadata containers OUT of post-strip image bytes, byte-for-byte.
 *
 * Why this exists: stripExifNative's re-encode discards all SOURCE metadata,
 * but the platform encoder writes its own benign APP1 (orientation/XMP) into
 * the fresh JPEG — Apple's UIImage.jpegData always does, and expo-image-
 * manipulator exposes no option to suppress it. verifyExifStripped (correctly)
 * fails ANY APP1, so without this sanitizer every native photo submit failed
 * on iOS. Rather than trusting any codec's output, we remove the metadata
 * containers ourselves, which also makes the privacy guarantee codec-
 * independent.
 *
 * What it removes — exactly the set verifyExifStripped checks:
 *   - JPEG: APP1 (FFE1, EXIF/XMP), APP9 (FFE9), APP13 (FFED, IPTC) segments
 *     before SOS. Everything from the first SOS onward is copied verbatim.
 *     APP0 (JFIF), APP2 (ICC color profile) and APP14 (Adobe transform flag)
 *     are deliberately PRESERVED — dropping them would shift colors on
 *     Display-P3 iPhone photos.
 *   - PNG: eXIf chunks. All other chunks are copied verbatim.
 *
 * POST-STRIP BYTES ONLY. This is safe against rotation only because the
 * re-encode has already baked orientation into the pixels (iOS: forced
 * ImageFixOrientationTransformer; Android: Glide decode; web: canvas
 * drawImage), so the codec's APP1 carries Orientation=1 and dropping it is
 * display-neutral. Never run this on original picker bytes as a substitute
 * for the re-encode — a non-1 Orientation tag there corrects un-rotated
 * pixels, and the re-encode is also what kills GPS in containers we don't
 * parse (HEIC/WEBP).
 *
 * Fail-closed contract (D8): returns null when the bytes are not well-formed
 * JPEG/PNG (lost marker sync, truncated/invalid lengths, missing SOS/IEND,
 * unknown magic bytes) — callers must abort the upload. When nothing needed
 * removing, returns the ORIGINAL buffer unchanged (zero-copy fast path), so
 * already-clean output uploads byte-identical.
 */
export function sanitizeImageMetadata(
  arrayBuffer: ArrayBuffer,
): { buffer: ArrayBuffer; removedSegments: number } | null {
  const view = new Uint8Array(arrayBuffer);

  // JPEG: FF D8 (same signature check as verifyExifStripped).
  if (view.length >= 4 && view[0] === 0xff && view[1] === 0xd8) {
    const kept = jpegKeepRanges(view);
    if (kept === null) return null;
    if (kept.removed === 0) return { buffer: arrayBuffer, removedSegments: 0 };
    return { buffer: assembleRanges(view, kept.ranges), removedSegments: kept.removed };
  }

  // PNG: 89 50 4E 47 (same signature check as verifyExifStripped).
  if (
    view.length >= 16 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47
  ) {
    const kept = pngKeepRanges(view);
    if (kept === null) return null;
    if (kept.removed === 0) return { buffer: arrayBuffer, removedSegments: 0 };
    return { buffer: assembleRanges(view, kept.ranges), removedSegments: kept.removed };
  }

  // Unknown format: the strip step only ever emits JPEG or PNG — fail closed.
  return null;
}

/**
 * Walk JPEG marker segments SOI→SOS and collect the byte ranges to KEEP,
 * dropping APP1/APP9/APP13. Copy-through construction: kept segments are
 * emitted in order and everything from the first SOS (or EOI) onward is kept
 * verbatim, so entropy-coded scan data — where 0xFFE1 pairs occur by chance —
 * is never touched. Mirrors jpegHasMetadataSegment's walk semantics exactly
 * (fill-byte skip, standalone TEM/RSTn, 2-byte big-endian length incl.
 * itself); every condition the verifier treats as malformed returns null here.
 */
function jpegKeepRanges(
  view: Uint8Array,
): { ranges: [number, number][]; removed: number } | null {
  const ranges: [number, number][] = [[0, 2]]; // SOI (FF D8)
  let removed = 0;
  let i = 2;
  while (i + 1 < view.length) {
    if (view[i] !== 0xff) return null; // lost segment sync — can't sanitize
    let markerAt = i + 1;
    // Skip fill bytes (a marker may be preceded by any number of 0xFF).
    while (view[markerAt] === 0xff && markerAt + 1 < view.length) markerAt++;
    const marker = view[markerAt];
    if (marker === undefined) return null;
    // Standalone markers without a length field: TEM (01), RSTn (D0–D7).
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      ranges.push([i, markerAt + 1]);
      i = markerAt + 1;
      continue;
    }
    // SOS (DA): entropy-coded data follows — keep the remainder verbatim
    // (covers progressive multi-scan JPEGs and restart markers). EOI (D9):
    // keep any trailer verbatim too. Either way, done.
    if (marker === 0xda || marker === 0xd9) {
      ranges.push([i, view.length]);
      return { ranges, removed };
    }
    // All remaining markers carry a 2-byte big-endian length (incl. itself).
    if (markerAt + 3 >= view.length) return null; // truncated header
    const len = (((view[markerAt + 1] ?? 0) << 8) | (view[markerAt + 2] ?? 0)) >>> 0;
    if (len < 2 || markerAt + 1 + len > view.length) return null; // malformed
    const end = markerAt + 1 + len;
    if (marker === 0xe1 || marker === 0xed || marker === 0xe9) {
      removed++; // drop APP1/APP13/APP9 (leading fill bytes go with it — legal)
    } else {
      ranges.push([i, end]); // keep, incl. preceding fill bytes, verbatim
    }
    i = end;
  }
  // Ran off the end without reaching SOS/EOI — malformed, can't sanitize.
  return null;
}

/**
 * Walk PNG chunks and collect the byte ranges to KEEP, dropping eXIf chunks
 * (4-byte length + type + data + CRC — CRCs are per-chunk, so no recompute is
 * needed). IEND and anything after it are kept verbatim. Mirrors
 * pngHasExifChunk's walk; malformed structure returns null.
 */
function pngKeepRanges(
  view: Uint8Array,
): { ranges: [number, number][]; removed: number } | null {
  const ranges: [number, number][] = [[0, 8]]; // PNG signature
  let removed = 0;
  let i = 8;
  while (i + 8 <= view.length) {
    const length =
      (((view[i] ?? 0) << 24) |
        ((view[i + 1] ?? 0) << 16) |
        ((view[i + 2] ?? 0) << 8) |
        (view[i + 3] ?? 0)) >>>
      0;
    const t0 = view[i + 4];
    const t1 = view[i + 5];
    const t2 = view[i + 6];
    const t3 = view[i + 7];
    // 'IEND' — keep it (and any trailing bytes) verbatim; done.
    if (t0 === 0x49 && t1 === 0x45 && t2 === 0x4e && t3 === 0x44) {
      ranges.push([i, view.length]);
      return { ranges, removed };
    }
    const next = i + 8 + length + 4; // header + data + CRC
    if (next <= i || next > view.length) return null; // malformed/truncated
    // 'eXIf' — the chunk PNG uses to embed EXIF (incl. GPS): drop it.
    if (t0 === 0x65 && t1 === 0x58 && t2 === 0x49 && t3 === 0x66) {
      removed++;
    } else {
      ranges.push([i, next]);
    }
    i = next;
  }
  // Ran off the end without IEND — malformed, can't sanitize.
  return null;
}

/**
 * Assemble kept byte ranges into a fresh ArrayBuffer (single allocation).
 */
function assembleRanges(view: Uint8Array, ranges: [number, number][]): ArrayBuffer {
  let total = 0;
  for (const [start, end] of ranges) total += end - start;
  const out = new ArrayBuffer(total);
  const outView = new Uint8Array(out);
  let offset = 0;
  for (const [start, end] of ranges) {
    outView.set(view.subarray(start, end), offset);
    offset += end - start;
  }
  return out;
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
 * flag-photos Supabase bucket and return its public URL plus the storage
 * path it was uploaded to. Callers keep the `path` so a failed submit can
 * clean up the now-orphaned object via removeUploadedFlagPhotos — tracking
 * the path directly avoids fragile URL parsing later.
 *
 * ─── ⚑ THE NO-URL-PARSING LAW, AND ITS ONE CARVE-OUT (§SKY-6a) ────────────
 * THE LAW: never derive a Storage path by taking a public URL apart. Carry the
 * path forward as data. Everything above this line exists to make that possible.
 *
 * THE CARVE-OUT, ratified by Sky on 2026-07-28 and deliberately narrow:
 * **exactly one named helper — `storagePathFromPublicUrl` — anchored on exactly
 * one constant, `FLAG_PHOTOS_BUCKET`. NO OTHER URL PARSING ANYWHERE.**
 *
 * Why it had to exist: SR-050. A takedown that leaves the reported photo
 * publicly fetchable is not a takedown, and there is nowhere to read a path
 * FROM. `flags.photo_url` and `flag_photos.url` both store public URLs; the
 * `path` half of the upload tuple is used for failed-submit cleanup and then
 * discarded (`photos.ts`). There is no SELECT policy on `storage.objects`, so
 * `storage.list()` returns nothing either. Honoring this law to the letter is
 * precisely what made the owner half unbuildable.
 *
 * Sky's reasoning for choosing derivation over a `storage_path` column: this law
 * was written against ad-hoc parsing scattered through the codebase, not against
 * the URL shape changing. One tested helper against a known constant answers the
 * first concern. If the shape ever DOES change — a private bucket, signed URLs,
 * a CDN or custom domain — derivation becomes the wrong bet and the column is
 * right. `storage_path` is on the backlog for that day, at which point this
 * helper becomes legacy-only, for rows uploaded before the column existed.
 *
 * If you are adding a second URL parser: don't. Add the column instead.
 *
 * EXIF stripping: Before upload, strips GPS, timestamps, camera info,
 * thumbnails, IPTC, and XMP metadata to protect user location privacy.
 * Uses platform-specific approaches:
 *   - iOS/Android: expo-image-manipulator native transcode (HEIC → JPEG on iOS)
 *   - Web: Canvas re-encoding (some quality loss, acceptable)
 *   - Error handling: D8 fail-CLOSED — if stripping cannot be completed on
 *     EITHER platform, the upload is aborted (we never send original bytes
 *     that may carry GPS/EXIF).
 *
 * Validates the URI scheme, the extension, and the byte size before
 * touching Storage so a malformed pick or a runaway file fails loudly
 * here instead of silently filling the bucket with garbage.
 */
/**
 * Shared upload-with-EXIF-strip pipeline used by BOTH uploadFlagPhoto and
 * uploadAvatar (src/lib/users.ts). Centralizes the privacy-critical sequence
 * so the avatar path can never drift from the flag-photo path:
 *
 *   1. scheme guard      — reject anything not in ALLOWED_PHOTO_SCHEMES,
 *                          including http(s):// (would fetch/re-upload a
 *                          remote image instead of the just-picked local one).
 *   2. extension allowlist (jpg/jpeg/png/webp/heic/heif — not widened).
 *   3. fetch bytes + empty / 10 MB-cap pre-checks.
 *   4. detectMimeFromBytes pre-check (magic-byte sniff; reject non-images).
 *   5. fail-closed strip gate (both platforms): stripExif{Web,Native} returns
 *      null on ANY failure => abort. The ORIGINAL bytes are NEVER uploaded.
 *   5b. byte-level metadata sanitizer (sanitizeImageMetadata) — splices
 *      APP1/APP13/APP9 (JPEG) / eXIf (PNG) out of the post-strip bytes.
 *      Codecs (notably Apple's) re-emit a benign APP1 during re-encode, so we
 *      remove metadata ourselves instead of trusting any codec's output.
 *      Fail-closed: null (unparseable bytes) => abort.
 *   6. post-strip verifyExifStripped gate (structural JPEG/PNG verifier,
 *      unchanged backstop confirming the sanitizer's work) — abort on false.
 *   7. derive contentType + finalExt from the ACTUAL post-strip bytes.
 *   8. upload with upsert:false, then return the public URL + storage path.
 *
 * The caller supplies `buildPath(userId, finalExt)` so each surface keeps its
 * own object-naming scheme (flags: `<uid>/<ts>.<ext>`, avatars:
 * `<uid>/avatar/<ts>.<ext>`) — the path shape is NOT hardcoded here. The
 * caller also supplies the web-strip-failure message (flags surface a
 * HEIC-specific hint; avatars use the generic copy).
 */
export async function uploadStrippedImage(
  userId: string,
  localUri: string,
  buildPath: (userId: string, finalExt: string) => string,
  webStripFailedMessage: string,
  srcWidth?: number,
  srcHeight?: number,
): Promise<{ url: string; path: string }> {
  if (!localUri || typeof localUri !== 'string') {
    throw new Error('No photo selected.');
  }
  // SCHEME GUARD — rejects http(s):// (and any other non-local scheme) so we
  // never fetch + re-upload a remote image. uploadFlagPhoto has always
  // enforced this; uploadAvatar previously omitted it.
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
    // D8: stripExifWeb returns null on ANY failure (no canvas, image decode
    // failure — e.g. a HEIC the browser can't render, toBlob/FileReader error).
    // Fail-closed: abort rather than upload original bytes that may carry GPS.
    const stripped = await stripExifWeb(arrayBuffer, ext);
    if (stripped === null) {
      throw new Error(webStripFailedMessage);
    }
    arrayBuffer = stripped;
  } else {
    // D8: stripExifNative returns null on failure; abort rather than upload
    // original bytes that may contain GPS/camera metadata. P3 perf: pass the
    // source file URI so the manipulator reads it directly (no ~10 MB base64
    // data-URI build). The arrayBuffer is still passed for the empty-input
    // guard + the dev-mode before/after byte-count log.
    const stripped = await stripExifNative(arrayBuffer, ext, localUri, srcWidth, srcHeight);
    if (stripped === null) {
      throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
    }
    arrayBuffer = stripped;
  }

  // Sanitize: splice metadata containers OUT of the post-strip bytes
  // ourselves. The codec's re-encode discards SOURCE metadata but may write
  // its own benign APP1 (orientation/XMP) into the fresh file — Apple's
  // encoder always does — which verifyExifStripped would reject. Removing
  // APP1/APP13/APP9 (JPEG) / eXIf (PNG) byte-for-byte here keeps the privacy
  // guarantee codec-independent. See sanitizeImageMetadata's doc comment.
  const sanitized = sanitizeImageMetadata(arrayBuffer);
  if (sanitized === null) {
    // D8 fail-closed: bytes we can't parse as JPEG/PNG can't be sanitized.
    if (__DEV__) {
      console.debug('[EXIF] Sanitizer could not parse post-strip bytes (unverifiable).');
    }
    throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
  }
  if (__DEV__ && sanitized.removedSegments > 0) {
    console.debug(
      `[EXIF] Sanitizer removed ${sanitized.removedSegments} metadata segment(s) post-strip.`,
    );
  }
  arrayBuffer = sanitized.buffer;

  // Post-strip verification: unchanged fail-closed backstop confirming the
  // sanitizer's work. A `false` here means a sanitizer bug — codec-emitted
  // APP1/APP13/APP9 and PNG eXIf are already spliced out above.
  const exifCheckPassed = verifyExifStripped(arrayBuffer);
  if (!exifCheckPassed) {
    // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
    throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
  }

  // The strip step re-encodes: HEIC/WEBP inputs come out as JPEG (native
  // ImageManipulator) or JPEG/PNG (web canvas). Derive the stored extension
  // and Content-Type from the ACTUAL post-strip bytes so the object's name,
  // MIME type, and content always agree (previously a HEIC pick uploaded
  // JPEG bytes as `<ts>.heic` with `image/heic`).
  const strippedMime = detectMimeFromBytes(arrayBuffer);
  const contentType = strippedMime === 'image/png' ? 'image/png' : 'image/jpeg';
  const finalExt = strippedMime === 'image/png' ? 'png' : 'jpg';
  const filePath = buildPath(userId, finalExt);

  const { error: uploadErr } = await supabase.storage
    .from(FLAG_PHOTOS_BUCKET)
    .upload(filePath, arrayBuffer, {
      contentType,
      upsert: false,
    });
  if (uploadErr) throw uploadErr;

  const { data } = supabase.storage.from(FLAG_PHOTOS_BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, path: filePath };
}

export async function uploadFlagPhoto(
  userId: string,
  localUri: string,
  srcWidth?: number,
  srcHeight?: number,
): Promise<{ url: string; path: string }> {
  // Flag photos keep the `<uid>/<ts>.<ext>` object name. The web-strip-failure
  // copy carries the F46 HEIC-specific hint (retrying the same undecodable
  // file is doomed — point the user at JPG/PNG instead). srcWidth/srcHeight (the
  // picker-reported dimensions, when available) drive the B8 downscale-on-ingest.
  return uploadStrippedImage(
    userId,
    localUri,
    (uid, finalExt) => `${uid}/${Date.now()}.${finalExt}`,
    "Photo privacy check failed: this photo couldn't be processed in the browser (HEIC photos often can't). Please choose a JPG or PNG instead.",
    srcWidth,
    srcHeight,
  );
}

/**
 * Best-effort cleanup of Storage objects uploaded during a flag submit that
 * subsequently failed (Decision 5, Option A — cleanup on failure only).
 *
 * Photos upload BEFORE the flags row is created, so a mid-loop upload
 * failure or a createFlag failure leaves blobs in the flag-photos bucket
 * with no DB row referencing them. The submit catch calls this with the
 * paths it tracked; the bucket's owner-only delete RLS permits removing
 * one's own objects.
 *
 * NEVER throws — the caller is already surfacing the original submit error
 * to the user, and that error must not be masked by a cleanup failure. A
 * failed cleanup just console.warns (orphans are invisible to users; a
 * server-side sweep can collect any that slip through).
 */
/**
 * The ONE carve-out to the no-URL-parsing law (see `uploadStrippedImage`'s
 * docblock, and DECISIONS §SKY-6a). Recovers a Storage object path from a
 * public flag-photo URL so SR-050's owner-side takedown can actually delete
 * the photo.
 *
 * ─── IT FAILS CLOSED, AND THAT IS THE WHOLE DESIGN ────────────────────────
 * It anchors on the KNOWN constant `STORAGE_PUBLIC_PREFIX` + `<bucket>/` rather
 * than guessing at path segments, strips any query or fragment, decodes percent
 * escapes, and returns `null` the moment anything does not line up. A `null`
 * means "I could not be sure", and the caller deletes NOTHING. Never delete on
 * a guess: the failure mode of a wrong guess is destroying somebody else's
 * photo, which is far worse than the orphan a null leaves behind.
 *
 * It also requires the recovered path to start with `<uid>/`. Storage RLS
 * enforces that server-side anyway, so this is belt-and-braces — but it turns a
 * silently-refused delete into a locally-visible one.
 *
 * ⚑ A NULL IS LOUD (Sky's amendment, §SKY-6a): *"Silent null means the photo
 * never gets deleted and the takedown hole comes back invisibly."* So it warns
 * AND emits an analytics event. The event carries no URL and no ids — the URL
 * embeds the owner's uid, and `analytics.stripPII` would drop those keys
 * regardless; what is worth knowing is only that a derivation failed and why.
 */
export function storagePathFromPublicUrl(url: string, uid: string): string | null {
  const marker = `${STORAGE_PUBLIC_PREFIX}${FLAG_PHOTOS_BUCKET}/`;
  const at = url.indexOf(marker);
  if (at === -1) {
    console.warn('[flags] SR-050: photo URL did not match the expected public-object shape');
    trackEvent('storage_path_derivation_failed', { reason: 'marker_absent' });
    return null;
  }

  // Everything after the marker, minus a query string or fragment. Both are
  // plausible on a CDN or a transform URL and neither is part of the object key.
  let path = url.slice(at + marker.length).split(/[?#]/)[0];
  if (!path) {
    console.warn('[flags] SR-050: photo URL had the marker but no object path after it');
    trackEvent('storage_path_derivation_failed', { reason: 'empty_path' });
    return null;
  }

  try {
    path = decodeURIComponent(path);
  } catch {
    // A malformed escape means we do not actually know the key. Refuse.
    console.warn('[flags] SR-050: photo URL path could not be decoded');
    trackEvent('storage_path_derivation_failed', { reason: 'undecodable' });
    return null;
  }

  // The scheme is `<uid>/<timestamp>.<ext>` — see uploadFlagPhoto. A path that
  // does not begin with this user's folder is either another user's object or a
  // shape we no longer understand; either way, not ours to delete.
  if (!path.startsWith(`${uid}/`)) {
    console.warn('[flags] SR-050: derived path is not in the caller\'s own folder — refusing');
    trackEvent('storage_path_derivation_failed', { reason: 'foreign_folder' });
    return null;
  }

  return path;
}

export async function removeUploadedFlagPhotos(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  try {
    const { error } = await supabase.storage.from(FLAG_PHOTOS_BUCKET).remove(paths);
    if (error) {
      console.warn('[flags] Failed to clean up orphaned flag photos:', error);
    }
  } catch (e) {
    console.warn('[flags] Failed to clean up orphaned flag photos:', e);
  }
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
  // Apple 1.2(a): the submit-time filter, at the same trust boundary as the
  // coordinate and category guards above and before any network call. Checks
  // the DESCRIPTION only — category and severity are closed enum sets that
  // cannot carry free text. Client-side only and bypassable; see the header of
  // `@/moderation/blockedTerms`.
  if (input.description && containsBlockedTerm(input.description)) {
    throw new Error(CONTENT_BLOCKED_MESSAGE);
  }

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

/**
 * Thrown by updateFlagStatus when the compare-and-set found the flag in a
 * different state than the caller saw (someone changed or deleted it while
 * the screen showed a stale snapshot). Callers show a friendly conflict
 * message + refresh instead of a raw PostgREST error.
 */
export class FlagStatusConflictError extends Error {
  constructor() {
    super('This flag changed since you opened it.');
    this.name = 'FlagStatusConflictError';
  }
}

export async function updateFlagStatus(
  flagId: string,
  status: FlagStatus,
  expectedCurrent?: FlagStatus,
) {
  // F53 (re-sweep): the update was a blind last-write-wins — a user acting on
  // a stale snapshot (the detail modal/list can sit unrefreshed for minutes)
  // silently reverted another user's resolution (resolved -> verified) while
  // being told '+points' the trigger never awarded. When the caller passes the
  // status it believes the flag has, the write only commits if that is still
  // true; otherwise (status moved, or flag deleted) it throws a typed
  // conflict the caller can render honestly. A deleted flag also no longer
  // surfaces .single()'s raw PGRST116 coercion message.
  let query = supabase.from('flags').update({ status }).eq('id', flagId);
  if (expectedCurrent !== undefined) {
    query = query.eq('status', expectedCurrent);
  }
  const { data, error } = await query.select().maybeSingle();
  if (error) throw error;
  if (!data) throw new FlagStatusConflictError();

  // Analytics chokepoint: every status change flows through here, so this is
  // the one place to instrument it. We log only the destination status +
  // platform — never the flag_id or user_id. See src/lib/analytics.ts.
  trackEvent('flag_status_updated', { to_status: status, platform: Platform.OS });

  return data as FlagRow;
}

/**
 * Cast a reopen vote for a resolved flag via the increment_reopen_request RPC
 * (migration 2026-05-30_flag_reopen_requests.sql). Returns the new vote count
 * for the current resolution cycle, or null if the RPC is unavailable on this
 * backend (migration not applied / RLS rejection) so callers degrade
 * gracefully instead of throwing. The RPC stores NO user_id (Jordan privacy
 * gate) and is a server-side no-op (returns 0) unless the flag is 'resolved'.
 */
export async function requestFlagReopen(flagId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc('increment_reopen_request', {
    p_flag_id: flagId,
  });
  if (error) {
    // Migration-absent fallback ONLY (F38 re-sweep): PostgREST PGRST202 =
    // function not found in the schema cache; Postgres 42883 = undefined
    // function. Anything else — network failure, RLS, timeout — must THROW so
    // the caller shows an honest error. Collapsing every error to null made
    // the modal display the success-sounding "sent for review" message for a
    // vote that never reached the server.
    const code = (error as { code?: string }).code;
    if (code === 'PGRST202' || code === '42883') {
      console.warn(
        '[reopen] increment_reopen_request RPC missing (migration not applied):',
        error.message,
      );
      return null;
    }
    throw error;
  }
  return typeof data === 'number' ? data : null;
}

/**
 * Delete a flag, and — SR-050 — the photos that belong to it.
 *
 * RLS allows the row delete only when `user_id = auth.uid()`, so the caller does
 * not need to re-check ownership; Supabase rejects any other user's row.
 *
 * ─── WHY THE PHOTOS ARE PART OF THIS (11_SR050_TAKEDOWN_GAP.md) ───────────
 * Deleting the row used to leave every photo publicly fetchable forever, at a
 * URL anyone who had seen it still held. **A takedown that leaves the reported
 * photo up is not a takedown** — which is why this is a leg of Apple 1.2(b) and
 * not merely tidiness.
 *
 * ─── ORDER IS LOAD-BEARING ────────────────────────────────────────────────
 * The URLs live ON the rows being deleted. Gather first, delete second, or the
 * only record of what to clean up is gone by the time we look for it. The row
 * delete is what the user is owed, so it happens even if the photo sweep
 * cannot: `removeUploadedFlagPhotos` never throws, by design.
 *
 * ─── TWO CALLERS, ONE OF THEM CANNOT FINISH THE JOB ───────────────────────
 * `FlagDetailModal` calls this as the flag's OWNER, and the `flag-photos owner
 * delete` Storage policy permits it — that path now works end to end.
 * `AdminScreen` calls it as an ADMIN taking down someone else's flag, and that
 * same policy DENIES the Storage delete: the row goes, the photo stays. The
 * client half cannot fix that; it needs a Storage policy, which is a Sky-applied
 * migration. The artifact is written and waiting in
 * `04b_sql_sweep_lens4b_RECOVERED.md` §C-12. **Until she applies it, admin
 * takedown remains incomplete, and 1.2(b) says so rather than claiming closed.**
 */
export async function deleteFlag(flagId: string) {
  // Gather BEFORE the delete — see the order note above.
  const paths = await collectFlagPhotoPaths(flagId);

  const { error } = await supabase.from('flags').delete().eq('id', flagId);
  if (error) throw error;

  // Best-effort, never throws. On the admin path RLS refuses this and it warns;
  // the row is still gone, which is the contract the caller surfaces.
  await removeUploadedFlagPhotos(paths);
}

/**
 * Every Storage path belonging to a flag: the legacy single `photo_url` plus
 * every row in the `flag_photos` junction. Deduped, because a flag's first
 * photo can legitimately appear in both.
 *
 * Returns `[]` rather than throwing on any failure. This runs on the delete
 * path, and a flag the user asked to remove must not survive because a photo
 * lookup had a bad day — that would be the feature failing at the only moment
 * it matters. Undeleted blobs are invisible to users and are what R-1's
 * server-side sweep is for.
 */
async function collectFlagPhotoPaths(flagId: string): Promise<string[]> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    // No uid means no owner-folder to validate against, and every derivation
    // would refuse anyway. Skip the round trips.
    if (!uid) return [];

    const [rowRes, photosRes] = await Promise.all([
      supabase.from('flags').select('photo_url').eq('id', flagId).maybeSingle(),
      supabase.from('flag_photos').select('url').eq('flag_id', flagId),
    ]);

    const urls: string[] = [];
    const legacy = (rowRes.data as { photo_url?: string | null } | null)?.photo_url;
    if (legacy) urls.push(legacy);
    for (const p of (photosRes.data ?? []) as { url?: string | null }[]) {
      if (p.url) urls.push(p.url);
    }

    const paths = new Set<string>();
    for (const url of urls) {
      const path = storagePathFromPublicUrl(url, uid);
      if (path) paths.add(path);
    }
    return [...paths];
  } catch (e) {
    console.warn('[flags] SR-050: could not collect photo paths before delete:', e);
    return [];
  }
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
 *   - NOTE (corrected 2026-07-31, TB-10): the line that used to sit here said
 *     "RLS on `flags` requires auth.uid() to be non-null". That has been FALSE
 *     since 2026-05-29, when `flags readable by anon` was added — the table is
 *     readable with the public anon key. It was load-bearing misinformation:
 *     it is the safeguard a reader would rely on when reasoning about this
 *     query, and the prior privacy review reasoned only about the `anon` role
 *     while `display_name` stays joinable by any signed-in user (TB-9/AB-7).
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
// aloud so meaning isn't carried by color alone. The labels DERIVE from the
// design-system severity ramp (theme.ts) so the report form, legend, map
// callouts, and SeverityBadge always name a severity identically — one source.
export const SEVERITY_LABELS: Record<FlagSeverity, string> = {
  1: severityRamp[1].label,
  2: severityRamp[2].label,
  3: severityRamp[3].label,
  4: severityRamp[4].label,
  5: severityRamp[5].label,
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
