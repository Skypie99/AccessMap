# D1F4 async account deletion — source implementation report

**Date:** 2026-08-27
**Worktree:** `/Users/skypie/AccessMap-codex/d1f4-async-account-deletion-i`
**Branch:** `codex/d1f4-async-account-deletion-i`
**Implementation commit:** `1778388 feat(deletion): implement async account removal`
**Baseline:** `cf2b7f8c0c8b5b941d49fd4eae97d955a350478e`

## Outcome

The D1F4 source implementation is complete and locally reviewable. It creates
the approved durable deletion-operation control plane, immediate request fence,
server-created photo intents, stateless worker source, same-operation manual
review continuation, client-held receipt recovery, and Auth-last completion.
No migration was applied; no Supabase configuration, secret, scheduler,
Storage bucket, Auth tenant, or deployed function was changed.

## What changed

- Added forward-only migration
  `supabase/migrations/2026-08-27_d1f4_async_account_deletion.sql`.
  It adds the operation, receipt-hash, write-fence, lease/retry, review-audit,
  exact-key provenance, and upload-intent control planes. Transaction A commits
  `REQUESTED` without taking the account row lock. Transaction B locks the
  account, increments `deletion_fence_version`, creates/confirms the durable
  deletion lock, and commits `LOCKED` only after that barrier drains prior
  writers.
- Replaced the synchronous `delete-account` source with the authenticated
  Transaction-A request endpoint. It derives the subject from Auth and accepts
  only the client-created operation ID and 256-bit receipt secret. It returns
  `202 requested`, never a deletion-success response.
- Added source-only `account-deletion-worker`, `account-deletion-status`, and
  `account-deletion-review` Edge Functions. The worker leases an operation,
  reconciles only known exact object keys, routes uncertainty to review, deletes
  Auth last, reconciles ambiguous Auth outcomes, and redacts the retained
  subject only at `COMPLETE`. The review handler is server-secret protected and
  resumes the same operation; it stores only redacted audit evidence.
- Replaced new authenticated direct photo writes with server-created
  `PREPARED` intents and opaque canonical object keys. The server commits an
  intent only after exact bucket/key/owner evidence. Absent or uncertain Storage
  evidence becomes `AMBIGUOUS` and cannot automatically complete deletion.
- Closed the signed-in `feedback` `user_id = NULL` bypass while retaining the
  anonymous feedback route. All later authenticated account-owned writes check
  the request fence. Anonymous reports remain photo-free.
- Added SecureStore-backed client receipt handling, generic unauthenticated
  receipt-status recovery after a lost response/Auth deletion, asynchronous
  deletion copy, and completion-only local receipt dismissal.
- Updated types and report/avatar photo callers to use the intent protocol;
  updated and added focused tests for request/lock ordering, ambiguity/review,
  receipt recovery, intent finalization, frozen migration hashes, and UI flow.

## Frozen migrations

The two frozen artifacts are byte-for-byte unchanged from the candidate base:

- `2026-08-27_d1sa_deployed_security_containment.sql` SHA-256:
  `d131d76929bae33051b7a3fcacb8852d58b38fda951f1c57b95aac227e85c68d`
- `2026-08-27_d1_option_a_account_deletion.sql` SHA-256:
  `a01142702609c2c32cce252f979e2ffc3ee6aa90b91030332fe1ceb287c83e01`

## Gates

| Gate | Command | Result |
| --- | --- | --- |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit` | Passed. |
| ESLint | `node node_modules/eslint/bin/eslint.js src --ext .ts,.tsx` | Passed with 0 errors and 90 existing/project warning-level findings. |
| Focused D1F4 suite | `npm exec --package=typescript@6.0.3 tsc -- --noEmit && npm exec --package=jest@29.7.0 jest -- --ci --no-watchman src/__tests__/d1f4AsyncAccountDeletion.guard.test.ts src/lib/__tests__/account.test.ts src/lib/__tests__/accountDeletionReceipt.test.ts src/lib/__tests__/photos.test.ts src/lib/__tests__/flags.test.ts src/lib/__tests__/users.test.ts src/screens/__tests__/ReportFlagModal.test.tsx src/__tests__/webResilience.test.ts` | Passed: 8 suites, 251 tests. |
| Full Jest suite | `node node_modules/jest/bin/jest.js --ci --no-watchman -w 3` | Passed: 257 suites, 3,774 tests; 32 intentional todos. |
| Diff whitespace | `git diff --check` | Passed. |
| Frozen-file integrity | `shasum -a 256 … && git diff --exit-code -- <frozen migrations>` | Passed. |

The repository's shell scripts could not resolve the normally linked local
`.bin` executables in this environment, so the identical installed TypeScript,
ESLint, and Jest entrypoints were invoked directly. No dependencies were added
beyond the committed Expo Crypto and SecureStore source dependencies.

## Source findings

- `REQUESTED` is a committed, immediate authenticated-write fence. The
  `request_account_deletion` source deliberately does not update the user row;
  `lock_requested_account_deletion` acquires the user-row gate and increments
  the fence version in Transaction B.
- The worker has no Storage-listing path. It removes object keys only from the
  intent/provenance ledger or a redacted review resolution. No deletion
  decision uses a public URL or UUID substring.
- `PREPARED`, `AMBIGUOUS`, and unresolved historic provenance route to review;
  they have no automatic `READY_FOR_AUTH_DELETE` or `COMPLETE` transition.
- Review escalation is immediate for deterministic provenance/security
  ambiguity and otherwise after three passes or 24 hours. The fence remains in
  place through review and until complete.
- The implemented client has no published 30-day completion promise. It says
  only that deletion is asynchronous and that the device will show completion.

## Known limitations and deployment holds

This is a source-only result. The worker is not scheduled, no worker/review
secret has been configured, and no migration/function/configuration has been
deployed. There is no local Supabase/Storage integration environment in this
worktree, so these hosted facts remain unverified:

- direct authenticated Storage admission after `REQUESTED`;
- the actual `storage.objects.owner_id` value during authenticated upload;
- exact-key reconciliation/deletion timing and finalization behavior;
- database locking, stale-snapshot fencing, leases, and crash recovery against
  the hosted database;
- Auth deletion reconciliation and post-Auth generic receipt status;
- lost-response recovery against hosted functions.

Automatic completion must remain deployment-blocked until the agreed staging
acceptance matrix proves those behaviors. If the Storage assumptions do not
hold, unresolved `PREPARED`/`AMBIGUOUS` operations remain manual-review-only;
do not add sleeps, timing windows, bucket sweeps, or a signed-URL claim as a
substitute for that proof.

## DECISIONS FOR SKY

1. **Decision:** approve a separate, least-privilege operational setup for the
   worker trigger and Sky-only review secret/action after source review.
   **Recommendation:** do not deploy or enable automatic completion until the
   staging acceptance matrix below passes. **Why:** source code cannot prove
   hosted Storage owner metadata or in-flight upload behavior. **Alternative:**
   deploy a manual-review-only workflow. **Impact:** the account stays fenced,
   and review resolves the same operation.

2. **Decision:** confirm Sky's pre-launch privacy-review process and evidence
   handling before publishing a duration promise. **Recommendation:** retain
   the current no-duration copy until the reviewer workflow is demonstrated.
   **Why:** 30 calendar days remains provisional. **Alternative:** publish a
   deadline before operational support exists. **Impact:** a user-facing promise
   could become inaccurate.

3. **Decision:** authorize staging acceptance, not production deployment, as
   the next phase. **Recommendation:** test constrained direct Storage upload
   admission, exact owner metadata, request/drain ordering, worker lease/crash
   recovery, Auth-last reconciliation, and lost-response receipt recovery.
   **Why:** these are explicit D1F4 deployment holds. **Alternative:** weaken
   ambiguity handling. **Impact:** weakening would violate the safe
   manual-review fallback and is not recommended.
