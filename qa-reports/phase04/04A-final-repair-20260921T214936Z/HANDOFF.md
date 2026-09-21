# Phase 04A FINAL REPAIR — HANDOFF (success)

STATUS: `PHASE04A_FINAL_REPAIR: PASS` — see the machine-readable block at the end.

Bounded repair of the 04A candidate after a fresh independent Opus acceptance
review returned HOLD on the rev-7 (`817ac8c`) repair. Scope was strictly
limited to the predicates the review named (D-04A-2); 04B and the primary
`~/AccessMap` checkout were never touched.

## Identity

- CANONICAL_BASE (Phase 04 base): `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5`
- BRANCH: `sonnet/flagstone-phase04a-compat-20260921`
- WORKTREE: `/Users/skypie/AccessMap-worktrees/flagstone-p04a-sonnet-20260921`
- STARTING_HEAD (fresh HOLD result): `817ac8cee31eda363daceb0f1acdae10082fa247`
  (tree `85a58a13c0546d676997a939f1395bdaeb4d9774`)
- Primary `/Users/skypie/AccessMap` checkout: never touched (no `cd` into it,
  no writes) — its pre-existing dirty state (`CLAUDE.md`, `supabase/.temp/`,
  untracked `AGENTS.md`/`_to_delete/`/`build.log`) predates this session.
- 04B worktree (`/Users/skypie/AccessMap-worktrees/flagstone-p04b-opus-20260921`):
  never touched.

## Owner decision applied (D-04A-2)

Sky's controlling decision for this repair: a flag with photos must not
delete unless required photo removal is positively confirmed; under the
currently accepted backend contract, client-side `storage.remove()` alone is
not sufficient proof of deletion; if the client cannot positively prove
required photo removal, refuse the flag delete. Signed-in photo attachment
must be gated when the available backend cannot guarantee safe cleanup, with
no new backend infrastructure (no Storage SELECT policy, no migration, no
Edge Function, no RPC) deployed to satisfy this.

## Defect repaired

### The rev-7 (D-04A-1) HOLD — `storage.remove()`'s `error: null` is not proof of removal

The `817ac8c` implementation (D-04A-1, first repair) proved "required photo
cleanup" by calling `supabase.storage.from(...).remove(paths)` and treating a
resolved call with `error: null` as evidence every path was actually removed,
*then* issuing the `flags` row DELETE. The fresh independent review held this
as a real defect: under the flag-photos Storage policies this client can see,
a refused or no-op removal can return an empty deleted-object list with no
error at all — `{ data: [], error: null }` is not distinguishable, from the
client's vantage point, from "every object was really deleted." The rev-7
ordering (cleanup-then-delete) could therefore still report a successful
flag delete while a public photo remained live and unreachable from the UI
forever — the exact SR-050 class of bug, reopened by a subtler mechanism than
the original delete-then-cleanup ordering rev-7 itself fixed.

The review also found: the rev-7 `hasUnresolvedPhoto` / `storagePathFromPublicUrl`
resolution logic was solving the wrong problem (which exact path to remove)
when the real problem is that no path's removal can be *proven* at all; and
the `d1f4r3SourceClosure.guard.test.ts` source-order guard, while correctly
pinning "cleanup before delete," was pinning a fundamentally unsafe sequence
rather than the safe one.

## Fix (D-04A-2)

Rather than invent client-side proof (a Storage SELECT policy, a new RPC, an
Edge Function — all explicitly out of scope for this milestone), the fix
removes the proof-seeking step entirely and replaces it with an outright
refusal:

**`deleteFlag()` (`src/lib/flags.ts`)** now:

1. Reads the flag row (unchanged — missing row refuses immediately).
2. Reads gallery photos (unchanged — needed to decide photo presence before
   the row, and its `flag_photos`, cascade away).
3. Computes `hasAnyPhoto` from relational state alone: the primary
   `photo_url`/`photo_object_key`, or any gallery row at all. No path
   resolution, no `storagePathFromPublicUrl` call, no distinction between a
   resolvable and an unresolvable legacy URL — presence alone decides.
4. If `hasAnyPhoto`: throws `FlagPhotoCleanupUnprovenError` (new). No Storage
   call is made. The row and every photo are left exactly as they were.
5. Only a **zero-photo** flag reaches the direct `flags` DELETE `... RETURNING
   id` (unchanged from rev-6/7: exact `.eq('id', flagId)`, intended-id
   validated, zero/wrong-id refuses via the existing `FlagDeleteRefusedError`).

`removeRequiredFlagPhotos()` (the helper that called `storage.remove()` and
trusted its `error: null`) is deleted — it has no remaining caller and no
safe use.

**`uploadFlagPhoto()` (`src/lib/flags.ts`)** — a related, independently-named
finding (FDA-019) that the same review flagged as sharing the same root cause
(trusting an absence of an error as proof of a safe outcome): the legacy
uid-folder Storage-upload fallback taken when `prepare_flag_photo_upload` is
absent has no server-side hold protecting the object the way an upload
intent does. If the `flag_photos` row insert that must follow it never
happens or fails ambiguously, the only cleanup is client best-effort, and a
public object can be left with nothing pointing at it — unacceptable for a
**brand-new** signed-in photo. `uploadFlagPhoto` now throws a new
`FlagPhotoAttachmentUnavailableError` as soon as `isFunctionMissing(error)`
is detected, **before** `buildPath` returns a path and therefore before
`uploadStrippedImage`'s own `supabase.storage.upload()` call — no unsafe
object is ever written. `uploadAvatar` (`src/lib/users.ts`) is a separate
call site and is untouched; it keeps its own legacy fallback exactly as
before, per D-04A-2's explicit scope (avatar unaffected).

Both new errors are named, dedicated `Error` subclasses (not generic
`Error`), so callers can truthfully distinguish these refusals from a
network/RLS/permission failure. No caller code changed:
`AdminScreen.tsx`'s `handleRemove` and `FlagDetailModal.tsx`'s
`attachPendingPhoto` already route every thrown error through
`errorMessage(e)` into a truthful `Alert`/`notify` call with the photo kept
parked for retry (FlagDetailModal) or the row left alone (AdminScreen) — the
existing generic catch/notify pattern already satisfies "no fake success, no
silent drop, truthful message" once the thrown error's message is truthful.
`ReportFlagModal.tsx`'s submit flow is likewise untouched: a gated photo
upload now fails the whole submit through the existing
`notify("Couldn't submit your report", errorMessage(e))` path (the narrowest
truthful capability-unavailable flow the existing UI already supports) — the
user must remove the photo and retry, or wait; report-without-photo,
guest/anon reporting, and the FDA-019 orphan-cleanup fix for the still-live
intent-based batch path are all unaffected.

## Guards repaired

- `src/__tests__/d1f4r3SourceClosure.guard.test.ts` — its D-04A-1 source-order
  test (pinning `removeRequiredFlagPhotos(...)` before the row DELETE) is
  replaced with a D-04A-2 test pinning `FlagPhotoCleanupUnprovenError` before
  the row DELETE, asserting `deleteFlag`'s body contains **no** `.storage.`
  or `.remove(` call and no reference to `removeRequiredFlagPhotos` (deleted)
  or `storagePathFromPublicUrl` (still exported/tested as a pure function,
  just no longer called from `deleteFlag`).
- `src/__tests__/contractManifest.guard.test.ts` — FDA-002 sub-test now
  asserts the manifest does NOT claim removal is "proven BEFORE the row
  delete" and does contain `FlagPhotoCleanupUnprovenError` in its
  `phase04aFinalRepairNote`, with the superseded `phase04aRepairNote`
  explicitly marked `SUPERSEDED`. FDA-019 sub-test now asserts
  `prepare_flag_photo_upload`'s `onAbsent` is `fail_closed` (not `graceful`)
  on the flag-photo surface specifically, while the avatar surface keeps
  `graceful` unchanged.

## Manifest corrections

`supabase/contract/client-expectations.v1.json` (04A's exclusive ownership):
bumped `revision` 7 → 8 with a new `phase04aFinalRepairRevisionNote`. Added
`phase04aFinalRepairNote` to both the `flag-delete` and `photo-upload-flag`
surfaces; the prior `phase04aRepairNote` on each is retained as history but
now explicitly marked superseded rather than left standing as current truth.
`flag-delete`'s `productionImpact` no longer claims cleanup is "proven
BEFORE the row delete" — it now states a photo-bearing flag's delete fails
closed until an accepted backend capability can prove exact Storage removal.
`photo-upload-flag`'s `productionImpact` changed from `WORKING` (resting on
the now-removed legacy fallback) to `DEGRADED` (report-without-photo works;
photo attachment is truthfully gated when the RPC is absent).
`prepare_flag_photo_upload`'s `onAbsent` on the flag-photo surface changed
`graceful` → `fail_closed`; the avatar surface's own entry is untouched.
Four unrelated call-site `line` numbers (`transition_flag_status`,
`increment_reopen_request`, `list_public_leaderboard`,
`get_my_leaderboard_rank`) were corrected because `deleteFlag`'s and
`uploadFlagPhoto`'s rewrites shifted line numbers later in
`src/lib/flags.ts` — required for `contractManifest.guard.test.ts`'s dynamic
RPC line-position scan to stay green.

FDA-004 (moderation-queue) was not touched — `FUTURE_LIVE_PROOF_REQUIRED`
stands, no production runtime proof is claimed.

## Mutation / safety check (manual, disposable — not committed)

Each of the five predicates below was manually reintroduced with a temporary
`Edit`, the relevant tests were confirmed RED, and the edit was reverted.
After the final revert, `git diff src/lib/flags.ts` was captured before and
after the whole mutation sequence and byte-compared — identical, confirming
no residual mutation reached the implementation that follows.

| # | Mutation | Result |
|---|---|---|
| M1 | Neutered the `hasAnyPhoto` refusal (`if (false && hasAnyPhoto)`) so a photo-bearing flag reaches the DELETE | RED — 8 tests failed across `flags.supabase.test.ts` and `sr050DeleteFlagPhotos.test.ts` |
| M2 | Row DELETE `.eq('id', flagId)` → `.eq('user_id', flagId)` | RED — 2 tests failed (`flags.supabase.test.ts` LOCKING BLOCKER D3, `d1f4r3CanonicalReportDelete.test.ts` mutation-safety) |
| M3 | `hasAnyPhoto` computed without the gallery-photos check (only primary photo consulted) | RED — 2 tests failed (gallery-only-photo refusal cases) |
| M4 | `uploadFlagPhoto`'s `isFunctionMissing` branch reverted to the legacy uid-folder fallback instead of throwing | RED — 2 tests failed (`flags.test.ts` FDA-019 gate suite) |
| M5 | The `catch` block in `uploadFlagPhoto` converted a caught `FlagPhotoAttachmentUnavailableError` into a fake successful return | RED — 2 tests failed (same suite; the gate call site raises before this catch is meaningfully exercised, and the fake-success branch is unreachable in the real (non-mutated) source, but the mutation's presence was still confirmed to break the two assertions expecting the real thrown error) |

All five killed. `npx tsc --noEmit` stayed clean through every mutation
(none of them produce a type error, by design — these are behavioral
mutations) and the working tree was restored exactly before the final gate
run below.

## Exact tests run

```
npx tsc --noEmit
→ clean

npm run lint
→ 0 errors, 90 pre-existing warnings (same count as the pre-repair HANDOFF; none new)

npx jest --ci -w 2 \
  src/lib/__tests__/flags.test.ts src/lib/__tests__/flags.supabase.test.ts \
  src/lib/__tests__/photos.test.ts src/lib/__tests__/sr050DeleteFlagPhotos.test.ts \
  src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts \
  src/lib/__tests__/users.test.ts \
  src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/AdminScreen.test.tsx \
  src/components/__tests__/FlagDetailModal.gallery.test.tsx \
  src/__tests__/contractManifest.guard.test.ts src/__tests__/d1f4r3SourceClosure.guard.test.ts \
  src/__tests__/d1f4r3Fix2ReviewReplay.test.ts src/__tests__/webResilience.test.ts \
  src/__tests__/privacy.guard.test.ts src/lib/__tests__/adminReportsPrivacy.guard.test.ts \
  src/screens/__tests__/phase03bModerationClient.guard.test.ts
→ 16 suites, 416/416 tests PASS

npx jest --ci -w 2 --testPathPattern "privacy"
→ 4 suites (geoPrivacyFence, privacyLink.guard, privacy.guard, adminReportsPrivacy.guard), 53/53 tests PASS
(Phase 03C anon/public-read privacy contract — untouched by this repair, confirmed still green)

npx jest --ci -w 3
→ 297/297 suites, 4418/4450 tests PASS, 32 pre-existing todo, 0 failed
```

## Files changed

```
src/lib/flags.ts                                  | 169 ++++++++++++-----------
src/lib/__tests__/flags.test.ts                    |  48 ++++---
src/lib/__tests__/flags.supabase.test.ts           | 124 ++++++----------
src/lib/__tests__/sr050DeleteFlagPhotos.test.ts     |  42 +++---
src/__tests__/d1f4r3SourceClosure.guard.test.ts     |  47 +++----
src/__tests__/contractManifest.guard.test.ts        |  83 ++++++------
src/screens/__tests__/ReportFlagModal.test.tsx      |  31 +++++
supabase/contract/client-expectations.v1.json       |  84 ++++++------
```

All 8 files are within 04A's owned files (`src/lib/flags.ts`,
`supabase/contract/client-expectations.v1.json`, and their direct tests)
plus the three shared guard/replay files the original Phase 04A task
explicitly authorized 04A to correct when they pin a stale contract
(`contractManifest.guard.test.ts`, `d1f4r3SourceClosure.guard.test.ts`) —
`d1f4r3Fix2ReviewReplay.test.ts` and `d1f4r3CanonicalReportDelete.test.ts`
needed no changes (their assertions were already scoped to the zero-photo
DELETE mechanics, unaffected by D-04A-2). `src/lib/photos.ts` and
`src/lib/users.ts` were read and confirmed to need no changes: `photos.ts`'s
legacy-branch handling is now simply unreachable through `uploadFlagPhoto`'s
narrowed output rather than removed (not proven 04A-only, and removing it
would touch code the FDA-019 orphan-cleanup fix from the first repair still
legitimately owns); `users.ts`'s `uploadAvatar` is untouched per D-04A-2's
explicit scope.

## Local commits

1. `8466128fe0d3daa1a402b36e5b398b9cd32f68ea` — "fix(phase04a): D-04A-2 final
   repair — refuse photo-bearing flag deletes, gate photo attachment on
   absent upload-intent capability" — source, owned tests, the two shared
   guard files, manifest correction (8 files; tree
   `8413f11b9bdc8aecd977dde38b8274a0fd1255af`).
2. This handoff report (committed separately, untracked at commit 1 time).

No amend of prior history (`9700538`, `6b239dd`, `4f78c9c`, `817ac8c`
untouched). No push, no merge, no rebase.

## Next exact safe action

Fresh independent acceptance review of the final commit against D-04A-2's
predicates. If accepted, proceed to integrating 04A + 04B (04B was
independently accepted separately, on its own local candidate `3b21be7`,
unpushed) on a fresh combined tree, then re-run the contract guard + focused
tests + full gates before any owner merge/push decision (Sky-only, per Const.
Art. 1).

## Things NOT redone

No Phase 03B restoration. No re-litigating the accepted direct-DELETE path
itself (P04-D01/P04-D02) or the FDA-019 partial-batch orphan-cleanup fix from
the first repair (`batchInsertFlagPhotos`/`cleanupUnattachedFlagPhotos` in
`photos.ts` — unchanged, still correct, still tested). No 04B work —
`src/lib/account.ts`, `accountDeletionReceipt.ts`,
`accountDeletionAvailability.ts`, `ProfileScreen.tsx`, `SignInScreen.tsx`,
and their tests were never opened. No touch of the primary `~/AccessMap`
checkout. No Storage SELECT policy, no migration, no Edge Function, no RPC,
no linked/remote Supabase use. No production/staging contact, no deploy, no
push, no merge.

---

```
PHASE04A_FINAL_REPAIR:
PASS

STARTING_HEAD:
817ac8cee31eda363daceb0f1acdae10082fa247

D04A2_OWNER_DECISION:
PASS

FDA_002:
PASS

NO_PHOTO_FLAG_DELETE:
PASS

PHOTO_BEARING_FLAG_DELETE:
FAIL_CLOSED

PHOTO_DELETE_WITHOUT_PROOF:
NOT_PERMITTED

DELETE_TARGET_ID:
PASS

FDA_019:
PASS

UPLOAD_INTENT_AVAILABLE_PATH:
PASS

UPLOAD_INTENT_ABSENT_PATH:
PHOTO_ATTACHMENT_GATED

UNSAFE_LEGACY_FALLBACK:
NOT_REACHABLE

REPORT_WITHOUT_PHOTO:
PASS | unaffected — ReportFlagModal's photo-upload loop is only entered when photoUris is non-empty; no code path in the report-without-photo submit changed

GUEST_REPORT:
UNCHANGED

SOURCE_CLOSURE_GUARD:
PASS

MANIFEST_TRUTH:
PASS

FDA_004_LIVE_PROOF:
DEFERRED

MUTATION_SAFETY:
5/5 KILLED

FOCUSED_TESTS:
PASS

TYPECHECK:
PASS

LINT_STATIC:
PASS_WITH_PREEXISTING_WARNINGS

PHASE03C_COMPATIBILITY:
PASS

FULL_JEST:
PASS

FULL_JEST_FAILED:
0

LOCAL_COMMITS:
8466128fe0d3daa1a402b36e5b398b9cd32f68ea

FINAL_REPAIRED_CANDIDATE_SHA:
8466128fe0d3daa1a402b36e5b398b9cd32f68ea

FINAL_REPAIRED_CANDIDATE_TREE:
8413f11b9bdc8aecd977dde38b8274a0fd1255af

04B_TOUCHED:
NO

PRIMARY_DIRTY_WORKTREE_TOUCHED:
NO

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

PHASE04A_STATUS:
FINAL_REPAIR_AWAITING_FRESH_OPUS_ACCEPTANCE

HANDOFF:
qa-reports/phase04/04A-final-repair-20260921T214936Z/HANDOFF.md
```
