# D8 EXIF Fix — Implementation Report
**Date:** 2026-05-29
**Author:** Shamus
**Branch:** shamus/d8-exif-fix-2026-05-29
**Status:** COMPLETE — typecheck passes, 2 commits on branch, NOT merged

---

## What was done

Both failures identified in the spec (`2026-05-29_Shamus_D8_ExifFixSpec.md`) and confirmed by Morgan's adjudication have been fixed.

---

## D8-A: stripExifNative — fixed (flags.ts)

**Root cause confirmed:** `expo-media-library saveToLibraryAsync` returns `Promise<void>`. After `await`, the result was always `undefined`, the `if (!strippedAsset || !strippedAsset.uri)` guard always fired, and the original EXIF-bearing buffer was always returned. No transcoding ever occurred. This was a production no-op.

**Fix applied:**
- Import changed: `expo-media-library` → `expo-image-manipulator`
- `expo-image-manipulator` installed via `npx expo install expo-image-manipulator` (success; no `needsSkyInstall`).
- `stripExifNative` now calls `ImageManipulator.manipulateAsync(dataUrl, [], { compress: 0.9, format })` with no transform actions. The platform codec writes a fresh image with no metadata passthrough.
- Return type changed from `Promise<ArrayBuffer>` to `Promise<ArrayBuffer | null>`. `null` signals failure.
- On failure (empty output or exception), returns `null` instead of the original buffer — **fail-closed**.
- Caller in `uploadFlagPhoto` updated: handles `null` with `throw new Error('Photo privacy check failed: EXIF stripping could not be completed. Please try again.')`.

**Files changed:**
- `src/lib/flags.ts` — import swap, full `stripExifNative` replacement, caller update
- `package.json` — added `expo-image-manipulator`
- `package-lock.json` — lockfile updated

**expo-media-library import removed:** Confirmed `expo-media-library` was only used for `stripExifNative` in flags.ts. Import removed cleanly.

---

## D8-B: uploadAvatar EXIF gate — fixed (users.ts)

**Root cause confirmed:** `src/lib/users.ts:82-84` `console.warn`'d on `verifyExifStripped` returning false. The upload continued regardless. Avatar selfies typically contain the user's home location GPS — same D8 risk as flag photos.

**Fix applied:**
- `console.warn` replaced with `throw new Error('Photo privacy check failed. Please try a different photo or contact support.')` — mirrors `uploadFlagPhoto` in `flags.ts:319-321`.
- `stripExifNative` null return also handled in `uploadAvatar` — same fail-closed pattern as `uploadFlagPhoto`.
- Code comment added explaining the D8 privacy rationale and cross-reference to `flags.ts`.

**Files changed:**
- `src/lib/users.ts` — null handling for `stripExifNative` + throw on verification failure + D8 comment

---

## No opt-out UI

Per Sky's directive, no opt-out or disable-stripping UI was added. Stripping is always-on. Both functions enforce the gate unconditionally.

---

## Typecheck result

`npx tsc --noEmit` — **PASS** (zero errors, zero output).

The `expo-image-manipulator` package was successfully installed before typechecking.

---

## Commits on branch

1. `D8-A: Replace stripExifNative with expo-image-manipulator re-encode`
   — flags.ts + package.json + package-lock.json
2. `D8-B: uploadAvatar must throw on EXIF verification failure`
   — users.ts

---

## Decisions for Sky

1. **expo-image-manipulator installed** — already done, no action needed from Sky.
2. **Fail-closed confirmed** — on native strip failure, upload is blocked (not silently proceeded). This surfaces errors to users in edge cases (e.g. device codec failure). This is the correct D8 behavior per the spec; flagging in case Sky wants to adjust the error message copy.
3. **Avatar EXIF gate active** — avatar upload now aborts on verification failure, same as flag photos. If the `verifyExifStripped` heuristic has false positives, fix the heuristic — do not loosen the gate.
4. **Gary's test updates still needed** — `flags.test.ts:387-399` mocks `saveToLibraryAsync`; must be updated to mock `ImageManipulator.manipulateAsync` returning `{ uri: 'file:///tmp/stripped.jpg', width: 100, height: 100 }`. The `users.test.ts` avatar test also needs updating now that the verify path throws. Gary should be dispatched with `2026-05-29_Gary_TestSpec.md` as reference.

---

## Hard rails compliance

- Branch is `shamus/d8-exif-fix-2026-05-29` off `main` — confirmed via `git rev-parse --abbrev-ref HEAD` before each commit.
- Not pushed, not merged, no PR.
- No live database touched.
- No credentials handled.
- No opt-out UI added.
- `~/.claude` and `~/ClaudeCorp` not touched.
