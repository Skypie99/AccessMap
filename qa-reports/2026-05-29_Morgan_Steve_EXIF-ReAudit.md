# Morgan → Steve: DELEGATION — EXIF Strip Security Re-Assessment (P0)
**Date:** 2026-05-29 | **From:** Morgan (direct `/morgan`) | **To:** Steve (Safety Engineer)
**Model tier:** Sonnet | **Priority:** P0 — pre-launch BLOCKER | **Mode:** AUDIT-ONLY (propose, do not apply)

## Why you're being routed this (Const. Art. 9.4)
The 2026-05-28 EXIF privacy gate (D8) was marked APPROVED, but the 2026-05-29 Opus 4.8 audit found the native strip is non-functional. Security ownership of the upload trust boundary returns to you. This **supersedes** the 2026-05-28 verdict (see DECISIONS_LOG.md 2026-05-29 entry).

## Scope — verify each finding against real source, then propose fixes
1. **`stripExifNative` no-op** — `src/lib/flags.ts:54-97`. `MediaLibrary.saveToLibraryAsync()` returns `void`; confirm the guard always trips and the original arrayBuffer is returned on native. Confirm `flag-photos` bucket is public-read (`supabase/schema.sql` ~L251).
2. **Avatar gate not enforced** — `src/lib/users.ts:81-99`. Confirm verify-fail only `console.warn`s vs. the flag path's throw (`flags.ts:318-322`).
3. **`verifyExifStripped` format blindness** — `flags.ts:206-230`. Confirm it only scans JPEG markers (0xFFE1/ED/E9) and returns `true` for PNG/WEBP/HEIC.
4. **Trust-boundary review:** are there any OTHER paths that write user images to storage without strip+verify? (search for `.upload(`, `getPublicUrl`, bucket writes.)

## Expected output → `qa-reports/2026-05-29_Steve_EXIF-ReAudit.md`
- Confirmed/refuted per finding with file:line evidence.
- Proposed fix (propose-only): single shared `stripExif`+`verifyExifStripped` helper via `expo-image-manipulator`, routed through BOTH flag + avatar uploads, hard-gated (throw on verify-fail). No silent apply.
- Verdict: `EXIF GATE: OPEN | CLOSED-AFTER-FIX` + whether this blocks launch.
- Hand off to Shamus (build) only after Jordan privacy conditions land.

## Guardrails
Read-only + propose-only. No commits to main. No live-DB. Branch proposals only (`security/exif-regate-2026-05-29` suggested). Surface anything privacy-irreversible to Morgan for Sky.
