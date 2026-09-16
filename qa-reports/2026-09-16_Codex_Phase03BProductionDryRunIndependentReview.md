# Phase 03B Production Dry-Run Independent Review

## Verdict

`INDEPENDENT_PHASE03B_PRODUCTION_DRY_RUN_ACCEPTANCE: HOLD`

`PHASE03B_PRODUCTION_APPLY_AUTHORIZATION_PACKET: NOT_READY`

The frozen dry-run is a genuine non-applying dry-run against the named production project, its exact two-file plan and artifact identity are intact, and the pre/post immutability evidence is trustworthy. The packet nevertheless fails the required transient-safety standard: the two migrations commit independently, the first exposes the new moderation capability while the inherited points trigger is still active, and the second replaces that trigger only afterward. No inspected plan or evidence guarantees status-write quiescence between those commits. The replay harness tests only compatibility in this intermediate state and does not test its points semantics.

## Reviewer independence declaration

This reviewer did not implement the Phase 03B candidate, compatibility bridge, `photo_alt` repair, revised staging run, HTTP baseline adjudication, or frozen production dry-run. This was a review-only examination. The executor worktree and branch were not edited.

Reviewer worktree: `/Users/skypie/AccessMap-codex/flagstone-p03b-production-dry-run-independent-review-20260916`

Reviewer branch: `codex/flagstone-p03b-production-dry-run-independent-review-20260916`

Review base / dry-run source commit: `7bf05a22bf621fd2b6c2971d1ceb64f28bccc529`

Frozen candidate: `9d638456fa8e679678c54f131fe8f0db723eda72`

Candidate tree: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`

## What changed

- Added this independent review receipt only.
- No product source, migration, rollback, test, release, executor evidence, or production/staging state was changed.

## Identity and evidence review

- Git object, ancestry, and tree checks passed. `7bf05a2` contains the frozen dry-run receipt lineage; candidate `9d63845` is its ancestor and has the required tree.
- Candidate migration SHA-256 values independently match the frozen packet, accepted staging receipt `d88bb853b059e54d19cd9549ead4122c63b3ff15`, and the dry-run evidence:
  - moderation: `b1d7b5a6484a4217f509c3f27d168a8cac07f84833b7d1668a3fb251e7457a11`
  - points: `0b8ad388dc428ca27c605140b146a454e435fcac7dc0bea49c00f4f928af0ae5`
- The evidence manifest verified all 18 declared entries by byte count and SHA-256. The evidence privacy scan recorded zero credential, email-address, authorization-header, database-connection-string, or customer-payload matches.
- The raw dry-run receipt records `2026-09-16T23:03:47.877Z` through `2026-09-16T23:03:49.789Z`, exit code `0`, no signal, no timeout, `dryRun:true`, and exactly these migrations in order:
  1. `20260915210256_phase03b_moderation_semantics_compatibility_bridge.sql`
  2. `20260915210413_phase03b_points_integrity.sql`
- The command names production project `kldlwszpfkdmsjrjhjym`; the forbidden staging project `cepayqmsoqxshsiyqnvz` is not the target. Fresh read-only project metadata independently identified `kldlwszpfkdmsjrjhjym` as the active production project and did not identify staging as the target.

## CLI behavior review

- Installed executable: `/opt/homebrew/bin/supabase`
- Installed version: `2.116.0`
- Installed help states that `db push --dry-run` prints migrations that would be applied without applying them; `--skip-vault`, `--include-all`, and `--project-ref` are recognized flags.
- Upstream CLI tag `v2.116.0` was inspected at commit `997a1e69`. Its `db push` implementation branches on dry-run to print the plan; Vault and migration-apply operations occur only in the non-dry-run branch. Its integration tests assert that dry-run starts neither migration transactions nor Vault SQL.
- The preserved stdout and stderr are consistent with that contract: stdout reports `dryRun:true`; stderr states that migrations will not be pushed; the process exited normally.

Result: `CLI_DRY_RUN_VALIDITY: PASS`.

## Production immutability review

Frozen pre/post artifacts are byte/logically equivalent:

- migration ledger: 85 rows, 85 unique versions, latest `20260911120000`, ordered digest `811ab9813806cc37b0def61c6029579841170d904094e354951c239882a642ec`, zero Phase 03B ledger rows;
- structural checksum: `2d533d8f8bfb827fe6b63f4fb6f17035afd55b8d474260a51a20fe2c004bda01`;
- Edge Function: `notify-flag-status`, version 8, `ACTIVE`, `verify_jwt=false`, identity SHA-256 `276dcb14c85ca75955058b10ebb38d9d633fc29a21062fbcc181b502db7c2d70`;
- HTTP: queue 0, responses 6, fingerprint `709e04c5b05c3fb7986689366b007591ba9ca0740256358bbfe864314c59a2e8`, with the same six privacy-safe terminal row identities.

The structural snapshot begins a read-only transaction and covers catalogs for schemas, relations, columns, constraints, indexes, policies, triggers, routines, and `public.flags` grants. Its scope is sufficient for the Phase 03B immutability claim.

A fresh read-only production snapshot at `2026-09-16T23:28:40.864714Z` found the same 85-row ledger/digest, zero Phase 03B rows, structural checksum, HTTP counts/fingerprint, and function identity. This is current-state corroboration, not attribution evidence; the frozen paired snapshots establish dry-run immutability.

Result: ledger, structure, function identity, HTTP precondition, HTTP postcondition, and zero-production-mutation audit all `PASS`.

## Compatibility and authorization review

- Shipped Build 33 source `f5594171e75bc5ec92a87d0392c361601ddedfba` and pinned-web source `ebf091c21066d39898160b1357bde0aa35bdb8bf` have byte-identical historical `src/lib/flags.ts` helpers. Both issue direct authenticated status updates with the flag id and optional expected-status predicate.
- Migration 1 retains authenticated `UPDATE(status)`, revokes it from public/anonymous roles, preserves legal verify/resolve/reopen transitions, and forces reject/restore through the audited RPC.
- The current client uses `transition_flag_status()`. That function derives the actor from `auth.uid()`, requires an active account, locks the flag, checks the expected state, rejects stale/conflicting transitions, enforces admin-only reject/restore and reason allowlists, and writes moderation audit events.
- The repaired non-owner trigger rejects cross-owner `photo_alt` changes atomically and restores all other client-granted sibling content fields. Server-owned siblings remain outside the authenticated column grant. No sibling authorization omission was found.
- Rejected rows are hidden from anonymous and non-admin authenticated reads. Moderation ledger records are admin-readable and append-only. Report target mutations require a server-parsed anchored envelope and database-side admin authorization.
- The final post-migration-2 points state implements owner self-triage at zero points, once-per-flag milestones, comment/vote caps, one-way voting, and points-neutral reject/restore.

Results: Build 33, pinned web, new RPC, public-flags authorization, `photo_alt`, admin boundary, and final moderation semantics `PASS`. No sibling authorization omission was found.

## Transient-state analysis

The claimed `TRANSIENT_BREAKAGE_RISK: NONE` is falsified.

1. Migration 1 has its own `BEGIN` and `COMMIT` and exposes the moderation RPC before returning.
2. At that commit, the inherited `public.handle_flag_status_change()` remains active. It includes the legacy rejection penalty and repeatable milestone-reward behavior.
3. Migration 2 begins and commits separately; only it replaces the handler with points-neutral reject/restore and claim-once rewards.
4. The forward replay applies migration 1, runs only `phase03b-compatibility.test.sql`, then applies migration 2. Moderation and points suites run only after migration 2.
5. The README and production dry-run evidence specify order but do not impose a status-write quiescence/maintenance boundary across both commits.

Therefore, a live status transition after migration 1 commits and before migration 2 commits can retain legacy point effects. If migration 2 fails after migration 1 commits, that state can persist until separately repaired. Final-state staging tests do not prove the absence of this intermediate behavior.

Results:

- `POINTS_SEMANTICS_PLAN: PASS` for the planned final state; this does not cover the separately adjudicated intermediate state.
- `TRANSIENT_BREAKAGE_RISK: PRESENT`.
- `EVIDENCE_PACKAGE: HOLD` because its self-asserted `NONE` conclusion is not supported by intermediate-state points evidence or an operational quiescence control.
- `STAGING_PARITY: PASS` for exact bytes and accepted final-state tests; this does not cure the transient gap.

## Security review

A bounded read-only Codex Security diff review covered 30/30 changed source-like files from `342784c6205a824138d59025d65667e316022473` through `9d638456fa8e679678c54f131fe8f0db723eda72`, including client/admin paths, Edge Function logic, both migrations, both compensating rollbacks, contracts, tests, and the replay harness. It completed with one high-confidence, low-severity finding: `csf_3b349474629f76d7b515f9bd`, “Separate migration commits leave a legacy-points window.” The other reviewed security controls held in the resulting state.

## Gates

- `git cat-file -e <revision>^{commit}` for dry-run, candidate, accepted staging, and HTTP baseline commits: PASS.
- `git rev-parse 9d638456^{tree}`: `cfc76206f7cf7af6a7127a6329620d2ee1dc4da8`.
- Independent SHA-256 over candidate and accepted-staging migration bytes: exact expected hashes; PASS.
- Evidence manifest byte/hash verification: 18/18 entries matched; PASS.
- `supabase --version`: `2.116.0`.
- `supabase db push --help`: dry-run, skip-vault, include-all, and project-ref contract present; PASS.
- Frozen receipt inspection: exit 0, normal completion, no timeout/signal, `dryRun:true`, exact ordered pair; PASS.
- Frozen pre/post snapshot comparison: ledger, structure, function, and HTTP identical; PASS.
- Fresh authorized read-only production catalog/ledger/HTTP query: exit 0; no current drift in reviewed identities; PASS.
- Fresh authorized read-only production function listing: version 8, ACTIVE, `verify_jwt=false`, identity unchanged; PASS.
- Codex Security diff scan `8bffbcf4-4010-4001-9fde-ea453c6d1392`: complete coverage, 30/30 changed files, one low-severity finding; PASS as a completed review, finding remains open.
- `git diff --check`: PASS (no output).
- Product tests/build were not rerun because this review changed no product source and the accepted staging test outcomes were used only as final-state evidence, not as proof of transient safety.

## Governance and zero-write declaration

`PRODUCTION_MUTATIONS: NONE`

`STAGING_MUTATIONS: NONE`

`PUSHES: NONE`

`MAIN_MERGES: NONE`

`CLIENT_RELEASE: NONE`

`PHASE_03C_STARTED: NO`

`PRODUCTION_APPLY_AUTHORIZED: NO`

No production/staging mutation, apply, second production dry-run, mutating RPC/HTTP call, deployment, Vault/secret/auth change, notification, webhook, recovery, push, merge, release, or Phase 03C action occurred in this review.

## What's left

The production-apply authorization packet is not ready. A revised, non-applying apply plan must supply an enforceable status-write quiescence boundary from before migration 1 begins until migration 2 and post-apply verification complete, or the migration packaging must be redesigned so no externally visible intermediate points state exists. That revised plan requires a new independent review.

Accessibility remains `ACCEPTED_LATER_GATE`; it is not recertified or represented as PASS here.

## DECISIONS FOR SKY

Decision: whether to authorize preparation of a revised, non-applying Phase 03B production-apply packet with an enforceable status-write quiescence boundary across both migration commits.

Recommendation: authorize that packet revision only; do not authorize production apply.

Why: exact migration identity, dry-run validity, immutability, compatibility, and final-state security controls pass, but the current packet cannot prove its mandatory transient points invariant.

Alternative: redesign/rehearse the migrations as a single atomic externally invisible transition before preparing another packet.

Impact: until one alternative is documented, evidenced, and independently reviewed, the Phase 03B production-apply packet remains `NOT_READY`.
