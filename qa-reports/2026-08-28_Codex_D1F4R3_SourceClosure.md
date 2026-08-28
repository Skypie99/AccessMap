# D1F4R3 Source Closure — local implementation record

**Date:** 2026-08-28
**Worktree:** `/Users/skypie/AccessMap-codex/d1f4-source-repair-r3`
**Branch:** `codex/d1f4-source-repair-r3`
**Implementation commit:** `560b41efc0c22e69dab347f382b952e4158af8c6`
**Base:** `93036d13980eaa54e3c126043dc6d7116514210e`
**Scope:** local source, forward-only migration, focused tests, and QA record only. No remote database, deployment, merge, push, credentials, or production operation was performed.

## Result

**REPAIR BLOCKED — local source changes are committed, but the repository-wide executable gate and staging proof are unavailable in this environment.**

The committed source repair closes the specific R2 design failures in code and database contracts: a durable writer-drain proof gates cleanup and purge; pre-lock retries re-enter through `REQUESTED`/`LOCK_DRAIN`; review items are actionable and generation-aware; terminal evidence is durable; active Storage inventory uses bounded composite-keyset pagination; and ordinary flag deletion now uses a narrow authenticated server route rather than a client-side admin Storage delete capability.

This is not a release, deployment, or independent acceptance result. It is ready for a fresh independent worktree acceptance only after the blocking local dependency/runtime conditions below are resolved.

## What changed

### D1F4 deletion worker and database contracts

- Added `supabase/migrations/20260828010000_d1f4r3_source_closure.sql`, a forward-only migration that:
  - records a committed `deletion_lock_confirmed_at` and requires both that proof and the durable lock row before cleanup-side work or relational purge;
  - maps failures while still `REQUESTED` to `LOCK_DRAIN`, whose resume transitions back to `REQUESTED`, preventing a retry from skipping Transaction B;
  - captures historical and canonical Storage associations before destructive cleanup, preserves terminal evidence after completion, and prevents an incomplete association from being acknowledged away;
  - replaces offset-key iteration with a bounded `(object_key, source_ref, source_id)` composite-keyset RPC and rejects a null page limit;
  - creates exact review references using a SHA-256 object reference plus exact `bucket_id`/`object_key`, and reopens precise review if a preserved foreign object later becomes subject-owned;
  - makes review-item resolution single-item, idempotent for the same durable resolution, conflicting for a different repeat resolution, and truthful about whether work was requeued;
  - revalidates terminal Storage evidence before readiness and completion;
  - removes the old bulk review resolver and the direct admin Storage delete policy;
  - adds service-role-only prepare/finalize RPCs for ordinary flag deletion.
- Updated `supabase/functions/_shared/accountDeletionWorkerCore.ts` and `supabase/functions/account-deletion-worker/index.ts` so the worker asserts the durable drain before Storage removal or purge, records evidence before destructive phases, uses composite-keyset enumeration, and reconciles terminality before Auth-last completion.
- Updated `supabase/functions/account-deletion-review/index.ts` to return the stored RPC outcome rather than always reporting a requeue.

### Ordinary flag deletion

- Added `supabase/functions/delete-flag/index.ts`. The handler relies on the default Edge gateway JWT check, separately derives the caller with `auth.getUser()`, verifies exact canonical Storage absence after each removal, and finalizes the relational delete only after that check.
- Updated `src/lib/flags.ts` so ordinary deletion invokes that narrow Edge route and removed the broad client-side Storage/relational cleanup path.

### Regression coverage

- Added `src/__tests__/d1f4r3SourceClosure.guard.test.ts` to freeze predecessor migration hashes and guard the writer drain, retry route, review liveness, terminal evidence, bounded pagination, and canonical ordinary-delete path.
- Extended `src/__tests__/d1f4r2Adversarial.test.ts` with the P0 corrupt-`CLEANING` scenario, `REQUESTED → LOCK_DRAIN → REQUESTED` retry path, generation/review behavior, preserved-foreign revalidation, and pagination boundaries at 99/100/101/199/200/201/250/500/501.
- Replaced stale deletion-path unit coverage with `src/lib/__tests__/d1f4r3CanonicalReportDelete.test.ts`, and updated the flags/SR050 tests for the Edge invocation contract.

## Frozen predecessor evidence

The source guard and a separate SHA-256 check both matched the expected immutable predecessor bytes:

| File | SHA-256 |
| --- | --- |
| `supabase/migrations/2026-08-27_d1sa_deployed_security_containment.sql` | `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d` |
| `supabase/migrations/2026-08-27_d1_option_a_account_deletion.sql` | `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01` |

The shared Edge client has the exact pinned import `npm:@supabase/supabase-js@2.106.2`.

## Gates actually run

| Gate | Result | Evidence |
| --- | --- | --- |
| Focused D1F4 adversarial + source-closure tests | PASS | 2 suites, 33 tests passed, run with the existing local Jest binary and an explicit isolated-worktree module mapping. |
| Focused deletion-path regressions | PASS | 4 suites, 54 tests passed: async guard, canonical delete, SR050 deletion, and flags Supabase contract. |
| Focused total | PASS | 6 suites, 87 tests passed. Unrelated reopen-warning console notices were emitted by existing test setup. |
| Active owner UUID cast self-attack | PASS | No `owner_id::uuid` owner-cast matches in the active R2/R3 deletion migration and worker paths. |
| Active worker offset pagination self-attack | PASS | No `.range(` match in `supabase/functions/account-deletion-worker` or `accountDeletionWorkerCore.ts`. |
| Frozen predecessor SHA-256 | PASS | Both expected SHA-256 values matched exactly. |
| Exact Edge Supabase pin source check | PASS | Shared client imports `npm:@supabase/supabase-js@2.106.2`. |
| `git diff --check` before source commit | PASS | No whitespace errors. |
| `git diff --cached --check` before source commit | PASS | No whitespace errors. |
| `npm run typecheck` | BLOCKED | Existing local dependency cache cannot resolve `expo-crypto` and `expo-secure-store` from unchanged `src/lib/accountDeletionReceipt.ts`. No D1F4 R3 source error was reported before those missing-module failures. |
| `npm run lint` | BLOCKED | The only errors were unresolved `expo-secure-store` imports in unchanged receipt source/test paths; 90 existing warnings were also reported. |
| Full `npx --no-install jest --ci --watchman=false -w 3` | BLOCKED | Jest setup cannot resolve `expo-secure-store`; 261 suites failed to initialize before executing test bodies. No packages were downloaded or installed. |
| Migration parse/apply / Edge runtime test | NOT VERIFIED | No usable Deno, `psql`, or Docker runtime was available; local Supabase CLI exited with status 137 before reporting a version. No database operation was attempted. |
| Staging CORS/preflight and exact runtime auth/delete flow | NOT VERIFIED | No staging deploy or remote interaction is authorized in this task. |

## Deliberate safety boundaries

- No source under the primary AccessMap checkout or the R2 worktree was edited.
- A temporary local `node_modules` symlink was used only to run focused tests against the existing cache, then removed before staging. It is not present in the committed worktree.
- The proposed root Supabase function configuration change was not made: it would be an authentication/security configuration change, outside the estate safety floor. The new Edge handler therefore uses the default gateway JWT behavior and has a second explicit user lookup in handler source. Browser OPTIONS/preflight behavior remains a staging hold.
- No legacy string URL is used as deletion authority. A non-derivable historical association remains `BLOCKED_ASSOCIATION` / manual-review-required rather than becoming a silent acknowledge or delete path.

## What remains

1. Restore the project's expected local Expo dependency set from its approved lockfile/cache, then rerun the repository gates: `npm run typecheck`, `npm run lint`, `npx --no-install jest --ci -w 3`, and `git diff --check`.
2. Run a fresh independent source acceptance from a separate clean worktree. It must attack the migration and active worker directly; passing focused tests are not independent proof.
3. Under separately authorized staging-only scope, parse/apply the forward-only migration, test Edge JWT/CORS preflight behavior, test exact storage ownership/absence, exercise retry/review/terminality flows, and capture the recovery evidence. Do not treat source guards as deployed or device truth.

## DECISIONS FOR SKY

### 1. Resolve the local dependency gate before acceptance

**Decision:** restore the approved Expo dependency cache/installation used by this checkout, without changing the lockfile as a workaround.
**Recommendation:** restore the declared dependencies from the existing approved package lock, then rerun the complete local gate set.
**Why:** the full Jest, typecheck, and lint commands cannot initialize because `expo-secure-store` and `expo-crypto` are absent locally; this does not establish any changed-source failure, but it prevents a complete repository result.
**Alternative:** accept only the focused 87-test result.
**Impact:** that alternative leaves the repair blocked from independent acceptance and release planning.

### 2. Decide the authorized staging configuration and runtime verification scope for `delete-flag`

**Decision:** whether to review any needed Edge-function configuration under a dedicated authentication/security change and staging test plan.
**Recommendation:** preserve gateway JWT enforcement unless a separately reviewed configuration requires otherwise; test browser OPTIONS/preflight and token behavior in staging before relying on the new route.
**Why:** this task could not change root Supabase function authentication configuration. The handler has defense in depth, but source review cannot prove platform gateway and preflight behavior.
**Alternative:** change config within this repair without dedicated review.
**Impact:** that would cross the estate's no-auth/security-config boundary and still would not prove staging behavior.

### 3. Set the operator path for non-derivable historic URLs

**Decision:** define the staging manual-review procedure for a historical record that cannot be associated with an exact Storage object key.
**Recommendation:** retain the fail-closed `BLOCKED_ASSOCIATION` state until an authorized operator can establish an exact association or separately record a reviewed no-object outcome.
**Why:** the repair intentionally removes the old “acknowledge unknown association and continue” escape hatch.
**Alternative:** infer a key from a legacy URL and permit deletion/acknowledgement.
**Impact:** that alternative could delete the wrong object or erase the evidence required to make a privacy-terminal claim.
