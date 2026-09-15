# FDA-028 Independent Hosted Acceptance R7 — 2026-09-15

## 1. DECISIONS FOR SKY

No new decision is required to generate the new production authorization packet. Production execution remains unauthorized and must return to Sky with MF-03, the MF-04 production prerequisite, MF-05, IPv6 transport status, and the tracked production-link residual stated explicitly.

## 2. BLOCKERS / FAIL_FAST

None. The prior FDA-028 committed hosted-harness reproducibility blocker is closed by the exact R7 source and frozen hosted evidence reviewed here.

## 3. Verdict

R7 supplies the missing committed, executable hosted acceptance proof. Its raw evidence binds the run to the independently reviewed executable source and the exact fresh-stage target, detects the deliberate negative control, records 31 unique sequential PASS assertions, and proves complete rollback by exact pre/post state equality.

R5 and R6 remain valid HOLD evidence: R5 failed closed on a newly observed Supabase Management API error wrapper before the main proof; R6 detected one false assertion caused by unordered evaluation around a side-effecting purge call. R7 changes only that evaluation sequence, preserves the behavior being asserted, and passes hosted. No limiter implementation bytes changed.

```text
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: PASS
PHASE_03A_FRESH_STAGE_GATE: PASS
INDEPENDENT_STAGE_REVIEW: PASS
OTHER_STAGE_BLOCKERS: NONE
NEW_PRODUCTION_AUTHORIZATION_PACKET: MAY_BE_GENERATED_NOT_EXECUTED
```

## 4. Exact source, evidence, and target binding

| Identity | Independently verified value |
|---|---|
| R7 executable source SHA | `2a353336d442c5bb79579a2b0154d08aa43806c1` |
| R7 executable source tree | `472559b72421ee1b4f2a7ce12ebe21867c8a0c0d` |
| Hosted evidence checkpoint | `f4ef1e1f2a4e6220caff1d379d07b4a6f93b3ed3` |
| Runner checkpoint | `9033406960f087f703a6b5af6d7974df8304973c` |
| Accepted integration | `9a0af4c88b5b00898e405992cfd44ba7dfd689fc` |
| Fresh project | `cepayqmsoqxshsiyqnvz` |
| Fresh branch | `4a37413a-01c2-4ab2-8bf8-a17a42a549b8` |

The executable SHA is an ancestor of both the runner and evidence checkpoints. Between the executable SHA and runner checkpoint, only the R7 review/freeze/pre-limit documents were added; no runner, hosted SQL, test, limiter, or rollback byte changed. The evidence checkpoint adds only the frozen R7 report and raw run directory.

All executable Git-object hashes match `SOURCE_FREEZE_R7.md` and the R7 receipt:

```text
5c09b26ebef64f43e648fa989d18ebcc14c7c983e1dac24b02133c27190ff56e  scripts/run-fda028-hosted.mjs
dae845009d371d00124dd630ee0463ded98937bea93032805023541410c24bf9  scripts/__tests__/fda028HostedHarness.test.mjs
744f14f8371c03c557062547e0499581972556a07c4e5a0b1643670e69b06fc7  supabase/tests/fda028/hosted-state.sql
bade8a9a26677e8b76296ba75a5490fb1178ae98c3e292c35f499d880d5f36e0  supabase/tests/fda028/hosted-negative-control.sql
1d323af5a725ffaf88a113c1da869923864a558dcba3dda53dbdc21b2cd5ea3f  supabase/tests/fda028/hosted-acceptance.sql
```

The accepted limiter remains byte-identical:

```text
8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771  forward migration
eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302  rollback
```

The runner validates one-token project, branch, and reviewed-SHA arguments; refuses production, old staging, unexpected targets, duplicate/unknown selectors, and user-supplied `--linked`/database URL selectors; binds current artifacts to the reviewed Git commit before and around each database operation; and internally combines the CLI-required remote `--linked` mode with the frozen explicit fresh project ref.

The tracked `supabase/.temp/linked-project.json` still names production. That is a real residual hazard for broader CLI use, but it is not an R7 target ambiguity or a fresh-stage blocker: R7's command is source-frozen with the explicit fresh ref, and the returned 103-row ledger, limiter contract, Vault shape, and empty state uniquely match the accepted fresh branch rather than production or old staging. The residual must remain visible in the production packet and must be removed before any broader implicit-target workflow is authorized.

## 5. Raw R7 evidence review

Every raw-file SHA-256 matches `HOSTED_EVIDENCE_FREEZE_R7.md`:

```text
18098c7473cf11d88f0c5a431b3d4618d2aba2177547cd57f4da57d5d1510f4a  RECEIPT.json
d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7  negative.stderr.txt
3041dd5d43682e66748ee7cdd0ed61afb50aeb92f80f9ab63160de1d223a7e48  negative.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  post.stderr.txt
89fc516786f2ca07e2d5f311e3e9904176a52cf3791e8317491c7b88a1822edb  post.stdout.txt
2a0d79f732708c11678f9a21c9764d6a6a7a81d66e983920e296e9cb43176f15  pre.stderr.txt
06931bb11274cec2edbd7a832fc273bf1c0b0efb65f57d20862834833816141e  pre.stdout.txt
d63ec9b582f91b009666c34b62e1182141e707f0fc265622635695ee17cbd8c7  suite.stderr.txt
fc0ed16e02b0a09648af4ffa123cff0bc161e8301b87f9862de75d2b5a4f421c  suite.stdout.txt
```

The exact frozen parser independently accepts the raw envelopes:

- Negative control: plan 1, zero passed, one failed, exact deliberate-failure description, detected once.
- Main proof: plan 31, 31 records, sequential numbers 1–31, 31 unique non-empty descriptions, Boolean result type for every record, 31 passed, zero failed.
- Both proof commands returned the required nonzero `P0001` Management API wrapper with the exact rollback marker and context. A zero exit would have failed the protocol.
- Stderr contains only the runner's measured allowlist: login-role initialization and, for state reads, the CLI update notice.

The 31 assertions cover the real `flags_category_check`; absence of fixture-only `dev_key_material`; hosted Vault existence, count, and byte length; exact clockless/clocked function and role contracts; empty preconditions; bounded transaction-local configuration; config-derived timing; real full-path flag insertion; grant exhaustion; bucket exhaustion without overshoot; refusal without writes; orphan absence; bucket-delete and purge cascades; stale-grant rejection; actual `service_role` clockless execution; kill-switch writes; private-source fail-closed behavior; IPv4 `/32`; future-clock capping; Vault continuity; and helper absence.

### Complete rollback and cleanup

The independently parsed pre/post state objects are exactly equal after excluding only their randomized output-boundary tokens:

| State | Before | After |
|---|---:|---:|
| Migration rows / latest | 103 / `20260913080000` | 103 / `20260913080000` |
| Ordered ledger digest | `9c7301f4e088...` | `9c7301f4e088...` |
| Flags / buckets / grants | 0 / 0 / 0 | 0 / 0 / 0 |
| Helpers / queued HTTP | 0 / 0 | 0 / 0 |
| Vault rows / key bytes | 1 / 32 | 1 / 32 |
| `dev_key_material` | absent | absent |
| Key state, config, function contract | exact accepted state | exact accepted state |

The main proof is one `DO` statement whose required final exception atomically rolls back its real flag rows, limiter ledgers, config changes, key-state change, Vault write, temporary objects, and grants before the separate post-state query. `cleanup: PASS` is supported by the raw state, not only by the receipt label. No secret value appears in the state or assertion evidence.

## 6. R5/R6 HOLD lineage

- **R5:** reached the exact fresh stage and negative control, then correctly failed closed because the hosted Management API returned a previously unseen structured wrapper. Main proof did not run. Pre/post state matched and cleanup passed.
- **R6:** accepted that exact wrapper, passed its negative control, ran all 31 assertions, and returned 30/31. Only assertion 26 was false. Pre/post state again matched and cleanup passed.
- **R7 repair:** adds `v_purged`, executes `purge_at()` first, then evaluates the unchanged requirements `v_purged > 0` and zero remaining grants. The R6-to-R7 executable diff is limited to this sequencing and two source-test assertions. It cannot mask a purge or cascade failure.
- **R7 hosted result:** assertion 26 and all other assertions pass. This resolves the observed R6 harness-order defect without rewriting either HOLD or changing expected limiter behavior.

## 7. Reconciliation with existing Phase 03A evidence

- The earlier parallel full-path proof remains PASS: 25 attempts, allowance 10, 10 admissions, 10 real rows, 10 ledger units, 10 grants, zero orphans, no overshoot. R7 adds sequential grant/bucket exhaustion and lifecycle coverage; it does not replace the parallel comparator.
- Earlier named probes remain PASS for limiter/Vault surface isolation, clockless grants, real-role denial, domain guard, orphan FK, and Vault IO. R7 reproduces the relevant function/role/Vault contracts and actually invokes the clockless path as `service_role`.
- Fail-closed and lifecycle evidence now has committed hosted reproduction: private source refusal, invalid category control, stale-grant non-resurrection, delete cascade, config-derived purge, and exact cleanup.
- Hosted composed pgTAP remains 254/254 PASS with negative controls. Those suites cover separate Phase 03A contracts; R7 supplies the previously missing FDA-028 committed hosted proof.
- MF-04 remains `CLOSED_FOR_STAGE`. MF-05 remains `OPEN_ROLLOUT_DECISION` at `S3_LIMITER_PRESENT_BYPASS_OPEN`. IPv6 normalization remains PASS and IPv6 transport remains OPEN.

No contradiction or additional stage blocker was found.

## 8. Production packet boundary

A new production authorization packet may now be generated because the fresh-stage and independent-review gates pass. It must not be executed under this authority and must preserve:

- **MF-03:** production's FDA-028 Vault secret must be provisioned separately by Sky; never copy the staging secret.
- **MF-04:** production `webhook_endpoint` must exist before activating the forward correction or notifications fail closed.
- **MF-05:** keep the explicit rollout decision and Build 33 compatibility sequencing; do not silently close the legacy guest bypass.
- **IPv6:** normalization PASS and transport/ingestion OPEN remain separate claims.
- **Target safety:** carry the tracked production-linked artifact as a residual and prohibit implicit targeting.
- No old-staging mutation, production mutation, production Vault/config action, push, merge, deploy, release, or Phase 03B action is authorized by this review.

## 8.5 Process self-check

- **Efficiency:** reviewed the frozen raw files and exact source; no hosted test or mutation was rerun.
- **Overlap:** R5/R6 were treated as preserved lineage, not discarded or repeated.
- **Simplification:** the receipt alone was insufficient; direct raw-envelope parsing and pre/post comparison were retained because they decide reproducibility and cleanup.

## 9. What changed and gates

Only this independent report was added. No runner, test, SQL, limiter, migration, rollback, receipt, hosted object, Vault value, target, or Git ref was changed during review.

```text
raw R7 SHA-256 verification: PASS — 9/9 files match freeze
exact source Git-object verification: PASS — 5/5 executable artifacts match
accepted limiter/rollback hash verification: PASS — 2/2 match
raw negative parse: PASS — deliberate failure detected exactly once
raw main parse: PASS — 31/31, sequential, unique, Boolean, zero failures
raw pre/post comparison: PASS — exact state equality
npm run db:fda028:hosted:test -- --runInBand: PASS — 20/20
R6 raw parse: PASS — exact plan 31, only assertion 26 false
R6-to-R7 diff review: PASS — purge observation sequenced, expected behavior unchanged
```

## 10. Final return

```text
FDA028_HARNESS_REPAIR_SHA: 2a353336d442c5bb79579a2b0154d08aa43806c1
FDA028_HARNESS_REPAIR_TREE: 472559b72421ee1b4f2a7ce12ebe21867c8a0c0d
HOSTED_EVIDENCE_CHECKPOINT: f4ef1e1f2a4e6220caff1d379d07b4a6f93b3ed3
FRESH_STAGING_PROJECT_REF: cepayqmsoqxshsiyqnvz
FRESH_STAGING_BRANCH_ID: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
FDA028_HOSTED_ASSERTIONS: 31/31 PASS
FDA028_NEGATIVE_CONTROL: PASS
FDA028_CLEANUP: PASS
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: PASS
PHASE_03A_FRESH_STAGE_GATE: PASS
INDEPENDENT_STAGE_REVIEW: PASS
OTHER_STAGE_BLOCKERS: NONE
MF_03: OPEN_PRODUCTION_PREREQUISITE
MF_04: CLOSED_FOR_STAGE; OPEN_PRODUCTION_ENDPOINT_PREREQUISITE
MF_05: OPEN_ROLLOUT_DECISION
ROLLOUT_STAGE: S3_LIMITER_PRESENT_BYPASS_OPEN
NEW_PRODUCTION_AUTHORIZATION_PACKET: MAY_BE_GENERATED_NOT_EXECUTED
OLD_STAGING_MUTATIONS: NONE
PRODUCTION_MUTATIONS: NONE
PRODUCTION_VAULT_OR_CONFIG_ACTIONS: NONE
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
NEXT_SAFE_ACTION: generate a new production authorization packet carrying MF-03, MF-04, MF-05, IPv6, target-safety, Build 33, and no-execution boundaries
NEXT_PERMITTED_PHASE: PHASE-03A ONLY
```
