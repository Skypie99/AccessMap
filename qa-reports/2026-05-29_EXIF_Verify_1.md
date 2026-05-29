# EXIF GPS Stripping — Independent Verification Audit
**Date:** 2026-05-29
**Auditor:** Independent verification subagent (read-only, no prior report trust)
**Files read:** `src/lib/flags.ts`, `src/lib/users.ts`, `src/lib/__tests__/flags.test.ts`, `src/lib/__tests__/users.test.ts`

---

## Verdict: PARTIAL

The implementation is **functional for flag photo uploads** — `uploadFlagPhoto` correctly strips EXIF and **aborts** (throws) when verification fails. However, the equivalent path in `uploadAvatar` (users.ts) is **non-functional as a privacy gate** — it detects residual EXIF markers but proceeds with the upload anyway (only `console.warn`). The test suite does not catch this divergence.

---

## 1. stripExifNative — Is it a no-op?

**Not a no-op, but it has multiple fail-safe fallback paths that silently return the original.**

`flags.ts` lines 54–97:
- Line 75: calls `MediaLibrary.saveToLibraryAsync(dataUrl)` to transcode the image.
- Line 76–79: if the result is null or missing a URI → `console.warn` + **return original**.
- Line 84–87: if the fetched transcoded bytes are empty → `console.warn` + **return original**.
- Line 93–96: if any exception is thrown → `console.warn` + **return original**.
- Line 92: on success, returns the transcoded buffer (EXIF stripped by native re-encode).

**Assessment:** The native strip is a real attempt using `expo-media-library`. On success it produces a transcoded buffer with EXIF removed (the native re-encode discards metadata). On any failure it silently falls back to the original un-stripped buffer. This is intentional fail-safe design — but the next step (verifyExifStripped + abort) is what matters for the privacy gate.

---

## 2. verifyExifStripped — Control flow when markers detected

### In uploadFlagPhoto (flags.ts lines 318–322):

```
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  // D8 privacy gate: do not upload if GPS/EXIF metadata cannot be verified stripped.
  throw new Error('Photo privacy check failed. Please try a different photo or contact support.');
}
```

**Finding: UPLOAD ABORTS.** When `verifyExifStripped` returns false (markers detected), `uploadFlagPhoto` throws immediately. The Supabase storage upload on line 334 is never reached. This is a hard gate.

### In uploadAvatar (users.ts lines 81–84):

```
const exifCheckPassed = verifyExifStripped(arrayBuffer);
if (!exifCheckPassed) {
  console.warn('[EXIF] Verification detected possible metadata markers.');
}
```

**Finding: UPLOAD PROCEEDS.** When `verifyExifStripped` returns false, `uploadAvatar` only emits a console warning. The upload continues to line 96 unconditionally. This is a silent fail — the avatar will be uploaded with EXIF/GPS metadata intact if stripping failed.

**This is the critical divergence between the two prior reports.** Report A may have examined `uploadFlagPhoto` and called it done. Report B may have found `uploadAvatar`. Both were reading different functions.

---

## 3. Test quality — Do tests assert real stripping or mock pass-through?

### verifyExifStripped tests (flags.test.ts lines 328–362):
These test the pure function directly with raw byte arrays. They construct real byte patterns (0xFFE1, 0xFFED, 0xFFE9) and assert the function returns false. These are **genuine assertions on real logic** — they would fail if the marker-scan loop were removed.

### stripExifNative tests (flags.test.ts lines 371–426):
`mockSaveToLibraryAsync` is mocked. The "success" test (lines 387–399) does verify the returned buffer is the mocked STRIPPED buffer, not the original. **However:** the mock returns pre-built `STRIPPED = new Uint8Array([0x0a, 0x0b, 0x0c, 0x0d]).buffer` — a 4-byte buffer with no JPEG magic bytes and no EXIF markers. This buffer would pass `verifyExifStripped` trivially (no 0xFFE1/0xFFED/0xFFE9 bytes). The test does NOT verify that EXIF was actually removed from a real EXIF-bearing image. It only verifies the function returns whichever buffer the native API gives back.

**Assessment:** The stripExifNative tests prove the plumbing works (mock result flows through correctly) but cannot prove actual EXIF removal because they use synthetic buffers with no real metadata.

### stripExifWeb tests (flags.test.ts lines 435–452):
Only tests the `document === undefined` fallback path (Node/Jest environment). No test covers the canvas re-encoding path with a real image. The happy path is untested.

### uploadAvatar tests (users.test.ts lines 97–116):
The success test uses a 1 KB buffer with JPEG magic bytes (FF D8 FF) but no EXIF markers. `verifyExifStripped` will return true for this buffer (no markers to detect), so the test never exercises the `console.warn` branch. The non-blocking behavior when EXIF detection fires is **completely untested**.

---

## 4. Summary of Findings

| Claim | Verdict | Evidence |
|---|---|---|
| stripExifNative is functional | PARTIAL — real attempt with multiple fail-safe fallbacks to original | flags.ts:75-96 |
| stripExifWeb is functional | PARTIAL — real canvas re-encode on web, untested happy path | flags.ts:106-196 |
| uploadFlagPhoto aborts on EXIF detect | TRUE — throws with privacy error | flags.ts:318-322 |
| uploadAvatar aborts on EXIF detect | FALSE — console.warn only, upload proceeds | users.ts:81-84 |
| Tests verify real EXIF removal | FALSE — mocks pass synthetic bytes that trivially pass verification | flags.test.ts:387-399 |
| Tests would catch avatar privacy gate gap | FALSE — success test uses EXIF-free buffer | users.test.ts:97-116 |

---

## 5. Decisions for Sky

**D8 status (flag photos):** The flag photo upload path IS gated. D8 can be considered resolved for `uploadFlagPhoto`.

**NEW FINDING — avatar upload is not gated:** `uploadAvatar` in `users.ts` line 83 uses `console.warn` instead of `throw`. If a user's avatar photo contains GPS coordinates and stripping fails (any of the fail-safe fallback paths in stripExifNative), the metadata-bearing image will be uploaded silently. This is a privacy leak equivalent to D8 on a different code path.

**Recommended fix (propose-only — not applied by this auditor):**
In `users.ts` lines 81–84, change `console.warn` to `throw new Error(...)` matching the pattern in `uploadFlagPhoto`. The fix is one line.

---

## 6. Adjudication of Prior Reports

- **Report A ("12/12 tests passing, D8 closed")** — Partially correct on `uploadFlagPhoto`. Incorrect to close D8 globally without auditing `uploadAvatar`. Test count is accurate (tests exist and pass) but they do not prove EXIF is actually removed from real images.
- **Report B ("non-functional on native, upload does not abort")** — Incorrect that upload does not abort for flag photos. Correct that a code path exists where upload proceeds despite failed verification — but that path is in `uploadAvatar`, not `uploadFlagPhoto`.
