# FDA-028 hosted harness R7 evidence freeze

`STATUS: FROZEN_FOR_INDEPENDENT_HOSTED_ACCEPTANCE_REVIEW`

## Exact run identity

```text
FDA028_HARNESS_REPAIR_SHA: 2a353336d442c5bb79579a2b0154d08aa43806c1
FDA028_HARNESS_REPAIR_TREE: 472559b72421ee1b4f2a7ce12ebe21867c8a0c0d
runner checkpoint SHA: 9033406960f087f703a6b5af6d7974df8304973c
runner checkpoint tree: ffa47da8896a1ac833170f792e2442eb30eeb617
target project: cepayqmsoqxshsiyqnvz
target branch: 4a37413a-01c2-4ab2-8bf8-a17a42a549b8
production contact: false
```

## Exact result

```text
receipt status: PASS
negative control: plan 1, deliberate failure detected exactly once
main plan: 31
main passed: 31
main failed: 0
cleanup: PASS
failure: null
```

The main payload contains 31 sequential, uniquely named Boolean assertion records. It proves the named constraint rejects the invalid fixture, the real Vault path and function/role contracts exist, the accepted fresh stage is empty, bounded config and timing are active, real full-path inserts work, grant and bucket exhaustion do not overshoot, refused calls do not write flags, no orphan survives, bucket delete and purge cascade grants, stale grants do not resurrect, the actual `service_role` clockless path writes a real flag, the kill switch preserves writes, private input fails closed, public IPv4 normalizes to `/32`, future clock input is capped, Vault remains one readable 32-byte row, and no helper function is created.

## Cleanup proof

The raw pre/post envelopes have different randomized safety boundaries, but their parsed state objects are exactly equal:

```text
ledger count: 103 -> 103
latest ledger version: 20260913080000 -> 20260913080000
ledger digest: exact accepted digest -> exact accepted digest
flags: 0 -> 0
buckets: 0 -> 0
grants: 0 -> 0
helpers: 0 -> 0
queued_http: 0 -> 0
Vault secret rows: 1 -> 1
Vault key bytes: 32 -> 32
dev_key_material: absent -> absent
key state: exact match
config: exact match
function contract: exact match
```

The negative and main commands each returned the required nonzero exception wrapper. The main statement's config, real flag rows, limiter ledgers, key state, and Vault update were rolled back atomically before the post-state query.

## Raw evidence hashes

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

## Reconciliation with banked hosted evidence

No contradiction was found:

- The earlier full-path concurrency result remains PASS: 25 attempts at allowance 10 produced 10 admissions, 10 real flag rows, 10 ledger units, 10 grants, zero orphans, and no overshoot. R7 independently proves bounded sequential exhaustion at allowance 4, exact units, real rows, reset-client grant behavior, and zero orphans.
- The earlier named role and surface probes remain PASS. R7 verifies the same function signatures and ACLs and actually calls the clockless entry point under `service_role`.
- The earlier Vault IO probe remains PASS. R7 uses the real Vault view, one secret row, 32-byte decoded key, a transaction-local ratchet, and exact rollback without exposing key material.
- The earlier domain, lifecycle, fail-closed, and residue evidence remains PASS. R7 derives timing from its active config, proves delete/purge cascade and stale-grant behavior, checks private input refusal, and restores the complete state.
- The composed hosted pgTAP result remains 254/254 PASS. That suite covers separate Phase 03A contracts; R7 supplies the previously missing committed FDA-028 hosted reproduction.
- MF-04 remains CLOSED_FOR_STAGE and MF-05 remains OPEN_ROLLOUT_DECISION. This harness did not alter either classification.

The two earlier bounded HOLD attempts are preserved. R5 stopped after the negative control because of the newly observed Management API wrapper. R6 produced 30/31 and exposed an unordered harness Boolean expression. Both had cleanup PASS and neither contradicts R7.

## Pending independent disposition

```text
FDA028_IMPLEMENTATION_HOSTED_BEHAVIOR: PENDING_INDEPENDENT_REVIEW
FDA028_HOSTED_HARNESS_REPRODUCIBILITY: PENDING_INDEPENDENT_REVIEW
PHASE_03A_FRESH_STAGE_GATE: HOLD_PENDING_INDEPENDENT_REVIEW
INDEPENDENT_STAGE_REVIEW: PENDING
```

No production, old-stage, Git remote, push, merge, release, or Phase 03B operation occurred.
