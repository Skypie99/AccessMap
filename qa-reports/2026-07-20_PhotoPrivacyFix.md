# 2026-07-20 — Photo Privacy Check Fix (photos could never be attached)

**Branch:** `fix/photo-privacy-sanitize` (one commit, `64342e1`, off `main` @ `d43f867`)
**Status:** BUILT + VERIFIED (all gates green) — STOPPED ON BRANCH awaiting Sky's merge (Const. Art. 1)
**Severity:** CRITICAL — 100% failure of report-photo AND avatar uploads on iOS device

---

## 1. Symptom

Every barrier-report submit with a photo attached failed on Sky's iPhone with:

> **Couldn't submit your report** — Photo privacy check failed. Please try a different photo or contact support.

Reported by Sky with a device screenshot, 2026-07-20. The same failure silently
breaks avatar uploads (shared pipeline). Reports *without* photos were unaffected.

## 2. Root cause (confirmed, not hypothesized)

The error is thrown 100% client-side at the D8 privacy gate in
`src/lib/flags.ts` — **before any network call**. Supabase (bucket, RLS, edge
functions) was never involved.

Chain:

1. `uploadStrippedImage` → `stripExifNative` re-encodes the photo via
   `expo-image-manipulator` to discard source EXIF/GPS. **This step works.**
2. `verifyExifStripped` then walks the re-encoded JPEG and fails on **any**
   APP1/APP13/APP9 marker segment.
3. Apple's `UIImage.jpegData` — confirmed by reading the vendored native source
   in `node_modules/expo-image-manipulator/ios/` — writes its **own benign APP1
   (orientation/XMP) into every re-encode**, and the library exposes **no
   option to suppress it** (`ManipulateOptions` = `{base64, compress, format}`).
4. So the verifier rejected the stripper's own output → 100% failure on iOS.
   (Android's `Bitmap.compress` writes no APP1, so Android was likely fine.)

**Why CI never caught it:** tests mock the codec and feed the verifier a
hand-built APP0-only "clean" JPEG — real codec bytes never reached the gate.
The native path has effectively never passed this gate on a real iPhone since
the strict verifier (F29) + real re-encode (`4ebd824`, Jun 19) landed together.

## 3. Fix — sanitize-then-verify

New `sanitizeImageMetadata()` in `src/lib/flags.ts`: a pure byte-level
copy-through walk that **splices APP1/APP9/APP13 (JPEG) and eXIf (PNG) out of
the post-strip bytes ourselves**, inserted in `uploadStrippedImage` between the
strip and the verify. Key properties:

- **Privacy gets stronger, not weaker.** Metadata removal no longer depends on
  any codec's behavior, and `verifyExifStripped` stays byte-for-byte unchanged
  as the fail-closed backstop.
- **Fail-closed (D8 preserved):** malformed or non-JPEG/PNG bytes → `null` →
  same abort + same user-facing message; Storage is never touched.
- **No visual side effects:** APP0/APP2/APP14 (JFIF/ICC/Adobe) are preserved so
  colors don't shift on Display-P3 iPhone photos; dropping the APP1 can't
  rotate images because the re-encode has already baked orientation into the
  pixels (iOS unconditionally runs `ImageFixOrientationTransformer` — read from
  vendored source).
- **Zero-copy fast path:** already-clean output (Android/web) uploads
  byte-identical to before.
- One insertion point fixes **both** flag photos and avatars.

Rejected alternative: a GPS-aware verifier (parse EXIF, allow non-GPS APP1) —
more code, misses IFD1-thumbnail/MakerNote GPS, permanently weakens the D8
promise, and stays coupled to Apple's output shape.

## 4. Evidence

| Gate | Result |
|---|---|
| `npm run typecheck` | clean |
| `npx jest` (full) | 146 suites, 2074 passed + 84 todo, 0 failures |
| `npm run lint` | 0 errors (79 pre-existing warnings, unchanged) |
| Regression encoding | New full-pipeline test feeds `uploadFlagPhoto` exactly what the iOS codec emits (APP1-bearing JPEG) and asserts the upload **succeeds** with the APP1 spliced out, byte-exact. Verified it **fails against pre-fix code**: stashing the src changes → 17 new-test failures; restored → all green. |

New/changed tests: `sanitizeImageMetadata` unit suite (byte-exact splices,
APP2/ICC preservation, fill bytes, zero-copy fast path, fail-closed malformed
set, PNG eXIf), pipeline regression suite in `flags.test.ts`, avatar path in
`users.test.ts` rewritten (codec-APP1 now heals; D8 abort coverage kept via an
unparseable-bytes test).

Diff: 4 files, +539/−74 (`src/lib/flags.ts`, `src/lib/users.ts`, their two
test files).

## 5. DECISIONS FOR SKY

1. **Merge** `fix/photo-privacy-sanitize` → `main` (ff, one commit). Sky-only.
2. After merge, **device check** (NEEDS-SKY-DEVICE, ~2 min):
   - Attach a photo to a report → submit succeeds.
   - A portrait (tall) photo displays upright in the callout/gallery.
   - A vivid photo shows no color shift.
   - A HEIC pick from the library works.
   - Dev console should show: `[EXIF] Sanitizer removed 1 metadata segment(s) post-strip.`
3. Note: the fix reaches the phone via Metro/dev reload immediately after
   merge; the **TestFlight build only picks it up on the next EAS build**
   (paid, Sky-gated — Sky asks first per standing rule).

## 6. Rollback

Branch is unmerged; rollback = don't merge, or `git revert 64342e1` after merge.
No schema, storage, or config changes anywhere.
