# Jordan — Privacy Gate Report
**Date:** 2026-05-29  
**Role:** Jordan (Legal/Privacy Advisor)  
**Model tier:** Sonnet (claude-sonnet-4-6) — per Opus Gate hard rule  
**Branches reviewed:** `shamus/d8-exif-fix-2026-05-29`, `fix/security-hardening-2026-05-30`, `docs/beta-testing-guide-2026-05-30`, `qa/e2e-test-plan-2026-05-30`  
**Mode:** READ-ONLY. No code modified, no DB touched.

---

> **NOT LEGAL ADVICE.** This report reflects a code and privacy-flow audit by an AI agent, not a licensed attorney. AccessMap handles location data and disability-adjacent reports from users who may be in a protected class. Before public launch, Sky should obtain professional legal review under applicable law (PIPEDA if Canadian users, CPRA/CCPA if California users, GDPR if EU users). This report surfaces technical findings only.

---

## Verdict Table

| Branch | Privacy Verdict | Blocker? |
|---|---|---|
| `shamus/d8-exif-fix-2026-05-29` | **PASS** | No — D8 is CLOSED by this branch |
| `fix/security-hardening-2026-05-30` (rate-limit migration) | **PASS** | No |
| `docs/beta-testing-guide-2026-05-30` | **PRIVACY-CLEAR** (with note) | No |
| `qa/e2e-test-plan-2026-05-30` | **PRIVACY-CLEAR** | No |

---

## Part 1 — D8 EXIF Fix (PRIMARY GATE): `shamus/d8-exif-fix-2026-05-29`

### Verdict: PASS — D8 is CLOSED

This is the authoritative finding. I read the source on the branch directly:  
- `src/lib/flags.ts` (lines 1–361)  
- `src/lib/users.ts` (full file, 128 lines)  
- Prior adjudication and verification reports on the branch (3 independent verifiers + Morgan, all in `qa-reports/`)

### (a) Is GPS/EXIF actually stripped before upload on BOTH native and web?

**Native (iOS/Android): YES — correctly fixed.**

The prior D8-OPEN finding was that `stripExifNative` used `MediaLibrary.saveToLibraryAsync()` which returns `void`, making the strip a silent no-op. The fix on this branch replaces that entirely with `expo-image-manipulator`:

```typescript
// src/lib/flags.ts:86-90
const result = await ImageManipulator.manipulateAsync(
  dataUrl,
  [],  // no transform — re-encode only
  { compress: 0.9, format: saveFormat },
);
```

`ImageManipulator.manipulateAsync` actually re-encodes the image through the platform codec and returns `{ uri: string }` — a fresh file URI with no metadata passthrough. The old `as any` cast and void-return guard are gone. This is a genuine, functional EXIF strip on native.

**Web: YES — unchanged and correct.**

`stripExifWeb` (lines 116–206) uses canvas re-encoding (`canvas.toBlob`). This discards EXIF by design. Functionally correct. Unchanged from prior version.

### (b) Verification logic — is it sound?

`verifyExifStripped` (lines 216–240) scans the output buffer for JPEG metadata markers: `0xFFE1` (EXIF), `0xFFED` (IPTC), `0xFFE9` (XMP). Returns `true` if clean, `false` if any marker detected.

**Limitation I am noting (not blocking):** `verifyExifStripped` is JPEG-centric. For PNG and WEBP inputs it will return `true` (no 0xFFEx markers), but metadata can reside in PNG tEXt/zTXt chunks or WEBP EXIF/XMP chunks that this scanner would not catch. However:
- PNG and WEBP are re-encoded through the same platform codec path (canvas / ImageManipulator), which discards all metadata container formats.
- The scanner is a belt-and-suspenders check on top of a genuine re-encode — it is not the only protection.
- HEIC/HEIF inputs go through `ImageManipulator.SaveFormat.JPEG`, so the output is always JPEG and the marker scan applies correctly.

**This is an acceptable limitation for pre-launch.** A post-launch improvement would be to add PNG chunk and WEBP metadata scanning. Flag for a follow-on ticket, not a blocker.

### (c) No metadata leak path remains?

**Flag photos (`uploadFlagPhoto`, flags.ts:290–361):**

Control flow is:
1. Platform check → `stripExifWeb` (web) or `stripExifNative` (native)
2. On native: if `stripExifNative` returns `null` (failure) → **throw** (abort upload, fail-closed)
3. `verifyExifStripped` → if `false` → **throw** (abort upload)
4. Only if strip succeeds AND verify passes → Supabase upload

This is a hard gate. No path to upload that bypasses stripping.

**Avatar photos (`uploadAvatar`, users.ts:56–112):**

The prior D8-B finding was that `uploadAvatar` only `console.warn`'d on failed EXIF check. This branch fixes that:
- `stripExifNative` returns `null` on failure → **throw** (lines 81–84)
- `verifyExifStripped` failure → **throw** (lines 87–93)
- Upload is unreachable until both gates pass

The fix mirrors the flag photo path exactly. D8-B is resolved.

**Other upload paths:** Searched for `.upload(` and `.getPublicUrl` in the codebase. The only upload paths for user-generated images are `uploadFlagPhoto` and `uploadAvatar`. Both are now gated. No third path found.

### D8 Closure Conditions — Satisfied?

| Condition | Status |
|---|---|
| D8-A: stripExifNative replaced with functional implementation | SATISFIED (`expo-image-manipulator` on branch) |
| D8-B: uploadAvatar gated with throw (not just warn) | SATISFIED (users.ts:81-93) |
| Both flag AND avatar upload paths gated fail-closed | SATISFIED |
| Native path is no longer a production no-op | SATISFIED |

**D8 VERDICT: CLOSED.** This branch satisfies all pre-launch EXIF/GPS privacy requirements that this office can verify from code. Professional legal review is still recommended before public launch (see NOT LEGAL ADVICE header).

**Remaining post-launch improvement (non-blocking):** Add PNG tEXt/zTXt and WEBP EXIF chunk detection to `verifyExifStripped`. Assign to a follow-on privacy hygiene ticket.

**Remaining pre-launch task (not in this branch):** Real-device verification with `exiftool` on an actual iOS/Android camera photo post-upload. This is an implementation verification step, not a code blocker, but it should be on Sky's launch checklist.

---

## Part 2 — Rate-Limit Migration Privacy Review: `fix/security-hardening-2026-05-30`

**File:** `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`

### What it does

Creates a `BEFORE INSERT` trigger on the `flags` table that counts how many flags `auth.uid()` has created in the past 24 hours. If the count reaches 20, it raises an exception and aborts the insert.

### Does it log or store privacy-sensitive data?

**No.** The migration:
- Reads from `flags` where `user_id = auth.uid()` — this is an in-query count on existing data, not a new log table.
- Does not create any new table, column, or log entry.
- Does not store IP addresses, device identifiers, geolocation, or any additional PII.
- The `RAISE EXCEPTION` returns an error code to the caller — it is not persisted anywhere.

### Privacy verdict

**PASS.** The rate-limit mechanism is purely count-based on `user_id` and `created_at` columns that already exist. No new privacy surface introduced.

**Minor note on `SECURITY DEFINER`:** The function runs as the DB owner (bypasses RLS). This is standard for trigger-based rate limiting in Supabase. It does not introduce a data exposure risk — the function only reads a count, not raw data — but Sky/Dana should be aware that `SECURITY DEFINER` functions require careful review if their query logic changes in the future.

---

## Part 3 — Branches Flagged as Blocked-on-Privacy

### `docs/beta-testing-guide-2026-05-30`

**Files changed:** `app.json`, `docs/BETA_TESTING_GUIDE.md`, `qa-reports/2026-05-30_Steve_SecurityHardening.md`, `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`

The rate-limit migration rides along as a co-traveler on this branch (same as on `fix/security-hardening-2026-05-30`). The migration itself is privacy-safe (see Part 2 above).

`BETA_TESTING_GUIDE.md` is a documentation file with instructions for using TestFlight and Google Play Console. It contains no user data, no PII, no location/disability data surface. It references Sky's Apple ID and Apple Team ID in comments within `eas.json` — this is credential-adjacent but is already in version control on the branch and is not a new exposure (Apple Team ID is not a secret; Apple ID email is Sky's personal address already in `eas.json`).

**Privacy verdict: PRIVACY-CLEAR.** This branch was flagged "blocked-on-privacy" because Gary's merge-readiness audit gates all branches together while D8 was open. The D8 gate is now satisfied by `shamus/d8-exif-fix-2026-05-29`. The docs branch itself has no independent privacy surface. Once D8 merges, this branch is clear from a privacy standpoint.

### `qa/e2e-test-plan-2026-05-30`

**Files changed:** `qa-reports/2026-05-30_Steve_SecurityHardening.md`, `src/components/FlashBanner.tsx` (accessibility attribute only), `src/screens/ReportFlagModal.tsx` (accessibility label text only), `supabase/migrations/2026-05-30_flag_creation_rate_limit.sql`

The source changes are:
- `FlashBanner.tsx`: adds `accessibilityLiveRegion="polite"` attribute — no data handling, pure accessibility markup.
- `ReportFlagModal.tsx`: improves `accessibilityLabel` for severity buttons with descriptive text — no data handling.

No new data collection, storage, or transmission introduced.

**Privacy verdict: PRIVACY-CLEAR.** Same rationale as the docs branch — Gary's gate was blocking on D8. No independent privacy surface on this branch. Clear once D8 merges.

---

## Decisions for Sky

1. **D8 is CLOSED by `shamus/d8-exif-fix-2026-05-29`.** This branch is approved from a privacy standpoint and may proceed through Shamus/Rory's normal merge process.

2. **Real-device verification before launch (non-blocking on merge, blocking on launch):** After D8 merges, verify on a real iPhone and Android device by uploading a camera photo and downloading the resulting Supabase Storage object, then running `exiftool` on it to confirm no GPS data. This is a launch checklist item, not a code gate.

3. **Post-launch improvement (non-blocking):** Extend `verifyExifStripped` to scan PNG tEXt/zTXt chunks and WEBP EXIF/XMP containers. Assign to a follow-on privacy hygiene ticket after launch.

4. **Professional legal review recommended before public launch.** AccessMap's combination of (a) user location data, (b) disability-adjacent reports, and (c) a Canadian/US user base warrants a legal review for PIPEDA compliance and CPRA/CCPA applicability. This office can close D8 from a code perspective; it cannot substitute for a lawyer.

---

## Summary

| Item | Status |
|---|---|
| D8 EXIF/GPS gate on flag photos (native + web) | CLOSED by this branch |
| D8 EXIF/GPS gate on avatar photos (native + web) | CLOSED by this branch |
| Rate-limit migration privacy surface | NONE — clean |
| docs/beta-testing-guide branch independent privacy surface | NONE — was gated by D8, now clear |
| qa/e2e-test-plan branch independent privacy surface | NONE — was gated by D8, now clear |
| Launch-blocking privacy issues remaining | NONE (code) |
| Recommended before public launch | Real-device exiftool verification + professional legal review |

**Jordan — Legal/Privacy Advisor (READ-ONLY)**  
AccessMap pre-launch D8 privacy gate  
Report is PROPOSE/AUDIT-ONLY. No code changed, no DB touched, no external sends.
