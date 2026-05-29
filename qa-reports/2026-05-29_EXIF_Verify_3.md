# EXIF GPS Stripping — Independent Verification Report 3
**Date:** 2026-05-29  
**Auditor:** Independent verification subagent (read-only audit)  
**Verdict: PARTIAL**

---

## Executive Summary

The two prior contradicting reports have both partial validity. The truth from the source is nuanced:

- **`uploadFlagPhoto` (flag upload):** FUNCTIONAL — if `verifyExifStripped` detects EXIF markers, the upload is **aborted** with a thrown Error (not just warned).
- **`uploadAvatar` (avatar upload in users.ts):** NON-FUNCTIONAL for privacy gating — if `verifyExifStripped` detects EXIF markers, the code only emits a `console.warn` and **proceeds to upload anyway**.
- **`stripExifNative`:** Functionally present but has a critical design flaw — it calls `MediaLibrary.saveToLibraryAsync()`, which **saves the image to the user's photo library** as a side effect, not a transcode-only operation. All failure paths return the original unstripped buffer (no throw).
- **Tests:** The `stripExifNative` tests assert only on mocks — they never verify that real EXIF is removed. The mock's "STRIPPED" buffer (`[0x0a, 0x0b, 0x0c, 0x0d]`) contains no EXIF markers, so `verifyExifStripped` would pass trivially on it. These tests would pass even if stripping were a complete no-op that returned the same dummy bytes.

---

## Detailed Findings

### 1. `stripExifNative` — Functionally flawed

**File:** `src/lib/flags.ts`, lines 54–97

The function calls `MediaLibrary.saveToLibraryAsync(dataUrl)` (line 75), which is the Expo API for **saving a photo to the device photo library** — not a transcoding-only API. This has two problems:

1. **Unintended side effect:** Calling this saves a copy of the photo to the user's photo roll, which is not what EXIF stripping should do.
2. **The return value:** The mock in the test (`mockSaveToLibraryAsync.mockResolvedValue({ uri: 'file:///tmp/stripped.jpg' })`) returns a `{ uri }` shape. However, `MediaLibrary.saveToLibraryAsync` in the real Expo API returns a `void` Promise (it does not return an asset object with a URI). The cast `as any` on line 75 hides this type mismatch — in production, `strippedAsset` would be `undefined`, causing the `!strippedAsset || !strippedAsset.uri` check on line 76 to trigger the fail-safe `console.warn` and return the **original unstripped buffer**.

**Lines 75–79:**
```typescript
const strippedAsset = await (MediaLibrary.saveToLibraryAsync(dataUrl) as any);
if (!strippedAsset || !strippedAsset.uri) {
  console.warn('[EXIF] Native transcode failed; using original.');
  return arrayBuffer;  // ← returns ORIGINAL, unstripped
}
```

In real production native builds, `stripExifNative` is effectively a **no-op** — it returns the original buffer with EXIF intact.

### 2. `verifyExifStripped` — Functionally correct

**File:** `src/lib/flags.ts`, lines 206–230

The function correctly scans for JPEG metadata markers `0xFFE1` (EXIF), `0xFFED` (IPTC), `0xFFE9` (XMP). Returns `true` (safe) if none found, `false` if any are detected. The logic is sound.

### 3. `uploadFlagPhoto` — Upload ABORTS on verification failure (gating: YES)

**File:** `src/lib/flags.ts`, lines 318–322

```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

**This is gating.** If `verifyExifStripped` returns false, the function throws — the Supabase upload on line 334 is never reached.

**However:** because `stripExifNative` on native is effectively a no-op (returns original buffer), the original unstripped EXIF bytes are what gets verified — and they WILL contain EXIF markers. So the flag photo upload path will throw on native for any photo with EXIF, meaning users on native cannot upload flag photos at all. This is a UX failure mode, not a privacy leak.

### 4. `uploadAvatar` — Upload DOES NOT ABORT on verification failure (gating: NO)

**File:** `src/lib/users.ts`, lines 81–84

```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
  // ← NO throw, falls through to upload
}
```

Avatar upload proceeds with `console.warn` only — EXIF/GPS metadata in avatar photos is NOT blocked. This is a privacy vulnerability.

### 5. Tests — Mock-only, do not validate real stripping

**File:** `src/lib/__tests__/flags.test.ts`, lines 371–426

The `stripExifNative` tests use:
```typescript
const ORIGINAL = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
const STRIPPED = new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d]).buffer;
```

The "success" test (lines 387–399) mocks `saveToLibraryAsync` to return `{ uri: 'file:///tmp/stripped.jpg' }` — this is **not the real API return shape** (`saveToLibraryAsync` returns `void`). The test asserts `expect(result).toBe(STRIPPED)`, which only verifies the mock wiring, not that EXIF was actually removed.

The `verifyExifStripped` tests (lines 328–362) do correctly test the pure scanner function with real byte patterns, and these are valid.

The `stripExifWeb` test (line 438) only tests the `document === undefined` bail-out path (the Node/Jest environment), not actual canvas stripping. No browser-environment test exists for the happy path.

The `uploadFlagPhoto` validation tests (lines 266–313) stop before the EXIF strip/verify step because they trigger earlier validation errors. No end-to-end test of the gating behavior exists.

---

## Summary Table

| Function | Platform | Real stripping occurs? | Upload aborts on failure? |
|---|---|---|---|
| `uploadFlagPhoto` via `stripExifNative` | Native | **No** — `saveToLibraryAsync` returns void, falls back to original | **Yes** — throws (but will throw for every EXIF photo, blocking upload entirely) |
| `uploadFlagPhoto` via `stripExifWeb` | Web | **Yes** — canvas re-encoding genuinely strips metadata | **Yes** — throws |
| `uploadAvatar` via `stripExifNative` | Native | **No** — same no-op as above | **No** — console.warn only |
| `uploadAvatar` via `stripExifWeb` | Web | **Yes** — canvas re-encoding works | **No** — console.warn only |

---

## Adjudication of Prior Reports

- **Report A ("FULLY FUNCTIONAL, D8 closed"):** Wrong. `stripExifNative` is effectively a no-op in production (API mismatch hidden by `as any`), and `uploadAvatar` does not abort on verification failure.
- **Report B ("NON-FUNCTIONAL, upload does not abort"):** Partially right. Correct that native stripping is broken. Correct that avatar upload does not abort. Wrong that flag photo upload does not abort — `uploadFlagPhoto` does throw on failure (lines 319–322).

**Correct verdict: PARTIAL** — flag uploads are gated (but natively broken in a different way), avatar uploads are ungated.

---

## Decisions for Sky

1. **`stripExifNative` must be rewritten** — `MediaLibrary.saveToLibraryAsync` is not a transcoding API. A correct approach would use `ImageManipulator.manipulateAsync` (from `expo-image-manipulator`) which actually returns a new URI without saving to the library.
2. **`uploadAvatar` must be hardened** — the `console.warn` on line 83 in `users.ts` must be replaced with a `throw` to match the gating behavior in `uploadFlagPhoto`.
3. **D8 remains OPEN** — the prior closure was premature. Native EXIF stripping is not functional.
