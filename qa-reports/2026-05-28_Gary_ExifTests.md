# QA Report — EXIF Strip Test Coverage
**Role:** Gary (QA Engineer)
**Date:** 2026-05-28
**Branch:** `test/gary-exif-2026-05-28` (based on `privacy/exif-strip-2026-05-28`)
**Commit:** `7361873`

---

## Summary

12 new unit tests written for the EXIF metadata stripping feature shipped today on `privacy/exif-strip-2026-05-28`. All 884 tests pass (up from 872 on main). Typecheck clean. **Sign-off: READY TO MERGE.**

---

## What Was Tested

### A — `verifyExifStripped` (7 tests)
The privacy gate that confirms metadata was removed before upload. Tested as a pure function (exported for testability).

| Test | Result |
|---|---|
| Empty ArrayBuffer → true | ✅ |
| Benign bytes (no markers) → true | ✅ |
| EXIF marker 0xFFE1 at position 0 → false | ✅ |
| EXIF marker 0xFFE1 mid-buffer (scan loop tested) → false | ✅ |
| IPTC marker 0xFFED → false | ✅ |
| XMP marker 0xFFE9 → false | ✅ |
| JPEG SOI 0xFFD8 + 0xFFE0 (benign JFIF marker) → true | ✅ |

**Key finding:** The JPEG SOI test is important — 0xFFD8 is benign (start-of-image), not metadata. Confirmed the function doesn't false-positive on it.

### B — `stripExifNative` (4 tests)
Native iOS/Android transcode path using `expo-media-library`. All fail-safes return the ORIGINAL buffer — user's photo is never lost.

| Test | Result |
|---|---|
| MediaLibrary success → returns stripped buffer | ✅ |
| MediaLibrary returns null → returns original (fail-safe) | ✅ |
| MediaLibrary throws → returns original (fail-safe) | ✅ |
| Transcoded fetch returns empty buffer → returns original (fail-safe) | ✅ |

**Mock pattern:** `jest.mock('expo-media-library', ...)` + `global.fetch` mock. Consistent with existing Supabase mock pattern in the file.

### C — `stripExifWeb` (1 test)
Canvas re-encoding path (browser-only). In Jest/Node env, `document` is undefined.

| Test | Result |
|---|---|
| `document` undefined (Node/Jest env) → returns original (fail-safe) | ✅ |

---

## Changes to Source Files

**`src/lib/flags.ts`** — Added `export` to 3 previously-private functions:
- `stripExifNative` (line 66)
- `stripExifWeb` (line 121)
- `verifyExifStripped` (line 226)

This is purely for testability. No behavioral change.

**`src/lib/__tests__/flags.test.ts`** — Added:
- `expo-media-library` jest mock at file top (hoisted pattern)
- 3 new named imports from flags.ts
- 149 lines of new test sections (3 describe blocks)

---

## Test Run

```
Test Suites: 58 passed, 58 total
Tests:       884 passed, 884 total  (+12 from this branch)
Typecheck:   0 errors
```

---

## Issues Found

**None.** The implementation is clean and all fail-safes work as designed. The `stripExifWeb` test implicitly confirms the Node/test-env guard works.

One observation: `console.warn` fires on each fail-safe path (expected behavior — the logs are intentional for debugging). These warnings appear in test output but don't constitute failures.

---

## Sign-Off

**READY TO MERGE** — `test/gary-exif-2026-05-28` → into `privacy/exif-strip-2026-05-28` (or directly to cycle branch if EXIF strip is merged first).

**Merge order:** `privacy/exif-strip-2026-05-28` must be the base; `test/gary-exif-2026-05-28` stacks on top.
