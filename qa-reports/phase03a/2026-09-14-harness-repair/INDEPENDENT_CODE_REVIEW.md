# FDA-028 hosted harness repair — independent code review

`REVIEWED_AT_UTC: 2026-09-15`

## Verdict

```text
FDA028_HARNESS_REPAIR_SHA: 4370ac99221fc056a3215598aec9e363b804186d
FDA028_HARNESS_REPAIR_TREE: f5308540e9ed287dc69605238ef8f5355eb3bedd
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
FDA028_HARNESS_CODE_REVIEW: HOLD
HOSTED_EXECUTION_AUTHORIZED_BY_THIS_REVIEW: NO
```

The repair is genuinely harness-only and it removes the three known fixture couplings from the positive hosted path. The exact reviewed commit nevertheless has false-positive and authority-boundary defects that must be fixed before any hosted execution. All findings below are confined to the harness/runner; none requires a limiter implementation change.

## Ranked findings

### H1 — the runner does not enforce the reviewed harness source freeze

**Evidence:** `scripts/run-fda028-hosted.mjs:345-353` requires only a clean working tree, ancestry from `9a0af4c`, and the two limiter artifact hashes. `artifactSnapshot()` at lines 313-320 hashes whichever hosted files happen to be present at runtime; line 376 adopts that new snapshot as the expected snapshot. The snapshot is checked only against itself during that invocation. No constant or Git comparison binds the runner, hosted suite, negative control, or state probe to commit `4370ac9` or to the hashes banked in `SOURCE_FREEZE_AND_LOCAL_ACCEPTANCE.md`.

**Impact:** a later clean descendant can alter the reviewed hosted SQL or runner and still execute. The receipt will record the new hashes, but the safety check will not refuse them. This breaks the exact-source review boundary and allows unreviewed hosted inputs to run under this review's apparent approval.

**Required harness repair:** fail closed unless every executable hosted artifact is byte-identical to the reviewed freeze. A practical approach is to pin a reviewed Git commit/blob identity and compare the working files to those blobs before any network call; also repeat the comparison after execution. Because the runner cannot safely self-authorize a changed copy of itself, the comparison must anchor in immutable Git data or an independently pinned manifest rather than self-baselining the current filesystem.

### H1 — preflight contacts the production parent project's control plane despite the no-production-contact contract

**Evidence:** `PARENT_PROJECT_REF` and `PRODUCTION_PROJECT_REF` are the same production ref at lines 18-19. Lines 380-382 execute `supabase branches list --project-ref kldlwszpfkdmsjrjhjym`. This is a network request scoped to the production parent project, even though it does not query or mutate the production database. The controlling brief says the runner must “never contact production,” and the accepted proposal explicitly excludes “production or old-staging contact.”

**Impact:** the runner's production-database refusal is real, but its broader no-production-contact claim is false under the written contract. Live branch verification and the stated absolute prohibition are currently in tension.

**Required resolution:** either verify the preview identity without a production-scoped request, or obtain an explicit owner amendment that permits this exact read-only branch-metadata lookup while continuing to prohibit every production database, Vault, config, and mutation call. Do not infer that exception from the current text.

### H2 — the suite does not execute the public entry point as `service_role`

**Evidence:** `supabase/tests/fda028/hosted-acceptance.sql:78-105` uses `has_function_privilege`, which checks the function ACL but does not prove schema `USAGE` or a successful call under the runtime role. The clockless public entry point is invoked at lines 307-318 as the database owner. All other admissions use the owner-only clocked function. `hosted-state.sql:58-67` checks function existence only.

**Impact:** the suite can report PASS when `service_role` has an EXECUTE ACL but cannot resolve/call the function through the `limiter` schema, or when another role-context problem breaks the real service path. Owner execution does not establish runtime-role compatibility.

**Required harness repair:** within the rollback-only transaction, execute at least one real clockless `limiter.admit_guest_flag(...)` call under `SET LOCAL ROLE service_role` (or an equivalently faithful role context), assert its real `public.flags` row, and restore the owner role before owner-only lifecycle probes. Keep the deterministic clocked probes for timing tests.

### H2 — TAP acceptance permits skipped/bailout output and ignores unexpected diagnostics

**Evidence:** `assertSuccessfulTap()` at `scripts/run-fda028-hosted.mjs:162-170` treats every numbered `ok` line as a passed assertion without rejecting `# SKIP` or `# TODO`, `Bail out!`, YAML diagnostics, or other unexpected TAP content. The runner also never evaluates command stderr before setting PASS. A direct local probe confirmed that `1..1` plus `ok 1 - skipped # SKIP unavailable` returns `{passed: 1, failed: 0}`.

**Impact:** the runner can claim complete hosted acceptance when an assertion was skipped or when output contains a bailout/diagnostic that did not change the subprocess exit status. This conflicts with the proposal's requirement to fail on unexpected diagnostics and weakens the raw per-assertion evidence gate.

**Required harness repair:** reject skip/TODO directives, bailout lines, unrecognized TAP records, and non-whitelisted stderr before PASS. Add negative tests for each path.

### H3 — two contract checks can pass vacuously or for the wrong reason

1. `assertPreflightState()` at `scripts/run-fda028-hosted.mjs:246-248` accepts an empty `function_contract` object because `Object.values({}).some(...)` is false. A direct local probe returned `empty_function_contract_accepted=true`. Require the exact four named keys and `true` for each.
2. The legacy `ramp` control at `supabase/tests/fda028/hosted-acceptance.sql:26-36` catches any `check_violation`. It does not prove the category constraint caused the rejection. Use a pgTAP exception assertion tied to the expected SQLSTATE and category-constraint identity/message, so an unrelated new check cannot satisfy this control.

These are lower severity because the committed state query currently emits all four keys and the other fixture values match the accepted schema. They are still genuine false-positive paths in a reproducibility harness.

## Required-domain disposition

| Domain | Result | Evidence boundary |
|---|---|---|
| Harness-only scope | PASS | The repair delta changes `package.json`, harness tests/runner, and harness contract/checkpoint documents only. The accepted limiter forward and rollback bytes are unchanged. |
| Real `public.flags` schema | PARTIAL PASS | Positive rows use `no_ramp` and valid coordinate/severity/status values; the `ramp` negative control is too broad. |
| Real limiter configuration | PASS | The preflight pins the accepted 86400-second configuration. The suite changes to a 60-second domain only after proving an empty ledger, derives timing from active config, and encloses the change in a rollback-only transaction. |
| Real function path | HOLD | Owner-only full-path behavior is exercised, but the public clockless function is not executed as `service_role`. |
| Real Vault path | PASS WITH CLEANUP LIMIT | Hosted `dev_key_material` is required absent; the suite reads and ratchets through Vault without rendering key material. Rollback plus key-state comparison is the cleanup basis; post-state observes only key length/row count, not secret identity. |
| Cleanup on suite PASS/FAIL | PASS for modeled database state | `executeProtocol()` performs the post-check after TAP failure, SQL failure, or success. The SQL transaction ends in `ROLLBACK`; pre/post state compares flags, buckets, grants, config, key state, Vault shape, helper count, queue count, ledger, and function contract. |
| Exact target/production refusal | HOLD | Preview database queries use only the exact expected preview ref and reject production/old/ambiguous refs, but branch verification contacts the production parent control plane. |
| Determinism | PASS WITH SOURCE HOLD | One captured clock and bounded transaction-local config make current outcomes deterministic; reviewed artifact identity is not pinned. |
| TAP false-positive resistance | HOLD | Plan/number/failure accounting works, but skip/bailout/diagnostic paths remain. |
| Residual contamination | PASS for current SQL transaction | No persistent helper is created; config, key state, flags, limiter rows, queued HTTP count, and Vault shape are compared after rollback. |
| `ramp` coupling removed | PASS from positive path | `ramp` remains only as a negative control. |
| 600-second coupling removed | PASS | No 600-second literal remains; timing uses current config after a bounded 60-second transaction-local override. |
| `dev_key_material` coupling removed | PASS | The hosted suite asserts absence and never writes it. |

## Local gates run

```text
git source identity
PASS: 4370ac99221fc056a3215598aec9e363b804186d
PASS: tree f5308540e9ed287dc69605238ef8f5355eb3bedd

limiter delta and hashes
PASS: no forward/rollback limiter diff from 2123c01 to 4370ac9
PASS: forward sha256 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
PASS: rollback sha256 eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302

npm run db:fda028:hosted:test
PASS: 17 tests, 17 pass, 0 fail

npm run db:pgtap:discover
PASS: problems [], hosted plan 38, negative-control plan 1, state fixture discovered

node --check scripts/run-fda028-hosted.mjs
PASS

git diff --check 2123c01..4370ac9
PASS

direct target refusal probes
PASS: production ref exit 1 before receipt creation
PASS: prohibited --linked selector exit 1 before receipt creation
PASS: missing --project-ref exit 1 before receipt creation

adversarial parser/state probes
FAIL AS DESIGNED FOR REVIEW: empty function_contract was accepted
FAIL AS DESIGNED FOR REVIEW: a # SKIP assertion was counted as passed
```

No hosted environment was contacted. No database, Vault, limiter implementation, harness source, Git ref, production state, or remote state was mutated by this review.

## What changed

- Added only this independent review report.
- No harness, limiter, migration, rollback, test, runner, configuration, or receipt source file was edited.

## Branch and reviewed identity

```text
branch: codex/flagstone-p03a-takeover-20260914
reviewed repair: 4370ac99221fc056a3215598aec9e363b804186d
reviewed tree: f5308540e9ed287dc69605238ef8f5355eb3bedd
current checkpoint observed before this report: f15ecb7a6c1366a6cb275996b0f5b7dee28798ce
```

The executable harness files at the current checkpoint are byte-identical to the reviewed repair commit.

## What's left

1. Repair H1-H3 only in the harness/runner/tests.
2. Freeze the new exact executable artifact identities.
3. Repeat independent code review against that exact freeze.
4. Keep hosted staging execution blocked until `FDA028_HARNESS_CODE_REVIEW: PASS` is banked.

## DECISIONS FOR SKY

- **Production-parent metadata request:** decide whether the written “never contact production” rule permits one read-only `branches list` call scoped to the production parent solely to verify preview branch parentage and health.
  - **Recommendation:** preserve the prohibition unless the live branch identity cannot be proved another way; if an exception is necessary, authorize it explicitly and narrowly as a production control-plane metadata read with no production database, Vault, config, or mutation access.
  - **Alternative:** remove the production-scoped call and verify the preview using an accepted preview-scoped identity mechanism.
  - **Impact:** without a compliant identity mechanism or an explicit amendment, the runner cannot satisfy both live parentage verification and the current no-production-contact rule.
