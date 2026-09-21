# Phase 04A — HANDOFF (success)

STATUS: `PHASE04A_IMPLEMENTATION: PASS` — see the machine-readable block at the end.

## Identity

- CANONICAL_BASE: `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5` (tree `c20bf70595c9f77b1a2a2c4e24323764647f5709`) — verified against `origin/main` before any edit.
- BRANCH: `sonnet/flagstone-phase04a-compat-20260921`
- WORKTREE: `/Users/skypie/AccessMap-worktrees/flagstone-p04a-sonnet-20260921`
- CANDIDATE_SHA (local, unpushed): `9700538`
- Primary `/Users/skypie/AccessMap` checkout: untouched throughout (never `cd`'d into for a write; confirmed on its own pre-existing branch/dirty state at the start of this session).

## Findings implemented

### FDA-002 — owner/admin flag deletion (CONFIRMED_OPEN → fixed)
`deleteFlag()` (`src/lib/flags.ts`) no longer calls the never-deployed `delete-flag` Edge Function. It now:
1. Reads `flags`(id, user_id, photo_url, photo_object_key) + `flag_photos`(url, object_key) for the target flag first (so cleanup knows its exact target set before anything is deleted).
2. Issues `DELETE ... RETURNING id` directly against `flags`. Zero returned rows (RLS refusal, or the row is already gone) throws `FlagDeleteRefusedError` — never a silent/false success.
3. Authorization is 100% server-side via the live `flags delete own` (`auth.uid() = user_id`) and `admin delete any flag` (`users.is_admin`) RLS — independently confirmed live in `supabase/contract/deployed-contract.v1.json`'s `authorization.flagsPolicies` (captured 2026-09-04). This client never infers owner/admin privilege itself.
4. After the row delete is confirmed, best-effort cleans up every photo object it can derive with certainty (`object_key` when present; otherwise `storagePathFromPublicUrl` against the **flag owner's** uid, which is correct even when an admin deletes someone else's flag, since Storage objects always live under `<owner-uid>/...`). An anonymous flag's url-only gallery photos are left uncleaned (no owner uid to validate against — fail-closed, matches `storagePathFromPublicUrl`'s own documented rule). `flag_photos` rows cascade via their existing `ON DELETE CASCADE` FK.
5. Cleanup never blocks or reverses a confirmed delete (mirrors `removeUploadedFlagPhotos`'s existing "never throws" contract).

No caller changes were needed — `AdminScreen.tsx:332` and `FlagDetailModal.tsx:1119` already just `await deleteFlag(id)` and show `errorMessage(e)` on any throw.

### FDA-019 — signed-in flag-photo reports (CONFIRMED_OPEN → fixed)
`uploadFlagPhoto()` now mirrors `uploadAvatar()`'s (`src/lib/users.ts`) `isFunctionMissing` → legacy fallback exactly:
- When `prepare_flag_photo_upload` is absent, it uploads to the proven pre-intent `<uid>/<ts>.<ext>` Storage path (already-documented in `CLAUDE.md` as the original scheme; authorized by the already-live `flag-photos auth upload` policy) and returns `intentId: null`. This runs *after* the shared EXIF-strip/sanitize/verify gates, so the fallback can never upload unstripped bytes.
- `photos.ts`'s `batchInsertFlagPhotos` / `addFlagPhoto` insert the `flag_photos` row **directly** (via the new `insertLegacyFlagPhoto`) when `intentId` is `null`, authorized by the already-live `flag_photos: authenticated insert` policy (`WITH CHECK (true)`). `object_key` is never set by this path — it's server-guarded (`enforce_flag_photos_object_key_guard`) and the row legitimately uses the legacy `url` shape.
- If that row insert is denied/fails, the just-uploaded Storage object (no server-side intent tracks it, unlike the RPC path) is removed via `removeUploadedFlagPhotos` before the error propagates — "no orphaned upload on a denied downstream operation."
- `ReportFlagModal.tsx`'s total-failure cleanup path now splits by upload kind: intent-based uploads still get `cancelFlagPhotoUpload`; legacy uploads (`intentId: null`) get `removeUploadedFlagPhotos` directly, since there's no intent to cancel.
- Guest/anonymous reporting is completely unchanged (no photo control on that path; untouched).

### FDA-004 — moderation queue (FUTURE_LIVE_PROOF_REQUIRED → no code change, manifest reconciled)
`src/lib/adminReports.ts` was read-only, as directed. Its existing capability-gated, fail-closed client (`ModerationQueueUnavailableError` on any RPC error; no direct `feedback` access) already satisfies the compatibility contract for both the capability-present and capability-absent cases. `client-expectations.v1.json` gets a `phase04aNote` on the `moderation-queue` surface documenting the 2026-09-21 02:20 UTC Phase 03B post-exit structural evidence (RPCs + columns proven to exist in an archived catalog) **without** flipping `deployed: true` — that would assert a live-verified fact this local-only milestone has no authority to establish (the counterpart `deployed-contract.v1.json` capture is still the stale 2026-09-04 one, and re-capturing it is explicitly out of scope). `FUTURE_LIVE_PROOF_REQUIRED` stands.

## Phase 03C compatibility

`src/__tests__/privacy.guard.test.ts` — **PASS**, unmodified. No anon grant, Storage policy, or guest-identity behavior was touched by either fix. `src/lib/__tests__/adminReportsPrivacy.guard.test.ts` and `src/screens/__tests__/phase03bModerationClient.guard.test.ts` — **PASS**, unmodified (FDA-004 had no source change).

## Files changed (all within OWNED_FILES, one exception noted)

- `src/lib/flags.ts`, `src/lib/photos.ts`, `src/screens/ReportFlagModal.tsx` (source)
- `src/lib/__tests__/{flags.test.ts,flags.supabase.test.ts,photos.test.ts,sr050DeleteFlagPhotos.test.ts,d1f4r3CanonicalReportDelete.test.ts}`, `src/screens/__tests__/ReportFlagModal.test.tsx` (owned tests)
- `supabase/contract/client-expectations.v1.json` (exclusive 04A ownership, as directed)
- **`src/__tests__/webResilience.test.ts`** — **not in OWNED_FILES**, touched anyway. Its L7 test source-anchors a literal substring (`'void Promise.all(preparedPhotos.map'`) inside `ReportFlagModal.tsx`'s failure-cleanup block. Splitting that block by upload kind (FDA-019) renamed the mapped variable to `intentPhotos`, breaking the anchor. This is a pure mechanical anchor re-point (same assertions: still contains `cancelFlagPhotoUpload`, now also asserts `removeUploadedFlagPhotos`, still excludes `releaseUri`/`revokeObjectURL`) with zero semantic change to the invariant being tested. Recorded here per the overlap-recording instruction rather than silently expanding scope; happy to revert if 04B/integration prefers a different resolution.

`src/screens/AdminScreen.tsx` and `src/components/FlagDetailModal.tsx` (conditional ownership) were **not touched** — no caller-side correction was needed.

## Known, by-design test fallout (not fixed — outside 04A's file authority)

Three **unowned, shared** regression-pin files hardcode the exact `delete-flag` Edge Function call this milestone was explicitly directed to remove (P04-D01: "Do not deploy D1F4/delete-flag to satisfy the client" — i.e. replace it, not keep it):

| File | Assertion(s) failing | Why |
|---|---|---|
| `src/__tests__/contractManifest.guard.test.ts` | `del.callSites.every((c) => c.onAbsent === 'hard')` (FDA-002 sub-test) and `prepare.onAbsent).toBe('hard')` (FDA-019 sub-test) | This suite's own docstring says it exists to make "the four shipped mismatches reproduce from the manifests" — i.e. it's a frozen "before" pin for the exact bugs FDA-002/FDA-019 fix. Explicitly listed as a forbidden-but-run shared gate for 04A. |
| `src/__tests__/d1f4r3SourceClosure.guard.test.ts` | `expect(flags).toContain("supabase.functions.invoke('delete-flag'")` | Source-text pin belonging to the separate, undeployed D1F4R3 proposed lineage (`supabase/nonmanaged/proposed/`). Not in OWNED_FILES. |
| `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts` | Same pin, one assertion | Same D1F4R3 lineage, same root cause. Not in OWNED_FILES. |

All four failing tests trace to this single, expected, accepted-direction cause. **No other test in the repository regressed.**

## Exact tests run

```
npx tsc --noEmit                                    → PASS (clean)
npm run lint                                         → 0 errors, 90 pre-existing warnings (none new)
npx jest --ci -w 3                                    → 4403/4439 passed, 4 failed (see table above), 32 todo (pre-existing)
```

Focused suites (owner/admin delete success + zero-row refusal + admin-cross-user cleanup + anon-flag fail-closed cleanup + cleanup-failure-doesn't-block-delete; legacy-upload fallback + denied-insert cleanup + guest-unchanged; FDA-004 read-only verification):
```
npx jest --ci -w 2 src/lib/__tests__/flags.test.ts src/lib/__tests__/flags.supabase.test.ts \
  src/lib/__tests__/photos.test.ts src/lib/__tests__/sr050DeleteFlagPhotos.test.ts \
  src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts src/lib/__tests__/adminReports.test.ts \
  src/lib/__tests__/adminReportsPrivacy.guard.test.ts src/screens/__tests__/AdminScreen.test.tsx \
  src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/phase03bModerationClient.guard.test.ts
→ 10/10 suites, 315/315 tests PASS
```

Local Phase 03B replay / Phase 03C 208-assertion SQL replay (`npm run db:snapshot`-style local Postgres harness) was **not run** — not needed to validate this milestone's client-only changes, and standing up that harness was outside the bounded scope of a compatibility-repair task already fully proven by the Jest suites above and the independently-captured `deployed-contract.v1.json` authorization evidence.

## Local commits

1. `9700538` — "Phase 04A: FDA-002 direct-DELETE adapter + FDA-019 legacy photo fallback" (source + tests + manifest)

No push, no merge, no rebase. `git status` is clean except for this untracked report directory.

## Next exact safe action

Independent review of `9700538` on this branch/worktree. If accepted, integrate 04A first (per `07_IMPLEMENTATION_SEQUENCE.md`), then 04B's account-deletion work and its documented `account-deletion` manifest delta on a fresh combined tree, then re-run the contract guard + focused tests + full gates before any owner merge. Separately, decide who updates the three by-design-broken shared regression pins above (`contractManifest.guard.test.ts`'s two sub-assertions, `d1f4r3SourceClosure.guard.test.ts`, `d1f4r3Fix2ReviewReplay.test.ts`) — none are in 04A's file ownership.

## Things NOT redone

No Phase 03B restoration/apply. No re-litigating the accepted direct-DELETE path (P04-D01/P04-D02, already `ALREADY_DECIDED_BY_ACCEPTED_EVIDENCE`). No treating the stale 2026-09-04 catalog as current moderation truth. No Phase 03C redesign. No 04B account-deletion work — `src/lib/account.ts`, `accountDeletionReceipt.ts`, `accountDeletionAvailability.ts`, `ProfileScreen.tsx`, `SignInScreen.tsx`, and their tests were never opened.

---

```
PHASE04A_IMPLEMENTATION:
PASS

CANONICAL_BASE:
7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5

FDA_002:
PASS

FDA_004_LOCAL_COMPATIBILITY:
PASS

FDA_004_LIVE_PROOF:
DEFERRED

FDA_019:
PASS

PHASE03C_COMPATIBILITY:
PASS

FOCUSED_TESTS:
PASS

TYPECHECK:
PASS

LINT_STATIC:
PASS_WITH_PREEXISTING_WARNINGS

FULL_JEST:
PASS_WITH_KNOWN_UNOWNED_GUARD_FALLOUT (4403/4439; 4 failing tests in 3 unowned shared files, all tracing to the single accepted FDA-002 removal of the delete-flag Edge Function call — see table above)

LOCAL_COMMITS:
9700538

CANDIDATE_SHA:
9700538

CANDIDATE_TREE:
8ea1f37056f8e177ae63f6ce6311eeeeeafae1f1

PRODUCTION_CONTACT:
NONE

STAGING_CONTACT:
NONE

DATABASE_ACTION:
NONE

DEPLOYMENT:
NONE

PUSH:
NOT_PERFORMED

04B_TOUCHED:
NO

PHASE04A_STATUS:
IMPLEMENTED_AWAITING_INDEPENDENT_ACCEPTANCE

HANDOFF:
qa-reports/phase04/04A-20260921T091714Z/HANDOFF.md
```
