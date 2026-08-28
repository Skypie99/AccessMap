# D1F4R3 local gate verification — exact dependency restoration

**Date:** 2026-08-28
**Candidate worktree:** `/Users/skypie/AccessMap-codex/d1f4-source-repair-r3`
**Branch:** `codex/d1f4-source-repair-r3`
**Candidate HEAD verified:** `c2d01d9a65d0e63ae9240d6e314bf8f4cd4697bb`
**Implementation commit:** `560b41efc0c22e69dab347f382b952e4158af8c6`
**Scope:** verification continuation only. No application, migration, package-manifest, lockfile, Supabase configuration, remote, deployment, or production change was made.

## Verdict

**D1F4R3 LOCAL GATES FAIL — SOURCE OR TEST REPAIR REQUIRED**

The previous local dependency blocker is resolved, and all candidate-specific D1F4R3 focused tests pass. The canonical repository Jest run now reaches its test bodies and fails in three pre-existing, non-D1F4 test suites. The source-only Edge configuration inspection also identifies an independent Work-review concern: `delete-flag` is browser-invoked and implements an `OPTIONS` branch, but the root Supabase configuration has no explicit entry for it. Current official Supabase documentation says omitted functions use `verify_jwt = true` and that the gateway validates requests before handler code, so whether a browser preflight reaches that branch is not demonstrated by source alone.

No repair was attempted because this task authorized verification only.

## Dependency integrity and restoration

Before `npm ci`, the worktree was clean and had no `node_modules` directory. The two missing modules were already represented by the approved dependency graph:

| Package | package.json | package-lock root | resolved after restore |
| --- | --- | --- | --- |
| `expo-crypto` | `~15.0.9` | `~15.0.9` | `15.0.9` |
| `expo-secure-store` | `~15.0.8` | `~15.0.8` | `15.0.8` |

`npm ci` restored 1,142 lockfile-defined packages and completed successfully. It emitted third-party deprecation and audit notices; no `npm audit fix`, upgrade, package edit, or lockfile edit was run.

The package manifests were byte-identical before and after installation:

| File | SHA-256 before / after |
| --- | --- |
| `package.json` | `bb86fd5ecf6c7fca360ca123334c3c4a3d56ec97fc3e55237d6a9c9f7de833b5` |
| `package-lock.json` | `8efdb129a4cc940a42233237b0d13bec2fcfd08d86e819aa5d3871fc326c6972` |

`node_modules` is ignored and was not staged or committed.

## Executable gates

| Gate | Result | Evidence |
| --- | --- | --- |
| `npm run typecheck` | PASS | `tsc --noEmit` exited 0. |
| `npm run lint` | PASS | 0 errors; 90 existing warnings. |
| Canonical `npx --no-install jest --ci -w 3` | FAIL | 3 suites failed, 258 passed, 261 total; 5 tests failed, 3,801 passed, 32 TODO, 3,838 total; 918.674 seconds. |
| Focused R3 suite with `--watchman=false` | PASS | 6 suites, 87 tests: async guard, adversarial R2/R3 closure, R3 source closure, canonical flag deletion, SR050 deletion, and flags Supabase contract. |
| `git diff --check` | PASS | No whitespace errors. |
| `git diff --cached --check` | PASS | No whitespace errors. |
| Implementation-range whitespace check | PASS | `93036d1..560b41e` has no whitespace errors. |

The canonical Jest run first reported a Watchman crawl timeout, then automatically retried with Jest's node crawler and completed. The gate failure below is therefore not a Watchman-only failure.

### Full-Jest failures outside the R3 candidate

1. `src/screens/__tests__/ReportFlagModal.test.tsx`
   - `submitting state — L4 disable sweep`: expected `mockCreateAnonFlag` once after rate-limit rejection, received zero calls.
   - `R2-F3` draft-dismissal case: cannot find `Apply template: Winter ramp`.
2. `src/screens/__tests__/MapScreen.guestHandoff.test.tsx`
   - one non-iOS guest handoff case times out in an `afterEach` hook;
   - a second case queries a component after unmount.
3. `src/screens/__tests__/LeaderboardScreen.monogram.test.tsx`
   - the initials case exceeds its 15-second test timeout.

These failures are outside the D1F4 source/migration/Edge paths and appeared only after the exact dependency tree was restored. They were not modified, weakened, or repaired in this verification task.

## D1F4R3 focused behavioral proof

The focused pass includes the requested candidate controls:

- corrupt-`CLEANING` writer-drain rejection;
- `REQUESTED → LOCK_DRAIN → REQUESTED` retry route;
- privacy-terminal keyset pagination boundaries;
- repeated review and replay behavior;
- historical terminal-evidence controls;
- ordinary `delete-flag` behavior;
- final Storage terminality.

Focused tests remain source/mocked/database-contract evidence only. They are not a local PostgreSQL, Edge gateway, Storage, Auth, or staging proof.

## Static and privacy gates

| Check | Result |
| --- | --- |
| Frozen D1S-A migration SHA-256 | PASS — `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d` |
| Frozen rejected synchronous D1 migration SHA-256 | PASS — `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01` |
| Active D1F4 owner UUID-cast scan | PASS — no `owner_id::uuid` owner-cast match in active R2/R3 worker paths. |
| Active worker privacy-terminal `.range()` scan | PASS — no match in active worker/core paths. |
| Exact Edge client pin | PASS — shared client imports `npm:@supabase/supabase-js@2.106.2`. |
| Changed-source literal secret scan | PASS — no suspected credential literal in the candidate source diff. |
| Root function configuration inspection | REVIEW REQUIRED — no `[functions.delete-flag]` entry exists. |

## `delete-flag` Edge source configuration result

The handler source:

- returns shared CORS headers and has an `OPTIONS` handler;
- accepts only `POST` after preflight;
- builds an anonymous-key caller client with the incoming `Authorization` header and requires `caller.auth.getUser()`;
- lets the client supply only a UUID `flagId`, never a user/owner subject;
- uses a server-only service-role client for narrow prepare/finalize RPCs and Storage operations;
- obtains an exact server-side canonical plan, requires exact Storage-owner equality, treats only exact absence as idempotent, checks exact absence after removal, and only then finalizes the relational deletion;
- returns generic error responses rather than keys, account roles, or report-existence detail.

The root `supabase/config.toml` contains explicit `verify_jwt = false` entries for `delete-account`, `account-deletion-worker`, `account-deletion-status`, and `account-deletion-review`, but none for `delete-flag`. Current official Supabase documentation says the per-function default is `verify_jwt = true` and that the platform check runs before handler code. Therefore this source does not establish that an unauthenticated browser `OPTIONS` preflight can reach the handler branch. Do not invent a configuration change in this verification thread; send this exact source/config question to independent Work review and prove deployed behavior only in separately authorized staging.

## Operational historical-association hold

R3 continues to fail closed for historical objects whose exact Storage association cannot be safely derived. It retains a `BLOCKED_ASSOCIATION` / manual-review-required path rather than using URL substring ownership, path guessing, or blind acknowledgement.

**Operational release hold:** before account deletion is considered operationally ready, Sky needs an authorized procedure for resolving a non-derivable historical association from exact, server-derived evidence. This report does not authorize or implement that procedure.

## Tooling limitations and staging-only holds

- `deno`, `psql`, and Docker remain unavailable locally.
- A Supabase CLI binary exists, but the earlier local version check exited 137; it was not repeatedly retried during this verification continuation.
- No local migration parse/apply, Edge execution, deployed function-catalog, function-grant, RLS, MVCC, Storage, Auth, browser CORS, or gateway behavior was exercised.
- No remote database, Edge deployment, Storage/Auth mutation, EAS build, TestFlight, or App Store action occurred.

## DECISIONS FOR SKY

### 1. Assign the three full-suite test failures outside D1F4

**Decision:** assign repair/triage for the `ReportFlagModal`, `MapScreen.guestHandoff`, and `LeaderboardScreen.monogram` failures in the appropriate owning workstream.
**Recommendation:** reproduce and repair them in a separate, scoped worktree; do not fold them into the D1F4 privacy repair.
**Why:** the restored exact dependency set makes the canonical test suite execute and these are now real gating failures, but their files and behaviors are unrelated to R3.
**Alternative:** ignore the failures because D1F4-focused tests pass.
**Impact:** the complete repository gate remains red and the candidate is not ready for fresh independent source re-acceptance.

### 2. Obtain independent source/config review for `delete-flag`

**Decision:** decide the intended browser JWT and preflight configuration for the new Edge route.
**Recommendation:** preserve the current source unchanged until an independent Work review decides the platform configuration and separately authorized staging test plan.
**Why:** the route's handler is defense-in-depth authenticated, but it has no explicit root config entry while its browser CORS branch depends on reaching handler code.
**Alternative:** change `verify_jwt` in this verification thread.
**Impact:** that would cross the no-auth/security-configuration boundary and still would not establish deployed gateway behavior.

### 3. Retain the historic exact-association release hold

**Decision:** approve an operator procedure for an exact-but-non-derivable historical association.
**Recommendation:** require exact server-side evidence or a separate approved no-object outcome; keep `BLOCKED_ASSOCIATION` otherwise.
**Why:** R3 intentionally prevents unprovable URL/path inference and blind acknowledgement.
**Alternative:** infer ownership from a legacy URL or clear the review state without exact evidence.
**Impact:** the alternative could remove the wrong object or permit a deletion to complete without privacy-terminal evidence.
