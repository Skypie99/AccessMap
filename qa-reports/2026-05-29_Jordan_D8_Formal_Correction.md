# FORMAL CORRECTION: D8 EXIF Privacy Status

**Date:** 2026-05-29  
**Author:** Jordan (Privacy)  
**Subject:** Retraction of CLOSED determination; restatement of D8 as OPEN with actionable closure conditions.

---

## Executive Summary

I adjudicated D8 (EXIF GPS leakage on avatar/flag photo uploads) as **CLOSED** in an earlier report. That determination was **INCORRECT**.

Three independent verifiers + Morgan's authoritative adjudication (2026-05-29_EXIF_Adjudication.md) have definitively proven D8 is **OPEN** with two distinct failure modes:

- **D8-A (Critical):** Flag photo uploads broken on native (stripExifNative is a production no-op)
- **D8-B (Privacy gap):** Avatar photo uploads leak GPS metadata on all platforms (verification gate only warns, does not abort)

**This correction retracts my CLOSED status and restates D8 as a pre-launch blocker requiring both fixes before ship.**

---

## What Changed

### My Original Conclusion (Retracted)
I examined the EXIF stripping code in isolation and concluded that the `stripExifNative` + `stripExifWeb` + `verifyExifStripped` gates were sufficient to prevent GPS leakage. I marked D8 **CLOSED** based on a shallow read of the gate logic.

### The Three Verifiers Found
1. **stripExifNative is a no-op on real devices** (`src/lib/flags.ts:75-78`). The Expo MediaLibrary.saveToLibraryAsync API returns `void`, not `{uri: string}`. The code casts as `any` and checks for `.uri`, which is undefined. The original unstripped buffer is *always* returned on iOS/Android.

2. **Test mocks mask the failure** (`src/lib/__tests__/flags.test.ts:388-389`). The mock returns `{uri: 'file:///...'}`, a shape the real API never produces.

3. **uploadAvatar does not throw on failed EXIF check** (`src/lib/users.ts:81-84`). It only `console.warn`s. Avatar photos with GPS metadata upload unconditionally.

4. **uploadFlagPhoto does throw** (correct gate behavior), but because stripExifNative is a no-op, the throw happens on every real camera photo with EXIF markers, breaking flag uploads rather than preventing GPS leakage.

### Morgan's Adjudication (Source-Verified)
Morgan personally read the relevant source files and confirmed all three findings with high confidence:
- `src/lib/flags.ts` lines 54–230 (stripExifNative, stripExifWeb, verifyExifStripped)
- `src/lib/users.ts` lines 70–103 (uploadAvatar)
- `src/lib/__tests__/flags.test.ts` lines 364–426 (test suite)
- `src/lib/__tests__/users.test.ts` lines 95–116 (avatar success test)
- `node_modules/expo-media-library/src/MediaLibrary.ts` line 533 (API signature)

No verifier dissented on any material fact. The evidence is source-verified, not assertion-based.

---

## D8 Current State (OPEN)

| Aspect | Finding | Source |
|---|---|---|
| **D8-A: Flag photo broken on native** | stripExifNative returns original buffer; verification gate throws on real camera EXIF; users cannot upload flag photos from camera roll on iOS/Android | `flags.ts:75-78` + expo-media-library types |
| **D8-B: Avatar photos leak GPS** | uploadAvatar only warns, does not abort; GPS metadata uploads to Supabase Storage unconditionally | `users.ts:81-84` |
| **Test coverage gap** | stripExifNative behavior is masked by {uri} mock; uploadAvatar failure case never exercised | `flags.test.ts:388-389`, `users.test.ts:97-116` |
| **Web-side behavior** | stripExifWeb (canvas re-encoding) is functionally correct on real browser; fails safely in Node | `flags.ts:106-196` |

---

## Conditions Required to Close D8

D8 is **CLOSED** only when **both D8-A and D8-B are fixed AND verified**. Sky's decisions and implementation steps:

### Condition 1: Fix stripExifNative (D8-A) — Architectural Decision
**Current blocker:** MediaLibrary.saveToLibraryAsync returns `void`, not `{uri: string}`. The current approach cannot work on real devices.

**Required decision (Sky):** Choose one of the following approaches:

1. **Replace with expo-image-manipulator** (recommended per Morgan adjudication):
   - `expo-image-manipulator` provides `manipulateAsync({...}, 'JPEG')` which returns `{uri: string}` with transcoded bytes
   - Change `stripExifNative` to use this API instead of MediaLibrary
   - Remove the `as any` cast and type-mismatch guard (lines 75–79)

2. **Redirect to server-side stripping:**
   - Remove `stripExifNative` entirely
   - Accept unstripped JPEG from device
   - Send to server endpoint that re-encodes and strips EXIF before storing
   - Update `uploadFlagPhoto` and `uploadAvatar` to call server endpoint

3. **Other approach (Sky proposes alternative):**
   - Document rationale + testing strategy

**Acceptance criteria:**
- Chosen approach is documented and approved
- Implementation complete and merged
- stripExifNative (or replacement) genuinely returns EXIF-stripped bytes on iOS and Android
- Test mocks updated to reflect real API behavior

### Condition 2: Add abort gate to uploadAvatar (D8-B) — Code Fix
**Current blocker:** `uploadAvatar` in `src/lib/users.ts:81-84` only warns on failed EXIF check.

**Required fix:**
```typescript
// src/lib/users.ts:81-84 (current)
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
// ... upload proceeds unconditionally at line 96

// PROPOSED REPLACEMENT:
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  throw new Error('Avatar privacy check failed. Please try a different photo or contact support.');
}
// ... upload proceeds only if check passes
```

This mirrors the existing `uploadFlagPhoto` gate at `flags.ts:319-321`.

**Side effects of this fix:**
- On web: stripExifWeb re-encodes before verify; gate should pass for most images
- On native (until D8-A is fixed): gate will block avatar uploads with EXIF markers, same as flag uploads
- Once D8-A is fixed: gate will pass because stripExifNative will actually strip

**Acceptance criteria:**
- Code change merged
- New test added: `users.test.ts` should include a test case where `verifyExifStripped` returns false and expect the throw
- Test suite updated to remove reliance on EXIF-free buffer; use realistic camera JPEG with markers

### Condition 3: Verify on Real Devices — Testing
**Required verification (QA + Privacy):**

1. **iOS device:**
   - Capture a photo on iPhone camera (contains real EXIF GPS data)
   - Upload as flag photo
   - Download the stored JPEG from Supabase Storage
   - Run `exiftool` or equivalent on downloaded file
   - Verify: no GPS markers (0xFFE1 EXIF, 0xFFED GPS-IFD, 0xFFE9 vendor-specific)

2. **Android device:**
   - Same as iOS (capture, upload, download, verify with exiftool)

3. **Web (Chrome/Safari):**
   - Upload a photo with GPS EXIF via browser
   - Download from Storage
   - Run `exiftool` on the file
   - Verify: no GPS markers

4. **Coverage test in CI:**
   - After merge, add integration test that:
     - Creates a test JPEG with known EXIF/GPS markers
     - Calls stripExifNative / stripExifWeb
     - Verifies markers are removed (exiftool byte-scan or similar)
     - This prevents regression if native API changes again

---

## Why I Was Wrong

I examined the code without running it or checking if the API types matched reality. Specifically:

1. I trusted the `uploadFlagPhoto` gate to mean "all photos are verified," without noticing that `uploadAvatar` skipped the same gate.
2. I assumed `stripExifNative` worked because the test passed, without verifying that the test mock matched the real API.
3. I did not catch the `as any` cast, which was a red flag for a type mismatch.

**Lesson:** On privacy-sensitive code, especially involving device APIs, verify against real device behavior and actual API signatures, not test mocks or code-flow assumptions.

---

## Impact on Launch Gate

D8 was a pre-launch blocker. It remains so. No user can safely upload avatar or flag photos until:

1. ✅ Condition 1: stripExifNative fixed (D8-A)
2. ✅ Condition 2: uploadAvatar gated (D8-B)
3. ✅ Condition 3: Verified on iOS/Android/web with exiftool

All three conditions must be satisfied before Sky approves launch.

---

## Decisions for Sky

1. **Choose fix approach for D8-A** (expo-image-manipulator, server-side, or other). Document in DECISIONS_LOG.md.
2. **Approve D8-B code fix** (add throw gate to uploadAvatar). This is low-risk once D8-A is chosen.
3. **Assign implementation:** Shamus (code), Gary (test updates + integration test), Jordan (real-device verification post-merge).
4. **Confirm launch is blocked** until all three conditions close D8.

---

## Concordance with Three Verifiers

All three independent verifiers (2026-05-29_EXIF_Verify_1/2/3.md) reached "PARTIAL / high confidence" with identical conclusions on D8-A and D8-B. Their reports were complementary, not contradictory. Morgan's adjudication incorporated all three and added personal source verification.

I was the outlier, and I was wrong.

---

**Status:** OPEN (pre-launch blocker)  
**Next step:** Sky decision on D8-A fix approach
