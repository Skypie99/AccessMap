# Flagstone Phase 03A Independent Fresh-Stage Review — 2026-09-14

## 1. DECISIONS FOR SKY

- [ ] **Authorize one bounded FDA-028 hosted-harness repair round** — the limiter's named hosted behavior passes, but the committed acceptance suite cannot reproduce a conforming hosted run.
  - **Recommended scope:** change only the FDA-028 tests and their explicit hosted runner. Preserve `supabase/migrations-next/phase03a/20260909120000_fda028_v4_limiter.sql` byte-for-byte unless a new independent review finds an implementation defect.
  - **Required proof:** a committed, target-explicit runner executes a schema-valid, configuration-aware suite against disposable staging; captures raw assertion output; fires its negative controls; rolls back all test state; and leaves zero database or filesystem residue.
  - **Alternative:** waive reproducible committed hosted acceptance and rely on the named probes. This is not recommended because a future reviewer could not reproduce the broader FDA-028 claim from the repository.
  - **Impact:** Phase 03A remains at HOLD until the repaired harness receives independent CODE review and a newly authorized disposable-staging run.
  - **Owner:** Sky; surfaced by the resumed independent Step 13 reviewer.

- [ ] **Retain the MF-05 rollout decision for the later production packet** — fresh staging is intentionally `S3_LIMITER_PRESENT_BYPASS_OPEN`.
  - **Recommendation:** keep the legacy guest bypass open until a separately accepted guest-ingest path can call the limiter without breaking Build 33.
  - **Alternative:** close direct guest writes in a coordinated Stage B cutover after compatible clients and ingestion exist.
  - **Impact:** this open owner decision does not invalidate the fresh-stage implementation evidence, but production authorization must state the chosen rollout posture explicitly.

## 2. BLOCKERS / FAIL_FAST

- **BLOCKER — FDA028-HOSTED-HARNESS-REPRODUCIBILITY.** `supabase/tests/fda028/acceptance3.sql` is coupled to its local fixture and has no committed hosted runner. The repository therefore cannot reproduce the prior `38/38 hosted` claim against the conforming fresh-stage schema and configuration.
  - **Quarantined?** Yes. The defect is in the test harness/evidence path. The accepted limiter migration bytes and the named hosted behavior evidence remain intact.
  - **Recommended path:** perform the bounded test-only repair described in §8. Do not redesign the limiter or tune an ad-hoc hosted copy until it passes.

## 3. Summary and verdict

This report resumes the single unfinished independent Step 13 review from the preserved transcript at `/Users/skypie/.claude/projects/-Users-skypie/0b4e32a4-48d3-4c49-9023-eb92290e4f07/subagents/agent-ab7d5b27a74a10a6f.jsonl`. The prior reviewer completed identity, ledger, structural-capture, Build 33, and composed pgTAP checks before the session limit. I preserved those results and resumed at FDA-028; I did not repeat any completed mutating hosted test.

Fresh staging is still the named healthy disposable branch, its 103-row ordered ledger exactly matches the committed capture, and its current structural catalog matches FIRST_APPLY with zero residuals. Build 33, composed pgTAP, Vault isolation, the named FDA-028 probes, no-overshoot concurrency, MF-04, MF-05 classification, round-trip identity, target safety, and production isolation are supported by the frozen evidence and read-only rechecks.

The stage gate cannot pass because the committed FDA-028 acceptance suite is not runnable as hosted acceptance against the real schema/configuration. This is a **test-harness and evidence-reproducibility defect**, not evidence of a limiter implementation defect.

```text
INDEPENDENT_STAGE_REVIEW: HOLD
PHASE_03A_FRESH_STAGE_GATE: HOLD
HOLD_SCOPE: FDA028_COMMITTED_HOSTED_HARNESS_REPRODUCIBILITY_ONLY
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
NEW_PRODUCTION_AUTHORIZATION_PACKET: NOT_READY
```

## 4. Frozen identity and reviewer independence

### Review basis

| Identity | Verified value | Result |
|---|---|---|
| Frozen Step 12 parent | `9a0af4c88b5b00898e405992cfd44ba7dfd689fc` | MATCH |
| Frozen Step 12 tree | `4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5` | MATCH |
| Accepted CODE SHA | `3ac416e2cd19c7322061efb689abc5bebcef3a83` | ancestor of frozen parent |
| Accepted CODE tree | `99ee18fbeb72e0f31d501f749df920d30ea907de` | MATCH |
| Accepted INT SHA | `f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a` | ancestor of frozen parent |
| Accepted INT tree | `96d8e38b37e881fa1f4d6e39cf5e276e1f51b833` | MATCH |
| Takeover branch at review | `codex/flagstone-p03a-takeover-20260914` at `e630fa2973b7ab181822580ea1fcacec33e7d5e3` | only the takeover checkpoint differs from the frozen parent before this report |
| `main` / `origin/main` | `70b52a30e9fff0f7d538509b110212bb8d872391`, tree `847f39f6d8e5d7feb28af0f5da823034ce19f848` | MATCH, divergence `0/0` |
| Accepted CODE/INT on remote | no remote branch contains either commit | NONE |

I did not author the Phase 03A implementation, Step 1–12 receipts, or their hosted executions. This report continues the one partial independent review; it does not dispatch or combine a second reviewer. The only file I wrote is this report. I made no Git ref, source, migration, hosted schema/data, Vault, Edge Function, or configuration change.

### Fresh target identity

The Supabase branch listing returned:

| Field | Current read-only result |
|---|---|
| Parent project | `kldlwszpfkdmsjrjhjym` |
| Fresh project ref | `cepayqmsoqxshsiyqnvz` |
| Fresh branch ID | `4a37413a-01c2-4ab2-8bf8-a17a42a549b8` |
| Branch name | `flagstone-p03a-rerun-clean-20260911` |
| `with_data` | `false` |
| Preview status | `ACTIVE_HEALTHY` |

The old branch remains `ctshxbykuemeqnofqcdh` / `441acc38-d71c-4a87-883e-61ff87e0c52e`, also `ACTIVE_HEALTHY`. No target identity was inferred from a local linked-project file.

## 5. Evidence integrity and completeness

### Receipt hashes

Every SHA-256 named in `TAKEOVER_CHECKPOINT.json` matches the tracked artifact at the frozen parent:

| Artifact | SHA-256 prefix | Result |
|---|---|---|
| `OP_FRESH_RERUN.json` | `f84a18213072` | MATCH |
| `OP_STEP4_APPLY.json` | `6c3b480d01bc` | MATCH |
| `OP_STEP5_BUILD33.json` | `ccce9bfb4f73` | MATCH |
| `OP_STEP6_PGTAP.json` | `c45f7051f750` | MATCH |
| `OP_STEP7_FDA028_FINDING.json` | `7766392296e2` | MATCH |
| `OP_STEP7_FDA028_PROBES.json` | `ecc78f337f7b` | MATCH |
| `OP_STEP9_IPV6.json` | `213792f5a61c` | MATCH |
| `OP_STEP10_11_ROUNDTRIP.json` | `6f12797c70f5` | MATCH |
| `OP_STEP12_GATES.json` | `68e55a49d60f` | MATCH |
| `LEDGER_AFTER_ROUNDTRIP.json` | `0e0dd5cc3d6f` | MATCH |

The checkpoint does not list a SHA-256 for `OP_STEP2_VAULT.json`; the artifact is nevertheless tracked in the frozen parent and independently hashes to `879b5e113b4cb571a6a5bc78c9987365910150b372c74556341575fc2a8a1291`. This is a checkpoint cross-reference omission, not missing evidence.

### Operation completeness

- Latest verified execution step: **12**.
- `RUNNING`: none.
- `APPLIED_NOT_VERIFIED`: none.
- `OUTCOME_UNKNOWN`: none.
- Fresh Step 13 report before this file: none.
- The rejected older independent report targets `ctshxbykuemeqnofqcdh`; it cannot accept this fresh branch.

### Credential and target safety

- `REAL_CREDENTIAL_HITS: 0` in the Step 12 delta scan. The broad credential guard remains honestly recorded as `KNOWN_FALSE_POSITIVE` because finding IDs in `qa-reports/phase03a/state.json` match its heuristic; it is not relabeled PASS.
- The staging limiter key appears in no tracked source or receipt. This review queried only secret row counts and decoded byte lengths; it did not select, print, copy, or persist any secret value.
- `supabase/.temp/linked-project.json` is tracked and its `.ref` is the production project `kldlwszpfkdmsjrjhjym`. This is a real residual target-safety hazard and must be carried forward accurately. It does **not** add a second fresh-stage HOLD in this review: every reviewed Phase 03A runner requires an explicit single-token `--project-ref` and refuses unsafe implicit/linked targeting, the frozen target-safety suite banked 27/27 passes for those execution paths, and every read in this review used an explicit project ref. The production-linked artifact should still be untracked before any broader or non-Phase-03A Supabase CLI workflow is authorized.
- No production Vault/config read was performed.

## 6. Findings by required domain

### Canonical migration and 103-row forward ledger — PASS

The live ordered ledger has 103 rows, all versions are 14 digits, no version is duplicated, and the stage-B version `20260911130000` is absent. Its composition is exact:

| Segment | Rows |
|---|---:|
| Canonical production baseline | 71 |
| Original fresh-stage apply | 14 |
| Forward restoration | 9 |
| Forward re-application | 9 |
| Total | 103 |

The SHA-256 of the live ordered `version<TAB>name` stream is `9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316`; the committed `LEDGER_AFTER_ROUNDTRIP.json` produces the same digest. This independently binds the current live ledger to all 103 captured rows, rather than only comparing the row count.

```text
CANONICAL_MIGRATION_IDENTITY: PASS
FORWARD_LEDGER_TRUTH: PASS
```

### Build 33 role compatibility — PASS, with the stated baseline limitation

The resumed transcript records a fresh rollback-contained execution of `build33-compat.test.sql`: 37/37 assertions, zero failures, byte-identical to the retained TAP. The same reviewer also confirmed under the real `anon` role that `flag_comments` has SELECT privilege and returns an RLS-filtered empty result instead of `42501`.

- Authenticated: own `is_admin` read, multi-user leaderboard visibility, rank, comment-author hydration, and all four compatibility RPCs passed.
- Anonymous: the guest map remains readable; comments and point events avoid privilege errors and may be RLS-filtered empty.
- Stage B remains withheld.
- Claim boundary: the 71-migration canonical baseline grants anon nothing. Stage A **establishes** the tested guest posture on this branch; this evidence does not prove preservation of production's out-of-band anon grant set.

```text
BUILD33_AUTHENTICATED_COMPATIBILITY: PASS
BUILD33_ANON_COMPATIBILITY: PASS
```

### Hosted composed pgTAP — PASS

The frozen raw TAP and receipt account for all assertions:

| Suite | Result |
|---|---:|
| `promptb_media_key_guards.test.sql` | 25/25 |
| `phase03a-foundation.test.sql` | 113/113 |
| `phase03a-privileges.test.sql` | 79/79 |
| `build33-compat.test.sql` | 37/37 |
| Total | **254/254** |

The prior partial reviewer reran all four rollback-contained suites. It reproduced 25/25 and 37/37 byte-for-byte; the foundation and privilege suites reproduced all 113 and 79 passing assertions, with only absent warning lines preventing whole-file byte equality. No assertion failed. The Step 6 negative controls emitted a deliberate failed assertion and a plan/run mismatch, so the zero-failure result is non-vacuous.

These 254 assertions do not cover the FDA-028 limiter internals; incidental limiter text matches must not be counted as that proof.

```text
HOSTED_PGTAP: 254/254 PASS, 0 failures
```

### Staging Vault I/O — PASS

- Step 2 proved initial hosted read of a staging-only 64-byte root and derivation of a 32-byte epoch key.
- Step 12 proved the limiter's hosted write/reseed path replaced that root with its managed 32-byte representation.
- Current read-only checks return one named staging secret, decoded length 32 bytes, and `octet_length(limiter.read_epoch_key()) = 32`.
- `anon` and `authenticated` have no limiter schema usage; `service_role` has usage and only the three clockless entry points.
- `limiter.dev_key_material` is absent on the real hosted branch, as intended.

```text
VAULT_IO_STAGING: PASS
```

### FDA-028 implementation behavior — PASS, bounded to named hosted proof

The accepted candidate at the frozen parent hashes to `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771`, matching the accepted V4 artifact.

The frozen hosted evidence establishes:

- limiter surface isolation from `anon` and `authenticated`;
- service-role access only to `admit_guest_flag`, `admit_guest_feedback`, and `purge`, never the caller-clock variants;
- fail-closed malformed/private/missing source handling;
- domain-change guard enforcement;
- orphan-grant FK rejection;
- Vault read and managed-write behavior;
- full-path concurrency: 25 attempts, allowance 10, 10 admitted, 15 refused, 10 real flag rows, 10 ledger units, 10 grants, and 0 orphans.

The concurrency receipt tests admission, ledger debit, and the real `public.flags` insert under parallel load. Current staging has zero flags, buckets, grants, and users, confirming the retained clean post-probe state.

```text
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_CONCURRENCY: PASS — 25 attempts / allowance 10 / admitted 10 / rows 10 / units 10 / orphans 0
```

### FDA-028 committed hosted harness — HOLD

This is the sole fresh-stage blocker.

1. `supabase/tests/fda028/acceptance3.sql` uses category `ramp` 24 times. The local fixture defines unconstrained text, while the real `public.flags` constraint rejects `ramp`; `no_ramp` is schema-valid.
2. Its lifecycle purge uses `t0 + 600 seconds`. Hosted accepted configuration is `window_seconds = 86400`, so the test's assumption is false unless it explicitly and safely controls configuration.
3. It updates `limiter.dev_key_material`, which `fixture.sql` documents as local-only and the real candidate deliberately does not create.
4. The suite creates `public.pass(text, boolean)` outside a transaction and contains state-changing SQL without a committed hosted rollback wrapper. The earlier aborted attempt left that helper behind until it was identified and removed.
5. `scripts/run-pgtap.mjs` classifies the file as `raising-proof`; it does not execute it as hosted acceptance. No other committed runner supplies the missing hosted contract.

The banked hosted concurrency script corrects the category and proves the no-overshoot path, but it is one named probe, not a reproduction of the broader 38-assertion acceptance claim.

```text
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
DEFECT_CLASS: TEST_HARNESS_AND_EVIDENCE_REPRODUCIBILITY
IMPLEMENTATION_DEFECT_FOUND: NO
```

### Smallest bounded repair scope

Create a test-only hosted FDA-028 acceptance lane with these constraints:

1. Add one committed hosted suite using real-schema categories and no local-fixture-only relation.
2. Make lifecycle timing derive from the active configuration, or set a test configuration only after draining the ledger inside a transaction that is always rolled back.
3. Keep the local `dev_key_material` failure-mode proof explicitly local. For hosted acceptance, test the Vault-backed contract with a safe, reviewable method that never reveals key material and never leaves a secret/config mutation behind; do not pretend the local table exists hosted.
4. Wrap helper creation, data writes, config changes, and cleanup in one rollback-enforced unit. Fail the runner if rollback or residue verification cannot be proven.
5. Add an explicit hosted runner that requires a validated project ref, refuses linked/default targets, streams raw assertions, counts plan/ok/not-ok, fires negative controls, and banks a sanitized receipt.
6. Preserve the accepted limiter migration and its rollback bytes unless the repaired test independently exposes an implementation failure.

No source was edited as part of this review.

### MF-04 environment isolation — CLOSED_FOR_STAGE

The staged function has no production project reference, reads `webhook_endpoint` from database-scoped Vault configuration, and fails closed when the endpoint is absent. The frozen endpoint-gate probe reached the new endpoint check inside a rolled-back transaction and observed the expected skip with zero queued requests. Current staging has no `webhook_secret` and no `webhook_endpoint`; the function body still contains no production ref.

Production prerequisite remains explicit: provision a valid production-scoped `webhook_endpoint` before activating this forward correction, or notifications fail closed. This review performed no production Vault/config action.

```text
MF_04: CLOSED_FOR_STAGE
```

### MF-05 rollout classification — OPEN_ROLLOUT_DECISION

Current staging has the limiter installed and isolated from client roles. It also retains anonymous column-level INSERT grants for 10 `flags` columns and 5 `feedback` columns, plus the anon insert policy on `flags`. A table-level `has_table_privilege(..., 'INSERT')` check is false because these are column grants; that does not close the direct-write bypass.

```text
MF_05: OPEN_ROLLOUT_DECISION
ROLLOUT_STAGE: S3_LIMITER_PRESENT_BYPASS_OPEN
```

### Round trip and forward recovery — PASS

| Capture | Catalog checksum |
|---|---|
| FIRST_APPLY | `1cb772c877a25b87f5e1870301e974a5d23e938e9ed412d2a57b8d9fa3dd45d3` |
| RESTORED | `d18dc1d133281b61f0fb3c5b5de571bdac8d536b9f9d3ca9a1f70b7482eec663` |
| REAPPLY_CLEAN | `1cb772c877a25b87f5e1870301e974a5d23e938e9ed412d2a57b8d9fa3dd45d3` |

FIRST_APPLY versus RESTORED has 255 expected and classified residuals because the forward restoration removes Stage A and restores replaced pre-candidate objects. FIRST_APPLY versus REAPPLY_CLEAN has zero residuals. The partial reviewer generated a fresh read-only live capture from the current branch and independently reproduced the FIRST_APPLY checksum and zero-residual diff.

The structural tool intentionally excludes schemas outside its declared scope and volatile OIDs/planner statistics. Exact digest equality is corroborative within that documented scope; it is not a claim about every possible hosted platform object.

```text
ROUND_TRIP_CAPTURE: PASS
ROUND_TRIP_STRUCTURAL_IDENTITY: PASS
```

### IPv6 — normalization PASS / transport OPEN

The hosted suite contains 24 real passing assertions plus one deliberate failing negative control. It covers IPv4-mapped and NAT64 normalization, RFC 6052 extraction, IPv6 `/64` grouping, IPv4 `/32`, and rejection of malformed, multi-valued, private, loopback, link-local, and unique-local inputs.

The fresh API hostname had no AAAA record, and no deployed guest-ingest Edge Function reads a trusted client address and calls the limiter. Therefore end-to-end IPv6 transport/ingestion was unavailable and was correctly left OPEN rather than simulated. This honest split is accepted and is not an additional fresh-stage blocker.

```text
IPV6_NORMALIZATION: PASS — 24/24 real assertions; negative control fired
IPV6_TRANSPORT: OPEN
```

### Old staging and production boundary — PASS

Read-only reconciliation currently shows:

| Target | Ledger | Phase 03A state |
|---|---|---|
| Old staging `ctshxbykuemeqnofqcdh` | 82 rows; max `20260910162409` | no rows at or after the fresh run; evidence-only branch unchanged |
| Production `kldlwszpfkdmsjrjhjym` | 71 rows; max `20260830130000` | zero Phase 03A/recovery ledger rows; no limiter schema; zero Stage A RPCs |

These checks establish that the candidate/recovery migrations were not applied to production through the migration ledger and that their principal catalog objects are absent. They do not claim a full byte-for-byte production catalog audit. No production Vault/config was read.

```text
OLD_STAGING_MUTATIONS: NONE
PRODUCTION_MUTATIONS: NONE
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
```

## 6.5 Process self-check

### Efficiency check

I resumed at the first unfinished review item recorded in the partial transcript. I did not rerun the completed canonical apply, hosted FDA-028 admissions, concurrency test, round trip, restoration/reapply, or evidence gates. Current database contact was limited to read-only identity, ledger, catalog-property, privilege, row-count, and boundary queries.

### Overlap check

The only overlap is intentional continuity with the partial independent reviewer. Completed work from that transcript is cited as preserved evidence; it was not duplicated. The older independent stage report was used only to understand the accepted IPv6 claim split because it targets a different staging project and cannot supply this verdict.

### Simplification opportunities

The simplest safe repair is a separate hosted suite/runner rather than editing `acceptance3.sql` in place until it turns green. This preserves the local fixture proof and makes the hosted claim explicit, reviewable, and target-safe.

## 7. Verification performed

### Local read-only checks

```bash
git status --porcelain=v1 -b
git show -s --format='%H %T %P %s' 3ac416e2cd19c7322061efb689abc5bebcef3a83 f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
git rev-list --left-right --count main...origin/main
git diff --name-status 9a0af4c88b5b00898e405992cfd44ba7dfd689fc..HEAD
shasum -a 256 qa-reports/phase03a/2026-09-11-freshstage/OP_*.json
jq -r '.[] | [.version,.name] | @tsv' qa-reports/phase03a/2026-09-11-freshstage/LEDGER_AFTER_ROUNDTRIP.json | shasum -a 256
```

Results: frozen SHA/tree and ancestry matched; `main`/`origin/main` divergence was `0/0`; only the takeover checkpoint differed before this report; all checkpoint hashes matched; committed ordered-ledger digest was `9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316`.

### Read-only hosted checks

Supabase branch and SQL reads used explicit project refs. Results: fresh branch identity matched and was healthy; current ordered-ledger digest matched the committed 103 rows; current catalog/privilege/Vault-length/residue facts matched the receipts; old staging remained at 82 rows; production remained at 71 rows with no Phase 03A ledger or principal catalog objects.

### Preserved partial-review checks, not repeated

- Fresh live structural capture: checksum `1cb772c877a25b87f5e1870301e974a5d23e938e9ed412d2a57b8d9fa3dd45d3`, zero residuals against FIRST_APPLY.
- Build 33 pgTAP: 37/37, zero failures, retained TAP identical.
- Remaining composed pgTAP: 25/25, 113/113, and 79/79; zero assertion failures.
- Real `anon` role: `flag_comments` SELECT granted and RLS-filtered to zero rows without a permission error.

## 8. Next recommended action

Authorize one CODE/test-harness-only repair that adds a committed, schema-valid, configuration-aware, rollback-enforced FDA-028 hosted suite and target-explicit runner; independently review that repair before authorizing any new disposable-staging mutation.

```text
TAKEOVER_GATE: HOLD
CURRENT_AUTHORITATIVE_BRANCH: integration/flagstone-b33-convergence-20260903
CURRENT_HEAD: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
CURRENT_TREE: 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5
ACCEPTED_CODE_SHA: 3ac416e2cd19c7322061efb689abc5bebcef3a83
ACCEPTED_CODE_TREE: 99ee18fbeb72e0f31d501f749df920d30ea907de
ACCEPTED_INT_SHA: f2c2fbef36e88289c9c2a0663e6f26fc974e0a2a
ACCEPTED_INT_TREE: 96d8e38b37e881fa1f4d6e39cf5e276e1f51b833
FRESH_STAGING_PROJECT_REF: cepayqmsoqxshsiyqnvz
FRESH_STAGING_BRANCH_ID: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
FRESH_STAGING_LEDGER_COUNT: 103
LATEST_VERIFIED_STAGE_STEP: 12
CANONICAL_MIGRATION_IDENTITY: PASS
FORWARD_LEDGER_TRUTH: PASS
BUILD33_AUTHENTICATED_COMPATIBILITY: PASS
BUILD33_ANON_COMPATIBILITY: PASS
HOSTED_PGTAP: 254/254 PASS, 0 failures
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: HOLD
FDA028_CONCURRENCY: PASS — 25 attempts, allowance 10, admitted 10, real rows 10, ledger units 10, orphans 0
VAULT_IO_STAGING: PASS
MF_04: CLOSED_FOR_STAGE
MF_05: OPEN_ROLLOUT_DECISION
ROLLOUT_STAGE: S3_LIMITER_PRESENT_BYPASS_OPEN
ROUND_TRIP_CAPTURE: PASS
ROUND_TRIP_STRUCTURAL_IDENTITY: PASS
IPV6_NORMALIZATION: PASS
IPV6_TRANSPORT: OPEN
INDEPENDENT_STAGE_REVIEW: HOLD
PHASE_03A_FRESH_STAGE_GATE: HOLD
NEW_PRODUCTION_AUTHORIZATION_PACKET: NOT_READY
OLD_STAGING_MUTATIONS: NONE
PRODUCTION_MUTATIONS: NONE
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
NEXT_SAFE_ACTION: authorize one bounded FDA-028 committed hosted-harness CODE repair; no implementation or hosted mutation yet
NEXT_PERMITTED_PHASE: PHASE-03A ONLY
```
