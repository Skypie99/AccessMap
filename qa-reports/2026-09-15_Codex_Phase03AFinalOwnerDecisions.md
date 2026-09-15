# Phase 03A final owner decisions and authorization packet

## Outcome

The final owner-facing packet is ready for Sky's decision. Both production prerequisites remain satisfied by current shape-only evidence, production ledger and catalog identity remain unchanged, the exact 14-file Stage A plan remains valid, Stage B is excluded, and the reviewed 24-artifact forward-recovery preparation remains intact.

The independent final packet review passed. No production apply, dry-run, migration, Vault/config change, function invocation, webhook, production traffic, push, merge, deploy, release, or Phase 03B work occurred.

## What changed

- Banked fresh read-only production project, prerequisite-shape, ledger, catalog, and privacy-safe aggregate evidence.
- Recorded the temporary MF-05 recommendation `ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A` with its compatibility and claim limits.
- Proposed all eight production limiter values with confidence and accessibility/abuse/shared-network tradeoffs.
- Prepared the exact 14-migration Stage A authorization packet, 24 forward-recovery identities and triggers, pre/post verification, STOP/`OUTCOME_UNKNOWN` handling, and a dry-run-only owner phrase.
- Obtained an independent PASS review of the frozen packet.

Only QA reports and evidence were added. Application, migration, limiter, and rollback bytes were not changed.

## Branch and identities

```text
BRANCH: codex/flagstone-p03a-takeover-20260914
ACCEPTED_RELEASE_SHA: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
ACCEPTED_RELEASE_TREE: 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5
REPAIR_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
FROZEN_PACKET_COMMIT: f677c45f2f1622396a66c9b8503b8885a90f6e5e
FROZEN_PACKET_TREE: 08bc4b6c92c786af0b080676ee5b36afa8f40d1e
PACKET_SHA256: b930bf7b005b740b3f78914f570e7725e19389d33e040b6b5e854905867fe40a
```

## Gates

```text
fresh project identity: PASS — exact ref kldlwszpfkdmsjrjhjym
read-only SQL boundary: PASS — transaction_read_only=on
MF-03 shape-only verification: PASS — exactly 1 non-empty 64-hex/32-byte row
MF-04 shape-only verification: PASS — exactly 1 non-empty HTTPS-shape row
ledger comparison: PASS — exact 71-row equality; ordered digest unchanged
catalog comparator: PASS — canonical and non-ledger structural digests unchanged
Stage A hashes and production absence: PASS — 14/14
Stage B exclusion: PASS
forward-recovery current hashes: PASS — 24/24
packet static validation: PASS
independent final packet review: PASS
production-plan focused tests: PASS — 18/18, independently run
credential guard: PASS — 10/10, independently run
npm run typecheck: PASS
```

The production-safe aggregate sample contains only 12 lifetime guest flags and no per-prefix distribution. The policy therefore starts generously and marks the shared-network-dependent values provisional for later privacy-safe operational tuning.

## What's left

- Sky must decide whether to accept the temporary MF-05 bypass-open posture.
- Sky must approve or reject the eight proposed production limiter values.
- If Sky approves both, the next permitted operation is one exact production dry-run only using the phrase in the packet. A real apply still requires a separate owner token after the dry-run is banked and independently reviewed.

## DECISIONS FOR SKY

- **Decision:** Accept or reject `ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A`.
- **Recommendation:** Accept it temporarily to preserve Build 33 and pinned-web compatibility while keeping Stage B and cutover work separate.
- **Alternative:** Hold Stage A until a coordinated client and pinned-web cutover is ready.
- **Impact:** Acceptance does not claim all guest traffic is rate-limited and does not remove the legacy path.

- **Decision:** Approve or reject policy `5 / 50 / 86400 / 32 / 64 / 1 / 7 / 32`.
- **Recommendation:** Approve it as the conservative initial policy, with provisional fields tuned later from privacy-safe saturation and denial aggregates.
- **Alternative:** Hold and gather more production evidence; no limiter-backed production traffic exists yet, so that evidence cannot be obtained before initial rollout.
- **Impact:** The proposal preserves the shipped five-per-day experience and funds ten fully active grants behind one public prefix while bounding reset amplification at 10x.

The exact owner phrase is in `FINAL_PRODUCTION_AUTHORIZATION_PACKET.md` and `R06_COMPLETE.md`. Its scope is production dry-run only.
