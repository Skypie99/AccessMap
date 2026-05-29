# D8 EXIF Fix Spec — Proposed Patches (PROPOSE ONLY, NOT APPLIED)
**Date:** 2026-05-29
**Author:** Shamus
**Status:** AUDIT + PROPOSE ONLY — no code has been edited
**D8 Gate:** OPEN (this spec targets both confirmed failures)

---

## Executive Summary

Two discrete failures confirmed by Morgan's adjudication (2026-05-29_EXIF_Adjudication.md):

| ID | File | Line(s) | Failure |
|----|------|---------|---------|
| A | `src/lib/flags.ts` | 54–96 | `stripExifNative` is a production no-op — `saveToLibraryAsync` returns `void`, so `strippedAsset` is always `undefined`, the guard at line 76 always fires, and the original unstripped buffer is always returned |
| B | `src/lib/users.ts` | 81–84 | `uploadAvatar` `console.warn`s on EXIF verification failure rather than throwing — avatar photos can be uploaded with GPS metadata intact |

Both patches are proposed as diffs below. Neither has been applied.

---

## Fix A — Replace `stripExifNative` with `expo-image-manipulator`

### Root cause (verified from source)

`src/lib/flags.ts:75`:
```typescript
const strippedAsset = await (MediaLibrary.saveToLibraryAsync(dataUrl) as any);
```

`expo-media-library/src/MediaLibrary.ts:533` declares:
```typescript
export async function saveToLibraryAsync(localUri: string): Promise<void>
```

`saveToLibraryAsync` returns `Promise<void>`. After `await`, `strippedAsset` is `undefined`. The check at line 76 (`if (!strippedAsset || !strippedAsset.uri)`) fires unconditionally. The fallback `return arrayBuffer` at line 78 always executes. No transcoding occurs. The original EXIF-bearing buffer is silently passed upstream.

### Proposed replacement

`expo-image-manipulator` (already in the Expo SDK 54 universe; ships with managed workflow) provides `ImageManipulator.manipulateAsync(uri, actions, options)` which returns `Promise<{ uri: string; width: number; height: number }>`. A re-encode with no transform actions strips EXIF because the codec writes a fresh image with no metadata passthrough.

**New import needed at top of `src/lib/flags.ts`:**
```
import * as ImageManipulator from 'expo-image-manipulator';
```

The `expo-media-library` import at line 4 can be removed entirely if `stripExifNative` is the only use — verify this before applying.

### Proposed diff — `src/lib/flags.ts`

```diff
--- a/src/lib/flags.ts
+++ b/src/lib/flags.ts
@@ -1,7 +1,7 @@
 import { supabase } from './supabase';
 import { color as themeColor } from '@/theme';
 import { Platform } from 'react-native';
-import * as MediaLibrary from 'expo-media-library';
+import * as ImageManipulator from 'expo-image-manipulator';
 import type { FlagCategory, FlagRow, FlagSeverity, FlagStatus } from '@/types/database';
 
 export const FLAG_PHOTOS_BUCKET = 'flag-photos';
@@ -44,55 +44,53 @@ export const NEXT_PAGE_SIZE = 20;
 /**
  * Strip EXIF metadata (GPS, timestamps, camera info, thumbnails, IPTC, XMP)
- * from an image on iOS/Android using expo-media-library native APIs.
+ * from an image on iOS/Android using expo-image-manipulator re-encode.
  *
- * On iOS, this handles HEIC re-encoding to JPEG. On Android, images are
- * transcoded. If stripping fails, we warn and return the original arrayBuffer
- * so the upload proceeds (fail-safe). The orientation is baked into the pixels.
+ * ImageManipulator.manipulateAsync re-encodes the image via the platform codec,
+ * producing a new file with no metadata passthrough. The returned {uri} is a
+ * fresh file:// URI that we fetch back as bytes.
  *
- * Post-strip verification reads the output bytes to confirm EXIF is gone.
+ * If stripping fails we return null (NOT the original buffer) so callers can
+ * enforce the D8 privacy gate rather than silently proceeding with metadata.
  */
-export async function stripExifNative(arrayBuffer: ArrayBuffer, ext: string): Promise<ArrayBuffer> {
+export async function stripExifNative(
+  arrayBuffer: ArrayBuffer,
+  ext: string,
+): Promise<ArrayBuffer | null> {
   try {
-    // Convert arrayBuffer to base64 data URL for the native API.
+    // Write the buffer to a temporary data URI so ImageManipulator can read it.
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
 
-    // expo-media-library transcodes the image, stripping EXIF + baking
-    // orientation. On iOS, HEIC is re-encoded to JPEG. Returns a file:// URI.
-    // eslint-disable-next-line @typescript-eslint/no-explicit-any
-    const strippedAsset = await (MediaLibrary.saveToLibraryAsync(dataUrl) as any);
-    if (!strippedAsset || !strippedAsset.uri) {
-      console.warn('[EXIF] Native transcode failed; using original.');
-      return arrayBuffer;
-    }
-
-    // Read the transcoded image back as bytes.
-    const strippedResponse = await fetch(strippedAsset.uri as string);
+    // Re-encode with no transform actions. This forces the platform codec to
+    // write a fresh image — EXIF/GPS/IPTC/XMP are not carried through.
+    // SaveFormat.JPEG is used for JPEG/HEIC/HEIF; PNG stays PNG.
+    const saveFormat =
+      ext === 'png'
+        ? ImageManipulator.SaveFormat.PNG
+        : ImageManipulator.SaveFormat.JPEG;
+    const result = await ImageManipulator.manipulateAsync(
+      dataUrl,
+      [], // no transform — re-encode only
+      { compress: 0.9, format: saveFormat },
+    );
+    // result.uri is a fresh file:// URI with no metadata.
+    const strippedResponse = await fetch(result.uri);
     const strippedBuffer = await strippedResponse.arrayBuffer();
     if (strippedBuffer.byteLength === 0) {
-      console.warn('[EXIF] Transcoded image is empty; using original.');
-      return arrayBuffer;
+      console.warn('[EXIF] ImageManipulator output is empty; stripping failed.');
+      return null;
     }
 
     console.debug(
       `[EXIF] Native re-encode: ${arrayBuffer.byteLength} → ${strippedBuffer.byteLength} bytes`,
     );
     return strippedBuffer;
   } catch (e) {
-    console.warn('[EXIF] Native transcode failed:', e);
-    return arrayBuffer;
+    console.warn('[EXIF] ImageManipulator transcode failed:', e);
+    return null;
   }
 }
```

### Caller changes needed — `uploadFlagPhoto` and `uploadAvatar`

Both callers currently call `stripExifNative` and assign the result directly to `arrayBuffer`. With the new signature returning `ArrayBuffer | null`, callers must handle `null` as a stripping failure. Because this is a D8 privacy gate, `null` should throw rather than fall through.

The same pattern applies in both `flags.ts:314` and `users.ts:78`:

```diff
-    arrayBuffer = await stripExifNative(arrayBuffer, ext);
+    const stripped = await stripExifNative(arrayBuffer, ext);
+    if (stripped === null) {
+      throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
+    }
+    arrayBuffer = stripped;
```

This change is needed in two places:
- `src/lib/flags.ts` around line 314 (inside `uploadFlagPhoto`)
- `src/lib/users.ts` around line 78 (inside `uploadAvatar`)

### Dependency decision for Sky

`expo-image-manipulator` is an Expo first-party package. In a managed Expo SDK 54 workflow it is available without ejecting. However it may not be in `package.json` yet.

**Sky must decide:** Run `npx expo install expo-image-manipulator` (or `npm install expo-image-manipulator --legacy-peer-deps`) before this patch can be applied. Shamus cannot run install commands.

Check current dependencies:
```
grep expo-image-manipulator /Users/skypie/AccessMap/package.json
```
If absent, it must be added.

### Rollback plan

If `expo-image-manipulator` is not available or the re-encode fails on device:
- The `null` return + throw pattern means the upload is blocked (fail-closed), which is the correct D8 behavior.
- To roll back to the previous fail-open behavior (not recommended — re-opens the privacy gap), restore the old `return arrayBuffer` fallbacks and revert the import.
- A feature flag (`__DEV__` guard or a new `flags.ts` constant `EXIF_STRICT_MODE = true`) could make the throw conditional during debugging if needed, but should never be disabled in production.

---

## Fix B — `uploadAvatar` must throw on EXIF verification failure

### Root cause (verified from source)

`src/lib/users.ts:81–84`:
```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
```

The upload continues regardless. Compare with `uploadFlagPhoto` in `src/lib/flags.ts:318–322` which throws:
```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

Avatar photos can contain GPS data from the camera. The user's home location is likely in avatar selfies. This is the same D8 privacy risk as flag photos.

### Proposed diff — `src/lib/users.ts`

```diff
--- a/src/lib/users.ts
+++ b/src/lib/users.ts
@@ -81,7 +81,9 @@ export async function uploadAvatar(userId: string, localUri: string): Promise<st
   const exifCheckPassed = verifyExifStripped(arrayBuffer);
   if (!exifCheckPassed) {
-    console.warn('[EXIF] Verification detected possible metadata markers.');
+    // D8 privacy gate: abort upload if EXIF markers are still present.
+    // Mirrors uploadFlagPhoto behavior in src/lib/flags.ts:319-321.
+    throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
   }
```

This is a 2-line change. No new imports, no new dependencies.

### UX impact

When this throw fires, the caller in `ProfileScreen.tsx` (or wherever `uploadAvatar` is invoked) will receive a rejected promise. That call site must already handle errors (since `uploadErr` from Supabase can throw). Verify the call site wraps `uploadAvatar` in try/catch and surfaces the message to the user via `Alert.alert`. If it does not, add a catch block there as part of applying this fix.

### Rollback plan

Revert `throw` back to `console.warn`. This re-opens the D8 gap for avatar photos. Not recommended. The rollback exists only if the throw causes a regression where legitimate photos are blocked by a false-positive in `verifyExifStripped`. If that happens, the verifier heuristic (not this gate) is the thing to fix.

---

## Test suite updates required (not written here — Gary's domain)

Gary's existing test at `flags.test.ts:387-399` mocks `saveToLibraryAsync` to return `{ uri: ... }`. After Fix A, that mock must be replaced with a mock of `ImageManipulator.manipulateAsync` returning `{ uri: 'file:///tmp/stripped.jpg', width: 100, height: 100 }`.

The `uploadAvatar` test at `users.test.ts:95-116` passes today because verification is non-blocking. After Fix B, the test must either:
1. Ensure the test image passes `verifyExifStripped` (no EXIF markers), or
2. Expect the throw when the test image fails verification.

Gary should be dispatched to write the updated test spec before these patches are applied.

---

## Decisions for Sky

1. **expo-image-manipulator dependency** — must be installed before Fix A can land. One command: `npx expo install expo-image-manipulator`. Sky or Rory runs this; Shamus cannot.
2. **Fail-closed vs fail-open on native strip** — Fix A makes `stripExifNative` return `null` on failure, causing an upload abort (fail-closed). Previous behavior was fail-open (upload with original buffer). This is the correct D8 behavior but will surface errors to users in edge cases. Sky should confirm fail-closed is acceptable.
3. **Avatar EXIF gate** — Fix B makes avatar upload abort on verification failure, same as flag photos. Sky should confirm this is the intended policy.
4. **Gary test spec** — Gary should update `flags.test.ts` and `users.test.ts` mocks before these patches are merged. Recommend dispatching Gary with reference to this report.

---

## Files read to produce this report

- `/Users/skypie/AccessMap/src/lib/flags.ts` lines 1–120, 280–344 (verified from source)
- `/Users/skypie/AccessMap/src/lib/users.ts` lines 1–120 (verified from source)
- `/Users/skypie/AccessMap/qa-reports/2026-05-29_EXIF_Adjudication.md` (Morgan's adjudication, confirmed findings)
