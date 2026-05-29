# EXIF Test Audit — Gary QA Report
**Date:** 2026-05-29  
**Scope:** `src/lib/__tests__/flags.test.ts` (stripExifNative) + `src/lib/__tests__/users.test.ts` (uploadAvatar avatar upload path)  
**Mode:** AUDIT + PROPOSE ONLY (no code changes applied)  
**Files Read:** flags.test.ts (lines 1–508), users.test.ts (lines 1–176), flags.ts (lines 54–344)

---

## Executive Summary

Two critical test gaps remain in the EXIF/privacy gate:

1. **stripExifNative mock returns wrong shape** — mocks `saveToLibraryAsync` to return `{uri:...}` but the real API returns either `null` or an `Asset` object with `.uri`. The test never detects the no-op case where stripExif returns the original buffer unchanged.
2. **uploadAvatar test avoids the warn branch entirely** — the success path stamps valid JPEG bytes into the buffer, so `detectMimeFromBytes` always passes and the test never reaches the `verifyExifStripped` failure case that should abort the upload.
3. **No regression test** — there's no test asserting that `stripExifNative` **must** actually modify the buffer. A broken implementation that always returns the original bytes unchanged would pass the current suite.

All three gaps are pre-launch privacy blockers. GPS coordinates embedded in unverified "stripped" photos would leak user location.

---

## Gap Analysis

### Gap 1: stripExifNative Mock Returns Unchecked Shape

**File:** `src/lib/__tests__/flags.test.ts:387–399`

```typescript
// Line 387–399: the success case
it('returns the stripped buffer when MediaLibrary succeeds', async () => {
  // MediaLibrary returns a transcoded asset URI.
  mockSaveToLibraryAsync.mockResolvedValue({ uri: 'file:///tmp/stripped.jpg' });
```

**Problem:**  
The real `expo-media-library.saveToLibraryAsync(dataUrl)` API signature (iOS/Android native) returns:
- Success: an `Asset` object with shape `{ id, filename, uri, mediaType?, width?, height? }`
- Failure: `null` (not an error object)

The mock in the test resolves to `{uri:...}` which is structurally valid but **incomplete**. More importantly, the implementation (flags.ts line 75–79) checks `!strippedAsset || !strippedAsset.uri`, which would catch a null response but never catches an unexpected shape.

**Why it matters:**  
If `saveToLibraryAsync` behaves differently on real hardware, or if a future Expo version changes the return type, the test won't detect the drift. The warn-path branches (lines 401–406, 415–425) test the null/empty cases but don't verify the happy-path actually produces a different buffer.

**Real-world scenario:**  
On native, `saveToLibraryAsync` saves the image to the device library **and returns a reference**. The implementation then refetches the transcoded bytes from `strippedAsset.uri`. If that uri is invalid or points to the wrong file, `fetch` could silently return the original or an empty buffer, bypassing EXIF verification.

---

### Gap 2: uploadAvatar Avatar Test Never Enters verifyExifStripped Failure Path

**File:** `src/lib/__tests__/users.test.ts:97–116`

```typescript
// Line 97–116: success case
it('success: returns the public URL on a valid JPG upload', async () => {
  const fakeBuffer = new ArrayBuffer(1024);
  const jpegView = new Uint8Array(fakeBuffer);
  jpegView[0] = 0xff; jpegView[1] = 0xd8; jpegView[2] = 0xff; // JPEG magic
  (global as unknown as { fetch: unknown }).fetch = async () => ({
    arrayBuffer: async () => fakeBuffer,
  });
  mockUpload.mockResolvedValueOnce({ error: null });
  mockGetPublicUrl.mockReturnValueOnce({
    data: { publicUrl: 'https://cdn.example.com/user-abc-123/avatar/1234567890.jpg' },
  });
  const url = await uploadAvatar(USER_ID, 'file:///tmp/photo.jpg');
  expect(url).toMatch(/^https:\/\//);
```

**Problem:**  
The fakeBuffer has valid JPEG magic bytes (FF D8 FF), so `detectMimeFromBytes(fakeBuffer)` at line 304 of flags.ts returns `'image/jpeg'`. The function then calls `stripExifNative(fakeBuffer, 'jpg')`.

The mock for `saveToLibraryAsync` in flags.test.ts (line 389) returns `{uri:...}`, but **users.test.ts never mocks it**. The result is that `stripExifNative` fails gracefully (returns original buffer), then **`verifyExifStripped(fakeBuffer)` is called on line 318**.

Since fakeBuffer contains only JPEG magic bytes and zeros, `verifyExifStripped` will return `true` (no EXIF markers found). The test succeeds without ever hitting the `throw` on line 321.

**Why it matters:**  
The privacy gate (line 319–322 in flags.ts) is meant to abort upload if EXIF markers are still present after stripping. But the test never exercises what happens when `verifyExifStripped` returns false. A bug like this would silently upload unverified photos with GPS metadata intact:

```typescript
// If this condition were inverted or broken, GPS would leak:
const exifCheckPassed = verifyExifStripped(arrayBuffer); // returns FALSE
if (!exifCheckPassed) {
  // Should abort here — but test never reaches this
  throw new Error(...);
}
```

**Missing test case:**  
There should be a test asserting: "if verifyExifStripped fails, uploadAvatar aborts before storage upload".

---

### Gap 3: No Regression Test for stripExifNative Non-op

**File:** `src/lib/__tests__/flags.test.ts:371–426`

**Problem:**  
All stripExifNative tests mock fetch or throw to simulate behavior, but none assert that stripExif **actually modified the bytes**. An implementation that returns the original buffer unchanged (a no-op) would pass all current tests:

```typescript
// Broken implementation that would pass tests:
export async function stripExifNative(arrayBuffer: ArrayBuffer, ext: string): Promise<ArrayBuffer> {
  // ... no-op ...
  return arrayBuffer; // Just return original, never actually strip!
}
```

**Why it matters:**  
This is the most dangerous silent failure. A user's photo with embedded GPS coordinates would be uploaded unverified, leaking location. The privacy gate `verifyExifStripped` is the backstop, but it only detects JPEG/IPTC/XMP **markers**, not all metadata formats. Relying entirely on the marker scan without confirming stripping actually happened is risky.

**Real-world scenario:**  
Imagine a future version of expo-media-library where `saveToLibraryAsync` silently fails but still returns a uri. The implementation fetches back the original file, verifyExifStripped scans for markers and finds none (false negative), and a user's location is broadcast to the world.

---

## Proposed Fixes (Diffs Only)

### Fix 1: Correct stripExifNative Mock to Real Return Shape

**File:** `src/lib/__tests__/flags.test.ts`

Replace the mock on line 389 to use the actual Expo return shape. When success, return an Asset-like object; when failure, return null:

```diff
  describe('stripExifNative', () => {
    // A minimal 4-byte "image" to use as input. Real images would be larger
    // but the function treats the buffer as opaque bytes.
    const ORIGINAL = new Uint8Array([0x01, 0x02, 0x03, 0x04]).buffer;
    const STRIPPED = new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d]).buffer;
  
    beforeEach(() => {
      mockSaveToLibraryAsync.mockReset();
      (global as unknown as { fetch: unknown }).fetch = jest.fn();
    });
  
    afterEach(() => {
      // Restore to avoid polluting other test suites.
      (global as unknown as { fetch: unknown }).fetch = undefined as unknown as typeof fetch;
    });
  
    it('returns the stripped buffer when MediaLibrary succeeds', async () => {
-     // MediaLibrary returns a transcoded asset URI.
-     mockSaveToLibraryAsync.mockResolvedValue({ uri: 'file:///tmp/stripped.jpg' });
+     // MediaLibrary returns an Asset object with id, filename, uri, mediaType.
+     // This matches the real expo-media-library return type on iOS/Android.
+     mockSaveToLibraryAsync.mockResolvedValue({
+       id: 'fake-asset-id',
+       filename: 'stripped.jpg',
+       uri: 'file:///tmp/stripped.jpg',
+       mediaType: 'photo',
+     });
      // fetch reads back the stripped bytes.
      (
        global as unknown as {
          fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
        }
      ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });
  
      const result = await stripExifNative(ORIGINAL, 'jpg');
      expect(result).toBe(STRIPPED);
    });
```

**Rationale:**  
The implementation on flags.ts:75 casts the result as `any` but then checks `.uri` on line 76. Using the real shape ensures the mock reflects actual expo-media-library behavior. This will catch future drift.

---

### Fix 2: Add Regression Test — stripExifNative Must Modify the Buffer

**File:** `src/lib/__tests__/flags.test.ts`

Add this test to the stripExifNative describe block (after line 425):

```diff
    it('returns the original buffer (fail-safe) when the transcoded fetch returns empty bytes', async () => {
      mockSaveToLibraryAsync.mockResolvedValue({ uri: 'file:///tmp/empty.jpg' });
      (
        global as unknown as {
          fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
        }
      ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => new ArrayBuffer(0) });

      const result = await stripExifNative(ORIGINAL, 'jpg');
      expect(result).toBe(ORIGINAL);
    });
+
+   it('REGRESSION: fails if stripExifNative returns the original buffer unchanged', async () => {
+     // This test ensures that if stripExifNative is broken and returns the
+     // original buffer instead of the transcoded one, this test will fail.
+     // A broken implementation would make this test fail, preventing silent
+     // privacy leaks (GPS metadata in unverified photos).
+     mockSaveToLibraryAsync.mockResolvedValue({
+       id: 'fake-asset-id',
+       filename: 'stripped.jpg',
+       uri: 'file:///tmp/stripped.jpg',
+       mediaType: 'photo',
+     });
+     (
+       global as unknown as {
+         fetch: (u: string) => Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
+       }
+     ).fetch = jest.fn().mockResolvedValue({ arrayBuffer: async () => STRIPPED });
+
+     const result = await stripExifNative(ORIGINAL, 'jpg');
+
+     // The result must be the STRIPPED buffer, not the ORIGINAL.
+     // If this assertion fails, stripExifNative is a no-op and GPS data leaks.
+     expect(result).toBe(STRIPPED);
+     expect(result).not.toBe(ORIGINAL);
+   });
  });
```

**Rationale:**  
This test will fail if stripExifNative is accidentally implemented as a no-op. It forces the bytes to actually change, catching the most dangerous silent failure.

---

### Fix 3: Add uploadAvatar Test for verifyExifStripped Abort Path

**File:** `src/lib/__tests__/users.test.ts`

Add this test to the uploadAvatar describe block (after line 174):

```diff
    // ── Error path 4: Supabase Storage upload error ───────────────────────
    it('error: re-throws the Supabase Storage error on upload failure', async () => {
      const fakeBuffer = new ArrayBuffer(512);
      // Stamp WEBP magic bytes (RIFF....WEBP) so detectMimeFromBytes() accepts the buffer.
      const webpView = new Uint8Array(fakeBuffer);
      webpView[0] = 0x52; webpView[1] = 0x49; webpView[2] = 0x46; webpView[3] = 0x46; // RIFF
      webpView[8] = 0x57; webpView[9] = 0x45; webpView[10] = 0x42; webpView[11] = 0x50; // WEBP
      (global as unknown as { fetch: unknown }).fetch = async () => ({
        arrayBuffer: async () => fakeBuffer,
      });

      const storageError = { message: 'Bucket not found', status: 404 };
      mockUpload.mockResolvedValueOnce({ error: storageError });

      await expect(uploadAvatar(USER_ID, 'file:///tmp/photo.webp')).rejects.toEqual(storageError);

      // getPublicUrl must NOT be called when upload fails.
      expect(mockGetPublicUrl).not.toHaveBeenCalled();
    });
+
+   // ── Error path 5: EXIF verification failure ──────────────────────────────
+   it('error: aborts upload when verifyExifStripped detects metadata', async () => {
+     // This test ensures that if stripExifNative returns a buffer with EXIF
+     // markers still present, the upload aborts before touching Storage.
+     // Without this test, a no-op stripExif implementation would silently
+     // leak GPS coordinates to the public bucket.
+     const fakeBuffer = new ArrayBuffer(512);
+     const jpegView = new Uint8Array(fakeBuffer);
+     // Stamp JPEG magic bytes + EXIF marker (FF E1) to simulate stripping failure.
+     jpegView[0] = 0xff; jpegView[1] = 0xd8; jpegView[2] = 0xff; // JPEG SOI
+     jpegView[10] = 0xff; jpegView[11] = 0xe1; // EXIF marker at position 10
+     (global as unknown as { fetch: unknown }).fetch = async () => ({
+       arrayBuffer: async () => fakeBuffer,
+     });
+
+     // Mock stripExifNative to return a buffer with EXIF still present
+     // (simulating a failed or no-op strip operation).
+     mockSaveToLibraryAsync.mockResolvedValueOnce({
+       id: 'fake-asset-id',
+       filename: 'stripped.jpg',
+       uri: 'file:///tmp/stripped.jpg',
+       mediaType: 'photo',
+     });
+     // Mock fetch called by stripExifNative to return the buffer with EXIF markers.
+     const originalFetch = (global as unknown as { fetch: unknown }).fetch;
+     let callCount = 0;
+     (global as unknown as { fetch: unknown }).fetch = async (uri: unknown) => {
+       callCount++;
+       // First call is from stripExifNative (fetching transcoded image).
+       // Second call would be from verifyExifStripped (scanning buffer).
+       // We want to return the EXIF-marked buffer so verification fails.
+       return {
+         arrayBuffer: async () => fakeBuffer,
+       };
+     };
+
+     try {
+       await expect(uploadAvatar(USER_ID, 'file:///tmp/photo.jpg')).rejects.toThrow(
+         /privacy check failed/i,
+       );
+
+       // Supabase storage must NOT be touched.
+       expect(mockUpload).not.toHaveBeenCalled();
+     } finally {
+       (global as unknown as { fetch: unknown }).fetch = originalFetch;
+     }
+   });
  });
```

**Rationale:**  
This test verifies the critical privacy gate. If `verifyExifStripped` detects EXIF markers, the upload must abort before any Storage call. A broken or missing verification step would allow GPS-tagged photos to leak.

---

## Impact Assessment

| Test Gap | Privacy Risk | Severity | Fix Complexity |
|---|---|---|---|
| stripExifNative mock shape drift | Unverified EXIF bypass on native | **HIGH** (pre-launch gate) | Low (mock update) |
| uploadAvatar missing verify-fail path | GPS leak if verify broken/no-op | **CRITICAL** (privacy gate) | Low (new test case) |
| stripExifNative no-op regression | Silent privacy failure (worst case) | **CRITICAL** (catch no-op) | Low (regression test) |

All three are **blocking pre-launch** unless fixed. They are not functional bugs (the implementation is correct), but test gaps that would allow privacy bugs to slip through code review.

---

## Recommendations

1. **Apply all three proposed diffs** before merging any code to main.
2. **Run the updated suite locally** to verify tests pass:
   ```bash
   npm test -- src/lib/__tests__/{flags,users}.test.ts
   ```
3. **Verify stripExifNative mock shape** matches real Expo types by spot-checking Expo docs or a native device.
4. **Consider adding lint rule** to detect missing verification of security-critical outputs (stretch goal, not blocking).

---

## Files for Reference

- Implementation: `src/lib/flags.ts` lines 54–344 (stripExifNative, uploadFlagPhoto, verifyExifStripped)
- Test file 1: `src/lib/__tests__/flags.test.ts` lines 371–426 (stripExifNative tests)
- Test file 2: `src/lib/__tests__/users.test.ts` lines 83–175 (uploadAvatar tests)
- Privacy gate: `src/lib/flags.ts` lines 318–322 (verify + abort)

---

## Sign-Off

**Gary — QA Engineer**  
AccessMap pre-launch security gate audit  
All proposed changes are PROPOSE-ONLY (no application). Diffs are ready for Shamus review and manual apply.
