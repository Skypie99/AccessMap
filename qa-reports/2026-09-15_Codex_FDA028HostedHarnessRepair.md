# FDA-028 hosted harness repair — final handoff

**Date:** 2026-09-15
**Prompt:** `FLAGSTONE-P03A-FDA028-HOSTED-HARNESS-REPAIR-20260914-R1`
**Branch:** `codex/flagstone-p03a-takeover-20260914`
**Packet checkpoint SHA:** `58eea9da98083872ecccf9fd32381f3a259f59fc`
**Packet checkpoint tree:** `e4dfd9a12c2ee7198ec3b9fd8a8803076b677ab8`
**Exact repaired executable SHA:** `2a353336d442c5bb79579a2b0154d08aa43806c1`
**Exact repaired executable tree:** `472559b72421ee1b4f2a7ce12ebe21867c8a0c0d`

## Outcome

The sole takeover blocker is closed. The committed FDA-028 hosted harness now reproduces the accepted limiter behavior against the exact fresh staging project and branch. Its negative control passed, all 31 main assertions passed, cleanup restored the complete captured state, and the independent hosted reviewer accepted both the implementation behavior and harness reproducibility.

The Phase 03A fresh-stage gate is `PASS`. A new production authorization packet is ready for Sky's review. It grants no production authority and was not executed.

## What changed

### Executable harness

- `package.json` adds the single committed hosted runner command.
- `scripts/run-fda028-hosted.mjs` binds execution to the explicit fresh-stage project, branch, and reviewed source; refuses production, old staging, ambiguous selectors, and unreviewed artifacts; captures raw evidence; requires the negative control; propagates assertion failure; and verifies complete cleanup without exposing Vault material.
- `scripts/__tests__/fda028HostedHarness.test.mjs` covers target refusal, source binding, result parsing, failure propagation, real contract couplings, and cleanup behavior.
- `supabase/tests/fda028/hosted-state.sql` captures the complete bounded pre/post comparison state.
- `supabase/tests/fda028/hosted-negative-control.sql` proves the real `flags_category_check` rejects the invalid `ramp` fixture.
- `supabase/tests/fda028/hosted-acceptance.sql` uses valid real-schema values, actual function signatures, a transaction-local bounded configuration derived from the accepted contract, the real Vault path, no `dev_key_material`, 31 sequential assertions, and an intentional final exception that rolls back all mutations.

R7's final change only sequences `purge_at()` before counting grants. This removes PostgreSQL Boolean evaluation-order ambiguity while preserving both required checks. The accepted limiter migration and rollback bytes did not change.

### Evidence and review trail

- `qa-reports/phase03a/2026-09-14-harness-repair/` contains the prepared checkpoint, hosted contract, source freezes, pre-limit banks, all independent code reviews, retained R5/R6 HOLD receipts, R7 raw hosted output, the R7 evidence freeze, independent hosted acceptance, and the new production authorization packet.
- R5 stopped safely after discovering the Management API's structured nonzero rollback wrapper; its main proof did not run and cleanup passed.
- R6 reached 30/31 and isolated assertion 26's unordered side-effect observation; cleanup passed.
- R7 retained the expected behavior, returned 31/31, and passed exact pre/post state equality.

## Exact accepted evidence

```text
fresh project: cepayqmsoqxshsiyqnvz
fresh branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
fresh ledger: 103 rows
latest ledger version: 20260913080000
ordered ledger sha256: 9c7301f4e0880905a84b1e27a9360afc229034042506d1b651700643fc0c8316
negative control: plan 1; deliberate failure detected exactly once
main proof: plan 31; 31 passed; 0 failed
cleanup: PASS; complete parsed pre/post state equality
hosted evidence checkpoint: f4ef1e1f2a4e6220caff1d379d07b4a6f93b3ed3
independent hosted review: 7cd0c69a218cd22f947c2106677e8d0ed9a87297
```

Cleanup retained the exact 103-row ledger and accepted digest; zero flags, buckets, grants, helpers, and queued HTTP rows; one readable 32-byte Vault key; absent `dev_key_material`; and identical key state, config, and function contract. No secret value appears in the evidence.

The result agrees with the previously banked 25-way full-path proof: allowance 10, 10 admitted, 10 real rows, 10 ledger units, 10 grants, zero orphans, and no overshoot. Vault IO, reset continuity, client independence, lifecycle, fail-closed behavior, and hosted composed pgTAP 254/254 remain valid.

## Gates

Commands were run from `/Users/skypie/AccessMap-codex/flagstone-p03a-takeover-20260914`.

```text
npm run db:fda028:hosted:test
PASS — 20 tests; 20 passed; 0 failed

node --check scripts/run-fda028-hosted.mjs
PASS

npm run db:pgtap:discover
PASS — problems []

exact executable artifact SHA-256 verification
PASS — 5/5 artifacts match SOURCE_FREEZE_R7.md

accepted limiter and rollback SHA-256 verification
PASS — forward 8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771
PASS — rollback eded3c9feaa139dc112e7356fc7cf2adc896cc87192231a63cb4b55c1acc8302

R7 hosted negative-control parse
PASS — plan 1; one deliberate failure detected

R7 hosted main parse
PASS — plan 31; 31 unique sequential Boolean results; 31 passed; 0 failed

R7 pre/post comparison
PASS — complete parsed state equality

npm run db:apply:plan
PASS — 9 canonical Phase 03A Stage A candidates; 0 refusals; local ledger audit clean

git diff --check
PASS
```

The independent code review passed before R7 touched staging. The independent hosted acceptance then verified the frozen raw hashes, exact Git-object source binding, negative/main envelope parsing, cleanup, and reconciliation with the earlier Phase 03A evidence.

## Authority and remaining work

- `MF-03`: open production prerequisite. Sky must provision a new production-only limiter Vault secret through an owner-controlled path.
- `MF-04`: closed for stage; the production `webhook_endpoint` remains a required production prerequisite.
- `MF-05`: open rollout decision. Stage A retains `S3_LIMITER_PRESENT_BYPASS_OPEN` for Build 33 and pinned-web compatibility.
- Production thresholds remain deferred; fresh-stage test values are not a production recommendation.
- IPv6 normalization is `PASS`; IPv6 transport and end-to-end ingestion remain `OPEN`.
- The credential guard has a known false positive on the identifiers `STAGE-MF-03`, `STAGE-MF-04`, and `STAGE-MF-05`; the fresh-stage delta contained no real credential material.
- Current Git truth shows no tracked `supabase/.temp/project-ref` or `supabase/.temp/linked-project.json`. The independent R7 report's statement that the latter remains tracked is stale; implicit target selection remains prohibited.
- The staged forward-recovery files prove the recovery model but are not automatically authorized for production.

No old staging, production, production Vault/config, webhook, push, main merge, deploy, release, TestFlight, App Store, or Phase 03B action occurred.

## DECISIONS FOR SKY

**Decision:** Whether to issue a separate exact production authorization after reviewing `qa-reports/phase03a/2026-09-14-harness-repair/NEW_PRODUCTION_AUTHORIZATION_PACKET.md`.

**Recommendation:** Keep production unchanged until the production read-only preflight is banked, exact thresholds are chosen, MF-03 and MF-04 are completed through owner-controlled paths, MF-05's bypass-open impact is explicitly accepted, and production-specific forward-recovery identities are reviewed. Then issue an exact target- and artifact-bound authorization token if the preflight remains clean.

**Why:** Fresh staging now proves the accepted Phase 03A candidate and repaired FDA-028 harness, while production still has target-specific prerequisites and owner choices that staging cannot resolve.

**Alternative:** Request changes to the packet or retain the current production state without authorizing any operation.

**Impact:** Phase 03A remains fresh-stage accepted and production remains unchanged. Phase 03B, push, main merge, deployment, and release remain unauthorized.

## Final status

```text
FDA028_HARNESS_REPAIR_SHA: 2a353336d442c5bb79579a2b0154d08aa43806c1
FDA028_HARNESS_REPAIR_TREE: 472559b72421ee1b4f2a7ce12ebe21867c8a0c0d
FDA028_LIMITER_IMPLEMENTATION_BYTES_CHANGED: NO
FDA028_HARNESS_CODE_REVIEW: PASS
FDA028_HOSTED_REPRODUCIBLE_ASSERTIONS: 31/31 PASS
FDA028_HOSTED_NEGATIVE_CONTROLS: PASS
FDA028_HOSTED_CLEANUP: PASS
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PASS
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: PASS
PHASE_03A_FRESH_STAGE_GATE: PASS
INDEPENDENT_STAGE_REVIEW: PASS
NEW_PRODUCTION_AUTHORIZATION_PACKET: READY
FRESH_STAGING_LEDGER_COUNT: 103
OLD_STAGING_MUTATIONS: NONE
PRODUCTION_MUTATIONS: NONE
PUSHES: NONE
MAIN_MERGES: NONE
PHASE_03B_STARTED: NO
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
NEXT_SAFE_ACTION: Sky reviews the new production authorization packet and either issues an exact production authorization token or requests changes
NEXT_PERMITTED_PHASE: PHASE-03A ONLY
```
