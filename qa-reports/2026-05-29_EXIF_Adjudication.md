# EXIF Privacy Adjudication — Morgan Final Verdict
**Date:** 2026-05-29
**Adjudicator:** Morgan (Constitution Art. 7.2 — location/disability data)
**Input:** Three independent verifier reports (2026-05-29_EXIF_Verify_1/2/3.md)
**D8 Status:** OPEN

---

## Methodology

All three verifiers agreed on the high-confidence findings. I personally read the following files from source before adjudicating — I do not rely on prior reports' conclusions alone:

- `src/lib/flags.ts` lines 54–230 (stripExifNative, stripExifWeb, verifyExifStripped, uploadFlagPhoto gate)
- `src/lib/users.ts` lines 70–103 (uploadAvatar)
- `src/lib/__tests__/flags.test.ts` lines 364–426 (stripExifNative test suite)
- `src/lib/__tests__/users.test.ts` lines 95–116 (uploadAvatar success test)
- `node_modules/expo-media-library/src/MediaLibrary.ts` line 533 (saveToLibraryAsync signature)

---

## Adjudication: Three Questions

### (a) Is EXIF stripping actually functional on native?

**Verdict: NO — stripExifNative is a production no-op on iOS/Android.**

Source-verified finding. The Expo MediaLibrary TypeScript definition at `node_modules/expo-media-library/src/MediaLibrary.ts:533` declares:

```typescript
export async function saveToLibraryAsync(localUri: string): Promise<void>
```

The code at `src/lib/flags.ts:75` casts the return value with `as any` and then checks `strippedAsset.uri` at line 76:

```typescript
const strippedAsset = await (MediaLibrary.saveToLibraryAsync(dataUrl) as any);
if (!strippedAsset || !strippedAsset.uri) {
  console.warn('[EXIF] Native transcode failed; using original.');
  return arrayBuffer;
}
```

Because `saveToLibraryAsync` returns `void` (not `{uri: string}`), `strippedAsset` is `undefined`. The guard at line 76 fires unconditionally. The original unstripped buffer is always returned on native. This is not a corner case — it is the only possible code path on iOS/Android.

The test suite at `flags.test.ts:387-399` mocks `saveToLibraryAsync` to return `{ uri: 'file:///tmp/stripped.jpg' }` — a shape the real API never produces. Tests pass. Production fails silently.

**stripExifWeb (canvas re-encoding at `flags.ts:106-196`) is functionally correct** in a real browser environment. It genuinely strips EXIF by drawing through canvas and re-encoding. It fails safely in Node/test environments (document===undefined guard at line 110).

### (b) Does upload gate on verification failure?

**Verdict: SPLIT — flag photos YES, avatar photos NO.**

**uploadFlagPhoto (`src/lib/flags.ts:317-322`):** GATED. Verified from source.

```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

The Supabase upload at line 334 is unreachable when this throws. The gate is real.

**Consequence of (a) + gate:** On native, stripExifNative always returns the original buffer. verifyExifStripped then scans the original. If the original JPEG contains 0xFFE1/0xFFED/0xFFE9 markers (standard EXIF — practically all camera-captured photos), verifyExifStripped returns false and the upload throws. This means flag photo uploads are effectively broken on native for any real camera photo, rather than leaking GPS. The failure mode is upload-blocking rather than GPS-leaking — but it is still a critical bug.

**uploadAvatar (`src/lib/users.ts:81-84`):** NOT GATED. Verified from source.

```typescript
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
// ... upload proceeds unconditionally at line 96
```

No throw. Upload proceeds regardless of EXIF check result. Avatar photos with GPS metadata silently upload. The test at `users.test.ts:97-116` uses a buffer with JPEG magic but no EXIF markers, so the console.warn branch is never exercised. This is a separate, unmitigated GPS leak path.

### (c) Is D8 a real OPEN pre-launch blocker?

**Verdict: OPEN. D8 remains a pre-launch blocker. It is also now a two-part blocker.**

All three verifiers reached "PARTIAL" with high confidence and unanimous agreement on the key facts. The evidence is source-verified, not assertion-based. Under the Constitution's default-to-safer rule for privacy data (Art. 7.2), OPEN is the only correct call.

---

## Definitive Findings Summary

| Finding | Status | Source |
|---|---|---|
| stripExifNative is a no-op on real devices | CONFIRMED | `flags.ts:75-78` + expo-media-library TypeScript types |
| stripExifWeb (canvas) is functionally correct on web | CONFIRMED | `flags.ts:106-196` |
| uploadFlagPhoto throws and aborts on failed EXIF check | CONFIRMED | `flags.ts:319-321` |
| uploadAvatar only console.warns and proceeds on failed EXIF check | CONFIRMED | `users.ts:81-84` |
| Test suite masks native no-op via {uri} mock | CONFIRMED | `flags.test.ts:388-389` |
| uploadAvatar EXIF failure path never exercised by any test | CONFIRMED | `users.test.ts:97-116` |

---

## Decisions for Sky

**D8 is OPEN with two distinct failure modes requiring two distinct fixes:**

**D8-A (Critical — flag photo upload broken on native):**
`stripExifNative` is a production no-op because `MediaLibrary.saveToLibraryAsync` returns `void`, not `{uri: string}`. On any real camera photo with EXIF markers, `verifyExifStripped` returns false and `uploadFlagPhoto` throws. Flag photo uploads are broken on iOS/Android for all standard camera photos — users cannot upload flag photos from their camera roll on native.

Fix required: Replace `stripExifNative`'s approach. Either use a library that actually returns transcoded bytes (e.g. `expo-image-manipulator` which returns `{uri: string}`), or remove the native path and redirect to a server-side stripping approach. The `as any` cast hid this type mismatch from TypeScript.

**D8-B (Privacy gap — avatar photos leak GPS on all platforms):**
`uploadAvatar` in `src/lib/users.ts:81-84` runs `verifyExifStripped` but only `console.warn`s on failure — it does not throw or abort. Avatar photos with GPS EXIF upload unconditionally. On web, stripExifWeb at least attempts stripping before the verify; on native, the no-op means the original GPS-tagged buffer uploads.

Fix required: Add the same abort-throw pattern to `uploadAvatar` that `uploadFlagPhoto` has. Additionally, either fix D8-A first (so stripping actually works before the gate blocks) or accept that the gate will block some avatar uploads too until the native strip is repaired.

**Sky's decision needed:**
1. Approve fix approach for D8-A (expo-image-manipulator vs. server-side vs. other). This is an architectural choice that changes a native API dependency.
2. Confirm D8-B fix (upgrade uploadAvatar to throw on failed EXIF check). Low-risk, high-impact.
3. Confirm launch is blocked until both D8-A and D8-B are resolved. No flag photo uploads work on native today.

**Proposed assignees:** Shamus (implementation), Gary (test fixes — mocks need to reflect real API behavior), Jordan (privacy sign-off once fixed).

---

## Verifier Concordance

All three verifiers returned "PARTIAL / high confidence" with identical conclusions on all load-bearing claims. No verifier dissented on any fact adjudicated here. The "contradiction" in the original reports was not a real disagreement — they were examining the same code and reached the same conclusions. The reports were complementary, not contradictory.
