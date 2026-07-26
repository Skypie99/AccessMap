# Jordan — Privacy/Safety Phase-0 Gate: 3 Queued Tech-Debt Fixes

- **Date:** 2026-06-19
- **Role:** Jordan (Legal/Privacy Advisor) — Const. Art. 7.6 Phase-0 review
- **Scope:** AccessMap (`~/AccessMap`). READ-ONLY on code. No source edited, no git touched.
- **Standard:** PIPEDA-aware, defense-in-depth, fail-closed for privacy-critical paths.
- **DISCLAIMER:** I am **NOT a lawyer**. This is advisory engineering-privacy review, not legal advice. Any data-practice decision with legal exposure (breach notification, consent, retention) needs professional legal review before it binds.

---

## Verdict Table

| # | Item | Verdict | One-line reason |
|---|------|---------|-----------------|
| 1 | DELETE dead `listFlagStatusHistory` + `FlagStatusHistoryEntry` | **APPROVE_WITH_CONDITIONS** | Deleting dead, wrong-column code REDUCES latent moderator-identity-leak risk; but the matching stale **type** in `database.ts` is the real trap and must go too. |
| 2 | UNIFY `uploadAvatar` onto the shared EXIF pipeline | **APPROVE_WITH_CONDITIONS** | Net privacy win (adds the missing scheme guard) — but only if the fail-closed gate, verify step, allowed-exts, and post-strip MIME derivation are all preserved. |
| 3 | RE-ENCODE `stripExifNative` from file URI (perf) | **APPROVE_WITH_CONDITIONS** | Perf change to privacy-critical code is fine ONLY if the strip semantics, fail-closed null contract, and pre-storage verify gate are byte-for-byte behaviorally unchanged. |

**No BLOCKs.** All three are net-neutral-to-positive for privacy. Conditions are guardrails so a builder cannot accidentally regress the EXIF/GPS or moderator-identity protections while doing the cleanup.

---

## 6-Trigger Privacy Check (Const. 9.6 spine-lite)

| Trigger | Item 1 | Item 2 | Item 3 |
|---|---|---|---|
| **Location data** (lat/lng, EXIF GPS) | Indirect — guards the audit log, not coords | YES — avatar selfies carry home GPS | YES — flag photos carry on-site GPS |
| **Disability / health data** | No | No | No |
| **Auth / identity** | YES — `user_id` = moderator identity (the whole hazard) | Minimal — `userId` only as storage path prefix | No |
| **Live DB / prod surface mutated** | No (deletes client TS only; migration unchanged) | No | No |
| **External send / side effect** | No | No | No |
| **Credentials / secrets** | No | No | No |

None of the three is itself an always-escalate privacy event. Item 1 *touches* the moderator-identity hazard but in the **risk-reducing** direction. No Morgan-to-Sky escalation is required to *proceed* with the builds; the per-item conditions below are sufficient. (One advisory flag for Sky's awareness is noted under Item 1.)

---

## Item 1 — DELETE dead `listFlagStatusHistory` + `FlagStatusHistoryEntry`

**Verdict: APPROVE_WITH_CONDITIONS**

### What I verified (grounding)
- `src/lib/flags.ts:1133-1164` — `FlagStatusHistoryEntry` interface (`old_status / new_status / changed_by / changed_at`) and `listFlagStatusHistory()`, which runs `.from('flag_status_history').select('old_status, new_status, changed_by, changed_at')`.
- The applied migration `supabase/migrations/2026-05-24_status_history_table.sql:122-137` creates the table with columns **`user_id`, `from_status`, `to_status`, `created_at`** — NOT the columns this function selects. So the function can only ever error → its `catch`/`if (error)` returns `[]`. It is dead in behavior, not just in references.
- **Live path is separate and correct:** `src/components/StatusHistoryModal.tsx:96` calls `listStatusHistory` from `src/lib/statusHistory.ts:47`, which queries the **`flag_status_history_public`** SECURITY-INVOKER view selecting `id, flag_id, from_status, to_status, created_at` — deliberately **OMITTING `user_id`** (the moderator's identity). Confirmed by the migration's Jordan-condition-#1 comment block (lines 19-21, 73-74) and the view's own contract comment in `statusHistory.ts:8-11`.
- **Nothing live reads the dead function:** `grep` for `listFlagStatusHistory` / `FlagStatusHistoryEntry` across `src/components` and `src/screens` returns **zero** non-test hits. The only non-test reference to `.from('flag_status_history')` (the raw table) in the whole repo is *inside* the dead function itself. Test references exist only in `src/lib/__tests__/flags.supabase.test.ts`.

### Does deleting reduce the latent moderator-identity-leak risk? — YES.
The hazard you named is real and the analysis holds: the dead function targets the **raw `flag_status_history` table** (which contains `user_id` = the verifier/moderator who acted), not the privacy-preserving public view. Today it's inert because the column names are wrong. The danger is a future dev who sees a broken-but-plausible "status history" fetcher, "fixes" the column names to `from_status / to_status / user_id`, and in doing so wires the client straight to moderator identity — re-exposing exactly what the public view was built to hide (and what the `W6-1` comment at `flags.ts:1177-1182` warns against for the leaderboard). Deleting it removes that footgun. This is consistent with the project's existing stance: moderator-targeting risk is treated as a first-class privacy threat here.

### THE TRAP THE TICKET UNDER-SCOPES (must be a condition)
`src/types/database.ts:137-155` declares the `flag_status_history` typed table with the **same wrong columns** (`old_status / new_status / changed_by / changed_at`) and an `Insert` shape. Deleting only the `flags.ts` function and interface leaves this stale type in place — which is the *more* dangerous half, because it would let a future `.from('flag_status_history').insert(...)` or typed select compile cleanly against moderator-bearing columns. If you delete the dead reader but keep the misleading type, you have arguably *increased* the footgun (a green typecheck on the wrong schema). **The type block must be removed in the same change** (or, if any other code legitimately needs the table typed, corrected to the real `user_id / from_status / to_status / created_at` shape — but only if a real consumer exists; none does today).

### Conditions for the builder
1. **Delete `database.ts:137-155` (`flag_status_history` typed-table block) in the SAME change** as the `flags.ts` deletions. Do not leave a stale wrong-column type behind. If you believe a consumer needs it, prove the consumer first; there is none today.
2. **Do NOT touch** `src/lib/statusHistory.ts`, `src/components/StatusHistoryModal.tsx`, the `flag_status_history_public` view, or the migration. The live path stays exactly as is.
3. **Remove the now-orphaned tests** in `src/lib/__tests__/flags.supabase.test.ts` (the `listFlagStatusHistory` describe block and its import, ~lines 12, 103, 406-443) so the suite stays green. Do not weaken any `statusHistory.test.ts` coverage.
4. **Preserve the `W6-1` security comment** at `flags.ts:1177-1182` (it's load-bearing institutional knowledge about not surfacing verifier activity).
5. Run `npm run typecheck` + `npm test` + `npm run lint` and confirm all green before declaring done.

### Advisory note for Sky (via Morgan, non-blocking)
The stale `flag_status_history` type in `database.ts` has been silently carrying the **wrong** column names since the migration changed them. Worth a one-line note that this cleanup also fixes a schema-truth drift, not just dead code.

---

## Item 2 — UNIFY `uploadAvatar` onto the shared EXIF-strip pipeline

**Verdict: APPROVE_WITH_CONDITIONS**

### What I verified (grounding)
- `src/lib/users.ts:62-123` — `uploadAvatar` currently duplicates the strip flow: fetch → size/empty checks → `detectMimeFromBytes` → platform `stripExifWeb`/`stripExifNative` (both fail-closed on `null`) → `verifyExifStripped` fail-closed → post-strip MIME-derived ext/contentType → upload with `upsert: false`.
- **The real gap:** `uploadAvatar` does **NOT** apply the `ALLOWED_PHOTO_SCHEMES` guard that `uploadFlagPhoto` enforces at `flags.ts:407-409`. `uploadAvatar` only regex-extracts an extension (`users.ts:63-67`) and never rejects a dangerous scheme. The dedicated risk: `ALLOWED_PHOTO_SCHEMES` exists specifically to **reject `http(s)://`** so the uploader can't be coerced into fetching and re-uploading a remote image (`flags.ts:24-27` comment). Avatar upload is missing that defense.
- The two `ALLOWED_*_EXTS` sets are currently identical (`jpg/jpeg/png/webp/heic/heif`), and `MAX_AVATAR_BYTES` == `MAX_PHOTO_BYTES` (10 MB).

### Does unifying restore defense-in-depth without weakening the strip? — YES, if done right.
Unifying onto `uploadFlagPhoto`'s pipeline ADDS the missing scheme guard (closes the SSRF-flavored / remote-fetch hole) while keeping the EXIF/GPS strip that's already present. Avatar selfies are the **highest** home-GPS risk in the app — a selfie taken at home embeds the user's residence in EXIF — so the existing fail-closed strip + verify is essential and must survive the refactor intact. Net: this is a privacy improvement, provided nothing in the current avatar path is dropped.

### Conditions for the builder (must PRESERVE all of these)
1. **Fail-closed strip gate:** both platforms must still abort the upload when `stripExif*` returns `null`. Never fall through to uploading original bytes. (Today: `users.ts:85-98`.)
2. **Post-strip verify gate:** `verifyExifStripped(arrayBuffer)` must still run AFTER stripping and abort on `false`. (Today: `users.ts:100-106`.) This is the structural JPEG/PNG check — do not downgrade it to the old byte-scan.
3. **Add the scheme guard:** the unified path MUST apply `ALLOWED_PHOTO_SCHEMES` (reject `http(s)://` etc.) for avatars too. This is the whole point of the unification — do not ship a "shared helper" that quietly drops it.
4. **Allowed-exts preserved:** keep the `jpg/jpeg/png/webp/heic/heif` allowlist as a hard pre-check. If you parameterize the shared helper, default must equal today's set; do not widen it.
5. **Post-strip MIME-derived naming preserved:** keep deriving `contentType`/`finalExt` from the ACTUAL post-strip bytes (`users.ts:108-114`) so name/MIME/content agree (HEIC→JPEG re-encode). Do not revert to trusting the input extension.
6. **Storage path scheme unchanged:** avatar path must stay `${userId}/avatar/${Date.now()}.${finalExt}` so the `split_part(name,'/',1) = auth.uid()` Storage RLS still holds (CLAUDE.md gotcha #4). The shared helper must accept a path prefix, not hardcode flags' `${userId}/${ts}` shape.
7. **`upsert: false` preserved** (no silent overwrite of another object).
8. **No regression to error messages that are privacy-meaningful** — the "privacy check failed" copy must remain so a strip failure is visibly a hard stop, not a soft warning.
9. Green `npm run typecheck` + `npm test` + `npm run lint`, plus a test asserting an `http://` URI is rejected by the avatar path (new coverage for the closed gap).

---

## Item 3 — RE-ENCODE `stripExifNative` from file URI (perf change)

**Verdict: APPROVE_WITH_CONDITIONS**

### What I verified (grounding)
- `src/lib/flags.ts:64-78` — current implementation builds a per-byte JS string (`Array.from(bytes).map(String.fromCharCode).join('')`) over the whole (up to ~10 MB) buffer, then `btoa` → `data:` URI, then `ImageManipulator.manipulateAsync`. The per-byte string is the perf pig (O(n) allocations, ~10 MB intermediate string).
- The privacy-critical contract around it (`flags.ts:59-110`): re-encode via platform codec with no transform (drops metadata), then `fetch(result.uri)` → `arrayBuffer()`, then **empty-output check returns `null`** (`:95-98`), and **any throw returns `null`** (`:106-109`). The whole function is the fail-closed strip primitive both `uploadFlagPhoto` and `uploadAvatar` depend on.

### Is the perf refactor safe? — YES, with hard invariants.
Passing the original `file://`/`content://` URI (or a data URI built more cheaply) directly into `ImageManipulator.manipulateAsync` instead of round-tripping through a hand-rolled base64 string is a legitimate, behavior-preserving speedup — `manipulateAsync` accepts a URI and re-encodes the same way regardless of how the input was handed to it. The privacy guarantee comes from the codec re-encode + the two fail-closed gates, NOT from the base64 construction. So the perf change is orthogonal to the privacy property **as long as** the gates are untouched.

### What must NOT change (conditions for the builder)
1. **Re-encode-only semantics:** still call `manipulateAsync(input, [], { format: <PNG for png else JPEG> })` with an EMPTY actions array. No passthrough mode, no "copy metadata" option, no skipping the codec for already-small files.
2. **Fail-closed null contract intact:** the function MUST still return `null` (never the original bytes) on: empty output (`byteLength === 0`), any thrown error, or any path where the stripped buffer can't be obtained. Callers rely on `null === abort`.
3. **Empty-output check preserved** (`:95-98`) — a zero-byte re-encode is a strip failure, not a success.
4. **Pre/post-strip validation order preserved at the call sites:** `detectMimeFromBytes` (pre) and `verifyExifStripped` (post) gates in `uploadFlagPhoto`/`uploadAvatar` must continue to run around this function. Item 3 must not move or remove them.
5. **Storage is never reached if stripping fails:** the upload must remain strictly downstream of a non-null strip result AND a passing `verifyExifStripped`. No reordering that could let original bytes touch `supabase.storage.upload`.
6. **Output format still JPEG/PNG only** so `verifyExifStripped`'s structural JPEG/PNG verifier (`flags.ts:257-345`) can still validate it. If the new path could emit a different container, the verify step would fail-closed (acceptable) — but the intent is unchanged output, so keep SaveFormat selection as-is.
7. **If the URI is read directly, preserve the size/empty pre-checks** that currently run on the fetched buffer in the callers (`uploadFlagPhoto:420-425`, `uploadAvatar:71-74`). Do not let a refactor that "reads from URI inside stripExifNative" bypass the 10 MB cap or the empty-file check.
8. **Verification beyond unit tests:** because this is native `ImageManipulator` behavior on real device codecs, a green `npm test` (which mocks the manipulator) is necessary but NOT sufficient. Flag for the **on-device EXIF-strip re-verification** that's already pending in `qa-reports/2026-06-09_AccessMap_ReSweep_Fixes.md §7` — this perf change should be re-checked on a real iOS/Android device with a known-GPS photo before it's trusted in production. Document this in the builder's QA report.
9. Green `npm run typecheck` + `npm test` + `npm run lint`; keep/extend the existing `stripExifNative` fail-closed tests.

---

## DECISIONS FOR SKY
None blocking. One FYI (Item 1 advisory): this cleanup also corrects a long-standing stale schema type in `src/types/database.ts` (wrong column names for `flag_status_history`), not just dead code — surfaced here for transparency. Item 3 carries a standing reminder that on-device EXIF-strip verification (per the 2026-06-09 ReSweep §7 checklist) should be re-run after the perf refactor, since unit tests mock the native manipulator.

---
*Prepared by Jordan (Legal/Privacy Advisor). Advisory only — not legal advice. Professional legal review required for any binding data-practice or breach decision.*
