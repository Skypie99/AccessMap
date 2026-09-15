# Phase 03A final production-authorization packet

```text
PROMPT_ID: FLAGSTONE-P03A-FINAL-OWNER-DECISIONS-20260914-R1
PACKET_CONTENT: READY
INDEPENDENT_FINAL_PACKET_REVIEW: PENDING
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
PRODUCTION_MUTATIONS_THIS_TASK: NONE
```

This packet records two recommendations and prepares a bounded production operation for later owner authorization. It does not approve either recommendation and is not itself authorization to run a dry-run or apply.

## 1. Exact target and source identities

```text
PRODUCTION_PROJECT_REF: kldlwszpfkdmsjrjhjym
ACCEPTED_RELEASE_SHA: 9a0af4c88b5b00898e405992cfd44ba7dfd689fc
ACCEPTED_RELEASE_TREE: 4e9d6aefc16cb8bce877dc6e0097b61ade8e22c5
PRODUCTION_PREREQUISITE_REPAIR_SHA: 22e1db5aa7e58d7129551cb1325f921b37f95105
PRODUCTION_PREREQUISITE_REPAIR_TREE: 657f1b6ce01d3fdbb27102b5aa33616c918feade
READINESS_EVIDENCE_COMMIT: 3140e876af54c1d5945d0e266f8bc1760f7b1848
POLICY_PROPOSAL_COMMIT: e2b8ee8634ddae3410ee935d685b62a7d3b5eb38
PACKET_PREGENERATION_COMMIT: 0a3914fa96d3dd4fb51040097a7d436b82d6df84
PACKET_PREGENERATION_TREE: 5e67c146cb1f6a9456203b419f7c1944b5332560
```

The accepted release is an ancestor of the repair SHA. Commits after the repair SHA contain QA evidence only; they do not change migration or FDA-028 limiter bytes. A later operation must materialize its isolated migration workspace from the exact repair SHA/tree and the frozen plan evidence.

## 2. Fresh production pre-apply state

A read-only inspection on project `kldlwszpfkdmsjrjhjym` returned `transaction_read_only=on` and no credential value or application row.

```text
MF03_SECRET_PREREQUISITE: SATISFIED — exactly 1 row, non-empty, 64-hex/32-byte shape valid
MF04_ENDPOINT_PREREQUISITE: SATISFIED — exactly 1 row, non-empty, HTTPS shape valid
PRODUCTION_LEDGER_COUNT: 71
PRODUCTION_LEDGER_LATEST: 20260830130000
PRODUCTION_LEDGER_ORDERED_SHA256: 8fd1da6ea324d6b458951a41970d729e1e879b09b502b68f16ba22b09bb9dc9b
PRODUCTION_CATALOG_CANONICAL_SHA256: 2c0bacf76c71924ffd8543852dc830f593058b8cb67a1016871f55908dae0443
PRODUCTION_CATALOG_STRUCTURAL_SHA256: 1c4cdbc441d3747f56109955c7b31840720d4cd09373572d961e9638fcc255c8
PRODUCTION_CATALOG_EXACT_ACCEPTED_MATCH: YES
LIMITER_SCHEMA_PRESENT: NO
```

## 3. Exact Stage A migration order

| # | Version | File | SHA-256 |
|---:|---|---|---|
| 1 | `20260904000000` | `20260904000000_adopt_private_admin_helper.sql` | `1d504c3ad05c0b31052715406059071301a51f4359ef35ce85c92cb61202fbf7` |
| 2 | `20260904000100` | `20260904000100_drop_duplicate_status_triggers.sql` | `9771e7c5df363b139e8bcd9e9f9e58b15e6c2f59eebb4523a330a774fc18db49` |
| 3 | `20260904000200` | `20260904000200_adopt_d1sa_containment.sql` | `fbc986296aee71109639ad833d4c75422c28bbefa4fddfefe51f29eeaf03dfb6` |
| 4 | `20260904000300` | `20260904000300_adopt_live_insert_throttles.sql` | `b346b2c7775543c9a268098c0956812b7ad9a9ddf49680202fe846073d4ef776` |
| 5 | `20260904000400` | `20260904000400_adopt_execute_revokes.sql` | `e8a3d880d361e5d6be96c8b30709a9b1b3d8a8d94e6d23175342db41bb20cf13` |
| 6 | `20260905055629` | `20260905055629_phase03a_flag_policies.sql` | `c8f4d419b01a624905c46bd168974d494d82af3a6960049c212d24e8fa07fcaa` |
| 7 | `20260905055630` | `20260905055630_phase03a_open_inserts.sql` | `c6410a61cb195b6d6d70f0d33139064dd191a9cb193534b7f36dc33e25e90071` |
| 8 | `20260905055632` | `20260905055632_phase03a_profile_updates.sql` | `ef24f6b44bcb7cdc7a2e89fe4a886a0d6a0688cf0a416564bde74b5d4c217187` |
| 9 | `20260905055633` | `20260905055633_phase03a_contextual_profiles.sql` | `526d2c47f3c6edb6c3cffff94b8bec4f3c9e4c3602a30a5e4059b14261d86bf9` |
| 10 | `20260905055635` | `20260905055635_phase03a_trigger_execute.sql` | `ca95d25a3219e541db555d5d8693e7240c7a927617c7a5969ee55cffa68074f9` |
| 11 | `20260905055636` | `20260905055636_phase03a_client_privileges.sql` | `44e405bd9bc7b8c2cccb816825f57d43d617a83bdf38d7f0b4d58205cf997063` |
| 12 | `20260905073925` | `20260905073925_phase03a_effective_privileges.sql` | `17970173cb28f29297a931751e9e8ca62c74366f1b83ab5cd36e536049562c20` |
| 13 | `20260909120000` | `20260909120000_fda028_v4_limiter.sql` | `8d1cc7e129040a3c1260e87cc45fd893ced1d63dd55b2f74245d2b30e6387771` |
| 14 | `20260911120000` | `20260911120000_phase03a_webhook_target_env_scoped.sql` | `9165f87e3571325fc847de5b08ca33aa9266e8786cee613be0cf61a06f4fbf6b` |

All 14 hashes were recomputed from the frozen files and match. All 14 versions remain absent from the exact current production ledger.

```text
STAGE_B_VERSION: 20260911130000
STAGE_B_SHA256: a21c56b588b958a261766257482a08ceefb8857dc8d9e7c11b180c7584d8b963
STAGE_B: EXCLUDED
```

## 4. MF-05 recommendation and impact

```text
MF05_OWNER_DECISION: ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A
OWNER_APPROVED: NO
```

This is a temporary rollout posture. Stage A introduces the accepted limiter infrastructure while retaining Build 33 and pinned-web compatibility. It does not claim every guest request is rate-limited because legacy direct guest inserts remain available. Stage B is excluded. There is no forced client upgrade, app release, pinned-web cutover, or legacy-path removal. Closing the bypass requires a later coordinated native and pinned-web cutover with separate evidence and authorization.

## 5. Proposed production limiter policy

| Field | Value | Confidence | Operational meaning |
|---|---:|---|---|
| `normal_allowance` | **5** | High | Preserves the shipped five guest reports per 24 hours. |
| `bucket_allowance` | **50** | Provisional | Funds ten full grants per public prefix; bounds reset amplification at 10x. |
| `window_seconds` | **86400** | High | Preserves the shipped 24-hour window and reset persistence within it. |
| `ipv4_prefix` | **32** | High | Uses one public IPv4 address per bucket and avoids merging unrelated addresses. |
| `ipv6_prefix` | **64** | Provisional | Resists privacy-address rotation within a normal subscriber prefix without broader grouping. |
| `retention_windows` | **1** | Provisional | Keeps the live and immediately preceding window for bounded reconciliation. |
| `reseed_interval` | **7** | Provisional | Randomly reseeds after seven daily epochs, bounding forward derivation from an older key. |
| `catchup_cap` | **32** | High | Bounds serial ratchet catch-up; longer gaps reseed at the current epoch. |

The detailed evidence and false-positive, abuse, privacy, and shared-network tradeoffs are frozen in `MF05_AND_PRODUCTION_POLICY_PROPOSAL.md`. These values equal the migration defaults, so no extra config mutation is part of Stage A. They were selected from the shipped five-per-day behavior, accepted architecture, hosted validation, and current aggregate production evidence rather than copied from staging by assumption. Production prefix distribution remains unknown; bucket, IPv6, retention, and reseed tuning therefore remains provisional.

## 6. Production forward recovery

```text
PRODUCTION_FORWARD_RECOVERY: PREPARED_REVIEWED
RECOVERY_EXECUTION_AUTHORIZED: NO
LEDGER_MODEL: FORWARD_ONLY
```

### Restore sequence — reverse dependency order

Every restore is classified `UNSAFE_BASELINE_RESTORE`; listing it does not make it safe to execute.

| Order | Version | File | SHA-256 |
|---:|---|---|---|
| 1 | `20260916000000` | `20260916000000_restore_fda028_v4_limiter.sql` | `cbf127cd99b787f2d96ead0254dd911a932c0fab8b0d4f0e1ccd98bb276dad85` |
| 2 | `20260916000100` | `20260916000100_restore_phase03a_effective_privileges.sql` | `518d4dcd7a3098204378b4f9605539c33b42301ddb636b51e8457eb881144ece` |
| 3 | `20260916000200` | `20260916000200_restore_phase03a_client_privileges.sql` | `63deacc24533b9d4631f2fdff850a52fff09c9d3f95b6d5aa4e218a8942bdeb3` |
| 4 | `20260916000300` | `20260916000300_restore_phase03a_trigger_execute.sql` | `784bfc7d6aba09574e7124b093bdb207c174997a2f8d8854428a9b22a5c6d68a` |
| 5 | `20260916000400` | `20260916000400_restore_phase03a_contextual_profiles.sql` | `fad594808bf926ff56f21209681dfd40e9e6dc68c45e78cefefbdeece3fcc5ae` |
| 6 | `20260916000500` | `20260916000500_restore_phase03a_profile_updates.sql` | `9de75a4ac3aca00f4d95dca493bd21b9a717e0089c9e17987105e38dc1b87f64` |
| 7 | `20260916000600` | `20260916000600_restore_phase03a_open_inserts.sql` | `2c5735df67803d3ae4f96ffa6999ced66aed7aaf6f4d0a49a2a4d5517825acbb` |
| 8 | `20260916000700` | `20260916000700_restore_phase03a_flag_policies.sql` | `616fff5909f0d392f4ff2ac75ad62040711736912328f30e825c5c4d1e532caa` |
| 9 | `20260916000800` | `20260916000800_restore_adopt_live_insert_throttles.sql` | `0c438210b56240fcc363ae9e77291d63a493c65bec2b52c6c0ec44064dce6088` |
| 10 | `20260916000900` | `20260916000900_restore_adopt_d1sa_containment.sql` | `9cd2d51d4e69cfacc3da122144a4069c0e7ca33fd864bd97fbc593d66d866d97` |
| 11 | `20260916001000` | `20260916001000_restore_drop_duplicate_status_triggers.sql` | `e53b7e90f97460e21c7e4bebae3dcdd4771dc3caa6411a377f34f297c94d7f3d` |
| 12 | `20260916001100` | `20260916001100_restore_adopt_private_admin_helper.sql` | `a77bd26a4bbd1519d9c704b25d448f3b59dc2dd3fabbc8966c5b3987d241dbfd` |

### Reapply sequence — original dependency order

| Order | Version | File | SHA-256 |
|---:|---|---|---|
| 1 | `20260917000000` | `20260917000000_reapply_adopt_private_admin_helper.sql` | `4bbe1474c3686d3236a96268d63cfb18bc03993e45d3358ba5a32c9d48ff6803` |
| 2 | `20260917000100` | `20260917000100_reapply_drop_duplicate_status_triggers.sql` | `95312a74435f4c552240d2a0182eff6f3753fe6a4bd9f92bb97fbf64a43ea6fa` |
| 3 | `20260917000200` | `20260917000200_reapply_adopt_d1sa_containment.sql` | `3eafc3a7f1feb87c5d562f33e2458df951ce493269f0379f7f5a2efbb3df773c` |
| 4 | `20260917000300` | `20260917000300_reapply_adopt_live_insert_throttles.sql` | `3ad95a6c4fa4ad902d76b28cb615b69790ba6b98a60f632ede728cc75b2d00f2` |
| 5 | `20260917000400` | `20260917000400_reapply_phase03a_flag_policies.sql` | `51d9c026ef0c5f031e2ac8e322cd714fd383c0539af5219242590a7f19bdc703` |
| 6 | `20260917000500` | `20260917000500_reapply_phase03a_open_inserts.sql` | `cc785dafbaaa881c2dc1efa45eeaa5bf42ceeb9058310c1118aa3f803be15674` |
| 7 | `20260917000600` | `20260917000600_reapply_phase03a_profile_updates.sql` | `1c0285b19a085df43171a28fab72141c913ff87542b14a5599be44eb1b2f7862` |
| 8 | `20260917000700` | `20260917000700_reapply_phase03a_contextual_profiles.sql` | `4ab6942066217ff014f1d6d5fd2466d969e0eab87e2defb2d2881358d8d45637` |
| 9 | `20260917000800` | `20260917000800_reapply_phase03a_trigger_execute.sql` | `a923d812939d8de814138277875e111fe199affe222659d69f498014f63ab6d8` |
| 10 | `20260917000900` | `20260917000900_reapply_phase03a_client_privileges.sql` | `4e2f7dcd1f17f4e7b875601114f55675f097fc3e7a57be270999f90ce8e52eeb` |
| 11 | `20260917001000` | `20260917001000_reapply_phase03a_effective_privileges.sql` | `da2caf361ae749ad047ae785bfd51c95bf3d01e1db7b172b688854f67fede79a` |
| 12 | `20260917001100` | `20260917001100_reapply_fda028_v4_limiter.sql` | `c695da25cdb7298652ba594130d6d05df769d2a08b65bab7261d378afc26658f` |

### Recovery triggers

- A separately authorized Stage A production apply has occurred.
- Post-apply verification identifies a material regression attributable to one or more candidates.
- The owner selects an exact bounded recovery subset after impact review.
- The selected versions remain unused and the current production ledger is reconciled.
- A fresh production capture is banked before and after the recovery operation.

Before any separately authorized recovery, reverify the target, source and artifact hashes, current ledger, unused recovery versions, selected dependency-safe subset, production prerequisites, and current application data impact. Bank a fresh before capture and a fresh after capture.

### Recovery stop conditions

- Stop on any target, source hash, ledger, version, prerequisite, or dependency mismatch.
- Stop on any need to restore either non-reversible security repair.
- Stop on any uncertain response or partial application.
- Stop on any recovery that would overwrite or discard legitimate live data.

Two forward-only security crossings have no restore or reapply artifact: `20260904000400_adopt_execute_revokes.sql` and `20260911120000_phase03a_webhook_target_env_scoped.sql`. A regression requires owner-selected application/release containment or a new defect-specific correcting migration with a fresh unused version and separate review. Never recreate the retired credential, client execution grants, or hardcoded endpoint.

## 7. Exact pre-apply verification and operation order

1. Create a local `PREPARED` checkpoint. Verify branch/worktree cleanliness and that no Git operation is active.
2. Verify the exact production ref `kldlwszpfkdmsjrjhjym` through explicit project metadata and database-side identity. Reject implicit, linked, local, URL, staging, whitespace-altered, or duplicate target selectors.
3. Verify the accepted release is an ancestor of repair SHA `22e1db5aa7e58d7129551cb1325f921b37f95105`, and verify repair tree `657f1b6ce01d3fdbb27102b5aa33616c918feade`.
4. Recompute every Stage A hash and verify the exact 14-entry order. Refuse Stage B and every recovery file.
5. In a read-only transaction, require the exact 71-row ledger, latest version, ordered digest, and exact canonical/structural catalog digests recorded above. Any drift is a STOP.
6. Verify MF-03 and MF-04 by count and shape only. Return no secret or endpoint value. Each must have exactly one valid row.
7. Reverify all 24 recovery versions are unused locally and in production, and verify all recovery hashes.
8. Run the tracked-tree credential guard. It must pass without emitting matched content.
9. After an explicit dry-run-only owner authorization, materialize the guarded isolated workspace from the frozen source and execute only the target-explicit `--dry-run --skip-vault` plan. Confirm exactly the 14 Stage A migrations above, once each, in order; confirm Stage B and recovery files are absent; destroy the marked workspace.
10. Bank and independently review the dry-run receipt. A real apply requires a new, separate owner token naming this packet, the reviewed dry-run, exact target, source, migrations, prerequisites, policy, recovery, verification gates, and mutation window.
11. Only after that separate apply token: bank `RUNNING`, perform one canonical target-explicit database push from the exact isolated workspace, and record `APPLIED_NOT_VERIFIED` only after a confirmed response.

No manual SQL-file execution, Management API SQL apply, linked target, database URL selector, wall-clock replacement version, direct ledger edit, Vault/config update, webhook invocation, guest-ingest invocation, or production test traffic is permitted.

## 8. Exact post-apply verification

1. Verify project ref again before every read.
2. Capture the full ordered ledger in a read-only transaction. Require all 14 exact version/name pairs once each, no Stage B row, no recovery row, and a count of 85 if no unrelated migration was applied. Any unrelated concurrent change is a STOP for acceptance and requires reconciliation.
3. Capture and retain the full comparator-v3 catalog. Review every residual against the declared effects of the 14 candidates; no unexplained residual may be accepted.
4. Verify `limiter.config` exists with exactly one row and the eight approved values `5 / 50 / 86400 / 32 / 64 / 1 / 7 / 32`. Do not change it during verification.
5. Verify MF-03 and MF-04 still each have exactly one non-empty, shape-valid row without returning either value.
6. Verify Stage B remains absent and the MF-05 posture remains `S3_LIMITER_PRESENT_BYPASS_OPEN`. Do not invoke limiter or guest-ingest functions.
7. Verify the expected function, role, grant, RLS, trigger, and webhook-target catalog contract without sending a webhook or creating production traffic.
8. Compare production-safe aggregate row counts to the pre-apply capture. The migration operation must not create or delete application rows, limiter spend rows, HTTP queue rows, or synthetic helpers.
9. Run local typecheck, lint, contract, snapshot, release, workspace-destruction, migration-identity, and credential gates against the exact source and bank their real results.
10. Obtain independent post-apply review before declaring production acceptance. Local or catalog success alone does not authorize client, release, Stage B, or Phase 03B work.

## 9. `OUTCOME_UNKNOWN` and STOP handling

- Before the mutation request, any target, selector, source, hash, ledger, catalog, prerequisite, policy, recovery, credential-gate, or dry-run mismatch is a STOP. Do not begin the apply.
- If an apply response times out, disconnects, is truncated, or otherwise leaves commit status uncertain, record `OUTCOME_UNKNOWN` immediately. Do not retry.
- Reconcile only with read-only project identity, ledger, and catalog checks. Classify each of the 14 versions as absent or present and compare actual structure before any new decision.
- If the apply is partial, preserve evidence and return HOLD. Do not delete or rewrite ledger rows and do not run recovery without a new exact owner authorization.
- If post-apply verification finds unexplained drift, missing prerequisites, unexpected rows, application-data change, Stage B, residue, or a security-crossing regression, stop and preserve evidence. Do not seek a passing result by mutating production.

## 10. Authority explicitly excluded

Even after the owner approves MF-05 and the policy proposal, the following remain unauthorized:

- Git push or main/deploy-branch merge
- client or web deployment
- TestFlight or App Store action
- forced client upgrade
- pinned-web cutover
- legacy-path removal or Stage B
- production notification/webhook probe
- production guest-ingest or limiter invocation
- production recovery execution
- Phase 03B

## 11. Exact next owner authorization phrase

The phrase below is a template only. Its presence here is not authorization.

> I approve MF-05 as ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A and approve the Phase 03A production limiter policy normal_allowance=5, bucket_allowance=50, window_seconds=86400, ipv4_prefix=32, ipv6_prefix=64, retention_windows=1, reseed_interval=7, catchup_cap=32. I authorize only the target-explicit production dry-run for project kldlwszpfkdmsjrjhjym from repair SHA 22e1db5aa7e58d7129551cb1325f921b37f95105 and tree 657f1b6ce01d3fdbb27102b5aa33616c918feade, using exactly the 14 Stage A versions and SHA-256 hashes in FINAL_PRODUCTION_AUTHORIZATION_PACKET.md, with --skip-vault, Stage B and recovery files excluded, mandatory STOP handling, workspace destruction, and independent receipt review. I do not authorize a production apply, Vault/config change, function invocation, production traffic, webhook, recovery action, push, merge, deploy, client release, TestFlight, App Store action, Stage B, or Phase 03B. Return the reviewed dry-run result to me for a separate apply decision.

## Standing state

```text
MF03_SECRET_PREREQUISITE: SATISFIED
MF04_ENDPOINT_PREREQUISITE: SATISFIED
MF05_RECOMMENDATION: ACCEPT_S3_LIMITER_PRESENT_BYPASS_OPEN_FOR_STAGE_A
PRODUCTION_POLICY: READY_FOR_OWNER_APPROVAL
PENDING_MIGRATIONS: 14
STAGE_B_INCLUDED: NO
PRODUCTION_FORWARD_RECOVERY: PREPARED_REVIEWED
PRODUCTION_MUTATIONS: NONE
PRODUCTION_AUTHORIZED: NO
MAIN_MERGE_AUTHORIZED: NO
NEXT_PERMITTED_PHASE: PHASE-03A ONLY
```
