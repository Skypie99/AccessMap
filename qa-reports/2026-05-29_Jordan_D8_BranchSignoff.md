# Jordan Privacy Review — D8 EXIF Fix Branch Signoff
**Date:** 2026-05-29  
**Branch Audited:** `shamus/d8-exif-fix-2026-05-29`  
**Auditor:** Jordan (Privacy)  
**Mode:** Code review + Constitutional compliance check (no commits applied)

---

## Summary

The branch **successfully closes both D8-A and D8-B** in code:

1. **D8-A (Flag photo upload broken on native):** CLOSED. Replaced `expo-media-library.saveToLibraryAsync` (API misuse; returns void) with `expo-image-manipulator.manipulateAsync` (genuine re-encode; returns uri). The function now actually strips EXIF via platform codec on iOS/Android. Failure path returns `null` and aborts upload.

2. **D8-B (Avatar photo GPS leak):** CLOSED. Added abort-throw gate to `uploadAvatar`, matching the pattern in `uploadFlagPhoto`. Now throws `'Photo privacy check failed...'` when `verifyExifStripped` detects EXIF markers. Previously only `console.warn`ed.

**Tests are comprehensive:** Both functions now exercise real failure modes (EXIF marker detection, ImageManipulator failures, empty buffer). The stripExifNative regression test ensures the buffer actually changes, preventing silent no-op bugs.

**No opt-out path exists:** Per Sky's directive, stripping is always-on; no UI or config flag to disable it.

---

## Detailed Findings

### D8-A: stripExifNative — Functionally Repaired

#### What Was Broken
- **Old code (before branch):** `MediaLibrary.saveToLibraryAsync(dataUrl)` — This API saves a photo to the device library and returns `void` (or Asset ID). The code cast it `as any` and checked for `.uri`, which would always be undefined on real devices. The fallback returned the original unstripped buffer.
- **Result:** Flag photo stripping was a no-op on iOS/Android. GPS EXIF leaked silently.

#### What is Fixed
- **New code:** `ImageManipulator.manipulateAsync(dataUrl, [], {format, compress})` — This re-encodes the image through the platform codec with no metadata passthrough. Returns `{uri: 'file://...'}` which is actually a fresh file with EXIF stripped.
- **Result:** Flag photo stripping now works on all platforms (native + web).

#### Key Code Path (flags.ts:54–97)
```typescript
const result = await ImageManipulator.manipulateAsync(dataUrl, [], { 
  compress: 0.9, 
  format: saveFormat 
});
// result.uri is a fresh file:// URI with no metadata.
const strippedResponse = await fetch(result.uri);
const strippedBuffer = await strippedResponse.arrayBuffer();
if (strippedBuffer.byteLength === 0) {
  console.warn('[EXIF] ImageManipulator output is empty; stripping failed.');
  return null;  // D8 fail-closed: abort upload
}
return strippedBuffer;
```

#### Abort Gate in uploadFlagPhoto (flags.ts:315–327)
```typescript
const stripped = await stripExifNative(arrayBuffer, ext);
if (stripped === null) {
  throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.');
}
arrayBuffer = stripped;
```

- ✅ **Returns null on failure:** Yes, all error paths (ImageManipulator exception, empty buffer) return `null`.
- ✅ **Throws on null:** Yes, gate throws immediately, preventing upload.
- ✅ **Never silent fallback:** Correct; no code path returns original buffer.

---

### D8-B: uploadAvatar — Privacy Gate Added

#### What Was Broken
- **Old code:** `uploadAvatar` ran `verifyExifStripped` but only `console.warn`ed on failure. Upload proceeded unconditionally.
- **Result:** Avatar photos with GPS EXIF silently uploaded to public bucket. Users' home locations leaked.

#### What is Fixed
- **New code:** `uploadAvatar` now throws on failed verification, matching `uploadFlagPhoto` pattern.

#### Abort Gate in uploadAvatar (users.ts:103–108)
```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  // D8 privacy gate: abort upload if EXIF markers are still present.
  // Mirrors uploadFlagPhoto behavior in src/lib/flags.ts — same gate, same
  // rationale (avatar selfies likely contain the user's home GPS coordinates).
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

- ✅ **Same error message as flags:** Yes, both use "Photo privacy check failed..."
- ✅ **Throws, not warns:** Yes, gate is hard (`throw`), not soft (`console.warn`).
- ✅ **Blocks all uploads on EXIF detection:** Yes, Supabase upload unreachable when this throws.

---

## Test Coverage Analysis

### stripExifNative Tests (flags.test.ts)

**What is tested:**

1. ✅ **Happy path:** MockImageManipulator returns `{uri:...}`, mock fetch returns different bytes (STRIPPED vs ORIGINAL). Test asserts `result === STRIPPED`.

2. ✅ **ImageManipulator throws:** Mocks exception; asserts `result === null` (fail-closed).

3. ✅ **Fetch returns empty buffer:** Asserts `result === null` (fail-closed).

4. ✅ **REGRESSION TEST (new):** Asserts that `result !== ORIGINAL` (if the function broke and returned original unchanged, this would fail and catch the silent privacy bug).

**Test quality:**
- Real failure modes are exercised (exception, empty bytes).
- The regression test is essential — it prevents a broken implementation that returns `ORIGINAL` from passing.
- Mock shapes (Asset with id/filename/uri/mediaType) match real expo-media-library types.

### uploadAvatar Tests (users.test.ts)

**What is tested:**

1. ✅ **File size validation:** Rejects files > 10 MB before EXIF step.

2. ✅ **MIME type validation:** Rejects non-image buffers.

3. ✅ **Success path:** Valid JPEG (no EXIF markers), verifies upload completes and returns publicUrl.

4. ✅ **Supabase Storage error:** Mocks upload failure; asserts error is re-thrown.

5. ✅ **EXIF verification failure (new):** Mocks fetch to return buffer with EXIF markers (0xFF 0xE1). Asserts upload throws before Storage is touched.

**Test quality:**
- The EXIF failure path is new and essential. Without it, a broken verification (e.g., inverted boolean) would silently leak GPS.
- Real JPEG marker bytes (0xFF 0xD8 0xFF, 0xFF 0xE1) are used; `verifyExifStripped` will detect 0xE1 and return false.
- Fetch call count tracking ensures we're testing the right code path.

### verifyExifStripped Tests (flags.test.ts, lines 328–362)

**What is tested:**
- ✅ Returns `true` for clean JPEG (no 0xFFE1/0xFFED/0xFFE9 markers).
- ✅ Returns `false` for JPEG with 0xFFE1 (EXIF).
- ✅ Returns `false` for JPEG with 0xFFED (IPTC).
- ✅ Returns `false` for JPEG with 0xFFE9 (XMP).

**Test quality:**
- These are unit tests on a pure function; they are correct and comprehensive.
- They do NOT test PNG chunk scanning (PNG uses iTXt, zTXt chunks) — that's a known limitation of the heuristic, but JPEG is the dominant format from camera roll.

---

## Code Quality Checks

### No Opt-Out / Disable-Stripping Path

**Verified:** Searched diff for "disable", "opt-out", "skip.*exif", "EXIF_STRICT_MODE", feature flags.

Result: No opt-out UI, no configuration flag to skip stripping. The only mention of a debug mode is:

```
A feature flag (`__DEV__` guard or a new `flags.ts` constant `EXIF_STRICT_MODE = true`) 
could make the throw conditional during debugging if needed, but should never be 
disabled in production.
```

This is **documented intent, not code** — the comment notes it *could* be done but *isn't done in this branch*. The implementation throws unconditionally. ✅ **COMPLIANT with Sky's directive.**

### Always-On Stripping

- ✅ Both `uploadFlagPhoto` and `uploadAvatar` call strip/verify unconditionally on all platforms.
- ✅ No conditional branches allow photos to skip the gate.
- ✅ Platform-specific paths (web vs native) both enforce verification: web uses `stripExifWeb`, native uses new `stripExifNative`.

### Dependency Addition

- ✅ `expo-image-manipulator@~14.0.8` added to `package.json` and `package-lock.json`.
- ✅ Imported at top of `flags.ts`: `import * as ImageManipulator from 'expo-image-manipulator';`
- ✅ This is the **only** external dependency change needed for D8-A.

---

## Remaining Conditions to Fully Close D8

Both D8-A and D8-B are **closed in code**. However, pre-launch verification requires:

### Real-Device Testing (Cannot be automated; requires manual testing)

1. **iOS real device EXIF stripping:**
   - Pick a photo with GPS EXIF from Photos app (or Camera roll with location enabled).
   - Upload as flag photo or avatar through AccessMap.
   - Use `exiftool` on the backend to scan the uploaded file in Supabase Storage.
   - **Assertion:** EXIF block (0xFFE1) must be absent. Uploaded file must have no GPS coordinates.

2. **Android real device EXIF stripping:**
   - Same as iOS: pick real photo with GPS, upload, scan with `exiftool`.
   - **Assertion:** No EXIF markers.

3. **Web browser EXIF stripping (canvas re-encode):**
   - Upload flagphoto from web browser (chrome, safari).
   - Scan uploaded file with `exiftool`.
   - **Assertion:** No EXIF block.

### Dependency Installation (May be deferred if EAS is not yet configured)

- ✅ `expo-image-manipulator@14.0.8` is declared in package.json.
- ⏳ **On first `eas build`:** EAS will install the Expo library's native modules for iOS/Android.
  - If EAS not yet configured, this can be deferred until the Expo build system is set up.
  - If EAS is already configured: Run `eas build --platform ios` and `eas build --platform android` to verify builds complete without native linking errors.

---

## Constitutional Compliance

### Privacy (Constitution Art. 7.2)
- ✅ Location data (GPS EXIF) is treated as privacy-sensitive.
- ✅ Stripping is mandatory (no user opt-out).
- ✅ Failure path is fail-closed (abort upload on any doubt).
- ✅ No credentials/secrets in code.
- ✅ No external sends (no API calls to untrusted services).

### Code Change Scope
- ✅ Branch is `shamus/d8-exif-fix-2026-05-29`, not main.
- ✅ This is a single coherent privacy fix (D8).
- ✅ No modification of `~/.claude`, `~/ClaudeCorp`, or live databases.
- ✅ All changes are reversible (code + test files only).

---

## Sign-Off

### D8-A (Flag photo upload stripped on native): CLOSED IN CODE
- `stripExifNative` now uses `expo-image-manipulator` (genuine re-encode).
- Returns `null` on failure.
- `uploadFlagPhoto` throws when `stripped === null`.
- Tests exercise real failure modes and regression.

### D8-B (Avatar photo GPS leak): CLOSED IN CODE
- `uploadAvatar` now throws on failed `verifyExifStripped`.
- Matches `uploadFlagPhoto` gate behavior.
- Test exercises EXIF marker detection path.

### No Opt-Out UI: VERIFIED
- No disable-stripping UI added.
- No feature flags to skip verification.
- Stripping is always-on per Sky's directive.

### Code Ready for Real-Device Testing
- ✅ Implementation correct per Constitution Art. 5 (privacy).
- ✅ Tests are comprehensive and meaningful.
- ✅ Dependency declared and installed.

**Branch is APPROVED for merge once:**
1. Real-device exiftool verification completes (iOS, Android, web).
2. EAS build succeeds (if not already configured, can be deferred).

No further code review blockers.

---

**Auditor:** Jordan (Constitution Art. 7.2 enforcer — privacy code, extra care)  
**Audit Date:** 2026-05-29  
**Branch SHA:** (current HEAD of shamus/d8-exif-fix-2026-05-29)
