# Phase 04A REPAIR — HANDOFF (success)

STATUS: `PHASE04A_REPAIR: PASS` — see the machine-readable block at the end.

Bounded repair of the 04A candidate after an independent Opus acceptance
review returned a real-defect HOLD. Scope was strictly limited to the
predicates the review named; 04B and the primary `~/AccessMap` checkout were
never touched.

## Identity

- CANONICAL_BASE (Phase 04 base): `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5`
- 04A implementation SHA (pre-repair): `9700538d270f1a0caf3ac4110223ed4137c9bc7c`
- STARTING_CANDIDATE (HOLD result): `6b239dd9cdf280de7165af0375cc6d7bf22654d9`
- BRANCH: `sonnet/flagstone-phase04a-compat-20260921`
- WORKTREE: `/Users/skypie/AccessMap-worktrees/flagstone-p04a-sonnet-20260921`
- REPAIRED_CANDIDATE_SHA (local, unpushed): `4f78c9ca6b92a0134087c9ca9e26d8b5e5acee76`
- REPAIRED_CANDIDATE_TREE: `5c83f243efd84b02faea45111811c0be116c942c`
- Primary `/Users/skypie/AccessMap` checkout: never touched (no `cd` into it, no writes).

## Owner decision applied

**D-04A-1** (Sky): keep the flag row until its associated public photos are
proven removed. Do NOT delete the flag row first with best-effort photo
cleanup. Deletion must fail closed if required photo cleanup fails or
Storage absence cannot be established.

## Defects repaired

### BLOCKER D1 — FDA-002 delete ordering (real defect, confirmed by review)

`deleteFlag()` (`src/lib/flags.ts`) previously: (1) read flag/photo state,
(2) deleted the `flags` row, (3) attempted Storage cleanup afterward,
best-effort. A Storage failure at step 3 could report a successful deletion
while a public photo stayed live and unreachable forever — the SR-050
takedown gap.

Repaired sequence, matching the review's required order exactly:

1. Read the flag row. Missing → refuse immediately (`FlagDeleteRefusedError`)
   — nothing to determine cleanup requirements from.
2. Snapshot every gallery photo (`flag_photos`).
3. Determine the exact Storage path each photo **requires** removed:
   `object_key` is exact; a legacy `url`-only photo is resolved through
   `storagePathFromPublicUrl` against the flag OWNER's uid. If a photo exists
   but its path cannot be derived with certainty — no owner uid (anonymous
   flag), a foreign-folder URL, or a malformed one — that photo's "required
   absence" cannot be established, and the whole delete is refused. This is
   an explicit, accepted trade-off under D-04A-1: an anonymous flag with an
   unresolvable legacy photo is now undeletable client-side until a
   server-side sweep resolves it, rather than silently deleting the row and
   leaving the photo live.
4. Remove every required path via a new `removeRequiredFlagPhotos` helper
   that **throws** on any Storage error (unlike `removeUploadedFlagPhotos`,
   which is deliberately best-effort/never-throws for a pre-publish upload
   that never became a flag photo). A thrown error here means the row is
   never touched.
5. Only now issue the `flags` DELETE `... RETURNING id`, and validate that
   the returned rows actually contain the exact target id
   (`deletedRows.some((row) => row.id === flagId)`) rather than merely
   checking a non-zero length — this closes the mutation-test gap the review
   found (`.eq('id', flagId)` → `.eq('user_id', flagId)` used to stay green).

### BLOCKER D2 — FDA-019 partial-batch photo orphans (real defect, confirmed by review)

`batchInsertFlagPhotos()` (`src/lib/photos.ts`) only cleaned up the ONE photo
whose `flag_photos` row-insert failed (via `insertLegacyFlagPhoto`'s own
internal cleanup). Every OTHER photo in the same batch that was uploaded
successfully but never even attempted for attachment (because the loop
stopped at the first failure) was left as a real object in the `flag-photos`
bucket with no DB row pointing at it.

Repaired: on any attach failure at position `i`, every photo from `i` onward
that is not already self-cleaned is cleaned up before the error propagates —
`cancelFlagPhotoUpload` for intent-based uploads (mirrors
`ReportFlagModal.tsx`'s own pre-`createFlag` failure handling: never
client-inferred absence, the durable server-side intent hold is what
actually protects the object), `removeUploadedFlagPhotos` for legacy
uploads. Already-attached photos before the failing position are never
touched. Covered in `photos.test.ts`'s new "FDA-019 orphan repair" describe
block at first, middle, and final failure position, plus a mixed
intent/legacy batch — 4 new tests, all passing.

### BLOCKER D3 — test quality (mutation-test gap, confirmed by review)

The independent reviewer mutation-tested the owned tests and found the
`deleteFlag` mocks accepted `.eq()` calls without checking their arguments,
so `.eq('id', flagId)` → `.eq('user_id', flagId)` stayed green. New LOCKING
tests in `flags.supabase.test.ts` and `d1f4r3CanonicalReportDelete.test.ts`
capture the delete-branch's `eq` spy and assert its exact call arguments.
Also added: an ordering LOCKING test (cleanup call precedes the DELETE call,
verified via a shared call-order array), a cleanup-failure-prevents-delete
LOCKING test, and a wrong-returned-id refusal test (`deletedRows` containing
a row whose id is NOT the target flagId must refuse, not merely check
length).

## Stale guards repaired

Three shared, previously-forbidden-to-edit regression-pin files still
asserted the pre-04A `delete-flag` Edge Function contract this milestone was
directed to remove (P04-D01). All three now assert the accepted current
contract instead:

- `src/__tests__/contractManifest.guard.test.ts` — FDA-002 sub-test now
  asserts no edge callsite + a deployed direct `flags` table DELETE callsite
  + the manifest no longer describes cleanup as best-effort. FDA-019
  sub-test now asserts the graceful fallback (matching the avatar surface)
  + declares the legacy `flag_photos` insert path + requires the
  `productionImpact`/`phase04aRepairNote` to actually mention the
  orphan-cleanup fix before claiming WORKING.
- `src/__tests__/d1f4r3SourceClosure.guard.test.ts` — its one stale
  assertion (`flags` containing the Edge Function invocation) is now a
  `not.toContain`. Added a new test asserting the SOURCE-level cleanup→DELETE
  ordering and that `removeRequiredFlagPhotos` never swallows an error —
  the static counterpart to the LOCKING behavior tests above.
- `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts` — its stale assertion is
  replaced with assertions on the accepted direct-DELETE path (no edge
  invocation, exact `.eq('id', flagId)` + `.select('id')`, `FlagDeleteRefusedError`
  present, no client-side `is_admin`/`auth.getUser()` inference inside
  `deleteFlag`'s own body).

The three files' OTHER assertions (D1F4R3's own, separate, still-undeployed
account-deletion `delete-flag` Edge Function lineage under
`supabase/functions/delete-flag/index.ts`, and the frozen-migration hash
pins) were left untouched — they were never stale.

## Manifest corrections

`supabase/contract/client-expectations.v1.json` (04A's exclusive ownership):
added a `phase04aRepairNote` to both the `flag-delete` and `photo-upload-flag`
surfaces documenting the exact defects and the repair, and corrected each
surface's `productionImpact` to stop claiming best-effort cleanup / an
unconditional WORKING claim on the flag-photo orphan path. Bumped
`revision` 6 → 7 with a new `phase04aRepairRevisionNote`. Updated two
`callSites` line numbers (`list_public_leaderboard`, `get_my_leaderboard_rank`
in `src/lib/flags.ts`) that shifted because `deleteFlag`'s rewrite added
lines earlier in the file — required for
`contractManifest.guard.test.ts`'s dynamic RPC/edge line-position scan to
stay green (table-kind call sites, which the `flag-delete`/`photo-upload-flag`
citations mostly are, are not line-validated by that scan, but the two RPC
citations are).

FDA-004 (moderation-queue) was not touched — `FUTURE_LIVE_PROOF_REQUIRED`
stands, no production runtime proof is claimed.

## Mutation / safety check (manual, disposable — not committed)

Before declaring PASS, each of the four predicates below was manually
reintroduced with a temporary `Edit`, the relevant tests were run and
confirmed RED, and the edit was reverted (confirmed via `git status` /
`git diff` showing no residual change; the working tree matched the
implementation commit exactly again before the final full-suite run).

| # | Mutation | Tests that went RED |
|---|---|---|
| 1 | `deleteFlag`'s row DELETE: `.eq('id', flagId)` → `.eq('user_id', flagId)` | `flags.supabase.test.ts` "LOCKING (BLOCKER D3)…", `d1f4r3CanonicalReportDelete.test.ts` "LOCKING (BLOCKER D3, mutation safety)…" (2 tests) |
| 2 | Moved the `flags` row DELETE before the required Storage cleanup | `flags.supabase.test.ts` "LOCKING (D-04A-1 / BLOCKER D1): a required Storage cleanup failure prevents…", "LOCKING (BLOCKER D1): required Storage cleanup happens before…", `d1f4r3SourceClosure.guard.test.ts` "Phase 04A repair (D-04A-1): …proves required photo cleanup before…" (3 tests) |
| 3 | `removeRequiredFlagPhotos` swallowed its Storage error (`console.warn` instead of `throw`) | `flags.supabase.test.ts` "LOCKING (D-04A-1 / BLOCKER D1): a required Storage cleanup failure prevents…", `d1f4r3SourceClosure.guard.test.ts` "Phase 04A repair (D-04A-1): …never swallows a cleanup failure…" (2 tests) |
| 4 | `batchInsertFlagPhotos`'s catch block reverted to only rethrowing (no `cleanupUnattachedFlagPhotos` call) | `photos.test.ts` "failure at the FIRST photo…", "failure at a MIDDLE photo…", "does not orphan a legacy upload that failed to insert while a later intent upload was never attempted" (3 tests) |

All four reverts were confirmed by re-running `npx tsc --noEmit` (clean) and
the full `npx jest --ci -w 3` suite (297/297 suites, 4417/4449 tests, 32
pre-existing todo, 0 failed) after the last revert.

## Exact tests run

```
npx tsc --noEmit
→ clean

npm run lint
→ 0 errors, 90 pre-existing warnings (same count as the pre-repair 04A HANDOFF; none new)

npx jest --ci -w 2 \
  src/lib/__tests__/flags.test.ts src/lib/__tests__/flags.supabase.test.ts \
  src/lib/__tests__/photos.test.ts src/lib/__tests__/sr050DeleteFlagPhotos.test.ts \
  src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts \
  src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/AdminScreen.test.tsx \
  src/__tests__/contractManifest.guard.test.ts src/__tests__/d1f4r3SourceClosure.guard.test.ts \
  src/__tests__/d1f4r3Fix2ReviewReplay.test.ts src/__tests__/webResilience.test.ts \
  src/__tests__/privacy.guard.test.ts src/lib/__tests__/adminReportsPrivacy.guard.test.ts \
  src/screens/__tests__/phase03bModerationClient.guard.test.ts
→ 14 suites, 383/383 tests PASS

npx jest --ci -w 2 --testPathPattern "privacy"
→ 4 suites (geoPrivacyFence, privacyLink.guard, privacy.guard, adminReportsPrivacy.guard), 53/53 tests PASS
(Phase 03C anon/public-read privacy contract — untouched by this repair, confirmed still green)

npx jest --ci -w 3
→ 297/297 suites, 4417/4449 tests PASS, 32 pre-existing todo, 0 failed
```

The pre-repair 4 known failures (`contractManifest.guard.test.ts`'s
FDA-002/FDA-019 sub-tests, `d1f4r3Fix2ReviewReplay.test.ts`'s stale
assertion, `d1f4r3SourceClosure.guard.test.ts`'s stale assertion) are all
resolved through the accepted current contract, not deleted or weakened.

## Local commits

1. `4f78c9ca6b92a0134087c9ca9e26d8b5e5acee76` — "fix(phase04a): repair
   deleteFlag ordering + FDA-019 orphan cleanup (D-04A-1)" — source, owned
   tests, stale-guard repairs, manifest correction (10 files, all within
   04A's OWNED_FILES plus the three shared guard files this repair task
   explicitly directed to update).

No push, no merge, no rebase, no amend of the prior 9700538/6b239dd
history. `git status` is clean except for this untracked report directory.

## Next exact safe action

Fresh independent acceptance review of `4f78c9ca6b92a0134087c9ca9e26d8b5e5acee76`
against the same predicates the HOLD named. If accepted, proceed to
integrating 04A + 04B (04B was independently accepted separately, on its own
local candidate `3b21be7`, unpushed) on a fresh combined tree per the
implementation sequence, then re-run the contract guard + focused tests +
full gates before any owner merge/push decision (Sky-only, per Const. Art. 1).

## Things NOT redone

No Phase 03B restoration. No re-litigating the accepted direct-DELETE path
(P04-D01/P04-D02). No 04B work — `src/lib/account.ts`,
`accountDeletionReceipt.ts`, `accountDeletionAvailability.ts`,
`ProfileScreen.tsx`, `SignInScreen.tsx`, and their tests were never opened.
No touch of the primary `~/AccessMap` checkout. No production/staging
contact, no migration, no deploy, no push.

---

```
PHASE04A_REPAIR:
PASS

STARTING_CANDIDATE:
6b239dd9cdf280de7165af0375cc6d7bf22654d9

D04A1_DECISION:
CLEANUP_PROVEN_BEFORE_ROW_DELETE

FDA_002:
PASS

DELETE_ORDERING:
PASS

DELETE_TARGET_ID:
PASS

CLEANUP_FAILURE_PREVENTS_DELETE:
PASS

FDA_019:
PASS

PARTIAL_PHOTO_FAILURE_CLEANUP:
PASS

FDA_004_LOCAL_COMPATIBILITY:
PASS

FDA_004_LIVE_PROOF:
DEFERRED

STALE_GUARDS_REPAIRED:
PASS

SOURCE_CLOSURE_GUARD:
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
PASS

FULL_JEST_FAILED:
0

MUTATION_SAFETY_CHECK:
PASS

LOCAL_COMMITS:
4f78c9ca6b92a0134087c9ca9e26d8b5e5acee76

REPAIRED_CANDIDATE_SHA:
4f78c9ca6b92a0134087c9ca9e26d8b5e5acee76

REPAIRED_CANDIDATE_TREE:
5c83f243efd84b02faea45111811c0be116c942c

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
REPAIRED_AWAITING_FRESH_INDEPENDENT_ACCEPTANCE

HANDOFF:
qa-reports/phase04/04A-repair-20260921T205556Z/HANDOFF.md
```
