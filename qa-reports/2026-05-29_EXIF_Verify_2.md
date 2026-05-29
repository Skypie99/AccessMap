# EXIF GPS Strip — Independent Verification Audit 2
**Date:** 2026-05-29  
**Auditor:** Independent verification subagent (claude-sonnet-4-6)  
**Verdict:** PARTIAL  
**Confidence:** High

---

## Scope

Two prior reports contradict each other on whether EXIF GPS stripping is functional. This audit reads the actual source directly and adjudicates.

Files read:
- `/Users/skypie/AccessMap/src/lib/flags.ts` (full file, 894 lines)
- `/Users/skypie/AccessMap/src/lib/users.ts` (full file, 120 lines)
- `/Users/skypie/AccessMap/src/lib/__tests__/flags.test.ts` (full file, 508 lines)

---

## Finding 1 — stripExifNative: Fundamental API Misuse (NON-FUNCTIONAL)

**File:** `src/lib/flags.ts`, lines 54–97

The native path calls `MediaLibrary.saveToLibraryAsync(dataUrl)` and expects the return value to be an object with a `uri` property containing the transcoded asset path.

```ts
// flags.ts line 75
const strippedAsset = await (MediaLibrary.saveToLibraryAsync(dataUrl) as any);
if (!strippedAsset || !strippedAsset.uri) {
  console.warn('[EXIF] Native transcode failed; using original.');
  return arrayBuffer;
}
```

**Problem:** `expo-media-library`'s `saveToLibraryAsync` saves an asset to the device photo library and returns `void` (or a string asset ID on some platforms), NOT an object with a `.uri` field. The function does not perform transcoding on behalf of the caller — it is a "save to camera roll" API. The returned value will be `undefined` (void return) or a plain asset ID string, which means `!strippedAsset` or `!strippedAsset.uri` will almost always be truthy, causing the code to fall through to:

```ts
console.warn('[EXIF] Native transcode failed; using original.');
return arrayBuffer;  // line 78 — returns ORIGINAL, unstripped buffer
```

The native strip path is effectively a no-op — it always returns the original, unstripped buffer on any real device. The `as any` cast on line 75 suppresses the TypeScript error that would have caught this.

---

## Finding 2 — stripExifWeb: Likely Functional (in browser)

**File:** `src/lib/flags.ts`, lines 106–196

The web path uses canvas re-encoding: draws the image onto a `<canvas>`, then exports via `canvas.toBlob()`. This is a well-established method that discards EXIF metadata. It is architecturally sound.

All error paths return the original buffer (fail-safe). The implementation is correct for browsers. It has no equivalent API misuse issue.

---

## Finding 3 — verifyExifStripped: Functional as a heuristic checker

**File:** `src/lib/flags.ts`, lines 206–230

Scans the byte array for JPEG metadata markers (0xFFE1 EXIF, 0xFFED IPTC, 0xFFE9 XMP). Returns `true` if clean, `false` if a marker is found. The logic is correct for JPEG marker detection.

**Limitation:** This is a byte-scan heuristic, not a full EXIF parser. It would not catch metadata stored via non-standard markers or embedded in PNG chunks. But for JPEG (the dominant format from camera roll), it is sufficient to detect standard EXIF blocks containing GPS.

---

## Finding 4 — uploadFlagPhoto: DOES abort when verifyExifStripped fails

**File:** `src/lib/flags.ts`, lines 317–322

```ts
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

The flag photo upload path **DOES throw** (abort) when `verifyExifStripped` returns false. Report B's claim that upload "proceeds with only a console.warn" is **WRONG for flag photos**.

---

## Finding 5 — uploadAvatar in users.ts: Does NOT abort (console.warn only)

**File:** `src/lib/users.ts`, lines 81–84

```ts
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
```

Avatar upload continues past a failed EXIF check. There is no `throw` here. A user's avatar photo with GPS EXIF embedded will be uploaded successfully. This is a real privacy gap — avatars are also user-generated photos that can contain GPS data.

---

## Finding 6 — Test Suite: Tests Exercise Mocked Behavior That Would Pass Even If Stripping Were a No-op

**File:** `src/lib/__tests__/flags.test.ts`

The `stripExifNative` test suite (lines 371–426) mocks `expo-media-library`:

```ts
const mockSaveToLibraryAsync = jest.fn();
jest.mock('expo-media-library', () => ({
  saveToLibraryAsync: (...args: unknown[]) => mockSaveToLibraryAsync(...args),
}));
```

The "success" test (lines 387–399) has:
```ts
mockSaveToLibraryAsync.mockResolvedValue({ uri: 'file:///tmp/stripped.jpg' });
```

This mocks `saveToLibraryAsync` to return `{ uri: '...' }` — but the real API does NOT return this shape. The test passes because the mock returns the shape the code expects, not because the real API would work. The test validates the code's internal logic only; it does not validate that the API contract is correct. If the real API were called, `strippedAsset.uri` would be undefined and the test would instead hit the fail-safe path.

The `verifyExifStripped` tests (lines 328–362) test the pure byte-scan function directly against literal byte arrays — these are correct and meaningful.

The `stripExifWeb` test (lines 435–452) only validates the `document === undefined` guard (Node/Jest environment). It does not test actual canvas re-encoding behavior (not possible in Jest without jsdom + canvas mock).

---

## Summary of Each Prior Report's Accuracy

| Claim | Source | Verdict |
|---|---|---|
| "EXIF stripping FULLY FUNCTIONAL on native" | Report A | WRONG — saveToLibraryAsync API misuse causes always-fail-safe fallback |
| "12/12 tests passing proves functional" | Report A | WRONG — tests mock the API to return what the code expects, not what the API actually returns |
| "D8 closed" | Report A | WRONG — D8 remains open; native path is a no-op |
| "upload does NOT abort when verifyExifStripped fails" | Report B | WRONG for flag photos (uploadFlagPhoto throws). CORRECT for avatar (uploadAvatar only warns) |
| "NON-FUNCTIONAL on native" | Report B | CORRECT — native path falls back to original buffer due to API misuse |

---

## Verdict

**PARTIAL**

- `stripExifWeb` (browser/web): Functionally correct architecture.
- `stripExifNative` (iOS/Android): Non-functional — always falls back to original unstripped buffer due to `saveToLibraryAsync` returning void/string, not `{ uri: string }`. GPS EXIF is NOT removed from photos taken on native devices.
- `verifyExifStripped`: Functional heuristic for JPEG markers.
- `uploadFlagPhoto` gating: DOES abort on failed verification (throw). But because native stripping fails silently and returns the original unstripped buffer, `verifyExifStripped` may or may not catch the metadata (it will catch it if the JPEG has standard 0xFFE1 markers, blocking the upload; it will miss non-standard or PNG metadata).
- `uploadAvatar` gating: Does NOT abort — proceeds with console.warn only. Privacy gap.

**D8 must remain OPEN.** Native EXIF stripping is a no-op. The correct fix is to use a dedicated EXIF-stripping library (e.g. `piexifjs`, `exifreader`, or manual ArrayBuffer manipulation to excise JPEG APP1 segments) rather than `saveToLibraryAsync`.

---

## Decisions for Sky

1. **D8 remains open.** Native EXIF/GPS stripping does not work. Every photo submitted from iOS or Android may contain GPS coordinates in EXIF.
2. **Avatar upload is also unprotected.** `uploadAvatar` in `src/lib/users.ts` only logs a warning on failed EXIF check — it does not abort. This is a separate privacy gap.
3. **Recommended fix (native):** Replace `saveToLibraryAsync` with a true EXIF-strip implementation: parse the JPEG ArrayBuffer and remove APP1/APP13/APP9 segments manually, or use a vetted JS library. Do not use expo-media-library for this purpose.
4. **Tests need to be updated** once the fix lands — the current mock hides the API contract mismatch.
