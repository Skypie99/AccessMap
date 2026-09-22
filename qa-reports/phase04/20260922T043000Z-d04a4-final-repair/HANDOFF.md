# Phase 04 final integrated candidate repair — D-04A-4

**Outcome:** PASS — safe temporary capability removal. This is a local integrated candidate awaiting fresh independent acceptance. The earlier integrated receipt at `qa-reports/phase04/20260922T032010Z-final-integration/FINAL_INTEGRATION.md` remains historical evidence; its FDA-002 zero-photo DELETE claim is superseded here.

## Identity and decision

- Worktree: `/Users/skypie/AccessMap-worktrees/flagstone-p04-integration-20260921`; branch: `codex/flagstone-phase04-integration-20260921`.
- Verified clean starting HEAD `ea5d98e152540eca4dbce10a0a12090cdd64d13d`, tree `3cd45c8d4a20eb261e8726fe485cd9eedbb84877`.
- Canonical base `7159d2499607b9e8b90fb03d0fa761a8dbe6e7a5` and accepted 04A `ab6b8059a68e7324ee1d07f435603038bdfa41eb` and 04B `3b21be73316ebea3c79e9ccc13a35a4a82a8373a` are ancestors. `origin/main` remained at the canonical base.
- Sky's D-04A-4 decision disables client-side flag deletion for **all flags** in Phase 04. A client photo lookup cannot prevent another permitted photo insert before a flags row DELETE; a cascade could then remove the new photo row while leaving its public Storage object. The client now refuses before any query, Storage call, Edge invocation, or row DELETE. A future atomic/server deletion contract is deferred without choosing an implementation.

## Files changed

- `src/lib/flags.ts`: `deleteFlag` immediately throws typed `FlagDeletionUnavailableError`; legacy refusal error classes remain for compatibility and are marked historical.
- `supabase/contract/client-expectations.v1.json`: revision 10 records D-04A-4 as current truth, removes the three obsolete flag-delete call sites, and retains earlier notes as superseded history. The FDA-003, FDA-004, and FDA-019 surface objects are structurally unchanged from the starting candidate.
- `src/lib/__tests__/flags.supabase.test.ts`, `src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts`, and `src/lib/__tests__/sr050DeleteFlagPhotos.test.ts`: replace superseded direct-DELETE expectations with refusal for zero-photo, owner, admin, arbitrary-id, repeat-activation, and photo-bearing paths.
- `src/__tests__/contractManifest.guard.test.ts`, `src/__tests__/d1f4r3SourceClosure.guard.test.ts`, and `src/__tests__/d1f4r3Fix2ReviewReplay.test.ts`: require no client flag-delete call site, no direct DELETE or Edge invocation in `deleteFlag`, and the current manifest statement.
- `src/components/__tests__/FlagDetailModal.refusal.test.tsx` and `src/screens/__tests__/AdminScreen.test.tsx`: owner/admin repeated refusal leaves the flag visible and surfaces the capability error without success callbacks. The two production caller files themselves did not need edits.
- This handoff, the root QA report, and `evidence/` record tests and mutation results. No backend policy, migration, Edge function, or account-deletion source changed.

The five accepted 04B source/test paths from commit `0a8af34` (`src/lib/__tests__/account.test.ts`, `src/screens/ProfileScreen.tsx`, `src/screens/SignInScreen.tsx`, and their two screen test files) are byte-identical to accepted 04B `3b21be7`. The later 04B receipt files are also untouched. FDA-019 upload behavior and guest behavior were not edited.

## Gates and actual results

| Command or proof | Result |
| --- | --- |
| `git status --porcelain=v1 -b`, `git rev-parse HEAD HEAD^{tree}`, `git merge-base --is-ancestor` checks, and `git rev-parse origin/main` before editing | Exact requested clean starting state and ancestry confirmed. Primary dirty checkout read only. |
| Combined focused `npx jest --ci -w 3 --silent` with the 21 paths in the prior integration receipt, including FDA-002, FDA-019, 04B, privacy and Phase 03B guards | PASS: 21/21 suites, 474/474 tests, 0 failed. Jest emitted the previously observed worker teardown warning. |
| `node scripts/replay-phase03c.mjs --pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql` | PASS: 208/208 assertions (52/49/22/85), 0 failed, socket-only, TCP disabled, disposable cluster destroyed. |
| `node scripts/replay-phase03b.mjs --pgtap-sql=/Users/skypie/Documents/Codex/2026-09-04/files-pasted-by-the-user-flagstone-2/work/pgtap-968eb53a33114e83042b3bdb0c664b5b80cf8bdf/sql/pgtap.sql` | PASS: forward and reapply suites, safe rollback, exact reapply, disposable cluster destroyed. |
| `npx tsc --noEmit` | PASS, exit 0, no diagnostics. |
| `npx eslint src --ext .ts,.tsx` | PASS WITH PREEXISTING WARNINGS: 0 errors, 90 warnings, matching the prior integrated receipt. |
| `npx jest --ci -w 3` | PASS: 299/299 suites; 4,470 passed, 32 todo, 0 failed (4,502 total). |
| `git diff --check` and source inventory for `.from('flags').delete()` / `functions.invoke('delete-flag')` under `src` | PASS: no whitespace errors; no reachable flags row DELETE or delete-flag Edge call in client source. |
| Five mutation runs in disposable scratch copies; runner, result JSON, stdout, and stderr in `evidence/` | PASS: M1 direct DELETE, M2 admin bypass, M3 owner bypass, M4 owner caller false success, M5 photo-check-then-delete all failed their selected tests: **5/5 KILLED**. The unmutated scratch baseline passed 3 suites / 60 tests. |

During the repair, the first focused runs failed only on manifest assertions and line references that still described the superseded direct DELETE. Those were corrected. A transient 91st lint warning came from an unused superseded test helper; after removing it, lint returned to the prior 90 warnings. No unrelated test failure remains.

The exact combined focused command was:

```bash
npx jest --ci -w 3 --silent src/lib/__tests__/flags.test.ts src/lib/__tests__/flags.supabase.test.ts src/lib/__tests__/photos.test.ts src/lib/__tests__/sr050DeleteFlagPhotos.test.ts src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts src/screens/__tests__/ReportFlagModal.test.tsx src/screens/__tests__/AdminScreen.test.tsx src/components/__tests__/FlagDetailModal.refusal.test.tsx src/__tests__/contractManifest.guard.test.ts src/__tests__/d1f4r3SourceClosure.guard.test.ts src/__tests__/d1f4r3Fix2ReviewReplay.test.ts src/__tests__/webResilience.test.ts src/__tests__/privacy.guard.test.ts src/lib/__tests__/adminReportsPrivacy.guard.test.ts src/screens/__tests__/phase03bModerationClient.guard.test.ts src/lib/__tests__/account.test.ts src/lib/__tests__/accountDeletionAvailability.test.ts src/lib/__tests__/accountDeletionReceipt.test.ts src/screens/__tests__/ProfileScreen.deletion.test.tsx src/screens/__tests__/SignInScreen.test.tsx src/__tests__/d1f4AsyncAccountDeletion.guard.test.ts
```

The replay file SHA-256 was `d4f9c8a4b0bfa6f2e29c751ab4deb79208e43f5935bab1948750b95bad3926b3`, matching the pinned integration input. The replay scripts use temporary Unix sockets with `listen_addresses=''` and accept no production database inputs.

## Finding status

- **FDA-002:** PASS — SAFE TEMPORARY CAPABILITY REMOVAL. Client flag deletion is disabled pending an atomic backend contract; this is not server deletion implementation.
- **FDA-003:** PASS — accepted 04B compatibility preserved; 04B behavior changed: NO.
- **FDA-004_CLIENT_COMPATIBILITY:** PASS. **FDA-004_LIVE_PROOF:** DEFERRED.
- **FDA-019:** PASS — secure capability-backed upload when available; signed-in attachment gated when absent; unsafe legacy fallback unreachable; guest behavior unchanged.
- **Phase 03C compatibility:** PASS. **Phase 03B local regression:** PASS.

Production contact: NONE. Staging contact: NONE. Database action: LOCAL DISPOSABLE ONLY. Deployment: NONE. Push: NOT PERFORMED. Primary dirty checkout touched: NO.

## DECISIONS FOR SKY

- **Final independent acceptance:** Recommendation: run one fresh independent review against the exact local repair commit and tree before Sky decides whether to merge or push. Reason: this receipt and its gates are author-side evidence. Alternative: keep the candidate local on HOLD. Impact: no Phase 04 publication or Phase 05 work follows from this report.
- **Future flag deletion:** Recommendation: retain the temporary refusal until a separately scoped backend phase establishes and verifies an atomic deletion contract. Alternative: continue leaving deletion unavailable. Impact: no client flag can be deleted through Phase 04, including a currently zero-photo flag.
- **FDA-004 live proof:** Recommendation: keep it deferred pending separate authorization and live evidence. Alternative: leave the finding open. Impact: this local compatibility PASS makes no deployed-runtime claim.
